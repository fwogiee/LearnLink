import express from 'express';
import FlashcardSet from '../models/FlashcardSet.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { owner, limit = 20, query } = req.query;
    const filters = {};
    if (owner === 'me') {
      filters.owner = req.user._id;
    } else if (owner) {
      filters.owner = owner;
    }
    if (query) {
      filters.$text = { $search: query };
    }

    const sets = await FlashcardSet.find(filters)
      .sort({ updatedAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100))
      .select('title description owner updatedAt createdAt cards');

    const response = sets.map((set) => ({
      _id: set._id,
      title: set.title,
      description: set.description,
      owner: set.owner,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
      cardsCount: set.cards?.length || 0,
      cards: set.cards,
    }));

    res.json(response);
  } catch (error) {
    console.error('List sets error', error);
    res.status(500).json({ message: 'Failed to fetch sets.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, cards = [] } = req.body || {};
    const set = await FlashcardSet.create({ owner: req.user._id, title: title || '', description: description || '', cards });
    res.status(201).json(set);
  } catch (error) {
    console.error('Create set error', error);
    res.status(500).json({ message: 'Failed to create set.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const includeCards = String(req.query.includeCards).toLowerCase() === 'true';
    const set = await FlashcardSet.findById(req.params.id).select(includeCards ? undefined : '-cards');
    if (!set) {
      return res.status(404).json({ message: 'Set not found.' });
    }
    if (!set.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    res.json(includeCards ? set : set.toObject());
  } catch (error) {
    console.error('Get set error', error);
    res.status(500).json({ message: 'Failed to fetch set.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body || {};
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) return res.status(404).json({ message: 'Set not found.' });
    if (!set.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    if (title !== undefined) set.title = title;
    if (description !== undefined) set.description = description;
    await set.save();
    res.json(set);
  } catch (error) {
    console.error('Update set error', error);
    res.status(500).json({ message: 'Failed to update set.' });
  }
});

router.post('/:id/cards', async (req, res) => {
  try {
    const { cards = [] } = req.body || {};
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) return res.status(404).json({ message: 'Set not found.' });
    if (!set.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    set.cards = cards.map((card) => ({ term: card.term || '', definition: card.definition || '' }));
    await set.save();
    res.json({ message: 'Cards updated.', cards: set.cards });
  } catch (error) {
    console.error('Update cards error', error);
    res.status(500).json({ message: 'Failed to update cards.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id);
    if (!set) return res.status(404).json({ message: 'Set not found.' });
    if (!set.owner.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    await set.deleteOne();
    res.json({ message: 'Set deleted.' });
  } catch (error) {
    console.error('Delete set error', error);
    res.status(500).json({ message: 'Failed to delete set.' });
  }
});

export default router;