import asyncHandler from 'express-async-handler';
import StudyEvent from '../models/studyEventModel.js';
import StudyTask from '../models/studyTaskModel.js';

// Create event
export const createEvent = asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate } = req.body;
  if (!title || !startDate || !endDate) {
    res.status(400);
    throw new Error('title, startDate and endDate are required');
  }
  const ev = await StudyEvent.create({
    user: req.user._id,
    title,
    description: description || '',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
  res.status(201).json(ev);
});

// Get events (optionally filter by date query param YYYY-MM-DD)
export const getEvents = asyncHandler(async (req, res) => {
  const dateStr = req.query.date;
  if (!dateStr) {
    const events = await StudyEvent.find({ user: req.user._id }).sort({ startDate: 1 });
    return res.json(events);
  }

  const dayStart = new Date(dateStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr);
  dayEnd.setHours(23, 59, 59, 999);

  // events that overlap the day: start <= dayEnd && end >= dayStart
  const events = await StudyEvent.find({
    user: req.user._id,
    startDate: { $lte: dayEnd },
    endDate: { $gte: dayStart },
  }).sort({ startDate: 1 });

  res.json(events);
});

// Update event (mark complete or update fields)
export const updateEvent = asyncHandler(async (req, res) => {
  const ev = await StudyEvent.findById(req.params.id);
  if (!ev) {
    res.status(404);
    throw new Error('Event not found');
  }
  if (String(ev.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to modify this event');
  }

  const { title, description, startDate, endDate, isCompleted } = req.body;
  if (title !== undefined) ev.title = title;
  if (description !== undefined) ev.description = description;
  if (startDate !== undefined) ev.startDate = new Date(startDate);
  if (endDate !== undefined) ev.endDate = new Date(endDate);
  if (isCompleted !== undefined) ev.isCompleted = isCompleted;

  await ev.save();
  res.json(ev);
});

// Delete event
export const deleteEvent = asyncHandler(async (req, res) => {
  const ev = await StudyEvent.findById(req.params.id);
  if (!ev) {
    res.status(404);
    throw new Error('Event not found');
  }
  if (String(ev.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to delete this event');
  }
  await StudyEvent.deleteOne({ _id: req.params.id });
  res.json({ message: 'Event removed' });
});

// Create task
export const createTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate } = req.body;
  if (!title || !dueDate) {
    res.status(400);
    throw new Error('title and dueDate are required');
  }
  const task = await StudyTask.create({
    user: req.user._id,
    title,
    description: description || '',
    dueDate: new Date(dueDate),
  });
  res.status(201).json(task);
});

// Get tasks for a specific date (query param date=YYYY-MM-DD)
export const getTasksByDate = asyncHandler(async (req, res) => {
  const dateStr = req.query.date;
  if (!dateStr) {
    res.status(400);
    throw new Error('date query parameter is required (YYYY-MM-DD)');
  }
  const dayStart = new Date(dateStr);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateStr);
  dayEnd.setHours(23, 59, 59, 999);

  const tasks = await StudyTask.find({
    user: req.user._id,
    dueDate: { $gte: dayStart, $lte: dayEnd },
  }).sort({ isCompleted: 1, dueDate: 1 });

  res.json(tasks);
});

// Get all tasks for authenticated user
export const getAllTasks = asyncHandler(async (req, res) => {
  const tasks = await StudyTask.find({ user: req.user._id }).sort({ dueDate: 1 });
  res.json(tasks);
});

// Update task (mark complete, change title/description/dueDate)
export const updateTask = asyncHandler(async (req, res) => {
  const task = await StudyTask.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  if (String(task.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to modify this task');
  }

  const { title, description, dueDate, isCompleted } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = new Date(dueDate);
  if (isCompleted !== undefined) task.isCompleted = isCompleted;

  await task.save();
  res.json(task);
});

// Delete task
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await StudyTask.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  if (String(task.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to delete this task');
  }
  await StudyTask.deleteOne({ _id: req.params.id });
  res.json({ message: 'Task removed' });
});

export default {
  createEvent,
  getEvents,
  updateEvent,
  deleteEvent,
  createTask,
  getTasksByDate,
  getAllTasks,
  updateTask,
  deleteTask,
};