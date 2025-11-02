// backend/routes/aiRoutes.js
// filepath: c:\Project-Manabat\study-hub\backend\routes\aiRoutes.js
import express from 'express';
import multer from 'multer';
import { generateFlashcards } from '../controllers/aiController.js';

const router = express.Router();

// allow uploads up to 10MB
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/generate-flashcards', upload.single('file'), generateFlashcards);

export default router;