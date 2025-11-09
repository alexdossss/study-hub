import mongoose from 'mongoose';

const PomodoroSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    duration: { type: Number, required: true }, // work duration in minutes (10,20,60)
    breakLength: { type: Number, required: true }, // break duration in minutes (2,5,10)
    status: {
      type: String,
      enum: ['started', 'running', 'paused', 'onBreak', 'completed'],
      default: 'started'
    },
    startTime: { type: Date },
    endTime: { type: Date },
    focusSeconds: { type: Number, default: 0 }, // accumulated focused seconds
    breakSeconds: { type: Number, default: 0 }  // accumulated break seconds
  },
  { timestamps: true }
);

PomodoroSessionSchema.methods.toSummary = function () {
  return {
    id: this._id,
    user: this.user,
    duration: this.duration,
    breakLength: this.breakLength,
    status: this.status,
    startTime: this.startTime,
    endTime: this.endTime,
    focusSeconds: this.focusSeconds,
    breakSeconds: this.breakSeconds,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const PomodoroSession = mongoose.model('PomodoroSession', PomodoroSessionSchema);
export default PomodoroSession;