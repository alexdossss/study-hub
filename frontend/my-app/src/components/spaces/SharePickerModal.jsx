import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

/**
 * SharePickerModal
 * Props:
 *  - type: 'note' | 'flashcard' | 'quiz'
 *  - spaceId: id of the space to share into
 *  - onClose(): close modal
 *  - onShared(item): called after successful share (optional)
 *
 * Shows user's private resources of the given type and lets them share one into the space.
 */
export default function SharePickerModal({ type = 'note', spaceId, onClose = () => {}, onShared = () => {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    fetchMyItems();
    // eslint-disable-next-line
  }, [type]);

  async function fetchMyItems() {
    setLoading(true);
    setError('');
    try {
      let url = '/notes?mine=true';
      if (type === 'flashcard') url = '/flashcards?mine=true';
      if (type === 'quiz') url = '/quizzes?mine=true';
      const { data } = await api.get(url);
      // Normalize arrays from different endpoints
      const list = Array.isArray(data.notes) ? data.notes
        : Array.isArray(data.decks) ? data.decks
        : Array.isArray(data.quizzes) ? data.quizzes
        : Array.isArray(data) ? data : (data.items || []);
      setItems(list);
    } catch (err) {
      console.error('fetchMyItems failed', err);
      setError(err?.response?.data?.message || 'Failed to load your items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare(item) {
    if (!spaceId) return alert('Space id missing');
    setSharingId(item._id || item.id || item.deckId || item.quizId);
    try {
      if (type === 'note') {
        await api.post(`/spaces/${spaceId}/share/note`, { noteRef: item._id || item.id });
      } else if (type === 'flashcard') {
        await api.post(`/spaces/${spaceId}/share/flashcard`, { deckId: item._id || item.id });
      } else if (type === 'quiz') {
        await api.post(`/spaces/${spaceId}/share/quiz`, { quizId: item._id || item.id });
      }
      onShared(item);
      alert('Shared successfully');
      onClose();
    } catch (err) {
      console.error('share failed', err);
      alert(err?.response?.data?.message || 'Failed to share');
    } finally {
      setSharingId(null);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Share your {type === 'note' ? 'Notes' : type === 'flashcard' ? 'Flashcards' : 'Quizzes'}</h3>
            <button onClick={onClose} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">Close</button>
          </div>

          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

          {loading ? (
            <div className="text-sm text-gray-500">Loading your items...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-500">No items found in your private collection.</div>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {items.map((it) => {
                const id = it._id || it.id;
                const title = it.title || it.name || it.deckName || it.quizTitle || `Item ${id}`;
                const subtitle = type === 'note' ? (it.description || it.excerpt || '') :
                  type === 'flashcard' ? `${(it.cards || it.cardsCount || []).length || it.cardCount || 0} cards` :
                  `${(it.questions || it.questionsCount || []).length || it.questionCount || 0} questions`;
                return (
                  <li key={id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{title}</div>
                      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
                    </div>
                    <div>
                      <button
                        onClick={() => handleShare(it)}
                        disabled={String(sharingId) === String(id)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-60"
                      >
                        {String(sharingId) === String(id) ? 'Sharing...' : 'Share'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 text-right">
            <button onClick={onClose} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}