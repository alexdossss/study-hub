import mongoose from 'mongoose';

/**
 * Member
 * Represents a membership request / record linking a user to a space.
 * This model is optional (Space.members also stores membership), but useful
 * for tracking request lifecycle, approvals, and queries.
 */
const MemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    status: { type: String, enum: ['requested', 'approved', 'rejected', 'left'], default: 'requested' },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    leftAt: { type: Date }
  },
  { timestamps: true }
);

MemberSchema.index({ user: 1, space: 1 }, { unique: true });

MemberSchema.methods.approve = function () {
  this.status = 'approved';
  this.approvedAt = new Date();
  return this.save();
};

MemberSchema.methods.reject = function () {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  return this.save();
};

MemberSchema.methods.leave = function () {
  this.status = 'left';
  this.leftAt = new Date();
  return this.save();
};

const Member = mongoose.model('Member', MemberSchema);
export default Member;