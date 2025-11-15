import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

/**
 * SharedItemsList
 * Props:
 *  - items: array from GET /spaces/:id/shared/items
 *  - spaceId
 *  - currentUserId
 *  - adminId (optional) - space admin id
 *  - onUnshared(): callback to refresh parent list
 */
export default function SharedItemsList({ items = [], spaceId, currentUserId, adminId = null, onUnshared = () => {} }) {
  const navigate = useNavigate();

  async function handleUnshare(item) {
    if (!confirm('Unshare this item from the space?')) return;
    try {
      await api.post(`/spaces/${spaceId}/unshare`, { kind: item.kind, refId: item.refId });
      alert('Unshared');
      onUnshared();
    } catch (err) {
      console.error('unshare failed', err);
      alert(err?.response?.data?.message || 'Failed to unshare');
    }
  }

  function renderAction(item) {
    if (item.kind === 'note') {
      const noteId = item.payload?.id || item.refId;
      return (
        <button onClick={() => navigate(`/notes/${noteId}`)} className="px-2 py-1 text-sm bg-indigo-600 text-white rounded">View</button>
      );
    }
    if (item.kind === 'flashcard') {
      return (
        <button onClick={() => navigate(`/flashcards/deck/${item.refId}`)} className="px-2 py-1 text-sm bg-indigo-600 text-white rounded">Study</button>
      );
    }
    if (item.kind === 'quiz') {
      return (
        <button onClick={() => navigate(`/quizzes/take/${item.refId}`)} className="px-2 py-1 text-sm bg-indigo-600 text-white rounded">Take Quiz</button>
      );
    }
    return null;
  }

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-2">Shared Resources</h4>
      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No shared items yet.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const sid = `${it.kind}-${it.refId}`;
            const sharedByName = it.sharedByUser?.name || it.sharedByUser?.username || (it.sharedByUser ? 'Member' : 'User');
            const canUnshare = String(it.sharedBy) === String(currentUserId) || (adminId && String(adminId) === String(currentUserId));
            return (
              <li key={sid} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">{it.kind}</div>
                  <div className="font-medium">{it.meta?.title || it.payload?.title || 'Shared Item'}</div>
                  <div className="text-xs text-gray-500">By {sharedByName} · {it.sharedAt ? new Date(it.sharedAt).toLocaleString() : ''}</div>
                </div>

                <div className="flex items-center gap-2">
                  {renderAction(it)}
                  {canUnshare ? (
                    <button onClick={() => handleUnshare(it)} className="px-2 py-1 text-sm bg-red-100 text-red-700 rounded">Unshare</button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}