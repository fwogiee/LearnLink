import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDb from './utils/connectDb.js';
import authRoutes from './routes/auth.js';
import setsRoutes from './routes/sets.js';
import quizzesRoutes from './routes/quizzes.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import materialsRoutes from './routes/materials.js'; // Import the new routes

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_ORIGIN, credentials: false }));
app.use(morgan('dev'));

// IMPORTANT: Register materials route BEFORE express.json()
// because it uses multer for file uploads (multipart/form-data)
app.use('/materials', materialsRoutes);

// Now apply JSON parser for other routes
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/sets', setsRoutes);
app.use('/quizzes', quizzesRoutes);
app.use('/ai', aiRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found.' });
});

// Error handling middleware - must be after all routes
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
