import express from 'express';
import {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  createTask,
  getTasksByDate,
  updateTask,
  deleteTask,
  getAllTasks, // <-- add this import
} from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// EVENTS
router.post('/events', protect, createEvent);
router.get('/events', protect, getEvents); // optional ?date=YYYY-MM-DD
router.put('/events/:id', protect, updateEvent);
router.delete('/events/:id', protect, deleteEvent);

// TASKS
router.post('/tasks', protect, createTask);
router.get('/tasks', protect, getTasksByDate); // ?date=YYYY-MM-DD
router.get('/tasks/all', protect, getAllTasks); // <-- new route for fetching all tasks
router.put('/tasks/:id', protect, updateTask);
router.delete('/tasks/:id', protect, deleteTask);

export default router;