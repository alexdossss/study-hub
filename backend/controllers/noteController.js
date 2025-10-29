import Note from '../models/noteModel.js';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';  // Add this import for file operations

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
}).single('file');

// Create note
export const createNote = asyncHandler(async (req, res) => {
  const handleCreate = async () => {
    const { title, description, type, docsUrl } = req.body;
    
    if (!title || !type) {
      res.status(400);
      throw new Error('Please provide all required fields');
    }

    const noteData = {
      user: req.user._id,
      title,
      description,
      type,
      isPublic: false
    };

    if (type === 'file' && req.file) {
      noteData.fileUrl = req.file.path;
    } else if (type === 'google_docs' && docsUrl) {
      if (!docsUrl.startsWith('https://docs.google.com')) {
        res.status(400);
        throw new Error('Invalid Google Docs URL');
      }
      noteData.docsUrl = docsUrl;
    }

    const note = await Note.create(noteData);
    res.status(201).json(note);
  };

  upload(req, res, async (err) => {
    if (err) {
      res.status(400);
      throw new Error(err.message);
    }
    await handleCreate();
  });
});

// Get all notes
export const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ user: req.user._id });
  res.json(notes);
});

// Get note by ID
export const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id
  });
  
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  
  res.json(note);
});

// Update note
export const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id
  });
  
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  
  if (req.body.type === 'file' && req.file) {
    // Delete old file if exists
    if (note.fileUrl) {
      fs.unlinkSync(note.fileUrl);
    }
    note.fileUrl = req.file.path;
  }
  
  note.title = req.body.title || note.title;
  note.description = req.body.description || note.description;
  if (req.body.type === 'google_docs') {
    note.docsUrl = req.body.docsUrl || note.docsUrl;
  }
  
  const updatedNote = await note.save();
  res.json(updatedNote);
});

// Delete note
export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id
  });
  
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  
  if (note.type === 'file' && note.fileUrl) {
    fs.unlinkSync(note.fileUrl);
  }
  
  await note.deleteOne();
  res.json({ message: 'Note deleted successfully' });
});

// Toggle publish state
export const togglePublish = asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    user: req.user._id
  });
  
  if (!note) {
    res.status(404).json({ message: 'Note not found' });
  }
  
  note.isPublic = !note.isPublic;
  const updatedNote = await note.save();
  
  res.json(updatedNote);
});

// @desc    Get all public notes
// @route   GET /api/notes/public
// @access  Private
export const getPublicNotes = asyncHandler(async (req, res) => {
  const publicNotes = await Note.find({ isPublic: true })
    .populate('user', 'username')
    .sort({ createdAt: -1 });
  
  if (!publicNotes || publicNotes.length === 0) {
    return res.status(200).json([]); // Return empty array instead of error
  }

  res.json(publicNotes);
});