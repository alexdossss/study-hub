import React from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';

/**
 * SpaceList
 * Props:
 *  - spaces: array of { id/_id, title, description, memberCount }
 *  - onOpen(spaceId): open space details (legacy)
 *  - currentUserId: optional current user id (string)
 *  - showRequestButton: boolean - show "Request to Join" button (default true)
 */
export default function SpaceList({ spaces = [], onOpen = () => {}, currentUserId = null, showRequestButton = true }) {
  const navigate = useNavigate();

  async function handleOpen(space) {
    try {
      onOpen(space._id || space.id);
    } catch (e) {
      console.error('open space failed', e);
    }
  }

  async function handleRequestJoin(e, space) {
    e.stopPropagation();
    try {
      await api.post(`/spaces/${space._id || space.id}/join`);
      alert('Join request sent.');
    } catch (err) {
      console.error('request join failed', err);
      alert(err?.response?.data?.message || 'Failed to request join');
    }
  }

  return (
    <div className="space-y-2">
      {spaces.length === 0 ? (
        <div className="text-sm text-gray-500">No spaces.</div>
      ) : (
        spaces.map((s) => {
          const sid = s._id || s.id;
          return (
            <div
              key={sid}
              className="p-3 border rounded hover:bg-gray-50 cursor-pointer flex items-start justify-between"
              onClick={() => handleOpen(s)}
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-gray-400">· {s.memberCount ?? 0} members</div>
                </div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-2">{s.description || ''}</div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/spaces/${sid}`);
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                >
                  Open
                </button>

                {showRequestButton ? (
                  currentUserId ? (
                    <button
                      onClick={(e) => handleRequestJoin(e, s)}
                      className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Request to Join
                    </button>
                  ) : (
                    <div className="text-xs text-gray-400">Login to join</div>
                  )
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}