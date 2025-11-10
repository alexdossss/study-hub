import React, { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import SpaceList from '../../components/spaces/SpaceList';
import SpaceDetails from '../../components/spaces/SpaceDetails';
import CreateSpaceModal from '../../components/spaces/CreateSpaceModal';
import ShareNoteModal from '../../components/spaces/ShareNoteModal';
import ChatFeed from '../../components/spaces/ChatFeed';
import MemberList from '../../components/spaces/MemberList';
import { SocketContext } from '../../context/SocketContext';

/**
 * SpacesPage
 * - Shows two sections:
 *    1) Your Spaces (spaces where you are a member)
 *    2) Available Spaces (public spaces where you're not a member)
 * - Request to Join button is only shown in Available Spaces
 */
export default function SpacesPage() {
  const [publicSpaces, setPublicSpaces] = useState([]);
  const [memberSpaces, setMemberSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // full space object
  const [showCreate, setShowCreate] = useState(false);
  const [showShareNote, setShowShareNote] = useState(false);
  const socket = useContext(SocketContext);

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch {
      return null;
    }
  })();

  const isAuthenticated = Boolean(
    userInfo?.token ||
    userInfo?.accessToken ||
    userInfo?.authToken ||
    userInfo?.user?.token
  );
  const currentUserId =
    userInfo?.id ||
    userInfo?._id ||
    userInfo?.user?.id ||
    userInfo?.user?._id ||
    userInfo?.userId ||
    null;

  useEffect(() => {
    fetchSpaces();
    // eslint-disable-next-line
  }, []);

  async function fetchSpaces() {
    setLoading(true);
    try {
      const { data } = await api.get('/spaces');
      const pub = data.spaces || [];
      setPublicSpaces(pub);

      if (isAuthenticated) {
        // fetch spaces where user is a member
        try {
          const { data: mineData } = await api.get('/spaces?mine=true');
          const mine = mineData.spaces || [];
          setMemberSpaces(mine);
          // remove member spaces from public listing for "available" view
          const memberIds = new Set(mine.map((m) => String(m._id || m.id)));
          setPublicSpaces(pub.filter((p) => !memberIds.has(String(p._id || p.id))));
        } catch (e) {
          // if mine fetch fails, keep memberSpaces empty
          console.warn('Failed to fetch member spaces', e);
          setMemberSpaces([]);
        }
      } else {
        setMemberSpaces([]);
      }
    } catch (err) {
      console.error('Failed to load spaces', err);
      setPublicSpaces([]);
      setMemberSpaces([]);
    } finally {
      setLoading(false);
    }
  }

  async function openSpace(spaceId) {
    try {
      const { data } = await api.get(`/spaces/${spaceId}`);
      setSelected(data.space);
      if (socket && socket.emit) socket.emit('joinSpace', { spaceId: String(spaceId) });
    } catch (err) {
      console.error('Failed to load space', err);
      alert('Failed to load space details');
    }
  }

  function closeSpace() {
    if (selected && socket && socket.emit) {
      try {
        socket.emit('leaveSpace', { spaceId: String(selected._id || selected.id) });
      } catch (e) {}
    }
    setSelected(null);
  }

  async function handleCreate(input) {
    let created = null;
    if (input && (input.id || input._id)) {
      created = input;
    } else {
      try {
        const { data } = await api.post('/spaces', input);
        created = data.space || data;
      } catch (err) {
        console.error('Failed to create space', err);
        alert('Failed to create space');
        return;
      }
    }

    // ensure no duplicate and add to memberSpaces (creator becomes admin/member)
    setMemberSpaces((prev) => {
      const id = created._id || created.id;
      const exists = prev.some((s) => String(s._id || s.id) === String(id));
      if (exists) return prev;
      return [created, ...prev];
    });
    // remove from publicSpaces if present
    setPublicSpaces((prev) => prev.filter((s) => String(s._id || s.id) !== String(created._id || created.id)));

    setShowCreate(false);
    openSpace(created.id || created._id);
  }

  async function handleRequestJoin(spaceId) {
    try {
      await api.post(`/spaces/${spaceId}/join`);
      alert('Join request sent. Admin will be notified.');
    } catch (err) {
      console.error('request join failed', err);
      alert(err?.response?.data?.message || 'Failed to request join');
    }
  }

  async function handleLeave(spaceId) {
    try {
      await api.post(`/spaces/${spaceId}/leave`);
      alert('You left the space');
      if (selected && String(selected._id || selected.id) === String(spaceId)) {
        closeSpace();
      }
      // refresh both lists
      fetchSpaces();
    } catch (err) {
      console.error('leave failed', err);
      alert(err?.response?.data?.message || 'Failed to leave space');
    }
  }

  async function handleShareNote(sharedPayload) {
    try {
      const spaceId = selected._id || selected.id;
      await api.post(`/spaces/${spaceId}/share/note`, sharedPayload);
      setShowShareNote(false);
      openSpace(spaceId);
    } catch (err) {
      console.error('share note failed', err);
      alert('Failed to share note');
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Study Spaces</h1>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded"
              >
                Create Space
              </button>
              <button onClick={fetchSpaces} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Log in to create or join spaces.</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white rounded shadow p-4">
              <h3 className="font-medium mb-3">Your Spaces</h3>
              {loading ? (
                <div className="text-gray-500">Loading...</div>
              ) : (
                <SpaceList
                  spaces={memberSpaces}
                  onOpen={openSpace}
                  currentUserId={currentUserId}
                  showRequestButton={false}
                />
              )}

              <div className="mt-6">
                <h3 className="font-medium mb-3">Available Spaces</h3>
                {loading ? (
                  <div className="text-gray-500">Loading...</div>
                ) : (
                  <SpaceList
                    spaces={publicSpaces}
                    onOpen={openSpace}
                    currentUserId={currentUserId}
                    showRequestButton={true}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            {!selected ? (
              <div className="bg-white rounded shadow p-6 text-center text-gray-600">
                <div className="text-lg font-medium mb-2">Select a space to view details</div>
                <div>View members, shared content, and join or request access.</div>
              </div>
            ) : (
              <div className="bg-white rounded shadow p-4 space-y-4">
                <SpaceDetails
                  space={selected}
                  currentUserId={currentUserId}
                  onRequestJoin={() => handleRequestJoin(selected._id || selected.id)}
                  onLeave={() => handleLeave(selected._id || selected.id)}
                  onOpenShare={() => setShowShareNote(true)}
                  onClose={closeSpace}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <ChatFeed spaceId={selected._id || selected.id} currentUserId={currentUserId} socket={socket} />
                  </div>

                  <div>
                    <MemberList members={selected.members || []} admin={selected.admin} currentUserId={currentUserId} spaceId={selected._id || selected.id} />
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Shared Notes</h4>
                      <div>
                        <button
                          onClick={() => openSpace(selected._id || selected.id)}
                          className="text-sm text-indigo-600"
                        >
                          Refresh shared items
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateSpaceModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {showShareNote && selected && (
        <ShareNoteModal
          space={selected}
          onClose={() => setShowShareNote(false)}
          onShare={handleShareNote}
        />
      )}
    </div>
  );
}