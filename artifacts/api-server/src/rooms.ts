/**
 * rooms.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * In-memory room manager for Tic-Tac-Toe online multiplayer.
 *
 * Host   = X = always moves first
 * Guest  = O = always moves second
 *
 * All room state is ephemeral — lost on server restart.
 */

import crypto from "node:crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Cell = "X" | "O" | null;

export interface ClientProfile {
  playerId: string;
  username: string;
  xp: number;
  rankDisplayName: string | null;
  equippedBadgeName: string | null;
}

export interface Room {
  id: string;
  code: string;
  isPrivate: boolean;
  hostSocketId: string;
  guestSocketId: string | null;
  hostProfile: ClientProfile;
  guestProfile: ClientProfile | null;
  board: Cell[];
  currentPlayer: "X" | "O";
  gameResult: { winner: "X" | "O"; line: number[] } | null;
  isDraw: boolean;
  scores: { X: number; O: number; draw: number };
  createdAt: number;
}

export interface PublicRoomSummary {
  id: string;
  hostUsername: string;
  hostRank: string | null;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
// socketId → roomId for O(1) lookup on disconnect
const socketToRoom = new Map<string, string>();

// ─── Win logic ────────────────────────────────────────────────────────────────

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function checkWinner(board: Cell[]): { winner: "X" | "O"; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as "X" | "O", line };
    }
  }
  return null;
}

// ─── ID & code generation ─────────────────────────────────────────────────────

function generateRoomId(): string {
  return crypto.randomBytes(8).toString("hex");
}

/** Generates a code like AX-89B2 — 4 alphanumeric chars, uppercase, no ambiguous chars */
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "AX-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure uniqueness
  for (const room of rooms.values()) {
    if (room.code === code) return generateRoomCode();
  }
  return code;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createRoom(
  socketId: string,
  isPrivate: boolean,
  profile: ClientProfile,
): Room {
  // One socket → one room at a time
  leaveCurrentRoom(socketId);

  const id = generateRoomId();
  const code = generateRoomCode();
  const room: Room = {
    id,
    code,
    isPrivate,
    hostSocketId: socketId,
    guestSocketId: null,
    hostProfile: profile,
    guestProfile: null,
    board: Array(9).fill(null) as Cell[],
    currentPlayer: "X",
    gameResult: null,
    isDraw: false,
    scores: { X: 0, O: 0, draw: 0 },
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  socketToRoom.set(socketId, id);
  return room;
}

/** Join an existing room by its internal ID. */
export function joinRoomById(
  socketId: string,
  roomId: string,
  profile: ClientProfile,
): Room | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Invalid or Expired Room Code. Please check the code." };
  if (room.guestSocketId) return { error: "Invalid or Expired Room Code. Please check the code." };
  if (room.hostSocketId === socketId) return { error: "You are already the host of this room." };

  leaveCurrentRoom(socketId);

  room.guestSocketId = socketId;
  room.guestProfile = profile;
  socketToRoom.set(socketId, room.id);
  return room;
}

/** Join a room using its 6-character code (private room flow). */
export function joinRoomByCode(
  socketId: string,
  code: string,
  profile: ClientProfile,
): Room | { error: string } {
  const normalized = code.trim().toUpperCase();
  for (const room of rooms.values()) {
    if (room.code === normalized) {
      return joinRoomById(socketId, room.id, profile);
    }
  }
  return { error: "Invalid or Expired Room Code. Please check the code." };
}

/** Auto-match into the first open public room, or create one if none exists. */
export function quickJoin(
  socketId: string,
  profile: ClientProfile,
): { room: Room; created: boolean } {
  for (const room of rooms.values()) {
    if (!room.isPrivate && !room.guestSocketId && room.hostSocketId !== socketId) {
      const result = joinRoomById(socketId, room.id, profile);
      if (!("error" in result)) return { room: result, created: false };
    }
  }
  return { room: createRoom(socketId, false, profile), created: true };
}

/** All open public rooms (waiting for a guest). */
export function getPublicRooms(): PublicRoomSummary[] {
  const result: PublicRoomSummary[] = [];
  for (const room of rooms.values()) {
    if (!room.isPrivate && !room.guestSocketId) {
      result.push({
        id: room.id,
        hostUsername: room.hostProfile.username,
        hostRank: room.hostProfile.rankDisplayName,
      });
    }
  }
  return result;
}

export function getRoomBySocket(socketId: string): Room | null {
  const roomId = socketToRoom.get(socketId);
  return roomId ? (rooms.get(roomId) ?? null) : null;
}

/** Apply a move. Returns the updated room or an error string. */
export function makeMove(
  room: Room,
  index: number,
  socketId: string,
): Room | { error: string } {
  if (room.board[index]) return { error: "Cell occupied" };
  if (room.gameResult || room.isDraw) return { error: "Game over" };

  // Enforce turn order
  const isHost = room.hostSocketId === socketId;
  const mySymbol: Cell = isHost ? "X" : "O";
  if (room.currentPlayer !== mySymbol) return { error: "Not your turn" };

  room.board[index] = mySymbol;
  const result = checkWinner(room.board);
  if (result) {
    room.gameResult = result;
    room.scores[result.winner]++;
  } else if (room.board.every((c) => c !== null)) {
    room.isDraw = true;
    room.scores.draw++;
  } else {
    room.currentPlayer = room.currentPlayer === "X" ? "O" : "X";
  }
  return room;
}

/** Reset board for a new round (scores persist). */
export function resetGame(room: Room): Room {
  room.board = Array(9).fill(null) as Cell[];
  room.currentPlayer = "X";
  room.gameResult = null;
  room.isDraw = false;
  return room;
}

/**
 * Remove a socket from its room.
 * Returns the room and the role that left, so the caller can notify the other player.
 * If host leaves, the room is deleted entirely.
 * If guest leaves, the guest slot is cleared (room persists, waiting for new guest).
 */
export function removeSocket(
  socketId: string,
): { room: Room; role: "host" | "guest" } | null {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return null;
  socketToRoom.delete(socketId);

  const room = rooms.get(roomId);
  if (!room) return null;

  if (room.hostSocketId === socketId) {
    if (room.guestSocketId) socketToRoom.delete(room.guestSocketId);
    rooms.delete(roomId);
    return { room, role: "host" };
  }

  if (room.guestSocketId === socketId) {
    room.guestSocketId = null;
    room.guestProfile = null;
    room.board = Array(9).fill(null) as Cell[];
    room.currentPlayer = "X";
    room.gameResult = null;
    room.isDraw = false;
    return { room, role: "guest" };
  }

  return null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function leaveCurrentRoom(socketId: string): void {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  socketToRoom.delete(socketId);
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.hostSocketId === socketId) {
    if (room.guestSocketId) socketToRoom.delete(room.guestSocketId);
    rooms.delete(roomId);
  } else if (room.guestSocketId === socketId) {
    room.guestSocketId = null;
    room.guestProfile = null;
  }
}
