/**
 * socket.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton Socket.io client.
 *
 * The socket connects with path /api/socket.io, which the Replit proxy routes
 * to the api-server (all /api/* traffic goes there).
 *
 * Usage:
 *   import { getSocket, disconnectSocket } from '../lib/socket';
 *   const socket = getSocket();   // connects on first call
 *   disconnectSocket();           // cleans up when leaving online mode
 */

import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
