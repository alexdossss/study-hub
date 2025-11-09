import express from 'express';
import * as pomodoroController from '../controllers/pomodoroController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Start a new pomodoro session
 * POST /api/pomodoro/start
 */
router.post('/start', protect, pomodoroController.startSession);

/**
 * Update / end a session
 * POST /api/pomodoro/end
 */
router.post('/end', protect, pomodoroController.endSession);

/**
 * Get history for authenticated user
 * GET /api/pomodoro/history
 */
router.get('/history', protect, pomodoroController.getHistory);

export default router;