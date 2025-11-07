import Quiz from '../models/Quiz.js';
import QuizHistory from '../models/QuizHistory.js';
import { generateQuizFromText } from '../utils/openaiClient.js';

function requireAuth(req, res) {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Create a quiz manually
 */
export async function createQuiz(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const { title, description, questions } = req.body;
    const userId = req.user.id;

    const quiz = await Quiz.create({ title, description, questions: questions || [], userId });
    return res.status(201).json(quiz);
  } catch (err) {
    console.error('createQuiz error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to create quiz' });
  }
}

/**
 * Generate a quiz using OpenAI
 */
export async function aiGenerateQuiz(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const userId = req.user.id;
    const { contextText, numQuestions, title } = req.body;

    if (!contextText || typeof contextText !== 'string') {
      return res.status(400).json({ message: 'contextText (string) is required' });
    }

    const generated = await generateQuizFromText(contextText, numQuestions || 5);

    const quizDoc = await Quiz.create({
      title: title || generated.title || 'AI Generated Quiz',
      description: `AI generated from user context`,
      questions: generated.questions,
      userId
    });

    return res.status(201).json(quizDoc);
  } catch (err) {
    console.error('aiGenerateQuiz error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to generate quiz' });
  }
}

/**
 * Get all quizzes for user
 */
export async function getQuizzes(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const userId = req.user.id;
    const quizzes = await Quiz.find({ userId }).sort({ createdAt: -1 });
    return res.json(quizzes);
  } catch (err) {
    console.error('getQuizzes error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
}

/**
 * Get single quiz
 */
export async function getQuizById(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const userId = req.user.id;
    const quiz = await Quiz.findOne({ _id: req.params.id, userId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    return res.json(quiz);
  } catch (err) {
    console.error('getQuizById error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to fetch quiz' });
  }
}

/**
 * Update quiz (title, questions)
 */
export async function updateQuiz(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const userId = req.user.id;
    const updates = req.body;
    const quiz = await Quiz.findOneAndUpdate({ _id: req.params.id, userId }, updates, { new: true });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    return res.json(quiz);
  } catch (err) {
    console.error('updateQuiz error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to update quiz' });
  }
}

/**
 * Delete quiz
 */
export async function deleteQuiz(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const userId = req.user.id;
    const deleted = await Quiz.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: 'Quiz not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteQuiz error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to delete quiz' });
  }
}

/**
 * Record quiz result / save history
 */
export async function recordQuizResult(req, res) {
  try {
    if (!requireAuth(req, res)) return;
    const userId = req.user.id;
    const { quizId, answers = [] } = req.body; // answers: [{ questionText, selectedAnswer, correctAnswer }]
    if (!Array.isArray(answers) || typeof quizId === 'undefined') {
      return res.status(400).json({ message: 'quizId and answers[] required' });
    }

    const total = answers.length;
    const score = answers.reduce((acc, a) => acc + (a.selectedAnswer === a.correctAnswer ? 1 : 0), 0);

    const history = await QuizHistory.create({
      userId,
      quizId,
      title: req.body.title || 'Completed Quiz',
      score,
      total,
      answers
    });

    return res.status(201).json(history);
  } catch (err) {
    console.error('recordQuizResult error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to record history' });
  }
}

/**
 * Get quiz history for a user
 */
export async function getQuizHistory(req, res) {
  try {
    // Use authenticated user's id from token instead of trusting a URL param
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const history = await QuizHistory.find({ userId }).sort({ takenAt: -1 });
    return res.json(history);
  } catch (err) {
    console.error('getQuizHistory error:', err?.stack || err);
    return res.status(500).json({ message: 'Failed to fetch quiz history' });
  }
}

export default {
  createQuiz,
  aiGenerateQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  recordQuizResult,
  getQuizHistory
};