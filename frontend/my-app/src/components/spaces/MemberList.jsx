import React from 'react';
import api from '../../services/api';
import { useContext } from 'react';
import { SocketContext } from '../../context/SocketContext';

/**
 * MemberList
 * Props:
 *  - members: array of { user: { _id, name, username } } or simple ids
 *  - admin: admin user id or object
 *  - currentUserId: current logged-in user id
 *  - spaceId: optional space id (required to perform remove API)
 */
export default function MemberList({ members = [], admin = null, currentUserId = null, spaceId = null }) {
  const socket = useContext(SocketContext);

  async function handleRemove(userId) {
    if (!spaceId) return alert('Space id not provided');
    if (!confirm('Remove this member from the space?')) return;
    try {
      await api.post(`/spaces/${spaceId}/remove`, { userId });
      alert('Member removed');
      // notify via socket
      try { socket?.emit?.('space:memberRemoved', { spaceId, userId }); } catch (e) {}
    } catch (err) {
      console.error('remove member failed', err);
      alert(err?.response?.data?.message || 'Failed to remove member');
    }
  }

  return (
    <div className="bg-white rounded shadow p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium">Members</div>
        <div className="text-xs text-gray-500">{members.length}</div>
      </div>

      {members.length === 0 ? (
        <div className="text-sm text-gray-500">No members yet.</div>
      ) : (
        <ul className="space-y-2">
          {members.map((m, idx) => {
            const user = m.user || m; // support both shapes
            const uid = user?._id || user?.id || user;
            const name = user?.name || user?.username || `User ${idx + 1}`;
            const isAdmin = String(uid) === String(admin?._id || admin);
            return (
              <li key={uid} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{name} {isAdmin && <span className="text-xs text-indigo-600 ml-2">Admin</span>}</div>
                  <div className="text-xs text-gray-500">{user?.email || ''}</div>
                </div>

                <div className="flex items-center gap-2">
                  {String(uid) === String(currentUserId) ? (
                    <div className="text-xs text-gray-500">You</div>
                  ) : null}

                  {isAdmin ? null : String(currentUserId) === String(admin?._id || admin) ? (
                    <button
                      onClick={() => handleRemove(uid)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}