import React, { useEffect, useState } from 'react';
import axios from 'axios';
import formatDate from 'date-fns/format';

const API_BASE = 'http://localhost:5000';

export default function TaskSidebar({ date, onClose, onClearDate, onTaskChange }) {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDesc, setQuickDesc] = useState('');

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const token = userInfo?.token;

  const isoDate = date ? formatDate(new Date(date), 'yyyy-MM-dd') : null;
  const now = new Date();

  // Fetching logic:
  // - If date is provided: fetch tasks/events for that date (date view)
  // - If no date: fetch all tasks/events and filter to upcoming & not completed (default view)
  useEffect(() => {
    if (!token) {
      setTasks([]); setEvents([]); setLoading(false);
      return;
    }

    setLoading(true);

    if (isoDate) {
      // date-filtered fetch
      const taskReq = axios.get(`${API_BASE}/api/study/tasks?date=${isoDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const eventReq = axios.get(`${API_BASE}/api/study/events?date=${isoDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Promise.all([taskReq, eventReq])
        .then(([tRes, eRes]) => {
          setTasks(tRes.data || []);
          setEvents(eRes.data || []);
        })
        .catch((err) => {
          console.error('fetch tasks/events for date', err);
          setTasks([]); setEvents([]);
        })
        .finally(() => setLoading(false));
    } else {
      // default: upcoming & pending only (no past, no completed)
      const taskReq = axios.get(`${API_BASE}/api/study/tasks/all`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => ({ data: [] }));

      const eventReq = axios.get(`${API_BASE}/api/study/events`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => ({ data: [] }));

      Promise.all([taskReq, eventReq])
        .then(([tRes, eRes]) => {
          const allTasks = tRes.data || [];
          const upcomingTasks = allTasks
            .filter(t => t && !t.isCompleted && new Date(t.dueDate) >= now)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          setTasks(upcomingTasks);

          const allEvents = eRes.data || [];
          const upcomingEvents = allEvents
            .filter(ev => ev && !ev.isCompleted && new Date(ev.endDate) >= now)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          setEvents(upcomingEvents);
        })
        .catch((err) => {
          console.error('fetch upcoming tasks/events', err);
          setTasks([]); setEvents([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isoDate, token, onTaskChange]);

  const refreshAll = async () => {
    if (!token) return;
    if (isoDate) {
      const [tRes, eRes] = await Promise.all([
        axios.get(`${API_BASE}/api/study/tasks?date=${isoDate}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/api/study/events?date=${isoDate}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setTasks(tRes.data || []);
      setEvents(eRes.data || []);
    } else {
      const [tRes, eRes] = await Promise.all([
        axios.get(`${API_BASE}/api/study/tasks/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/api/study/events`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const allTasks = tRes.data || [];
      const upcomingTasks = allTasks
        .filter(t => t && !t.isCompleted && new Date(t.dueDate) >= now)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setTasks(upcomingTasks);

      const allEvents = eRes.data || [];
      const upcomingEvents = allEvents
        .filter(ev => ev && !ev.isCompleted && new Date(ev.endDate) >= now)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      setEvents(upcomingEvents);
    }

    if (onTaskChange) onTaskChange();
  };

  const handleQuickAdd = async () => {
    if (!quickTitle) return alert('Title required');
    try {
      const payload = {
        title: quickTitle,
        description: quickDesc,
        dueDate: isoDate || formatDate(new Date(), "yyyy-MM-dd'T'HH:mm"),
      };
      await axios.post(`${API_BASE}/api/study/tasks`, payload, { headers: { Authorization: `Bearer ${token}` }});
      setQuickTitle(''); setQuickDesc('');
      await refreshAll();
    } catch (err) {
      console.error('quick add', err);
      alert('Failed to add task');
    }
  };

  const toggleTaskComplete = async (task) => {
    try {
      const due = new Date(task.dueDate);
      const isPast = due < new Date();
      if (isPast && !task.isCompleted) return alert('Task is past due — cannot mark completed here');

      await axios.put(`${API_BASE}/api/study/tasks/${task._id}`, { isCompleted: !task.isCompleted }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshAll();
    } catch (err) {
      console.error('toggle task complete', err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete task?')) return;
    try {
      await axios.delete(`${API_BASE}/api/study/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(prev => prev.filter(t => t._id !== taskId));
      if (onTaskChange) onTaskChange();
    } catch (err) {
      console.error('delete task', err);
      alert('Failed to delete task');
    }
  };

  const toggleEventComplete = async (ev) => {
    try {
      const ended = new Date(ev.endDate) < now;
      if (ended && !ev.isCompleted) return alert('Event is past due — cannot mark completed here');

      await axios.put(`${API_BASE}/api/study/events/${ev._id}`, { isCompleted: !ev.isCompleted }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshAll();
    } catch (err) {
      console.error('toggle event complete', err);
    }
  };

  const deleteEvent = async (evId) => {
    if (!confirm('Delete event?')) return;
    try {
      await axios.delete(`${API_BASE}/api/study/events/${evId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(prev => prev.filter(e => e._id !== evId));
      if (onTaskChange) onTaskChange();
    } catch (err) {
      console.error('delete event', err);
      alert('Failed to delete event');
    }
  };

  const isPastDue = (d) => new Date(d) < new Date();

  const handleCloseClicked = () => {
    if (typeof onClearDate === 'function') return onClearDate();
    if (typeof onClose === 'function') return onClose();
  };

  return (
    <aside style={{ width: 400, borderLeft: '1px solid #eee', padding: 12, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{isoDate ? formatDate(new Date(date), 'PPP') : 'Tasks & Events'}</h3>
        {/* Close button only in date view */}
        {isoDate && <button onClick={handleCloseClicked}>Close</button>}
      </div>

      {/* Quick Add only visible in date view */}
      {isoDate && (
        <div style={{ marginTop: 8 }}>
          <h4>Quick Add Task</h4>
          <input placeholder="Title" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
          <input placeholder="Description (optional)" value={quickDesc} onChange={(e) => setQuickDesc(e.target.value)} style={{ width: '100%', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleQuickAdd}>Add</button>
            <button onClick={() => { setQuickTitle(''); setQuickDesc(''); }}>Clear</button>
          </div>
        </div>
      )}

      <hr style={{ margin: '12px 0' }} />

      <div>
        <h4>Events</h4>
        {loading && <div>Loading…</div>}
        {!loading && events.length === 0 && <div>No events.</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {events.map(ev => {
            const ended = new Date(ev.endDate) < now;
            return (
              <li key={ev._id} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', opacity: ev.isCompleted ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, textDecoration: ev.isCompleted ? 'line-through' : 'none' }}>{ev.title}</div>
                    <div style={{ fontSize: 13 }}>{ev.description}</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{new Date(ev.startDate).toLocaleTimeString()} - {new Date(ev.endDate).toLocaleTimeString()}</div>
                    {ended && !ev.isCompleted && <div style={{ color: 'crimson', fontSize: 12 }}>Past due</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!ended && <button onClick={() => toggleEventComplete(ev)}>{ev.isCompleted ? 'Undo' : 'Complete'}</button>}
                    <button onClick={() => deleteEvent(ev._id)}>Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <hr style={{ margin: '12px 0' }} />

      <div>
        <h4>Tasks</h4>
        {!loading && tasks.length === 0 && <div>No tasks.</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map(task => {
            const past = isPastDue(task.dueDate);
            return (
              <li key={task._id} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', opacity: task.isCompleted ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, textDecoration: task.isCompleted ? 'line-through' : 'none' }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: 13 }}>{task.description}</div>}
                    <div style={{ fontSize: 12, color: '#555' }}>Due: {new Date(task.dueDate).toLocaleTimeString()}</div>
                    {past && !task.isCompleted && <div style={{ color: 'crimson', fontSize: 12 }}>Past due</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {!past && <button onClick={() => toggleTaskComplete(task)}>{task.isCompleted ? 'Undo' : 'Complete'}</button>}
                    <button onClick={() => deleteTask(task._id)}>Delete</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}