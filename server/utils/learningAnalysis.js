import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_TEXT_LENGTH = 60000;
const CHUNK_SIZE = 6000;

let cachedClient;
let cachedKey = '';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenerativeAI(apiKey);
    cachedKey = apiKey;
  }
  return cachedClient;
}

function chunkText(text, size = CHUNK_SIZE) {
  const chunks = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

async function runGemini(instruction, text, { temperature = 0.3, maxTokens = 800, responseMimeType } = {}) {
  const client = getGeminiClient();
  if (!client) return null;

  try {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = client.getGenerativeModel({ model: modelName });
    const normalized = (text || '').replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT_LENGTH);
    const parts = [{ text: instruction }];
    const segments = chunkText(normalized);
    if (segments.length === 0) {
      parts.push({ text: '(No content provided)' });
    } else {
      segments.forEach((segment, index) => {
        parts.push({ text: `Section ${index + 1}:\n${segment}` });
      });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType,
      },
    });

    const textResponse = result?.response?.text?.();
    return typeof textResponse === 'string' ? textResponse.trim() : null;
  } catch (error) {
    console.warn('Gemini request failed', error);
    return null;
  }
}

export async function summarizeMaterialText(title, text) {
  const sourceText = (text || '').trim();
  if (!sourceText) return 'Summary unavailable.';

  const summary = await runGemini(
    `You are a helpful study assistant. Summarize the following learning material titled "${title}" using 3-5 bullet points, followed by a short paragraph (max 120 words). Keep the language concise and student-friendly.`,
    sourceText,
    { temperature: 0.2, maxTokens: 512 },
  );

  if (summary) return summary;
  return fallbackSummary(sourceText);
}

export async function createFlashcardsFromText(text, count = 6) {
  const requested = Math.min(Math.max(Number(count) || 6, 3), 12);
  const sourceText = (text || '').trim();
  if (!sourceText) return fallbackFlashcards(sourceText, requested);

  const response = await runGemini(
    `Create ${requested} unique flashcards from the provided learning material. Reply strictly as JSON array. Each item should have "term" and "definition" fields with concise strings.`,
    sourceText,
    { temperature: 0.3, maxTokens: 900, responseMimeType: 'application/json' },
  );

  const parsed = safeParseJsonArray(response)
    ?.map((card) => ({
      term: String(card.term || card.front || '').trim().slice(0, 140),
      definition: String(card.definition || card.back || '').trim().slice(0, 300),
    }))
    .filter((card) => card.term && card.definition)
    .slice(0, requested);

  if (parsed && parsed.length) return parsed;
  return fallbackFlashcards(sourceText, requested);
}

export async function createQuizFromText(text, count = 5) {
  const requested = Math.min(Math.max(Number(count) || 5, 3), 10);
  const sourceText = (text || '').trim();
  if (!sourceText) return fallbackQuiz(sourceText, requested);

  const response = await runGemini(
    `Generate ${requested} multiple-choice questions from the provided material. Return JSON array with each item containing "question" (string), "options" (array of exactly 4 concise strings), and "correct" (one of the options).`,
    sourceText,
    { temperature: 0.3, maxTokens: 900, responseMimeType: 'application/json' },
  );

  const parsed = safeParseJsonArray(response)
    ?.map((question) => {
      const rawOptions = Array.isArray(question.options) ? question.options : [];
      const options = rawOptions.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 6);
      const correct = String(question.correct || '').trim();
      if (options.length < 2 || !options.includes(correct)) return null;
      return {
        question: String(question.question || '').trim().slice(0, 220),
        options,
        correct,
      };
    })
    .filter(Boolean)
    .slice(0, requested);

  if (parsed && parsed.length) return parsed;
  return fallbackQuiz(sourceText, requested);
}

export function buildDerivedTitle(originalName, suffix) {
  const base = String(originalName || '').replace(/\.[^.]+$/, '').trim();
  if (!base) return suffix;
  return `${base} ${suffix}`.trim();
}

function fallbackSummary(text) {
  const paragraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const taken = paragraphs.slice(0, 3);
  if (!taken.length) return 'Summary unavailable.';
  return taken.join('\n\n').slice(0, 1200);
}

function fallbackFlashcards(text, count) {
  const sentences = extractSentences(text);
  if (!sentences.length) {
    return Array.from({ length: count }, (_, index) => ({
      term: `Key concept ${index + 1}`,
      definition: 'No extracted detail available.',
    }));
  }

  return sentences.slice(0, count).map((sentence, index) => ({
    term: buildTermFromSentence(sentence, index),
    definition: sentence.trim(),
  }));
}

function fallbackQuiz(text, count) {
  const sentences = extractSentences(text);
  if (!sentences.length) {
    return [
      {
        question: 'True or False: Review the uploaded material to learn more.',
        options: ['True', 'False'],
        correct: 'True',
      },
    ];
  }

  return sentences.slice(0, count).map((sentence) => ({
    question: `True or False: ${sentence.trim()}`,
    options: ['True', 'False'],
    correct: 'True',
  }));
}

function extractSentences(text) {
  return (text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

function buildTermFromSentence(sentence, index) {
  const cleaned = sentence.replace(/[.!?]/g, '');
  const words = cleaned.split(/\s+/).slice(0, 6).join(' ');
  return words || `Concept ${index + 1}`;
}

function safeParseJsonArray(payload) {
  if (!payload) return null;
  try {
    const trimmed = payload.trim();
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Failed to parse JSON array from model output', error);
    return null;
  }
}
