import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import TaskSidebar from './TaskSidebar';
import EventModal from '../../components/study/EventModal';
import TaskModal from '../../components/study/TaskModal';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const API_BASE = 'http://localhost:5000';

export default function StudyPlanner() {
  const [calendarItems, setCalendarItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const token = userInfo?.token;

  const navigate = useNavigate();
  const location = useLocation();

  const fetchCalendarItems = useCallback(async () => {
    if (!token) return;
    try {
      const [eventRes, taskRes] = await Promise.all([
        axios.get(`${API_BASE}/api/study/events`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/api/study/tasks/all`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const events = (eventRes.data || []).map((e) => ({
        id: `evt-${e._id}`,
        title: e.title,
        start: new Date(e.startDate),
        end: new Date(e.endDate),
        allDay: false,
        raw: e,
        itemType: 'event',
        isCompleted: !!e.isCompleted,
      }));

      const tasks = (taskRes.data || []).map((t) => {
        const start = t.dueDate ? new Date(t.dueDate) : new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          id: `tsk-${t._id}`,
          title: `${t.title} (Task)`,
          start,
          end,
          allDay: false,
          raw: t,
          itemType: 'task',
          isCompleted: !!t.isCompleted,
        };
      });

      setCalendarItems([...events, ...tasks]);
    } catch (err) {
      console.error('fetchCalendarItems error', err);
    }
  }, [token]);

  useEffect(() => {
    fetchCalendarItems();
  }, [fetchCalendarItems, refreshFlag]);

  const handleSelectSlot = ({ start }) => {
    setSelectedDate(start);
  };

  const handleSelectEvent = (event) => {
    setSelectedDate(event.start || new Date());
  };

  const handleAddEventClick = () => setModalOpen(true);
  const handleAddTaskClick = () => setTaskModalOpen(true);

  const onEventCreated = () => {
    setModalOpen(false);
    setRefreshFlag(f => f + 1);
  };

  const onTaskCreated = () => {
    setTaskModalOpen(false);
    setRefreshFlag(f => f + 1);
  };

  // Called by TaskSidebar when tasks/events change
  const onTaskChange = () => setRefreshFlag(f => f + 1);

  // Clear selected date -> sidebar reverts to default view
  const clearSelectedDate = () => setSelectedDate(null);

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <a href="/home">Back</a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2>Study Planner</h2>
          <div>
            <button onClick={handleAddEventClick} style={{ marginRight: 8 }}>+ Add Event</button>
            <button onClick={handleAddTaskClick} style={{ marginRight: 8 }}>+ Add Task</button>
          </div>
        </div>

        <Calendar
        localizer={localizer}
        events={calendarItems}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '75vh' }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={(event) => {
            let style = {
            backgroundColor: '#3174ad', 
            color: 'white',
            borderRadius: '4px',
            opacity: 1,
            textDecoration: 'none',
            };

            // If event/task is completed, make it lighter and crossed out
            if (event.isCompleted) {
            style.backgroundColor = '#a0aec0'; // light gray
            style.color = '#4a5568'; // dark gray text
            style.textDecoration = 'line-through';
            style.opacity = 0.7;
            }

            return { style };
        }}
        />

      </div>

      {/* Sidebar is always visible */}
      <TaskSidebar
        date={selectedDate}
        onClose={clearSelectedDate}
        onClearDate={clearSelectedDate}
        onTaskChange={onTaskChange}
      />

      {modalOpen && <EventModal onClose={() => setModalOpen(false)} onCreated={onEventCreated} />}
      {taskModalOpen && <TaskModal onClose={() => setTaskModalOpen(false)} onCreated={onTaskCreated} />}
    </div>
  );
}
