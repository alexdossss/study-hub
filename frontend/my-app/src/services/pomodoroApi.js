import api from './api';

/**
 * pomodoroApi
 * Helper wrappers for Pomodoro backend endpoints.
 * - startSession(duration) -> POST /api/pomodoro/start
 * - endSession(payload)    -> POST /api/pomodoro/end
 * - getHistory()           -> GET  /api/pomodoro/history
 */

async function startSession(duration) {
  try {
    const { data } = await api.post('/pomodoro/start', { duration });
    return data.session;
  } catch (err) {
    console.error('pomodoroApi.startSession error', err);
    throw err?.response?.data || err;
  }
}

async function endSession(payload) {
  // payload: { sessionId, status?, endTime?, focusSeconds?, breakSeconds? }
  try {
    const { data } = await api.post('/pomodoro/end', payload);
    return data.session;
  } catch (err) {
    console.error('pomodoroApi.endSession error', err);
    throw err?.response?.data || err;
  }
}

async function getHistory() {
  try {
    const { data } = await api.get('/pomodoro/history');
    return data.sessions || [];
  } catch (err) {
    console.error('pomodoroApi.getHistory error', err);
    throw err?.response?.data || err;
  }
}

export default {
  startSession,
  endSession,
  getHistory
};