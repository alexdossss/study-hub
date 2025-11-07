// backend/models/QuizHistory.js
const mongoose = require('mongoose');

const AnswerRecordSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  selectedAnswer: { type: String },
  correctAnswer: { type: String },
  correct: { type: Boolean, required: true }
});

const QuizHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    title: { type: String },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    answers: { type: [AnswerRecordSchema], default: [] }
  },
  { timestamps: { createdAt: 'takenAt' } }
);

module.exports = mongoose.model('QuizHistory', QuizHistorySchema);