import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import studyRoutes from './routes/studyRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import quizRoutes from './routes/quizRoutes.js'; // <-- switched to ES import
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

dotenv.config();
const app = express();

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Add this middleware (replace 5173 with your dev port if different)
app.use((req, res, next) => {
  // Remove or relax X-Frame-Options (avoid SAMEORIGIN blocking cross-origin if iframe served from backend)
  res.removeHeader('X-Frame-Options');
  // Allow the frontend origin to embed backend-served files
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173");
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/study', studyRoutes);

// mount flashcards and AI endpoints
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiRoutes);

// register quiz routes (ES module import)
app.use('/api/quizzes', quizRoutes);

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
