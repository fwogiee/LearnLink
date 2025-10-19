import express from 'express';
import Quiz from '../models/Quiz.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { owner, limit = 20, query } = req.query;
    const filters = {};
    if (owner === 'me') filters.owner = req.user._id;
    else if (owner) filters.owner = owner;
    if (query) filters.title = new RegExp(query, 'i');

    const quizzes = await Quiz.find(filters)
      .sort({ updatedAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100));
    res.json(quizzes);
  } catch (error) {
    console.error('List quizzes error', error);
    res.status(500).json({ message: 'Failed to fetch quizzes.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, questions = [] } = req.body || {};
    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ message: 'At least one question is required.' });
    }
    const quiz = await Quiz.create({ owner: req.user._id, title, description, questions });
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error', error);
    res.status(500).json({ message: 'Failed to create quiz.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    if (!quiz.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    res.json(quiz);
  } catch (error) {
    console.error('Get quiz error', error);
    res.status(500).json({ message: 'Failed to fetch quiz.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    if (!quiz.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted.' });
  } catch (error) {
    console.error('Delete quiz error', error);
    res.status(500).json({ message: 'Failed to delete quiz.' });
  }
});

export default router;
