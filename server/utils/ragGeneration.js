import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.2;

let client;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

function extractTextFromResponse(response) {
  const candidate = response?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const textParts = parts.map((part) => part?.text).filter(Boolean);
  return textParts.join('').trim();
}

function logFinishReason(response) {
  const reason = response?.candidates?.[0]?.finishReason;
  if (reason) {
    console.log(`RAG finishReason: ${reason}`);
  }
}

export async function generateRagAnswer({ prompt, systemInstruction, model } = {}) {
  if (!prompt?.trim()) {
    throw new Error('Prompt is required.');
  }

  const ai = getClient();
  const response = await ai.models.generateContent({
    model: model || process.env.GEMINI_RAG_MODEL || DEFAULT_MODEL,
    contents: prompt,
    systemInstruction,
    config: {
      temperature: Number(process.env.GEMINI_RAG_TEMPERATURE) || DEFAULT_TEMPERATURE,
      maxOutputTokens: Number(process.env.GEMINI_RAG_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
    },
  });

  logFinishReason(response);
  return extractTextFromResponse(response);
}

export const ragGenerationDefaults = {
  model: DEFAULT_MODEL,
  maxOutputTokens: DEFAULT_MAX_TOKENS,
  temperature: DEFAULT_TEMPERATURE,
};
