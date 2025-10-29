import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PublicNotes() {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

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

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Public Notes</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div key={note._id} className="border p-4 rounded shadow">
            <h3 className="font-bold text-lg">{note.title}</h3>
            <p className="text-gray-600 mb-2">By: {note.user.username}</p>
            <p className="mb-4">{note.description}</p>
            
            {note.type === 'file' && note.fileUrl && (
              <div className="mt-2">
                {note.fileUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                  <img 
                    src={`http://localhost:5000/${note.fileUrl}`} 
                    alt={note.title}
                    className="max-w-full h-auto rounded"
                  />
                ) : (
                  <a 
                    href={`http://localhost:5000/${note.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View File
                  </a>
                )}
              </div>
            )}

            {note.type === 'google_docs' && note.docsUrl && (
              <iframe
                src={note.docsUrl}
                title={note.title}
                width="100%"
                height="300"
                className="mt-2 rounded border"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PublicNotes;