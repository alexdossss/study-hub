import React, { useState } from 'react';
import axios from 'axios';

function EditNoteModal({ note, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: note.title,
    description: note.description,
    file: null,
    docsUrl: note.docsUrl || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      
      if (note.type === 'file' && formData.file) {
        data.append('file', formData.file);
      } else if (note.type === 'google_docs') {
        data.append('docsUrl', formData.docsUrl);
      }

      await axios.put(`http://localhost:5000/api/notes/${note._id}`, data, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update note');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Edit Note</h2>
        
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">Title:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">Description:</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border p-2 rounded"
            />
          </div>

          {note.type === 'file' ? (
            <div className="mb-4">
              <label className="block mb-2">Replace File:</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                className="w-full"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block mb-2">Google Docs URL:</label>
              <input
                type="url"
                value={formData.docsUrl}
                onChange={(e) => setFormData({ ...formData, docsUrl: e.target.value })}
                className="w-full border p-2 rounded"
                pattern="https://docs\.google\.com.*"
                placeholder="https://docs.google.com/"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditNoteModal;