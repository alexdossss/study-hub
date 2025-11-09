import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

/**
 * QuizModal (framer-motion removed for compatibility)
 * - Lists user's quizzes (via GET /api/quizzes)
 * - Lets user open a quiz inside the modal and take it (uses GET /api/quizzes/:id)
 * - Uses a portal and simple Tailwind transitions instead of framer-motion to avoid import issues.
 *
 * Props:
 *  - onClose(): close the modal
 */
export default function QuizModal({ onClose }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    fetchList();
    // lock scroll while modal open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function fetchList() {
    setLoadingList(true);
    try {
      const { data } = await api.get('/quizzes');
      setQuizzes(Array.isArray(data) ? data : data.quizzes || []);
    } catch (err) {
      console.error('Failed to load quizzes', err);
      setQuizzes([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function openQuiz(id) {
    try {
      const { data } = await api.get(`/quizzes/${id}`);
      const q = data;
      setSelectedQuiz(q);
      setAnswers(new Array(q.questions?.length || 0).fill(null));
      setCurrent(0);
      setFinished(false);
      setScore(0);
    } catch (err) {
      console.error('Failed to load quiz', err);
      alert('Failed to load quiz');
    }
  }

  function selectAnswer(qIndex, choiceIndex) {
    setAnswers((a) => {
      const next = [...a];
      next[qIndex] = choiceIndex;
      return next;
    });
  }

  function computeResults() {
    if (!selectedQuiz) return;
    let s = 0;
    selectedQuiz.questions.forEach((q, i) => {
      const selIdx = answers[i];
      const selected = typeof selIdx === 'number' ? q.choices?.[selIdx] : undefined;
      const correctString = q.correctAnswer;
      const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : undefined;
      let isCorrect = false;
      if (correctString && selected !== undefined) {
        isCorrect = String(selected).trim() === String(correctString).trim();
      } else if (typeof correctIndex === 'number' && typeof selIdx === 'number') {
        isCorrect = selIdx === correctIndex;
      }
      if (isCorrect) s++;
    });
    setScore(s);
    setFinished(true);
  }

  function exitQuiz() {
    setSelectedQuiz(null);
    setAnswers([]);
    setCurrent(0);
    setFinished(false);
    setScore(0);
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-4xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-150"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-semibold">Quizzes</h3>
          <div className="flex items-center gap-2">
            {selectedQuiz ? (
              <button onClick={exitQuiz} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Back to list</button>
            ) : null}
            <button onClick={onClose} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">Close</button>
          </div>
        </div>

        <div className="p-4 h-[70vh] overflow-auto">
          {!selectedQuiz ? (
            <div>
              {loadingList ? (
                <div className="text-center text-gray-500">Loading quizzes...</div>
              ) : quizzes.length === 0 ? (
                <div className="text-center text-gray-500">You have no quizzes.</div>
              ) : (
                <div className="space-y-2">
                  {quizzes.map((q) => (
                    <div key={q._id || q.id} className="p-3 border rounded flex items-start justify-between">
                      <div>
                        <div className="font-medium">{q.title || 'Untitled Quiz'}</div>
                        <div className="text-sm text-gray-600">{q.questions?.length || 0} questions</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openQuiz(q._id || q.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded"
                        >
                          Take
                        </button>
                        <button
                          onClick={() => {
                            // open quiz in a new tab as fallback
                            window.open(`/quizzes/take/${q._id || q.id}`, '_blank');
                          }}
                          className="px-3 py-1 bg-gray-100 rounded"
                        >
                          Open page
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Quiz runner inside modal */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Taking</div>
                  <div className="font-semibold">{selectedQuiz.title || 'Untitled Quiz'}</div>
                </div>
                <div className="text-sm text-gray-500">Q {current + 1} / {selectedQuiz.questions?.length || 0}</div>
              </div>

              {!finished ? (
                <>
                  <div className="p-4 border rounded mb-3">
                    <div className="font-medium mb-3">{selectedQuiz.questions[current]?.questionText}</div>
                    <div className="space-y-2">
                      {selectedQuiz.questions[current]?.choices?.map((c, ci) => (
                        <label key={ci} className="flex items-center gap-3 p-2 border rounded cursor-pointer">
                          <input
                            type="radio"
                            name={`q-${current}`}
                            checked={answers[current] === ci}
                            onChange={() => selectAnswer(current, ci)}
                          />
                          <div>{c}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrent((p) => Math.max(0, p - 1))}
                      disabled={current === 0}
                      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {current < (selectedQuiz.questions.length - 1) ? (
                      <button
                        onClick={() => setCurrent((p) => Math.min(selectedQuiz.questions.length - 1, p + 1))}
                        disabled={answers[current] == null}
                        className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={computeResults}
                        disabled={answers[current] == null}
                        className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                      >
                        Submit
                      </button>
                    )}

                    <div className="ml-auto">
                      <button onClick={exitQuiz} className="px-3 py-1 bg-gray-100 rounded">Exit</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="text-lg">Score: <span className="font-bold">{score}</span> / {selectedQuiz.questions.length}</div>
                  </div>

                  <div className="space-y-3">
                    {selectedQuiz.questions.map((q, i) => {
                      const selIdx = answers[i];
                      const selected = typeof selIdx === 'number' ? q.choices?.[selIdx] : null;
                      const correctString = q.correctAnswer;
                      const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : undefined;
                      const correctChoice = correctString ?? (typeof correctIndex === 'number' ? q.choices?.[correctIndex] : null);
                      const isCorrect = correctChoice != null && selected === correctChoice;
                      return (
                        <div key={i} className="p-3 border rounded">
                          <div className="font-medium">Q{i + 1}. {q.questionText}</div>
                          <div className="mt-2 space-y-1">
                            {q.choices?.map((c, ci) => {
                              const chosen = selIdx === ci;
                              const correct = (correctChoice !== null && String(c).trim() === String(correctChoice).trim());
                              return (
                                <div key={ci} className={`p-1 rounded ${correct ? 'bg-green-100' : chosen && !correct ? 'bg-red-100' : ''}`}>
                                  <span className="font-medium mr-2">{`#${ci + 1}`}</span>
                                  <span>{c}</span>
                                  {chosen && <span className="ml-3 text-sm text-gray-700"> (Your answer)</span>}
                                  {correct && <span className="ml-3 text-sm text-green-700"> (Correct)</span>}
                                </div>
                              );
                            })}
                          </div>
                          {!isCorrect && (
                            <div className="mt-2 text-sm text-red-600">You answered: <span className="font-medium">{selected ?? 'No answer'}</span></div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button onClick={() => { setFinished(false); setAnswers(new Array(selectedQuiz.questions.length).fill(null)); setCurrent(0); setScore(0); }} className="px-3 py-1 bg-yellow-400 rounded">Retake</button>
                    <button onClick={exitQuiz} className="px-3 py-1 bg-gray-100 rounded">Back to list</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}