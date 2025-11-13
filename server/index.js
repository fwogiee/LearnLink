import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDb from './utils/connectDb.js';
import authRoutes from './routes/auth.js';
import setsRoutes from './routes/sets.js';
import quizzesRoutes from './routes/quizzes.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import materialsRoutes from './routes/materials.js';

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_ORIGIN, credentials: false }));
app.use(morgan('dev'));

app.use(express.json({ limit: '50mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/sets', setsRoutes);
app.use('/quizzes', quizzesRoutes);
app.use('/ai', aiRoutes);
app.use('/admin', adminRoutes);
app.use('/materials', materialsRoutes);
app.use('/uploads', express.static(uploadsDir));

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});


app.use((err, req, res, next) => {
  console.error('Error handler caught:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      message: 'Request too large. Maximum size is 50MB.' 
    });
  }
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error' 
  });
});

const PORT = Number(process.env.PORT) || 4000;

connectDb(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LearnLink API listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });
