// frontend/my-app/src/components/pomodoro/BookmarkModal.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

/**
 * BookmarkModal
 * - Lists user's bookmarked notes
 * - Opens notes in app (navigates to /notes/:id) and closes modal
 *
 * Props:
 *  - onClose(): function to close the modal
 */
export default function BookmarkModal({ onClose }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fetchBookmarks();
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchBookmarks() {
    setLoading(true);
    try {
      // try likely endpoints used elsewhere in app
      let res;
      try {
        res = await api.get('/notes/bookmarks');
      } catch (err) {
        res = await api.get('/bookmarks');
      }
      const data = res?.data || [];
      // normalize array
      setBookmarks(Array.isArray(data) ? data : data.bookmarks || []);
    } catch (err) {
      console.error('Failed to load bookmarks', err);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }

  function openNote(id) {
    if (!id) return;
    onClose?.();
    navigate(`/notes/${id}`);
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-semibold">Bookmarked Notes</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            Close
          </button>
        </div>

        <div className="p-4 h-[70vh] overflow-auto">
          {loading ? (
            <div className="text-center text-gray-500">Loading bookmarks...</div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center text-gray-500">No bookmarks found.</div>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((b) => (
                <li key={b._id || b.id} className="p-3 border rounded flex items-start justify-between">
                  <div className="flex-1 pr-3">
                    <div className="font-medium">{b.title || b.name || 'Untitled'}</div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-3">{(b.content || b.body || b.text || '').slice(0, 200)}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openNote(b._id || b.id)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded"
                    >
                      Open
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}