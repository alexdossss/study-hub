import PomodoroSession from '../models/PomodoroSession.js';

/**
 * Start a pomodoro session
 * POST /api/pomodoro/start
 * body: { duration } // minutes: 10 | 20 | 60
 */
export async function startSession(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { duration } = req.body;
    const allowed = [10, 20, 60];
    const dur = Number(duration);
    if (!allowed.includes(dur)) {
      return res.status(400).json({ message: 'Invalid duration. Allowed: 10,20,60' });
    }

    // map duration -> break length
    const breakMap = { 10: 2, 20: 5, 60: 10 };
    const breakLength = breakMap[dur] || 5;

    const session = await PomodoroSession.create({
      user: userId,
      duration: dur,
      breakLength,
      status: 'running',
      startTime: new Date()
    });

    return res.status(201).json({ session: session.toSummary() });
  } catch (err) {
    console.error('startSession error:', err);
    return res.status(500).json({ message: 'Failed to start session' });
  }
}

/**
 * End a pomodoro session (or update progress)
 * POST /api/pomodoro/end
 * body: {
 *   sessionId,            // required
 *   status,               // optional: 'paused'|'onBreak'|'completed'
 *   endTime,              // optional timestamp
 *   focusSeconds,         // optional number to add/replace
 *   breakSeconds          // optional number to add/replace
 * }
 */
export async function endSession(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { sessionId, status, endTime, focusSeconds, breakSeconds } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' });

    const session = await PomodoroSession.findOne({ _id: sessionId, user: userId });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (typeof status === 'string') session.status = status;
    if (endTime) session.endTime = new Date(endTime);
    if (typeof focusSeconds === 'number') session.focusSeconds = focusSeconds;
    if (typeof breakSeconds === 'number') session.breakSeconds = breakSeconds;

    // if marking complete and no endTime provided, set it now
    if (session.status === 'completed' && !session.endTime) {
      session.endTime = new Date();
    }

    await session.save();
    return res.json({ session: session.toSummary() });
  } catch (err) {
    console.error('endSession error:', err);
    return res.status(500).json({ message: 'Failed to update/end session' });
  }
}

/**
 * Get pomodoro history for the authenticated user
 * GET /api/pomodoro/history
 */
export async function getHistory(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const sessions = await PomodoroSession.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const list = sessions.map((s) => ({
      id: s._id,
      duration: s.duration,
      breakLength: s.breakLength,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime,
      focusSeconds: s.focusSeconds,
      breakSeconds: s.breakSeconds,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    return res.json({ sessions: list });
  } catch (err) {
    console.error('getHistory error:', err);
    return res.status(500).json({ message: 'Failed to fetch history' });
  }
}

export default {
  startSession,
  endSession,
  getHistory
};