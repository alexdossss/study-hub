// frontend/src/components/quiz/CreateQuiz.jsx
// filepath: c:\Project-Manabat\study-hub\frontend\my-app\src\components\quiz\CreateQuiz.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function CreateQuiz({ onClose }) {
  const [mode, setMode] = useState('manual'); // manual | ai
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { questionText: '', choices: ['', '', ''], correctIndex: 0 }
  ]);
  const [contextText, setContextText] = useState('');
  const [numQ, setNumQ] = useState(5);
  const [loading, setLoading] = useState(false);

  // resources for AI mode
  const [ownNotes, setOwnNotes] = useState([]);
  const [bookmarkedNotes, setBookmarkedNotes] = useState([]);
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [resourceTab, setResourceTab] = useState('own'); // 'own' | 'bookmarks' | 'manual'

  useEffect(() => {
    if (mode !== 'ai') return;
    async function fetchResources() {
      try {
        const [ownRes, bmRes] = await Promise.allSettled([
          api.get('/notes').catch(() => ({ data: [] })),
          api.get('/bookmarks').catch(() => api.get('/notes/bookmarks').catch(() => ({ data: [] })))
        ]);

        setOwnNotes(ownRes.status === 'fulfilled' ? ownRes.value.data || [] : []);
        setBookmarkedNotes(bmRes.status === 'fulfilled' ? bmRes.value.data || [] : []);
      } catch (err) {
        console.error('Failed to load note resources', err);
      }
    }
    fetchResources();
  }, [mode]);

  function addQuestion() {
    setQuestions((s) => [...s, { questionText: '', choices: ['', '', ''], correctIndex: 0 }]);
  }

  function updateQuestion(i, field, value) {
    setQuestions((s) => {
      const ns = [...s];
      ns[i] = { ...ns[i], [field]: value };
      return ns;
    });
  }

  function toggleSelectNote(id) {
    setSelectedNoteIds((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }

  async function buildContextFromSelected() {
    if (selectedNoteIds.size === 0) return contextText || '';
    const ids = Array.from(selectedNoteIds);
    const parts = [];
    for (const id of ids) {
      try {
        const { data } = await api.get(`/notes/${id}`);
        // try common fields for note content
        const content =
          (data && (data.content || data.body || data.text)) ||
          (data && data.note) ||
          (data && data.title ? `${data.title}\n${JSON.stringify(data)}` : JSON.stringify(data));
        parts.push(typeof content === 'string' ? content : JSON.stringify(content));
      } catch (err) {
        console.warn('Failed to fetch note', id, err);
        // skip if individual fetch fails
      }
    }
    // include manual contextText if present
    if (contextText) parts.unshift(contextText);
    return parts.join('\n\n---\n\n');
  }

  async function handleManualCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Normalize questions to include correctAnswer text expected by backend
      const payloadQuestions = questions.map((q) => {
        const ci = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
        const correctAnswer = q.choices?.[ci] ?? q.correctAnswer ?? q.choices?.[0] ?? '';
        return {
          questionText: q.questionText || '',
          choices: q.choices || ['', '', ''],
          correctAnswer
        };
      });

      await api.post('/quizzes', { title: title || 'Untitled Quiz', questions: payloadQuestions });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to create quiz');
    } finally {
      setLoading(false);
    }
  }

  async function handleAICreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const builtContext = await buildContextFromSelected();
      if (!builtContext || builtContext.trim().length === 0) {
        const ok = window.confirm('No context selected. Continue with empty context?');
        if (!ok) { setLoading(false); return; }
      }
      await api.post('/quizzes/ai-generate', {
        contextText: builtContext,
        numQuestions: numQ,
        title
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('AI generation failed');
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = selectedNoteIds.size;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4">
      <div className="bg-white rounded shadow max-w-3xl w-full p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Create Quiz</h2>
          <button onClick={onClose} className="text-gray-600">Close</button>
        </div>

        <div className="mb-3">
          <label className="mr-2">
            <input type="radio" checked={mode === 'manual'} onChange={() => setMode('manual')} /> Manual
          </label>
          <label className="ml-4">
            <input type="radio" checked={mode === 'ai'} onChange={() => setMode('ai')} /> AI Generate
          </label>
        </div>

        {mode === 'manual' ? (
          <form onSubmit={handleManualCreate} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" className="w-full p-2 border rounded" />
            {questions.map((q, i) => (
              <div key={i} className="p-2 border rounded">
                <input
                  value={q.questionText}
                  onChange={(e) => updateQuestion(i, 'questionText', e.target.value)}
                  placeholder={`Question ${i + 1}`}
                  className="w-full p-1 border rounded mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  {q.choices.map((c, ci) => (
                    <input
                      key={ci}
                      value={c}
                      onChange={(e) => {
                        const newChoices = [...q.choices];
                        newChoices[ci] = e.target.value;
                        updateQuestion(i, 'choices', newChoices);
                      }}
                      placeholder={`Choice ${ci + 1}`}
                      className="p-1 border rounded"
                    />
                  ))}
                </div>

                <div className="mt-2">
                  <div className="text-sm text-gray-700 mb-1">Correct choice</div>
                  <div className="flex items-center gap-3">
                    {q.choices.map((c, ci) => (
                      <label key={ci} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`correct-${i}`}
                          value={ci}
                          checked={q.correctIndex === ci}
                          onChange={() => updateQuestion(i, 'correctIndex', ci)}
                        />
                        <span className="whitespace-nowrap">{`#${ci + 1}`}{c ? ` — ${c}` : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={addQuestion} className="px-3 py-1 bg-gray-200 rounded">Add question</button>
              <button type="submit" disabled={loading} className="px-3 py-1 bg-blue-600 text-white rounded">Create</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAICreate} className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional quiz title" className="w-full p-2 border rounded" />

            <div className="border rounded p-2">
              <div className="flex items-center gap-3 mb-2">
                <button type="button" className={`px-2 py-1 rounded ${resourceTab === 'manual' ? 'bg-gray-200' : ''}`} onClick={() => setResourceTab('manual')}>Manual Context</button>
                <button type="button" className={`px-2 py-1 rounded ${resourceTab === 'own' ? 'bg-gray-200' : ''}`} onClick={() => setResourceTab('own')}>My Notes ({ownNotes.length})</button>
                <button type="button" className={`px-2 py-1 rounded ${resourceTab === 'bookmarks' ? 'bg-gray-200' : ''}`} onClick={() => setResourceTab('bookmarks')}>Bookmarked ({bookmarkedNotes.length})</button>
                <div className="ml-auto text-sm text-gray-600">Selected: {selectedCount}</div>
              </div>

              {resourceTab === 'manual' && (
                <textarea value={contextText} onChange={(e) => setContextText(e.target.value)} placeholder="Paste notes or text context here" rows={6} className="w-full p-2 border rounded" />
              )}

              {resourceTab === 'own' && (
                <div className="max-h-48 overflow-auto space-y-1">
                  {ownNotes.length === 0 ? <div className="text-sm text-gray-500">No notes found.</div> : ownNotes.map((n) => (
                    <label key={n._id || n.id} className="flex items-start gap-2 p-1 border-b">
                      <input type="checkbox" checked={selectedNoteIds.has(n._id || n.id)} onChange={() => toggleSelectNote(n._id || n.id)} />
                      <div>
                        <div className="font-medium">{n.title || n.name || 'Untitled'}</div>
                        <div className="text-xs text-gray-600">{(n.content || n.body || n.text || '').slice(0, 150)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {resourceTab === 'bookmarks' && (
                <div className="max-h-48 overflow-auto space-y-1">
                  {bookmarkedNotes.length === 0 ? <div className="text-sm text-gray-500">No bookmarked notes.</div> : bookmarkedNotes.map((n) => (
                    <label key={n._id || n.id} className="flex items-start gap-2 p-1 border-b">
                      <input type="checkbox" checked={selectedNoteIds.has(n._id || n.id)} onChange={() => toggleSelectNote(n._id || n.id)} />
                      <div>
                        <div className="font-medium">{n.title || n.name || 'Untitled'}</div>
                        <div className="text-xs text-gray-600">{(n.content || n.body || n.text || '').slice(0, 150)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label>Number of questions (1-20)</label>
              <input type="number" value={numQ} onChange={(e) => setNumQ(e.target.value)} min={1} max={20} className="w-20 p-1 border rounded" />
              <div className="ml-auto text-sm text-gray-600">You can combine manual text and selected notes.</div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded">Generate & Save</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}