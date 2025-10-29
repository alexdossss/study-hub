import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['file', 'google_docs'],
    required: true
  },
  fileUrl: String,
  docsUrl: String,
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Note = mongoose.model('Note', noteSchema);
export default Note;