import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

/**
 * CreateSpaceModal
 * Props:
 *  - onClose(): close modal
 *  - onCreate(payload): called with { title, description, isPublic } when created
 */
export default function CreateSpaceModal({ onClose = () => {}, onCreate = () => {} }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
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

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const payload = { title: title.trim(), description: description.trim(), isPublic: !!isPublic };
    setLoading(true);
    try {
      // Call API if onCreate not handled externally
      try {
        const { data } = await api.post('/spaces', payload);
        const created = data.space || data;
        onCreate(created);
      } catch (err) {
        // fallback to caller handler
        await onCreate(payload);
      }
    } catch (err) {
      console.error('create space failed', err);
      setError(err?.response?.data?.message || 'Failed to create space');
    } finally {
      setLoading(false);
      onClose();
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <form onSubmit={handleCreate} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Create Study Space</h3>
            <button type="button" onClick={onClose} className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">Close</button>
          </div>

          {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="E.g. Calculus Study Group"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-3 py-2"
              rows={4}
              placeholder="Optional description for the space"
            />
          </div>

          <div className="mb-4 flex items-center gap-3">
            <input id="isPublic" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <label htmlFor="isPublic" className="text-sm">Public (visible to everyone)</label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}