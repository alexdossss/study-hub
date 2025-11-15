import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import SpaceDetails from '../../components/spaces/SpaceDetails';
import ChatFeed from '../../components/spaces/ChatFeed';
import MemberList from '../../components/spaces/MemberList';
import SharedItemsList from '../../components/spaces/SharedItemsList';
import SharePickerModal from '../../components/spaces/SharePickerModal';
import { SocketContext } from '../../context/SocketContext';

/**
 * SpaceView
 * Dedicated page for a single space. Shows shared resources with actions and unshare.
 */
export default function SpaceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useContext(SocketContext);

  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState('note'); // 'note' | 'flashcard' | 'quiz'
  const [sharedItems, setSharedItems] = useState([]);

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch {
      return null;
    }
  })();
  const currentUserId =
    userInfo?.id ||
    userInfo?._id ||
    userInfo?.user?.id ||
    userInfo?.user?._id ||
    userInfo?.userId ||
    null;

  useEffect(() => {
    if (!id) return;
    fetchSpace();
    fetchSharedItems();
    // join socket room for live updates
    try {
      if (socket && socket.emit) socket.emit('joinSpace', { spaceId: String(id) });
      if (socket && socket.on) {
        socket.on('space:sharedItem', (payload) => {
          if (String(payload.spaceId) === String(id)) fetchSharedItems();
        });
        socket.on('space:unsharedItem', (payload) => {
          if (String(payload.spaceId) === String(id)) fetchSharedItems();
        });
      }
    } catch (e) {}
    return () => {
      try {
        if (socket && socket.emit) socket.emit('leaveSpace', { spaceId: String(id) });
        if (socket && socket.off) {
          socket.off('space:sharedItem');
          socket.off('space:unsharedItem');
        }
      } catch (e) {}
    };
    // eslint-disable-next-line
  }, [id]);

  async function fetchSpace() {
    setLoading(true);
    try {
      const { data } = await api.get(`/spaces/${id}`);
      setSpace(data.space);
    } catch (err) {
      console.error('Failed to load space', err);
      alert('Failed to load space');
      navigate('/spaces');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSharedItems() {
    try {
      const { data } = await api.get(`/spaces/${id}/shared/items`);
      setSharedItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error('Failed to load shared items', err);
      setSharedItems([]);
    }
  }

  async function handleRequestJoin() {
    try {
      await api.post(`/spaces/${id}/join`);
      alert('Join request sent. Admin will be notified.');
    } catch (err) {
      console.error('request join failed', err);
      alert(err?.response?.data?.message || 'Failed to request join');
    }
  }

  async function handleLeave() {
    try {
      await api.post(`/spaces/${id}/leave`);
      alert('You left the space');
      fetchSpace();
    } catch (err) {
      console.error('leave failed', err);
      alert(err?.response?.data?.message || 'Failed to leave space');
    }
  }

  function openPicker(type) {
    setPickerType(type);
    setShowPicker(true);
  }

  function onSharedRefresh() {
    fetchSharedItems();
    fetchSpace();
  }

  if (loading) {
    return <div className="min-h-screen p-6">Loading...</div>;
  }

  if (!space) {
    return <div className="min-h-screen p-6">Space not found.</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">{/* Back button intentionally removed on this page */}</div>

        <div className="bg-white rounded shadow p-4 space-y-4">
          <SpaceDetails
            space={space}
            currentUserId={currentUserId}
            onRequestJoin={handleRequestJoin}
            onLeave={handleLeave}
            onOpenShare={() => openPicker('note')}
            onClose={() => navigate('/spaces')}
            showClose={false}
            showRequestButton={false}
          />

          {/* lightweight share toolbar */}
          <div className="flex items-center gap-3">
            <button onClick={() => openPicker('note')} className="px-3 py-1 bg-green-600 text-white rounded">Share Note</button>
            <button onClick={() => openPicker('flashcard')} className="px-3 py-1 bg-yellow-600 text-white rounded">Share Flashcard</button>
            <button onClick={() => openPicker('quiz')} className="px-3 py-1 bg-purple-600 text-white rounded">Share Quiz</button>
            <button onClick={fetchSharedItems} className="px-3 py-1 bg-gray-100 rounded">Refresh Shared</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <ChatFeed spaceId={space._id || space.id} currentUserId={currentUserId} socket={socket} />
              <SharedItemsList
                items={sharedItems}
                spaceId={id}
                currentUserId={currentUserId}
                adminId={space.admin?._id || space.admin}
                onUnshared={fetchSharedItems}
              />
            </div>

            <div>
              <MemberList members={space.members || []} admin={space.admin} currentUserId={currentUserId} spaceId={space._id || space.id} />
              <div className="mt-4">
                <h4 className="font-medium mb-2">Shared Notes</h4>
                <div>
                  <button onClick={() => { fetchSharedItems(); fetchSpace(); }} className="text-sm text-indigo-600">Refresh shared items</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPicker && (
          <SharePickerModal
            type={pickerType}
            spaceId={id}
            onClose={() => setShowPicker(false)}
            onShared={() => onSharedRefresh()}
          />
        )}
      </div>
    </div>
  );
}