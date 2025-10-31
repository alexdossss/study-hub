import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';

export default function BookmarkedNotes() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');

  useEffect(() => {
    const fetch = async () => {
      if (!userInfo?.token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      try {
        const { data } = await axios.get(`${API_BASE}/api/notes/bookmarks`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setBookmarks(data);
      } catch (err) {
        console.error('fetch bookmarks error', err);
        setError(err.response?.data?.message || 'Failed to fetch bookmarks');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleOpen = (note) => {
    navigate(`/notes/${note._id}`, { state: { from: 'private', fromPath: '/bookmarks' } });
  };

  const handleUnbookmark = async (noteId) => {
    if (!userInfo?.token) return;
    try {
      const { data } = await axios.delete(`${API_BASE}/api/notes/${noteId}/bookmark`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      setBookmarks(data);
    } catch (err) {
      console.error('unbookmark error', err);
      setError('Failed to remove bookmark');
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading bookmarks…</div>;
  if (error) return <div style={{ padding: 20, color: 'crimson' }}>{error}</div>;

const handleBack = () => {
    const fromPath = location.state?.fromPath;
    if (fromPath) return navigate(fromPath);
    const fromFlag = location.state?.from;
    if (fromFlag === 'private') return navigate('/home');
    if (fromFlag === 'public') return navigate('/home-public');
    if (fromFlag === 'homepage_private') return navigate('/homepage_private');
    if (fromFlag === 'homepage_public') return navigate('/homepage_public');
    navigate(-1);
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <h2>Bookmarked Notes</h2>
      <button onClick={handleBack} style={{ padding: '6px 10px' }}>← Back</button>
      {bookmarks.length === 0 && <div style={{ marginTop: 12 }}>You have no bookmarked notes.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {bookmarks.map(note => (
          <li key={note._id} style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => handleOpen(note)}>
              <div style={{ fontWeight: 600 }}>{note.title}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{note.user?.username || note.ownerUsername} • {new Date(note.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <button onClick={() => handleOpen(note)} style={{ marginRight: 8 }}>View</button>
              <button onClick={() => handleUnbookmark(note._id)}>Unbookmark</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}