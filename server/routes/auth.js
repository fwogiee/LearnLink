import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../utils/tokens.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    const normalized = username.trim().toLowerCase();
    const existing = await User.findOne({ username: normalized });
    if (existing) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username: normalized, passwordHash, role: role === 'admin' ? 'admin' : 'user' });
    const token = signToken(user);
    return res.status(201).json({ token, role: user.role, username: user.username });
  } catch (error) {
    console.error('Register error', error);
    return res.status(500).json({ message: 'Failed to register.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }
    const normalized = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalized });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = signToken(user);
    return res.json({ token, role: user.role, username: user.username });
  } catch (error) {
    console.error('Login error', error);
    return res.status(500).json({ message: 'Failed to login.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.safe });
});

export default router;
