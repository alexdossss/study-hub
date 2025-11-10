import mongoose from 'mongoose';

/**
 * Message
 * - space: ref to Space
 * - user: ref to User (sender)
 * - text: message content
 * - meta: optional (e.g., system flags, attachments)
 *
 * Timestamps enabled for createdAt.
 */
const MessageSchema = new mongoose.Schema(
  {
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, trim: true, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    edited: { type: Boolean, default: false }
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

// helper to return lightweight payload
MessageSchema.methods.toPayload = function () {
  return {
    id: this._id,
    space: this.space,
    user: this.user,
    text: this.text,
    meta: this.meta,
    edited: this.edited,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// get recent messages for a space
MessageSchema.statics.recentForSpace = async function (spaceId, limit = 50) {
  return this.find({ space: spaceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name username email')
    .lean();
};

const Message = mongoose.model('Message', MessageSchema);
export default Message;