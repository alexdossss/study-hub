import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export default function TaskModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const token = userInfo?.token;

  const handleCreate = async () => {
    if (!title || !dueDate) return alert('Title and due date required');
    try {
      // dueDate: use date or datetime-local from input
      const payload = { title, description, dueDate };
      await axios.post(`${API_BASE}/api/study/tasks`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (onCreated) onCreated();
    } catch (err) {
      console.error('create task', err);
      alert('Failed to create task');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.25)', zIndex: 9999}}>
      <div style={{ background: '#000000ff', padding: 16, borderRadius: 6, width: 420 }}>
        <h3>Create Task</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <label>Due date</label>
        <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}