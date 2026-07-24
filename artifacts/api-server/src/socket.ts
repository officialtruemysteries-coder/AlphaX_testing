/**
 * socket.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.io server for real-time Tic-Tac-Toe multiplayer.
 *
 * Path: /api/socket.io  (matches the /api/* proxy route in Replit)
 *
 * Events (client → server):
 *   list-rooms          {} → rooms-list
 *   create-room         { isPrivate, profile }   → room-created
 *   join-room-by-id     { roomId, profile }       → room-joined | room-error
 *   join-room-by-code   { code, profile }         → room-joined | room-error
 *   quick-join          { profile }               → room-created | room-joined
 *   make-move           { index }                 → move-synced (broadcast)
 *   reset-game          {}                        → game-reset  (broadcast)
 *   leave-room          {}
 *
 * Events (server → client):
 *   rooms-list          { rooms: PublicRoomSummary[] }
 *   room-created        { roomId, code, isPrivate, hostProfile, waitingForOpponent? }
 *   room-joined         { roomId, role, hostProfile, guestProfile, board, … }
 *   opponent-joined     { guestProfile }
 *   move-synced         { board, currentPlayer, gameResult, isDraw, scores }
 *   game-reset          { board, currentPlayer, scores }
 *   opponent-disconnected {}
 *   room-error          { message }
 */

import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ClientProfile } from "./rooms.js";
import * as R from "./rooms.js";

export function setupSocket(server: HttpServer): void {
  const io = new Server(server, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    // Prefer WebSocket; fall back to polling for restricted environments
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // ── list-rooms ──────────────────────────────────────────────────────────
    socket.on("list-rooms", () => {
      socket.emit("rooms-list", { rooms: R.getPublicRooms() });
    });

    // ── create-room ─────────────────────────────────────────────────────────
    socket.on(
      "create-room",
      ({ isPrivate, profile }: { isPrivate: boolean; profile: ClientProfile }) => {
        const room = R.createRoom(socket.id, isPrivate, profile);
        socket.join(room.id);
        socket.emit("room-created", {
          roomId: room.id,
          code: room.code,
          isPrivate: room.isPrivate,
          hostProfile: room.hostProfile,
          waitingForOpponent: true,
        });
      },
    );

    // ── join-room-by-id (from Browse list) ───────────────────────────────────
    socket.on(
      "join-room-by-id",
      ({ roomId, profile }: { roomId: string; profile: ClientProfile }) => {
        const result = R.joinRoomById(socket.id, roomId, profile);
        if ("error" in result) {
          socket.emit("room-error", { message: result.error });
          return;
        }
        socket.join(result.id);
        socket.emit("room-joined", buildRoomJoinedPayload(result, "guest"));
        io.to(result.hostSocketId).emit("opponent-joined", {
          guestProfile: result.guestProfile,
        });
      },
    );

    // ── join-room-by-code (private room code) ────────────────────────────────
    socket.on(
      "join-room-by-code",
      ({ code, profile }: { code: string; profile: ClientProfile }) => {
        const result = R.joinRoomByCode(socket.id, code, profile);
        if ("error" in result) {
          socket.emit("room-error", { message: result.error });
          return;
        }
        socket.join(result.id);
        socket.emit("room-joined", buildRoomJoinedPayload(result, "guest"));
        io.to(result.hostSocketId).emit("opponent-joined", {
          guestProfile: result.guestProfile,
        });
      },
    );

    // ── quick-join ───────────────────────────────────────────────────────────
    socket.on("quick-join", ({ profile }: { profile: ClientProfile }) => {
      const { room, created } = R.quickJoin(socket.id, profile);
      socket.join(room.id);

      if (created) {
        // No open room found — became host, now waiting
        socket.emit("room-created", {
          roomId: room.id,
          code: room.code,
          isPrivate: false,
          hostProfile: room.hostProfile,
          waitingForOpponent: true,
          quickJoin: true,
        });
      } else {
        // Joined an existing room as guest
        socket.emit("room-joined", buildRoomJoinedPayload(room, "guest"));
        io.to(room.hostSocketId).emit("opponent-joined", {
          guestProfile: room.guestProfile,
        });
      }
    });

    // ── make-move ────────────────────────────────────────────────────────────
    socket.on("make-move", ({ index }: { index: number }) => {
      const room = R.getRoomBySocket(socket.id);
      if (!room || !room.guestSocketId) return; // need both players

      const result = R.makeMove(room, index, socket.id);
      if ("error" in result) return;

      io.to(result.id).emit("move-synced", {
        board: result.board,
        currentPlayer: result.currentPlayer,
        gameResult: result.gameResult,
        isDraw: result.isDraw,
        scores: result.scores,
        bySocketId: socket.id,
      });
    });

    // ── reset-game ───────────────────────────────────────────────────────────
    socket.on("reset-game", () => {
      const room = R.getRoomBySocket(socket.id);
      if (!room || !room.guestSocketId) return;
      const updated = R.resetGame(room);
      io.to(updated.id).emit("game-reset", {
        board: updated.board,
        currentPlayer: updated.currentPlayer,
        scores: updated.scores,
      });
    });

    // ── leave-room ───────────────────────────────────────────────────────────
    socket.on("leave-room", () => {
      handleLeave(socket.id);
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      handleLeave(socket.id);
    });

    // ─── Internal helper ─────────────────────────────────────────────────────
    function handleLeave(socketId: string) {
      const result = R.removeSocket(socketId);
      if (!result) return;
      const { room, role } = result;

      if (role === "host") {
        // Host gone — tell guest (if any) their opponent disconnected
        if (room.guestSocketId) {
          io.to(room.guestSocketId).emit("opponent-disconnected", {});
        }
      } else {
        // Guest gone — tell host
        io.to(room.hostSocketId).emit("opponent-disconnected", {});
      }
    }
  });
}

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildRoomJoinedPayload(room: R.Room, role: "host" | "guest") {
  return {
    roomId: room.id,
    code: room.code,
    isPrivate: room.isPrivate,
    role,
    hostProfile: room.hostProfile,
    guestProfile: room.guestProfile,
    board: room.board,
    currentPlayer: room.currentPlayer,
    scores: room.scores,
    gameResult: room.gameResult,
    isDraw: room.isDraw,
  };
}
