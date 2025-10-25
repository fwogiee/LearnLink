import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse'; // Use ES module import
import Tesseract from 'tesseract.js';
// pdf-poppler might require adjustments depending on its export type, assuming default export works
// Consider error handling if 'convert' is not directly available this way
import pdfPoppler from 'pdf-poppler';
const { convert } = pdfPoppler; // Assuming 'convert' is exported correctly

import { requireAuth } from '../middleware/auth.js'; // Use LearnLink's auth middleware
import LearningMaterial from '../models/LearningMaterial.js'; // Use the new model location

const router = express.Router();

// Determine __dirname equivalent in ES modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Multer Configuration ---
const UPLOADS_DIR = path.join(__dirname, '../../uploads'); // Relative to this file's location
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

// Ensure uploads and temp directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitize filename and ensure uniqueness
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `${Date.now()}-${safeOriginalName}`);
    }
});

// File filter to allow only PDF and TXT
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept file
    } else {
        // Reject file with a specific error message
        cb(new Error('Invalid file type. Only PDF and TXT files are allowed.'), false);
    }
};

// Multer instance with limits and filter
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB size limit
    fileFilter
});

// --- Helper function to process uploads after multer ---
async function processUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        const { originalname, path: filePath, mimetype, filename } = req.file;
        let extractedText = '';

        // --- Text Extraction Logic ---
        if (mimetype === 'application/pdf') {
            console.log(`Processing PDF: ${originalname}`);
            try {
                // First try direct text extraction
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                extractedText = data.text || ''; // Ensure it's a string

                console.log(`📄 PDF Info: ${originalname}`);
                console.log(`  - Pages: ${data.numpages}`);
                console.log(`  - Text length: ${extractedText.length} chars`);

                // If very little text extracted and it looks like an image PDF, try OCR
                if (extractedText.trim().length < 100 && data.numpages > 0) {
                    console.log('⚠️ PDF has minimal text, attempting OCR on first page...');

                    // Convert first page of PDF to an image for OCR
                    const opts = {
                        format: 'png',
                        out_dir: TEMP_DIR,
                        out_prefix: path.basename(filename, path.extname(filename)),
                        page: 1 // Process only the first page for OCR attempt
                    };

                    // Check if pdfPoppler is installed and working
                    try {
                        await convert(filePath, opts); // Use await here
                        const imagePath = path.join(TEMP_DIR, `${opts.out_prefix}-1.png`);

                        if (fs.existsSync(imagePath)) {
                            console.log(`Running OCR on ${imagePath}...`);
                            const { data: ocrData } = await Tesseract.recognize(imagePath, 'eng', {
                                logger: m => console.log(`[OCR]: ${m.status} (${(m.progress * 100).toFixed(1)}%)`) // Log OCR progress
                            });
                            extractedText = ocrData.text || ''; // Fallback to empty string
                            console.log(`✅ OCR extracted ${extractedText.length} characters.`);
                            // Clean up temporary image file
                            fs.unlinkSync(imagePath);
                        } else {
                            console.log('Temporary image file not found after conversion.');
                        }
                    } catch (popplerError) {
                        console.error('❌ Failed to convert PDF page to image for OCR (pdf-poppler might be missing or misconfigured):', popplerError.message);
                        // Do not overwrite extractedText if conversion failed
                    }
                }
            } catch (pdfError) {
                console.error(`❌ Error processing PDF ${originalname}:`, pdfError.message);
                extractedText = ''; // Fallback to empty string on error
            }
        } else if (mimetype === 'text/plain') {
            console.log(`Processing TXT: ${originalname}`);
            extractedText = fs.readFileSync(filePath, 'utf8');
            console.log(`  - Text length: ${extractedText.length} chars`);
        }
        // --- End of Text Extraction ---

        // Save metadata and extracted text to database
        const newMaterial = new LearningMaterial({
            originalName: originalname,
            path: `/uploads/${filename}`, // Store relative path for potential future serving
            mimeType: mimetype,
            content: extractedText.trim(), // Store the extracted text
            owner: req.user._id // Associate with the logged-in user
        });

        await newMaterial.save();
        // Respond with the created material data (excluding large content field)
        const { content, ...responseData } = newMaterial.toObject();
        res.status(201).json(responseData);

    } catch (error) {
        console.error('❌ Server error during file processing:', error);
        // Clean up uploaded file if DB save fails
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
           try {
              fs.unlinkSync(req.file.path);
              console.log(`Cleaned up failed upload: ${req.file.filename}`);
           } catch (unlinkErr) {
               console.error(`Failed to cleanup file ${req.file.filename}:`, unlinkErr);
           }
        }
        res.status(500).json({ message: 'Server error during file processing.' });
    }
}


// --- Routes ---

// POST /materials/upload - Upload a new learning material
router.post('/upload', requireAuth, (req, res) => {
    // Use multer middleware first
    const uploader = upload.single('material'); // 'material' should match the FormData key

    uploader(req, res, function (err) {
        // Handle multer errors (like file size or type)
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
            }
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        } else if (err) {
            // Handle custom errors (like file type filter)
             console.error('Upload error:', err);
            return res.status(400).json({ message: err.message });
        }

        // If no multer error, proceed to process the file (extract text, save to DB)
        processUpload(req, res);
    });
});

// GET /materials - Get all learning materials for the logged-in user (metadata only)
router.get('/', requireAuth, async (req, res) => {
    try {
        // Fetch materials for the current user, excluding the large 'content' field
        const materials = await LearningMaterial.find({ owner: req.user._id })
            .select('-content -path') // Exclude content and path for list view
            .sort({ createdAt: -1 }); // Sort by newest first
        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials list:', error);
        res.status(500).json({ message: 'Server error fetching materials.' });
    }
});

// GET /materials/:id - Get a single learning material, including its content
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const material = await LearningMaterial.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found.' });
        }

        // Ensure the logged-in user owns this material before sending content
        if (!material.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this material.' });
        }

        // Respond with full material data, including content
        res.json(material);
    } catch (error) {
         if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid material ID format.' });
         }
        console.error(`Error fetching material ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error fetching material details.' });
    }
});

// DELETE /materials/:id - Delete a learning material
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const material = await LearningMaterial.findById(req.params.id);

        if (!material) {
            return res.status(404).json({ message: 'Material not found.' });
        }

        // Ensure the user owns this material before deleting
        if (!material.owner.equals(req.user._id)) {
            return res.status(403).json({ message: 'Forbidden: You do not own this material.' });
        }

        // Delete the physical file from the uploads directory
        // Use the filename stored in the path, assuming it's relative like '/uploads/filename.pdf'
        const filename = path.basename(material.path);
        const fullFilePath = path.join(UPLOADS_DIR, filename);

        if (fs.existsSync(fullFilePath)) {
            try {
                fs.unlinkSync(fullFilePath);
                console.log(`Deleted file: ${fullFilePath}`);
            } catch (unlinkErr) {
                // Log error but proceed with DB deletion anyway
                console.error(`Failed to delete file ${fullFilePath}:`, unlinkErr);
            }
        } else {
             console.log(`File not found, skipping delete: ${fullFilePath}`);
        }

        // Delete the record from the database
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

