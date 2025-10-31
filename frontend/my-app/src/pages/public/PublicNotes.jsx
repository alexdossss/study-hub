import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';

function PublicNotes() {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPublicNotes = async () => {
    try {
      const headers = userInfo?.token ? { Authorization: `Bearer ${userInfo.token}` } : {};
      const { data: publicNotes } = await axios.get(`${API_BASE}/api/notes/public`, { headers });

      // If user logged in, fetch their bookmarks to mark items
      let bookmarkSet = new Set();
      if (userInfo?.token) {
        try {
          const { data: bookmarks } = await axios.get(`${API_BASE}/api/notes/bookmarks`, {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          bookmarkSet = new Set((bookmarks || []).map(b => String(b._id || b.id)));
        } catch (err) {
          console.warn('Failed to fetch user bookmarks', err);
        }
      }

      const notesWithFlag = (publicNotes || []).map(n => ({
        ...n,
        isBookmarked: bookmarkSet.has(String(n._id)),
      }));

      setNotes(notesWithFlag);
    } catch (err) {
      console.error('fetchPublicNotes error', err);
      setError('Failed to fetch public notes');
    }
  };

  const handleView = (noteId) => {
    navigate(`/notes/${noteId}`, {
      state: { from: 'public' }
    });
  };

  const toggleBookmark = async (noteId, currentlyBookmarked) => {
    const ui = JSON.parse(localStorage.getItem('userInfo') || 'null');
    if (!ui?.token) return alert('Please log in to bookmark');

    try {
      if (currentlyBookmarked) {
        await axios.delete(`${API_BASE}/api/notes/${noteId}/bookmark`, {
          headers: { Authorization: `Bearer ${ui.token}` },
        });
        setNotes(prev => prev.map(n => n._id === noteId ? { ...n, isBookmarked: false } : n));
      } else {
        await axios.post(`${API_BASE}/api/notes/${noteId}/bookmark`, {}, {
          headers: { Authorization: `Bearer ${ui.token}` },
        });
        setNotes(prev => prev.map(n => n._id === noteId ? { ...n, isBookmarked: true } : n));
      }
    } catch (err) {
      console.error('toggleBookmark error', err);
      alert(err.response?.data?.message || 'Failed to update bookmark');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Public Notes</h2>
      <a href="/home-public">Back</a>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div key={note._id} className="border p-4 rounded shadow">
            <h3 className="font-bold text-lg">{note.title}</h3>
            <p className="text-gray-600 mb-2">By: {note.user?.username}</p>
            <p className="mb-4">{note.description}</p>

            {(note.type === 'file' || note.type === 'google_docs') && (note.fileUrl || note.docsUrl) && (
              <div className="mt-2">
                <button
                  onClick={() => handleView(note._id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  View Note
                </button>
              </div>
            )}

            <div className="mt-2">
              <button
                onClick={() => toggleBookmark(note._id, !!note.isBookmarked)}
                className={note.isBookmarked ? "bg-gray-500 text-white px-4 py-2 rounded" : "bg-green-500 text-white px-4 py-2 rounded"}
              >
                {note.isBookmarked ? 'Unbookmark' : 'Bookmark'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicNotes;