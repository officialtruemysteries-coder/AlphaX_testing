/**
 * onlineTypes.ts
 * Shared types for online multiplayer — used by both OnlineLobby and OnlineGame.
 */

export type Cell = "X" | "O" | null;

export interface ClientProfile {
  playerId: string;
  username: string;
  xp: number;
  rankDisplayName: string | null;
  equippedBadgeName: string | null;
}

export interface PublicRoomSummary {
  id: string;
  hostUsername: string;
  hostRank: string | null;
}

export interface OnlineGameState {
  roomId: string;
  mySymbol: "X" | "O";
  hostProfile: ClientProfile;
  guestProfile: ClientProfile;
  board: Cell[];
  currentPlayer: "X" | "O";
  scores: { X: number; O: number; draw: number };
  gameResult: { winner: "X" | "O"; line: number[] } | null;
  isDraw: boolean;
}
