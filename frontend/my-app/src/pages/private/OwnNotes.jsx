import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CreateNoteModal from '../../components/notes/CreateNoteModal';
import EditNoteModal from '../../components/notes/EditNoteModal';

function OwnNotes() {
  const [notes, setNotes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [error, setError] = useState('');

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };

      const { data } = await axios.get('http://localhost:5000/api/notes', config);
      setNotes(data);
    } catch (error) {
      setError('Failed to fetch notes');
    }
  };

  const handleDelete = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await axios.delete(`http://localhost:5000/api/notes/${noteId}`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setNotes(notes.filter(note => note._id !== noteId));
      } catch (error) {
        setError('Failed to delete note');
      }
    }
  };

  const handleTogglePublish = async (noteId) => {
    try {
      const { data } = await axios.put(
        `http://localhost:5000/api/notes/${noteId}/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );
      setNotes(notes.map(note => 
        note._id === noteId ? { ...note, isPublic: data.isPublic } : note
      ));
    } catch (error) {
      setError('Failed to toggle publish status');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Notes</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      <button
        onClick={() => setShowCreateModal(true)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Create Note
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div key={note._id} className="border p-4 rounded">
            <h3 className="font-bold">{note.title}</h3>
            <p>{note.description}</p>
            
            {note.type === 'file' && note.fileUrl && (
              <div className="mt-2">
                {note.fileUrl.match(/\.(jpg|jpeg|png)$/i) ? (
                  <img 
                    src={`http://localhost:5000/${note.fileUrl}`} 
                    alt={note.title}
                    className="max-w-full h-auto"
                  />
                ) : (
                  <a 
                    href={`http://localhost:5000/${note.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500"
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
                className="mt-2"
              />
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSelectedNote(note);
                  setShowEditModal(true);
                }}
                className="bg-yellow-500 text-white px-2 py-1 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(note._id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Delete
              </button>
              <button
                onClick={() => handleTogglePublish(note._id)}
                className={`${
                  note.isPublic ? 'bg-gray-500' : 'bg-green-500'
                } text-white px-2 py-1 rounded`}
              >
                {note.isPublic ? 'Unpublish' : 'Publish'}
              </button>
            </div>
            
            {note.isPublic && (
              <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded mt-2">
                Published
              </span>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateNoteModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchNotes();
          }}
        />
      )}

      {showEditModal && selectedNote && (
        <EditNoteModal
          note={selectedNote}
          onClose={() => {
            setShowEditModal(false);
            setSelectedNote(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedNote(null);
            fetchNotes();
          }}
        />
      )}
    </div>
  );
}

export default OwnNotes;