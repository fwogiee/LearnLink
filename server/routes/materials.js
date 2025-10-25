import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import pdfPoppler from 'pdf-poppler';
const { convert } = pdfPoppler;

import { requireAuth } from '../middleware/auth.js';
import LearningMaterial from '../models/LearningMaterial.js';

const router = express.Router();

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('Created uploads directory at:', UPLOADS_DIR);
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log('Created temp directory at:', TEMP_DIR);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    allowed.includes(file.mimetype) 
      ? cb(null, true) 
      : cb(new Error('Invalid file type. Only PDF and TXT files are allowed.'), false);
  }
});

async function attemptOCR(filePath, filename) {
  try {
    const opts = {
      format: 'png',
      out_dir: TEMP_DIR,
      out_prefix: path.basename(filename, path.extname(filename)),
      page: 1
    };
    await convert(filePath, opts);
    const imagePath = path.join(TEMP_DIR, `${opts.out_prefix}-1.png`);
    
    if (fs.existsSync(imagePath)) {
      console.log(`Running OCR on ${imagePath}...`);
      const { data: ocrData } = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => console.log(`[OCR]: ${m.status} (${(m.progress * 100).toFixed(1)}%)`)
      });
      fs.unlinkSync(imagePath);
      console.log(`OCR extracted ${ocrData.text?.length || 0} characters.`);
      return ocrData.text || '';
    }
  } catch (error) {
    console.error('OCR failed:', error.message);
  }
  return '';
}

async function extractText(filePath, mimetype, originalname, filename) {
  if (mimetype === 'text/plain') {
    console.log(`Processing TXT: ${originalname}`);
    const text = fs.readFileSync(filePath, 'utf8');
    console.log(`  - Text length: ${text.length} chars`);
    return text;
  }

  if (mimetype === 'application/pdf') {
    console.log(`Processing PDF: ${originalname}`);
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      let text = data.text || '';
      
      console.log(`PDF Info: ${originalname}`);
      console.log(`  - Pages: ${data.numpages}`);
      console.log(`  - Text length: ${text.length} chars`);

      if (text.trim().length < 100 && data.numpages > 0) {
        console.log('Minimal text found, attempting OCR...');
        const ocrText = await attemptOCR(filePath, filename);
        if (ocrText) text = ocrText;
      }
      
      return text;
    } catch (error) {
      console.error(`Error processing PDF ${originalname}:`, error.message);
      return '';
    }
  }

  return '';
}

function cleanupFile(filePath, filename) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filename}`);
    } catch (err) {
      console.error(`Failed to cleanup ${filename}:`, err);
    }
  }
}

router.use(requireAuth);

router.post('/upload', (req, res) => {
  upload.single('material')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
      const { originalname, path: filePath, mimetype, filename } = req.file;
      const content = await extractText(filePath, mimetype, originalname, filename);
      
      const material = await LearningMaterial.create({
        originalName: originalname,
        path: `/uploads/${filename}`,
        mimeType: mimetype,
        content: content.trim(),
        owner: req.user._id
      });

      const { content: _, ...response } = material.toObject();
      res.status(201).json(response);
    } catch (error) {
      console.error('File processing error:', error);
      cleanupFile(req.file.path, req.file.filename);
      res.status(500).json({ message: 'Server error during file processing.' });
    }
  });
});

router.get('/', async (req, res) => {
  try {
    const materials = await LearningMaterial.find({ owner: req.user._id })
      .select('-content -path')
      .sort({ createdAt: -1 });
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Server error fetching materials.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found.' });
    }
    if (!material.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: You do not own this material.' });
    }
    res.json(material);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid material ID format.' });
    }
    console.error(`Error fetching material ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error fetching material details.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found.' });
    }
    if (!material.owner.equals(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden: You do not own this material.' });
    }

    const filename = path.basename(material.path);
    const fullPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`Deleted file: ${fullPath}`);
      } catch (err) {
        console.error(`Failed to delete file ${fullPath}:`, err);
      }
    }

    await LearningMaterial.findByIdAndDelete(req.params.id);
    res.json({ message: 'Material deleted successfully.' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid material ID format.' });
    }
    console.error(`Error deleting material ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error deleting material.' });
  }
});

export default router;
