import Note from '../models/noteModel.js';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import path from 'path';
import fs from 'fs';  // Add this import for file operations
import User from '../models/userModel.js'; // add this near top if not present

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

// Add this helper near the top of the file (after imports)
const buildGooglePreviewUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();

  // Document
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/) || url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch?.[1]) return `https://docs.google.com/document/d/${docMatch[1]}/preview`;

  // Spreadsheet
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch?.[1]) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;

  // Presentation / Slides
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/) || url.match(/\/slides\/presentation\/d\/([a-zA-Z0-9-_]+)/);
  if (slideMatch?.[1]) return `https://docs.google.com/presentation/d/${slideMatch[1]}/preview`;

  // Fallback: try replace /edit -> /preview for common edit links
  if (url.includes('docs.google.com') && url.includes('/edit')) {
    return url.replace('/edit', '/preview');
  }

  return url;
};

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

export const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ user: req.user._id });
  res.json(notes);
});

export const getNoteById = asyncHandler(async (req, res) => {
  try {
    const noteId = req.params.id;
    const note = await Note.findById(noteId).populate('user', 'username');

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const isPublic = !!(note.isPublic || note.published || note.public);

    const ownerId = (note.user && note.user._id) ? note.user._id.toString() : (note.owner ? note.owner.toString() : null);
    const requesterId = req.user && req.user._id ? req.user._id.toString() : null;

    if (!isPublic && !(ownerId && requesterId && ownerId === requesterId)) {
      return res.status(403).json({ message: 'Not authorized to view this note' });
    }

    const noteObj = note.toObject();

    if (noteObj.type === 'google_docs' && isPublic && ownerId !== requesterId) {
      if (noteObj.docsUrl) {
        const preview = buildGooglePreviewUrl(noteObj.docsUrl);
        if (preview) noteObj.docsUrl = preview;
      }
    }

    return res.json(noteObj);
  } catch (err) {
    console.error('getNoteById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export const updateNote = asyncHandler(async (req, res) => {

  upload(req, res, async (err) => {
    if (err) {
      console.error('Multer upload error in updateNote:', err);
      res.status(400);
      throw new Error(err.message || 'File upload error');
    }

    try {
      const note = await Note.findOne({
        _id: req.params.id,
        user: req.user._id
      });

      if (!note) {
        res.status(404);
        throw new Error('Note not found');
      }

      if (req.file) {
        if (note.fileUrl) {
          const oldPath = path.isAbsolute(note.fileUrl)
            ? note.fileUrl
            : path.join(process.cwd(), note.fileUrl);
          try {
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          } catch (e) {
            console.warn('Could not delete old file at', oldPath, e.message);
          }
        }
        note.fileUrl = req.file.path;
        note.type = 'file';
      } else if (req.body.type === 'google_docs') {
        note.docsUrl = req.body.docsUrl || note.docsUrl;
        note.type = 'google_docs';
      }

      note.title = req.body.title ?? note.title;
      note.description = req.body.description ?? note.description;

      const updatedNote = await note.save();
      res.json(updatedNote);
    } catch (error) {
      console.error('updateNote error:', error);
      res.status(500);
      throw error;
    }
  });
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
    return res.status(200).json([]);
  }

  const result = publicNotes.map(n => {
    const o = n.toObject();
    if (o.type === 'google_docs' && o.docsUrl) {
      const preview = buildGooglePreviewUrl(o.docsUrl);
      if (preview) o.docsUrl = preview;
    }
    return o;
  });

  res.json(result);
});

// Add bookmark a public note
export const addBookmark = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const note = await Note.findById(noteId);
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  // only allow bookmarking public notes
  const isPublic = !!(note.isPublic || note.published || note.public);
  if (!isPublic) {
    res.status(403);
    throw new Error('Cannot bookmark a private note');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // avoid duplicates
  const already = user.bookmarks?.some(b => String(b) === String(noteId));
  if (!already) {
    user.bookmarks = user.bookmarks ? [...user.bookmarks, noteId] : [noteId];
    await user.save();
  }

  // return updated bookmarks (populated)
  const populated = await User.findById(req.user._id).populate({
    path: 'bookmarks',
    populate: { path: 'user', select: 'username' },
  });

  res.json(populated.bookmarks || []);
});

// Remove bookmark
export const removeBookmark = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.bookmarks = (user.bookmarks || []).filter(b => String(b) !== String(noteId));
  await user.save();

  const populated = await User.findById(req.user._id).populate({
    path: 'bookmarks',
    populate: { path: 'user', select: 'username' },
  });

  res.json(populated.bookmarks || []);
});

// Get current user's bookmarked notes
export const getUserBookmarks = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'bookmarks',
    populate: { path: 'user', select: 'username' },
    options: { sort: { createdAt: -1 } }
  });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json(user.bookmarks || []);
});