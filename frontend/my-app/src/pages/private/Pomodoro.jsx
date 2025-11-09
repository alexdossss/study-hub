import React, { useState } from 'react';
import PomodoroTimer from '../../components/pomodoro/PomodoroTimer';
import NotesModal from '../../components/pomodoro/NotesModal';
import FlashcardsModal from '../../components/pomodoro/FlashcardsModal';
import QuizModal from '../../components/pomodoro/QuizModal';
import BookmarkModal from '../../components/pomodoro/BookmarkModal';
import pomodoroApi from '../../services/pomodoroApi';

export default function Pomodoro() {
  const [session, setSession] = useState(null); // { id, duration, breakLength, ... }
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const durations = [
    { label: '10 min (2 min break)', minutes: 10 },
    { label: '20 min (5 min break)', minutes: 20 },
    { label: '1 hour (10 min break)', minutes: 60 }
  ];

  async function handleStart(minutes) {
    setStarting(true);
    try {
      const sess = await pomodoroApi.startSession(minutes);
      setSession(sess);
    } catch (err) {
      console.error('Failed to start session', err);
      alert('Failed to start session');
    } finally {
      setStarting(false);
    }
  }

  async function handleEndUpdate(payload) {
    // payload: { sessionId, status, endTime, focusSeconds, breakSeconds }
    try {
      if (!session || !session.id) return;
      const body = { sessionId: session.id, ...payload };
      const updated = await pomodoroApi.endSession(body);
      setSession(updated);
    } catch (err) {
      console.error('Failed to update session', err);
    }
  }

  // helper to ensure only one modal open at a time
  function openOnly(modalSetter) {
    // close all first
    setIsNotesOpen(false);
    setIsFlashOpen(false);
    setIsQuizOpen(false);
    setIsBookmarkOpen(false);
    // open requested
    modalSetter(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timer Column */}
        <div className="md:col-span-2 flex flex-col items-center justify-center">
          {!session ? (
            <div className="w-full max-w-md text-center">
              <a href="/home">Back</a>
              <h1 className="text-2xl font-semibold mb-4">Pomodoro Focus Mode</h1>
              <p className="text-sm text-gray-600 mb-4">Choose a focus duration to begin.</p>
              <div className="space-y-3">
                {durations.map((d) => (
                  <button
                    key={d.minutes}
                    disabled={starting}
                    onClick={() => handleStart(d.minutes)}
                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <PomodoroTimer
              session={session}
              onSessionUpdate={handleEndUpdate}
              onReset={() => setSession(null)}
            />
          )}
        </div>

        {/* Tools Column */}
        <div className="space-y-4 flex flex-col items-stretch">
          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Study Tools</h3>
            <p className="text-sm text-gray-600 mb-3">Quickly open notes, flashcards, or quizzes without leaving focus mode.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => openOnly(setIsNotesOpen)}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
              >
                Notes
              </button>
              <button
                onClick={() => openOnly(setIsFlashOpen)}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
              >
                Flashcards
              </button>
              <button
                onClick={() => openOnly(setIsQuizOpen)}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
              >
                Quizzes
              </button>
              <button
                onClick={() => openOnly(setIsBookmarkOpen)}
                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-left"
              >
                Bookmarks
              </button>
            </div>
          </div>

          <div className="p-4 border rounded text-sm text-gray-600">
            <div className="font-medium mb-2">Session Info</div>
            {session ? (
              <>
                <div>Duration: {session.duration} min</div>
                <div>Break: {session.breakLength} min</div>
                <div>Status: {session.status}</div>
              </>
            ) : (
              <div>No active session</div>
            )}
          </div>

          <div className="p-4 border rounded text-xs text-gray-500">
            Tip: Use the Pause button on the timer to briefly stop without ending the session.
          </div>
        </div>
      </div>

      {/* Modals - only one can be opened at a time via openOnly() */}
      {isNotesOpen && <NotesModal onClose={() => setIsNotesOpen(false)} />}
      {isFlashOpen && <FlashcardsModal onClose={() => setIsFlashOpen(false)} />}
      {isQuizOpen && <QuizModal onClose={() => setIsQuizOpen(false)} />}
      {isBookmarkOpen && <BookmarkModal onClose={() => setIsBookmarkOpen(false)} />}
    </div>
  );
}