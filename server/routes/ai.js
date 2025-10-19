import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.post('/flashcards', async (req, res) => {
  try {
    const { topic, count = 5 } = req.body || {};
    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic is required.' });
    }

    const desired = Math.min(Math.max(Number(count) || 5, 3), 20);
    const cards = await generateFlashcards(topic, desired);
    res.json({ cards });
  } catch (error) {
    console.error('AI flashcards error', error);
    res.status(500).json({ message: 'Failed to generate flashcards.' });
  }
});

async function generateFlashcards(topic, count) {
  const apiKey = process.env.TOGETHER_AI_API;
  if (!apiKey) {
    return buildFallbackCards(topic, count);
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.TOGETHER_AI_MODEL || 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise study flashcards in JSON.',
          },
          {
            role: 'user',
            content: `Create ${count} flashcards for the topic "${topic}". Return JSON array with objects containing term, definition, and example fields.`,
          },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Together API error', await response.text());
      return buildFallbackCards(topic, count);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return buildFallbackCards(topic, count);

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return buildFallbackCards(topic, count);
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed
      .filter(Boolean)
      .slice(0, count)
      .map((card, index) => ({
        id: index,
        term: card.term || card.front || card.word || `Concept ${index + 1}`,
        definition: card.definition || card.back || '',
        example: card.example || card.usage || '',
      }));
  } catch (error) {
    console.error('Together API failure', error);
    return buildFallbackCards(topic, count);
  }
}

function buildFallbackCards(topic, count) {
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    cards.push({
      id: i,
      term: `${topic} concept ${i + 1}`,
      definition: `Key idea ${i + 1} related to ${topic}.`,
      example: `Example usage ${i + 1} illustrating ${topic}.`,
    });
  }
  return cards;
}

export default router;
