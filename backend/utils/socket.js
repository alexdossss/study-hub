import { Server } from 'socket.io';

/**
 * Socket helper for Study Groups & Spaces
 * - initSocket(httpServer, options) -> initializes io and basic handlers
 * - getIo() -> returns io instance
 *
 * Notes:
 * - This file does minimal auth handling: it reads handshake.auth.userId if provided
 *   and attaches it to socket.userId for convenience. For production, validate JWT.
 */

let io = null;

export function initSocket(httpServer, opts = {}) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: opts.origin || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    ...opts.socketOptions
  });

  io.on('connection', (socket) => {
    // attach userId if client passed it (handshake.auth.userId) — recommend sending validated token
    const userId = socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
    if (userId) {
      socket.userId = userId;
      // join a personal room for user-targeted events
      socket.join(String(userId));
    }

    // join a space room
    socket.on('joinSpace', (payload = {}) => {
      const { spaceId } = payload;
      if (!spaceId) return;
      socket.join(String(spaceId));
      // notify others in the room that a user joined (optional)
      io.to(String(spaceId)).emit('space:userJoined', { spaceId, userId: socket.userId });
    });

    socket.on('leaveSpace', (payload = {}) => {
      const { spaceId } = payload;
      if (!spaceId) return;
      socket.leave(String(spaceId));
      io.to(String(spaceId)).emit('space:userLeft', { spaceId, userId: socket.userId });
    });

    // Chat message coming from client; server should still validate/persist via REST,
    // but this allows instant broadcast if the client trusts the connection.
    socket.on('space:message', (payload = {}) => {
      const { spaceId, message } = payload;
      if (!spaceId || !message) return;
      io.to(String(spaceId)).emit('space:message', message);
    });

    // Admin actions or share notifications can be emitted similarly:
    socket.on('space:share', (payload = {}) => {
      const { spaceId, item } = payload;
      if (!spaceId || !item) return;
      io.to(String(spaceId)).emit('space:sharedItem', item);
    });

    socket.on('disconnect', (reason) => {
      // optional: emit presence update
      // Note: socket.rooms still contains rooms until after disconnect; we avoid heavy ops here.
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error('Socket.io not initialized. Call initSocket(httpServer) first.');
  return io;
}