import mongoose from 'mongoose';

/**
 * SharedNote
 * - Represents a note shared inside a Space.
 * - Keeps a lightweight snapshot (title/content) so shared items remain visible
 *   even if the original note changes or is deleted.
 *
 * Fields:
 *  - space: Space reference
 *  - noteRef: optional reference to original Note document
 *  - sharedBy: user who shared
 *  - title, content: snapshot of the shared note
 *  - meta: optional (e.g., source, tags)
 */
const SharedNoteSchema = new mongoose.Schema(
  {
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
    noteRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' }, // optional original note reference
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true },
    content: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

SharedNoteSchema.methods.toPayload = function () {
  return {
    id: this._id,
    space: this.space,
    noteRef: this.noteRef,
    sharedBy: this.sharedBy,
    title: this.title,
    content: this.content,
    meta: this.meta,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const SharedNote = mongoose.model('SharedNote', SharedNoteSchema);
export default SharedNote;