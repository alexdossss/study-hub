// frontend/src/components/quiz/EditQuiz.jsx
// filepath: c:\Project-Manabat\study-hub\frontend\my-app\src\components\quiz\EditQuiz.jsx
import React, { useState } from 'react';
import api from '../../services/api';

export default function EditQuiz({ quiz, onClose }) {
  const [local, setLocal] = useState({ ...quiz });
  const [loading, setLoading] = useState(false);

  function updateQuestion(i, field, value) {
    setLocal((s) => {
      const copy = { ...s };
      copy.questions = copy.questions.map((q, idx) => idx === i ? ({ ...q, [field]: value }) : q);
      return copy;
    });
  }

  async function save() {
    setLoading(true);
    try {
      await api.put(`/quizzes/${local._id}`, { title: local.title, questions: local.questions, description: local.description });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4">
      <div className="bg-white rounded shadow max-w-3xl w-full p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Edit Quiz</h2>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>

        <div className="space-y-3">
          <input value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} className="w-full p-2 border rounded" />
          {local.questions.map((q, i) => (
            <div key={i} className="p-2 border rounded">
              <input value={q.questionText} onChange={(e) => updateQuestion(i, 'questionText', e.target.value)} className="w-full p-1 border rounded mb-2" />
              <div className="grid grid-cols-2 gap-2">
                {q.choices.map((c, ci) => (
                  <input key={ci} value={c} onChange={(e) => {
                    const newChoices = [...q.choices]; newChoices[ci] = e.target.value;
                    updateQuestion(i, 'choices', newChoices);
                  }} className="p-1 border rounded" />
                ))}
              </div>
              <input value={q.correctAnswer} onChange={(e) => updateQuestion(i, 'correctAnswer', e.target.value)} placeholder="Correct answer text" className="w-full p-1 border rounded mt-2" />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={save} disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}