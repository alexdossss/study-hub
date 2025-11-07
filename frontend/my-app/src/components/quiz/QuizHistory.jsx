// frontend/src/components/quiz/QuizHistory.jsx
// filepath: c:\Project-Manabat\study-hub\frontend\my-app\src\components\quiz\QuizHistory.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function QuizHistory() {
  const [history, setHistory] = useState([]);

  async function fetchHistory() {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      const { data } = await api.get(`/quizzes/history/${userId}`);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  if (history.length === 0) return <p className="text-sm text-gray-600">No quiz history.</p>;

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <div key={h._id} className="p-2 border rounded">
          <div className="flex justify-between">
            <div>
              <div className="font-medium">{h.title}</div>
              <div className="text-sm text-gray-600">{new Date(h.takenAt).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{h.score} / {h.total}</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}