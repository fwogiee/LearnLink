import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import FlashcardSet from '../models/FlashcardSet.js';
import Quiz from '../models/Quiz.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/user-data', async (req, res) => {
  try {
    const username = (req.query.username || '').toString().trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [sets, cards, quizzes] = await Promise.all([
      FlashcardSet.find({ owner: user._id }).sort({ updatedAt: -1 }),
      FlashcardSet.aggregate([
        { $match: { owner: user._id } },
        { $unwind: '$cards' },
        {
          $project: {
            _id: '$cards._id',
            term: '$cards.term',
            definition: '$cards.definition',
            setId: { $toString: '$_id' },
          },
        },
      ]),
      Quiz.find({ owner: user._id }).sort({ updatedAt: -1 }),
    ]);

    const counts = {
      sets: sets.length,
      cards: cards.length,
      quizzes: quizzes.length,
    };

    res.json({ user: user.safe, sets, cards, quizzes, counts });
  } catch (error) {
    console.error('Admin user-data error', error);
    res.status(500).json({ message: 'Failed to fetch user data.' });
  }
});

router.delete('/delete/:username/set/:id', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const set = await FlashcardSet.findOne({ _id: req.params.id, owner: user._id });
    if (!set) return res.status(404).json({ message: 'Set not found.' });
    await set.deleteOne();
    res.json({ message: 'Set deleted.' });
  } catch (error) {
    console.error('Admin delete set error', error);
    res.status(500).json({ message: 'Failed to delete set.' });
  }
});

router.delete('/delete/:username/card/:id', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const set = await FlashcardSet.findOne({ owner: user._id, 'cards._id': req.params.id });
    if (!set) return res.status(404).json({ message: 'Card not found.' });
    set.cards = set.cards.filter((card) => card._id?.toString() !== req.params.id);
    await set.save();
    res.json({ message: 'Card deleted.' });
  } catch (error) {
    console.error('Admin delete card error', error);
    res.status(500).json({ message: 'Failed to delete card.' });
  }
});

router.delete('/delete/:username/quiz/:id', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const quiz = await Quiz.findOne({ _id: req.params.id, owner: user._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted.' });
  } catch (error) {
    console.error('Admin delete quiz error', error);
    res.status(500).json({ message: 'Failed to delete quiz.' });
  }
});

export default router;
