import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

/**
 * SocketProvider
 * - Initializes a socket.io client when a user is logged in.
 * - Attaches auth token / userId for basic identification (backend should validate JWT).
 * - Cleans up on unmount.
 *
 * Usage:
 *  <SocketProvider>
 *    <App />
 *  </SocketProvider>
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // derive token / user info from localStorage (adjust keys to your auth shape)
    let userInfo = null;
    try {
      userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
    } catch (e) {
      userInfo = null;
    }
    const token = userInfo?.token || userInfo?.accessToken || null;
    const userId = userInfo?.id || userInfo?._id || null;

    // do not connect if not logged in
    if (!token && !userId) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const s = io(SOCKET_URL, {
      auth: { token },
      query: { userId },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    s.on('connect', () => {
      // console.debug('socket connected', s.id);
    });
    s.on('connect_error', (err) => {
      console.warn('socket connect_error', err?.message || err);
    });

    setSocket(s);

    return () => {
      try {
        s.disconnect();
      } catch (e) {}
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export default SocketContext;