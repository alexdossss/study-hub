// backend/models/Quiz.js
const mongoose = require('mongoose');

const ChoiceSchema = new mongoose.Schema({
  text: { type: String, required: true }
});

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  choices: { type: [String], required: true }, // array of choice strings
  correctAnswer: { type: String, required: true }
});

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    questions: { type: [QuestionSchema], default: [] },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', QuizSchema);