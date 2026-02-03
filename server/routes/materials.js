import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import FlashcardSet from '../models/FlashcardSet.js';
import Quiz from '../models/Quiz.js';
import LearningMaterial from '../models/LearningMaterial.js';
import { requireAuth } from '../middleware/auth.js';
import { indexMaterialInBackground } from '../utils/ragIndexing.js';
import {
  summarizeMaterialText,
  createFlashcardsFromText,
  createQuizFromText,
  buildDerivedTitle,
} from '../utils/learningAnalysis.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-()]/g, '_');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'material'));
    }
  },
}).single('material');

function extractErrorMessage(error) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return 'File too large. Maximum size is 50MB.';
    if (error.code === 'LIMIT_UNEXPECTED_FILE') return 'Unsupported file type. Please upload PDF or TXT files.';
    return error.message;
  }
  return error.message || 'Upload failed.';
}

router.post('/upload', requireAuth, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: extractErrorMessage(err) });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided.' });
    }

    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const { className, classColor } = req.body;

    // Validate classColor if provided
    if (classColor && !/^#[0-9A-Fa-f]{6}$/.test(classColor)) {
      return res.status(400).json({ message: 'Invalid color format. Use hex format (#RRGGBB).' });
    }

    try {
      const content = await extractFileContent(filePath, mimetype);

      const material = await LearningMaterial.create({
        originalName: originalname,
        storedName: filename,
        mimeType: mimetype,
        size,
        content,
        user: req.user._id,
        className: className?.trim() || 'Uncategorized',
        classColor: classColor || '#3b82f6',
        ragStatus: 'indexing',
      });

      indexMaterialInBackground(material._id);
      return res.status(201).json(summarizeMaterial(material));
    } catch (error) {
      console.error('Failed to process uploaded material', error);
      return res.status(500).json({ message: 'Failed to process uploaded material.' });
    }
  });
});

router.get('/', requireAuth, async (req, res) => {
  const materials = await LearningMaterial.find({ user: req.user._id }).sort({ createdAt: -1 }).select('-content');
  res.json(materials.map(summarizeMaterial));
});

router.get('/:id', requireAuth, async (req, res) => {
  const material = await LearningMaterial.findById(req.params.id);

  if (!material) {
    return res.status(404).json({ message: 'Material not found.' });
  }

  if (material.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You are not allowed to view this material.' });
  }

  res.json(detailMaterial(material));
});

router.post('/:id/analyze', requireAuth, async (req, res) => {
  const { action, count } = req.body || {};
  if (!['summary', 'flashcards', 'quiz'].includes(action)) {
    return res.status(400).json({ message: 'Unknown analysis action.' });
  }

  const material = await LearningMaterial.findById(req.params.id);
  if (!material) {
    return res.status(404).json({ message: 'Material not found.' });
  }

  if (material.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You are not allowed to analyze this material.' });
  }

  let text = material.content?.trim();
  if (!text) {
    const filePath = path.join(uploadsDir, material.storedName);
    text = await extractFileContent(filePath, material.mimeType);
    material.content = text;
    await material.save();
  }

  if (!text) {
    return res.status(400).json({ message: 'No extracted text available for analysis.' });
  }

  try {
    if (action === 'summary') {
      const summary = await summarizeMaterialText(material.originalName, text);
      material.summary = summary;
      material.analysisUpdatedAt = new Date();
      await material.save();
      return res.json({ action: 'summary', summary });
    }

    if (action === 'flashcards') {
      const cards = await createFlashcardsFromText(text, count);
      if (!cards.length) {
        throw new Error('No flashcards generated.');
      }

      const title = buildDerivedTitle(material.originalName, 'Flashcards');
      const description = 'Automatically generated from learning material.';

      let set;
      if (material.flashcardSet) {
        set = await FlashcardSet.findById(material.flashcardSet);
        if (set) {
          set.cards = cards;
          set.title = set.title || title;
          set.description = set.description || description;
          await set.save();
        }
      }

      if (!set) {
        set = await FlashcardSet.create({
          owner: req.user._id,
          title,
          description,
          cards,
        });
      }

      material.flashcardSet = set._id;
      material.analysisUpdatedAt = new Date();
      await material.save();

      return res.json({ action: 'flashcards', set: { _id: set._id, title: set.title } });
    }

    if (action === 'quiz') {
      const questions = await createQuizFromText(text, count);
      if (!questions.length) {
        throw new Error('No quiz questions generated.');
      }

      const title = buildDerivedTitle(material.originalName, 'Quiz');
      const description = 'Automatically generated from learning material.';

      let quiz = material.quiz ? await Quiz.findById(material.quiz) : null;
      if (quiz) {
        quiz.questions = questions;
        quiz.title = quiz.title || title;
        quiz.description = quiz.description || description;
        await quiz.save();
      } else {
        quiz = await Quiz.create({
          owner: req.user._id,
          title,
          description,
          questions,
        });
      }

      material.quiz = quiz._id;
      material.analysisUpdatedAt = new Date();
      await material.save();

      return res.json({ action: 'quiz', quiz: { _id: quiz._id, title: quiz.title } });
    }

    return res.status(400).json({ message: 'Unsupported action.' });
  } catch (error) {
    console.error('Analysis error', error);
    res.status(500).json({ message: error.message || 'Failed to analyze material.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const material = await LearningMaterial.findById(req.params.id);

  if (!material) {
    return res.status(404).json({ message: 'Material not found.' });
  }

  if (material.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You are not allowed to delete this material.' });
  }

  const fileToDelete = path.join(uploadsDir, material.storedName);
  try {
    await fsp.unlink(fileToDelete);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Failed to delete uploaded file', error);
    }
  }

  await LearningMaterial.deleteOne({ _id: material._id });
  res.json({ message: 'Material deleted.' });
});

async function extractFileContent(filePath, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      const buffer = await fsp.readFile(filePath);
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    }

    if (mimeType === 'text/plain') {
      const text = await fsp.readFile(filePath, 'utf8');
      return text.trim();
    }
  } catch (error) {
    console.warn(`Failed to extract content from ${filePath}`, error);
  }

  return '';
}

function summarizeMaterial(material) {
  return {
    id: material._id.toString(),
    originalName: material.originalName,
    mimeType: material.mimeType,
    size: material.size,
    createdAt: material.createdAt,
    fileUrl: `/uploads/${material.storedName}`,
    hasSummary: Boolean(material.summary),
    flashcardSetId: material.flashcardSet ? material.flashcardSet.toString() : null,
    quizId: material.quiz ? material.quiz.toString() : null,
    className: material.className || '',
    classColor: material.classColor || '#3b82f6',
    ragStatus: material.ragStatus || 'idle',
    ragUpdatedAt: material.ragUpdatedAt ?? null,
  };
}

function detailMaterial(material) {
  const summary = summarizeMaterial(material);
  return {
    ...summary,
    content: material.content ?? '',
    summary: material.summary || '',
  };
}

export default router;
