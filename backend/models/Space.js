import mongoose from 'mongoose';

/**
 * Study Space
 * - title, description
 * - isPublic: listed publicly (true)
 * - admin: User who created the space
 * - members: array of user references with role metadata
 * - joinRequests: users who requested to join
 * - sharedContent: generic references to SharedNote / Flashcard / Quiz items
 *
 * Timestamps are enabled.
 */
const SpaceMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const SharedContentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['note', 'flashcard', 'quiz'], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // id of the shared item
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed } // optional extra metadata
  },
  { _id: true }
);

const SpaceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    isPublic: { type: Boolean, default: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [SpaceMemberSchema], default: [] },
    joinRequests: { type: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, requestedAt: Date }], default: [] },
    sharedContent: { type: [SharedContentSchema], default: [] }
  },
  { timestamps: true }
);

/**
 * Add a member (user) to the space. If already exists, no-op.
 * role defaults to 'member'.
 */
SpaceSchema.methods.addMember = function (userId, role = 'member') {
  const exists = this.members.some((m) => String(m.user) === String(userId));
  if (!exists) {
    this.members.push({ user: userId, role, joinedAt: new Date() });
  }
  // remove from joinRequests if present
  this.joinRequests = (this.joinRequests || []).filter((r) => String(r.user) !== String(userId));
  return this.save();
};

/**
 * Remove member by user id.
 */
SpaceSchema.methods.removeMember = function (userId) {
  this.members = (this.members || []).filter((m) => String(m.user) !== String(userId));
  return this.save();
};

/**
 * Request to join: add user to joinRequests if not already a member/requested
 */
SpaceSchema.methods.requestJoin = function (userId) {
  const isMember = this.members.some((m) => String(m.user) === String(userId));
  const alreadyRequested = (this.joinRequests || []).some((r) => String(r.user) === String(userId));
  if (isMember) return this; // no-op
  if (!alreadyRequested) {
    this.joinRequests.push({ user: userId, requestedAt: new Date() });
  }
  return this.save();
};

/**
 * Share content into space
 * kind: 'note'|'flashcard'|'quiz'
 * refId: ObjectId of the shared item
 */
SpaceSchema.methods.shareContent = function (kind, refId, sharedBy, meta = {}) {
  this.sharedContent = this.sharedContent || [];
  this.sharedContent.push({ kind, refId, sharedBy, sharedAt: new Date(), meta });
  return this.save();
};

/**
 * Summary object to return to clients
 */
SpaceSchema.methods.toSummary = function () {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    isPublic: this.isPublic,
    admin: this.admin,
    memberCount: (this.members || []).length,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Space = mongoose.model('Space', SpaceSchema);
export default Space;