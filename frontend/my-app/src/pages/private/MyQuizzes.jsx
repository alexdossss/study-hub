// frontend/src/pages/private/MyQuizzes.jsx
// filepath: c:\Project-Manabat\study-hub\frontend\my-app\src\pages\private\MyQuizzes.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CreateQuiz from '../../components/quiz/CreateQuiz';
import EditQuiz from '../../components/quiz/EditQuiz';
import QuizHistory from '../../components/quiz/QuizHistory';

export default function MyQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchQuizzes() {
    try {
      const { data } = await api.get('/quizzes');
      setQuizzes(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <a href="/home">Back</a>
        <h1 className="text-2xl font-semibold">My Quizzes</h1>
        <div>
          <button onClick={() => setShowCreate(true)} className="px-3 py-1 bg-blue-600 text-white rounded">Create / AI Generate</button>
        </div>
      </div>

      <div className="space-y-3">
        {quizzes.length === 0 && <p className="text-muted">No quizzes yet.</p>}
        {quizzes.map((q) => (
          <div key={q._id} className="p-3 border rounded flex justify-between items-start">
            <div>
              <h2 className="font-medium">{q.title}</h2>
              <p className="text-sm text-gray-600">{q.questions?.length || 0} questions</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => setEditing(q)} className="px-2 py-1 bg-yellow-400 rounded">Edit</button>
              <button
                onClick={async () => {
                  if (!confirm('Delete quiz?')) return;
                  try {
                    await api.delete(`/quizzes/${q._id}`);
                    fetchQuizzes();
                  } catch (err) {
                    console.error(err);
                    alert('Failed to delete');
                  }
                }}
                className="px-2 py-1 bg-red-500 text-white rounded"
              >
                Delete
              </button>

              {/* Take button: navigates to TakeQuiz page */}
              <button
                onClick={() => navigate(`/quizzes/take/${q._id}`)}
                className="px-2 py-1 bg-green-600 text-white rounded"
                title="Take this quiz"
                disabled={!q.questions || q.questions.length === 0}
              >
                Take
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateQuiz onClose={() => { setShowCreate(false); fetchQuizzes(); }} />}

      {editing && <EditQuiz quiz={editing} onClose={() => { setEditing(null); fetchQuizzes(); }} />}

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Quiz History</h3>
        <QuizHistory />
      </div>
    </div>
  );
}