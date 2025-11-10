import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ShareNoteModal
 * Props:
 *  - space: space object (optional) used for context
 *  - onClose(): close modal
 *  - onShare(payload): called with { noteRef?, title, content, meta? }
 *
 * This modal does not call the API directly; it delegates to onShare so the parent
 * (SpacesPage) can handle API / socket flow.
 */
export default function ShareNoteModal({ space = null, onClose = () => {}, onShare = () => {} }) {
  const [noteRef, setNoteRef] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim() && !content.trim()) {
      setError('Please provide a title or content to share.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        noteRef: noteRef || undefined,
        title: title.trim(),
        content: content.trim(),
        meta: { source: 'space', spaceId: space?._id || space?.id }
      };
      await onShare(payload);
    } catch (err) {
      console.error('Share failed', err);
      setError(err?.message || 'Failed to share note');
    } finally {
      setLoading(false);
      onClose();
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Share Note to {space?.title || 'Space'}</h3>
            <button type="button" onClick={onClose} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">Close</button>
          </div>

          {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Existing Note ID (optional)</label>
            <input value={noteRef} onChange={(e) => setNoteRef(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Paste note id if sharing an existing note" />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Shared note title" />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full border rounded px-3 py-2" placeholder="Paste content or summary to share" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">
              {loading ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}