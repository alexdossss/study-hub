import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function PublicNotes() {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicNotes();
  }, []);

  const fetchPublicNotes = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/notes/public', {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        }
      });
      setNotes(data);
    } catch (error) {
      setError('Failed to fetch public notes');
    }
  };

  const handleView = (noteId) => {
    navigate(`/notes/${noteId}`, {
      state: { from: 'public' }
    });
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
            <p className="text-gray-600 mb-2">By: {note.user.username}</p>
            <p className="mb-4">{note.description}</p>
            
            {note.type === 'file' && note.fileUrl && (
              <div className="mt-2">
                <button 
                  onClick={() => handleView(note._id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  View Note
                </button>
              </div>
            )}

            {note.type === 'google_docs' && note.docsUrl && (
              <div className="mt-2">
                <button 
                  onClick={() => handleView(note._id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  View Note
                </button>
              </div>
            )}
            <button onClick={() => handleView(note._id)}>
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicNotes;