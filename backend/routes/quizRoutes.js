import express from 'express';
import * as quizController from '../controllers/quizController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected quiz routes — use the exported protect middleware function
router.post('/ai-generate', protect, quizController.aiGenerateQuiz);
router.post('/', protect, quizController.createQuiz);
router.get('/', protect, quizController.getQuizzes);
router.get('/:id', protect, quizController.getQuizById);
router.put('/:id', protect, quizController.updateQuiz);
router.delete('/:id', protect, quizController.deleteQuiz);

// History and recording
router.post('/history/record', protect, quizController.recordQuizResult);
router.get('/history/:userId', protect, quizController.getQuizHistory);

export default router;