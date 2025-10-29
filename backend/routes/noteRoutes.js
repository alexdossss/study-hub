import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  togglePublish,
  getPublicNotes
} from '../controllers/noteController.js';

const router = express.Router();

// Most specific routes first
router.get('/public', protect, getPublicNotes);
router.put('/:id/publish', protect, togglePublish);

// Then the generic CRUD routes
router.route('/')
  .post(protect, createNote)
  .get(protect, getNotes);

router.route('/:id')
  .get(protect, getNoteById)
  .put(protect, updateNote)
  .delete(protect, deleteNote);

export default router;