import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function TakeQuiz() {
  const { id } = useParams(); // expects route like /quizzes/take/:id
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]); // store selected choice index per question
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get(`/quizzes/${id}`);
        setQuiz(data);
        setAnswers(new Array(data.questions?.length || 0).fill(null));
        setError('');
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  function selectChoice(qIndex, choiceIndex) {
    setAnswers((a) => {
      const next = [...a];
      next[qIndex] = choiceIndex;
      return next;
    });
  }

  function handleNext() {
    if (current < (quiz.questions.length - 1)) setCurrent((c) => c + 1);
  }

  function handlePrev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function computeResults() {
    if (!quiz) return;
    let s = 0;
    quiz.questions.forEach((q, i) => {
      const selIdx = answers[i];
      const selected = typeof selIdx === 'number' ? q.choices?.[selIdx] : undefined;
      // prefer string comparison with correctAnswer, fallback to index if provided
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

  function handleExit() {
    // if quiz in progress and any answer given ask to confirm
    const hasProgress = answers.some((a) => a !== null && typeof a !== 'undefined');
    if (!finished && hasProgress) {
      if (!window.confirm('Exit quiz? Your progress will be lost.')) return;
    }
    navigate('/my-quizzes');
  }

  if (loading) return <div className="p-4">Loading quiz...</div>;
  if (error) return (
    <div className="p-4">
      <div className="text-red-600 mb-2">{error}</div>
      <button onClick={() => navigate(-1)} className="px-3 py-1 bg-gray-200 rounded">Back</button>
    </div>
  );
  if (!quiz) return <div className="p-4">Quiz not found.</div>;

  const total = quiz.questions?.length || 0;

  if (finished) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-semibold">{quiz.title || 'Quiz Results'}</h2>
          <button onClick={handleExit} className="px-3 py-1 bg-gray-100 rounded">Exit</button>
        </div>

        <div className="mb-4">
          <div className="text-lg">Score: <span className="font-bold">{score}</span> / {quiz.questions?.length || 0}</div>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((q, i) => {
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
          <button onClick={() => { setFinished(false); setAnswers(new Array(quiz.questions.length).fill(null)); setCurrent(0); setScore(0); }} className="px-3 py-1 bg-yellow-400 rounded">Retake</button>
          <button onClick={handleExit} className="px-3 py-1 bg-blue-600 text-white rounded">Back to My Quizzes</button>
        </div>
      </div>
    );
  }

  // current question view
  const question = quiz.questions[current];
  const selectedIndex = answers[current];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">{quiz.title || 'Take Quiz'}</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600">Question {current + 1} / {quiz.questions?.length || 0}</div>
          <button onClick={handleExit} className="px-2 py-1 bg-gray-100 rounded ml-4">Exit</button>
        </div>
      </div>

      <div className="p-4 border rounded mb-3">
        <div className="font-medium mb-3">{question.questionText}</div>
        <div className="space-y-2">
          {question.choices?.map((c, ci) => (
            <label key={ci} className="flex items-center gap-3 p-2 border rounded cursor-pointer">
              <input
                type="radio"
                name={`q-${current}`}
                checked={selectedIndex === ci}
                onChange={() => selectChoice(current, ci)}
              />
              <div>{c}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={handlePrev} disabled={current === 0} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Previous</button>
        {current < (quiz.questions.length - 1) ? (
          <button onClick={handleNext} disabled={answers[current] == null} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">Next</button>
        ) : (
          <button onClick={computeResults} disabled={answers[current] == null} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50">Submit</button>
        )}

        <button onClick={handleExit} className="ml-auto px-3 py-1 bg-gray-100 rounded">Cancel</button>
      </div>
    </div>
  );
}