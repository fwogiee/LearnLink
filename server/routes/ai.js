import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createFlashcardsFromText } from '../utils/learningAnalysis.js';

const router = express.Router();

router.use(requireAuth);

router.post('/flashcards', async (req, res) => {
  try {
    const { topic, count = 5 } = req.body || {};
    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic is required.' });
    }

    const cards = await createFlashcardsFromText(topic, count);
    const formatted = cards.map((card, index) => ({
      id: index,
      term: card.term,
      definition: card.definition,
    }));
    res.json({ cards: formatted });
  } catch (error) {
    console.error('AI flashcards error', error);
    res.status(500).json({ message: 'Failed to generate flashcards.' });
  }
});

export default router;
