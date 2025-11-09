import React, { useEffect, useRef, useState } from 'react';
import pomodoroApi from '../../services/pomodoroApi';

/**
 * PomodoroTimer
 * Props:
 *  - session: { id, duration, breakLength, status }
 *  - onSessionUpdate(payload) -> called to persist updates to backend
 *  - onReset() -> called when parent wants to clear local session state
 *
 * Behavior:
 *  - Runs a work timer (duration minutes) then automatically switches to break (breakLength minutes).
 *  - Supports pause/resume/reset/skip-to-break/end.
 *  - Accumulates focusSeconds & breakSeconds and calls onSessionUpdate on status changes / end.
 */
export default function PomodoroTimer({ session, onSessionUpdate, onReset }) {
  const workTotal = (session.duration || 10) * 60;
  const breakTotal = (session.breakLength || 2) * 60;

  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [remaining, setRemaining] = useState(workTotal);
  const [running, setRunning] = useState(true);
  const [accFocus, setAccFocus] = useState(0);
  const [accBreak, setAccBreak] = useState(0);
  const intervalRef = useRef(null);

  // initialize timer on mount or when session changes
  useEffect(() => {
    setMode('work');
    setRemaining(workTotal);
    setRunning(true);
    setAccFocus(0);
    setAccBreak(0);
  }, [session.id]); // eslint-disable-line

  // start/stop interval when running changes
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => r - 1);
        // accumulate appropriate counter
        if (mode === 'work') setAccFocus((s) => s + 1);
        else setAccBreak((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, mode]);

  // handle timer reaching zero
  useEffect(() => {
    if (remaining > 0) return;

    // finished current phase
    if (mode === 'work') {
      // switch to break
      setMode('break');
      setRemaining(breakTotal);
      setRunning(true);

      // persist intermediate update: finished work, now onBreak
      safeUpdateSession({
        status: 'onBreak',
        focusSeconds: accFocus
      });
      return;
    }

    if (mode === 'break') {
      // completed whole session
      setRunning(false);
      const endTime = new Date().toISOString();

      safeUpdateSession({
        status: 'completed',
        endTime,
        focusSeconds: accFocus,
        breakSeconds: accBreak
      });

      // optionally call onReset after a short delay so parent UI can show completion
      // keep session visible until user presses Reset
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]); // intentionally only watch remaining

  // helper to format seconds -> MM:SS
  function fmt(sec) {
    const m = Math.floor(Math.max(0, sec) / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(Math.max(0, sec) % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  // safe wrapper to call parent's onSessionUpdate and persist to backend
  async function safeUpdateSession(payload) {
    try {
      if (typeof onSessionUpdate === 'function') {
        await onSessionUpdate(payload);
      } else {
        // as fallback directly call API
        await pomodoroApi.endSession({
          sessionId: session.id,
          ...payload
        });
      }
    } catch (err) {
      console.error('Failed to persist session update', err);
    }
  }

  // user actions
  const handlePause = async () => {
    setRunning(false);
    await safeUpdateSession({ status: 'paused', focusSeconds: accFocus, breakSeconds: accBreak });
  };

  const handleResume = async () => {
    setRunning(true);
    await safeUpdateSession({ status: 'running', focusSeconds: accFocus, breakSeconds: accBreak });
  };

  const handleSkipToBreak = async () => {
    // move immediately to break phase
    setMode('break');
    setRemaining(breakTotal);
    setRunning(true);
    await safeUpdateSession({ status: 'onBreak', focusSeconds: accFocus });
  };

  const handleEnd = async () => {
    const ok = window.confirm('End session and save progress?');
    if (!ok) return;
    setRunning(false);
    const endTime = new Date().toISOString();
    await safeUpdateSession({
      status: 'completed',
      endTime,
      focusSeconds: accFocus,
      breakSeconds: accBreak
    });
    if (typeof onReset === 'function') onReset();
  };

  const handleReset = async () => {
    const ok = window.confirm('Reset session locally? This will discard current progress. To save progress End the session.');
    if (!ok) return;
    // do not persist as reset means discard
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (typeof onReset === 'function') onReset();
  };

  // UI progress percent
  const totalForMode = mode === 'work' ? workTotal : breakTotal;
  const progress = Math.min(100, Math.round(((totalForMode - remaining) / totalForMode) * 100));

  return (
    <div className="w-full max-w-lg text-center p-6">
      <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow">
        <div className="text-sm text-gray-500 mb-2">Mode</div>
        <div className="text-2xl font-semibold mb-2">{mode === 'work' ? 'Focus' : 'Break'}</div>

        <div className="text-6xl font-mono my-4">{fmt(remaining)}</div>

        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-4">
          <div
            className="h-2 bg-indigo-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-3 mb-3">
          {running ? (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-400 rounded text-white shadow"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-600 rounded text-white shadow"
            >
              Resume
            </button>
          )}

          <button
            onClick={handleSkipToBreak}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
            disabled={mode === 'break'}
            title="Skip remaining focus and start break"
          >
            Skip to Break
          </button>

          <button
            onClick={handleEnd}
            className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            End & Save
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>Accumulated Focus: {(accFocus / 60).toFixed(1)} min</div>
          <div>Accumulated Break: {(accBreak / 60).toFixed(1)} min</div>
        </div>

        <div className="mt-4">
          <button onClick={handleReset} className="text-xs text-gray-500 underline">Reset (discard)</button>
        </div>
      </div>
    </div>
  );
}