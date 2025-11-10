import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import SpaceDetails from '../../components/spaces/SpaceDetails';
import ChatFeed from '../../components/spaces/ChatFeed';
import MemberList from '../../components/spaces/MemberList';
import ShareNoteModal from '../../components/spaces/ShareNoteModal';
import { SocketContext } from '../../context/SocketContext';

/**
 * SpaceView
 * Dedicated page for a single space. Mirrors the details area that was previously
 * rendered inline in SpacesPage but lives at /spaces/:id so the "Open" button navigates here.
 */
export default function SpaceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useContext(SocketContext);

  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

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
    // join socket room for live updates
    try { if (socket && socket.emit) socket.emit('joinSpace', { spaceId: String(id) }); } catch (e) {}
    return () => {
      try { if (socket && socket.emit) socket.emit('leaveSpace', { spaceId: String(id) }); } catch (e) {}
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

  async function handleShareNote(payload) {
    try {
      await api.post(`/spaces/${id}/share/note`, payload);
      setShowShare(false);
      fetchSpace();
    } catch (err) {
      console.error('share note failed', err);
      alert('Failed to share note');
    }
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
        <div className="mb-4">
          {/* Back button intentionally removed on this page */}
        </div>

        <div className="bg-white rounded shadow p-4 space-y-4">
          <SpaceDetails
            space={space}
            currentUserId={currentUserId}
            onRequestJoin={handleRequestJoin}
            onLeave={handleLeave}
            onOpenShare={() => setShowShare(true)}
            onClose={() => navigate('/spaces')}
            showClose={false}
            showRequestButton={false}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ChatFeed spaceId={space._id || space.id} currentUserId={currentUserId} socket={socket} />
            </div>

            <div>
              <MemberList members={space.members || []} admin={space.admin} currentUserId={currentUserId} spaceId={space._id || space.id} />
              <div className="mt-4">
                <h4 className="font-medium mb-2">Shared Notes</h4>
                <div>
                  <button onClick={() => fetchSpace()} className="text-sm text-indigo-600">Refresh shared items</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showShare && (
          <ShareNoteModal
            space={space}
            onClose={() => setShowShare(false)}
            onShare={handleShareNote}
          />
        )}
      </div>
    </div>
  );
}