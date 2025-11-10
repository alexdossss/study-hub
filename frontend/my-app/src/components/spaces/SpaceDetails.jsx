import React, { useEffect, useState } from 'react';
import api from '../../services/api';

/**
 * SpaceDetails
 * Props:
 *  - space: full space object returned by GET /api/spaces/:id
 *  - currentUserId: current logged-in user id (string) or null
 *  - onRequestJoin(): called when user requests join
 *  - onLeave(): called when user leaves
 *  - onOpenShare(): called to open share modal
 *  - onClose(): close details view
 *  - showClose: boolean (default true) - whether to render the Close button
 *  - showRequestButton: boolean (default true) - whether to render Request to Join button when not a member
 */
export default function SpaceDetails({
  space,
  currentUserId,
  onRequestJoin = () => {},
  onLeave = () => {},
  onOpenShare = () => {},
  onClose = () => {},
  showClose = true,
  showRequestButton = true
}) {
  const [details, setDetails] = useState(space);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const isMember = (details?.members || []).some((m) => String(m.user) === String(currentUserId));
  const isAdmin = String(details?.admin) === String(currentUserId);

  useEffect(() => {
    setDetails(space);
    // fetch join requests only for admin
    if (isAdmin) fetchJoinRequests();
    // eslint-disable-next-line
  }, [space, currentUserId]);

  async function fetchJoinRequests() {
    setLoadingRequests(true);
    try {
      // There is not a dedicated endpoint in the scaffolding; we can read space details that include joinRequests
      const { data } = await api.get(`/spaces/${details._id || details.id}`);
      setDetails(data.space);
      setJoinRequests(data.space.joinRequests || []);
    } catch (err) {
      console.error('Failed to load join requests', err);
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleApprove(memberId) {
    try {
      await api.post(`/spaces/${details._id || details.id}/join/${memberId}`, { action: 'approve' });
      await fetchJoinRequests();
      alert('Approved');
    } catch (err) {
      console.error('approve failed', err);
      alert(err?.response?.data?.message || 'Failed to approve');
    }
  }

  async function handleReject(memberId) {
    try {
      await api.post(`/spaces/${details._id || details.id}/join/${memberId}`, { action: 'reject' });
      await fetchJoinRequests();
      alert('Rejected');
    } catch (err) {
      console.error('reject failed', err);
      alert(err?.response?.data?.message || 'Failed to reject');
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-400">Space</div>
          <h2 className="text-2xl font-semibold">{details?.title}</h2>
          <div className="text-sm text-gray-600 mt-1">{details?.description}</div>
          <div className="text-xs text-gray-500 mt-2">{(details?.members || []).length} members</div>
        </div>

        <div className="flex items-center gap-2">
          {showClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              Close
            </button>
          )}

          {isAdmin ? (
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); alert('Link copied'); }}
              className="px-3 py-1 bg-indigo-600 text-white rounded"
            >
              Copy Link
            </button>
          ) : null}

          {!currentUserId ? (
            <div className="text-sm text-gray-500">Login to interact</div>
          ) : isMember ? (
            <div className="flex gap-2">
              <button onClick={onOpenShare} className="px-3 py-1 bg-green-600 text-white rounded">Share</button>
              <button onClick={onLeave} className="px-3 py-1 bg-red-100 text-red-700 rounded">Leave</button>
            </div>
          ) : (
            showRequestButton ? (
              <button onClick={onRequestJoin} className="px-3 py-1 bg-blue-600 text-white rounded">Request to Join</button>
            ) : null
          )}
        </div>
      </div>

      {/* Admin: Join Requests */}
      {isAdmin && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Join Requests</h4>
            <button onClick={fetchJoinRequests} className="text-sm text-indigo-600">Refresh</button>
          </div>

          {loadingRequests ? (
            <div className="text-sm text-gray-500">Loading requests...</div>
          ) : (joinRequests || []).length === 0 ? (
            <div className="text-sm text-gray-500">No pending requests.</div>
          ) : (
            <ul className="space-y-2">
              {joinRequests.map((r) => {
                const uid = r.user?._id || r.user || r.userId;
                const display = r.user?.name || r.user?.username || uid;
                return (
                  <li key={uid} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{display}</div>
                      <div className="text-xs text-gray-500">Requested: {new Date(r.requestedAt || r.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(uid)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                      <button onClick={() => handleReject(uid)} className="px-3 py-1 bg-red-100 text-red-700 rounded">Reject</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Shared Content preview */}
      <div className="mt-6">
        <h4 className="font-medium mb-2">Shared Content</h4>
        {details?.sharedContent?.length ? (
          <div className="space-y-2">
            {details.sharedContent.slice(0, 5).map((c) => (
              <div key={c._id || c._id} className="p-2 border rounded text-sm">
                <div className="text-xs text-gray-500">{c.kind}</div>
                <div className="font-medium">{c.meta?.title || c.meta?.name || 'Shared item'}</div>
                <div className="text-xs text-gray-400">By {String(c.sharedBy)}</div>
              </div>
            ))}
            <div className="text-sm text-gray-500">View full shared list in the space.</div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No shared items yet.</div>
        )}
      </div>
    </div>
  );
}