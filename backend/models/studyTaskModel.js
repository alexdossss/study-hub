import mongoose from 'mongoose';

const studyTaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const StudyTask = mongoose.model('StudyTask', studyTaskSchema);
export default StudyTask;