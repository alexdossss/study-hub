import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  togglePublish,
  getPublicNotes,
  addBookmark,
  removeBookmark,
  getUserBookmarks
} from '../controllers/noteController.js';

const router = express.Router();

// Most specific routes first
router.get('/public', protect, getPublicNotes);
router.put('/:id/publish', protect, togglePublish);

// Add bookmarks endpoints (must be before '/:id' routes)
router.get('/bookmarks', protect, getUserBookmarks);
router.post('/:id/bookmark', protect, addBookmark);
router.delete('/:id/bookmark', protect, removeBookmark);

// Then the generic CRUD routes
router.route('/')
  .post(protect, createNote)
  .get(protect, getNotes);

router.route('/:id')
  .get(protect, getNoteById)
  .put(protect, updateNote)
  .delete(protect, deleteNote);

export default router;