import mongoose from 'mongoose';

const studyEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const StudyEvent = mongoose.model('StudyEvent', studyEventSchema);
export default StudyEvent;