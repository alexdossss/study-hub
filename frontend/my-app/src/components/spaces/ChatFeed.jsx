import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

/**
 * ChatFeed
 * Props:
 *  - spaceId: id of the space
 *  - currentUserId: optional current user id
 *  - socket: optional socket.io client (from context)
 *
 * Behavior:
 *  - Loads recent messages via GET /api/spaces/:spaceId/messages
 *  - Joins socket room (emit joinSpace) and listens for 'space:message'
 *  - Allows posting messages via POST /api/spaces/:spaceId/messages (backend enforces membership)
 */
export default function ChatFeed({ spaceId, currentUserId = null, socket = null }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [isMember, setIsMember] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!spaceId) return;
    fetchMessages();
    checkMembership();

    // join socket room
    try {
      if (socket && socket.emit) socket.emit('joinSpace', { spaceId: String(spaceId) });
    } catch (e) {}

    function onMessage(msg) {
      // ensure message belongs to this space
      const id = msg.space || msg.spaceId || msg.space_id;
      if (!id || String(id) !== String(spaceId)) return;
      setMessages((m) => [...m, msg]);
      scrollToBottom();
    }

    try {
      if (socket && socket.on) socket.on('space:message', onMessage);
    } catch (e) {}

    return () => {
      try {
        if (socket && socket.emit) socket.emit('leaveSpace', { spaceId: String(spaceId) });
        if (socket && socket.off) socket.off('space:message', onMessage);
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, socket]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const { data } = await api.get(`/spaces/${spaceId}/messages`);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load messages', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function checkMembership() {
    if (!currentUserId) {
      setIsMember(false);
      return;
    }
    try {
      const { data } = await api.get(`/spaces/${spaceId}`);
      const members = data.space?.members || [];
      const found = members.some((m) => String(m.user) === String(currentUserId));
      setIsMember(found || String(data.space?.admin) === String(currentUserId));
    } catch (err) {
      console.error('membership check failed', err);
      setIsMember(false);
    }
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    // disable input quickly
    const payload = { text: trimmed };
    setText('');
    try {
      const { data } = await api.post(`/spaces/${spaceId}/messages`, payload);
      // API returns created message; append
      const msg = data.message || data;
      setMessages((m) => [...m, msg]);
      // emit via socket as well (optional)
      try {
        if (socket && socket.emit) socket.emit('space:message', { spaceId, message: msg });
      } catch (e) {}
      scrollToBottom();
    } catch (err) {
      console.error('Send failed', err);
      alert(err?.response?.data?.message || 'Failed to send message');
      // restore text? keep cleared
    }
  }

  return (
    <div className="bg-white rounded shadow p-3 h-[60vh] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Chat</div>
        <div className="text-xs text-gray-500">{isMember ? 'Member' : 'Read-only'}</div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto border rounded p-2 mb-3 bg-gray-50">
        {loading ? (
          <div className="text-sm text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const uid = m.user?._id || m.user?.id || m.user;
            const display = m.user?.name || m.user?.username || (uid === currentUserId ? 'You' : 'User');
            const time = new Date(m.createdAt || m.created_at || Date.now()).toLocaleTimeString();
            return (
              <div key={m._id || m.id || Math.random()} className="mb-2">
                <div className="text-xs text-gray-500">{display} · <span className="ml-1">{time}</span></div>
                <div className="mt-1">{m.text}</div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!isMember}
          placeholder={isMember ? 'Write a message...' : 'Join the space to chat'}
          className="flex-1 border rounded px-3 py-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isMember || !text.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}