/**
 * playerProfile.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the player's persistent identity and progression.
 *
 * STORAGE LAYOUT (all keys are independent — updating one never touches others)
 *   alphex-player-id    → stable UUID-like string, generated once, never reset
 *   alphex-player-data  → JSON blob: { username, avatar, xp, sessions, createdAt }
 *
 * XP SCALE:  cumulative 0 → 100,000 (hard cap; no resets, no wipes)
 * RANKS:     determined solely by cumulative XP
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerData {
  username: string;
  avatar: string | null;   // Base64 data-URL or null
  xp: number;              // cumulative, 0–100 000
  sessions: number;        // lifetime session count
  createdAt: number;       // epoch ms of first visit
}

export interface RankTier {
  name: string;
  min: number;
  max: number;
}

export interface ResolvedRank extends RankTier {
  /** 0–100: how far through the current bracket the player is */
  bracketPercent: number;
}

// ─── Rank table ──────────────────────────────────────────────────────────────

export const RANK_TIERS: RankTier[] = [
  { name: 'STARTER',      min: 0,      max: 500    },
  { name: 'EXPLORER',     min: 501,    max: 2_000  },
  { name: 'NOOB',         min: 2_001,  max: 5_000  },
  { name: 'PRO',          min: 5_001,  max: 10_000 },
  { name: 'SPECIALIST',   min: 10_001, max: 20_000 },
  { name: 'ADVANCED',     min: 20_001, max: 40_000 },
  { name: 'MASTER',       min: 40_001, max: 65_000 },
  { name: 'LEGEND',       min: 65_001, max: 90_000 },
  { name: 'ELITE LEGEND', min: 90_001, max: 100_000 },
];

export const XP_MAX = 100_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePlayerId(): string {
  const hex = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  return `AX-${hex()}${hex()}-${hex()}-${Date.now().toString(36).toUpperCase()}`;
}

function generateDefaultUsername(): string {
  return `PLAYER_${randInt(100, 999)}`;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ID_KEY   = 'alphex-player-id';
const DATA_KEY = 'alphex-player-data';

// ─── Core ID (immutable once set) ────────────────────────────────────────────

/**
 * Returns the player's permanent ID, creating it on first call.
 * Call as many times as you like — it always returns the same value.
 */
export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = generatePlayerId();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

// ─── Player data ──────────────────────────────────────────────────────────────

function buildDefaultData(): PlayerData {
  // One-time migration: carry over any username/XP set by the old key scheme
  let username = generateDefaultUsername();
  let xp = 0;

  try {
    const legacyUsername = localStorage.getItem('alphex-username');
    if (legacyUsername) username = JSON.parse(legacyUsername);
  } catch { /* ignore */ }

  try {
    const legacyXP = parseInt(localStorage.getItem('alphex-xp') ?? '0', 10);
    if (!isNaN(legacyXP) && legacyXP > 0) xp = Math.min(legacyXP, XP_MAX);
  } catch { /* ignore */ }

  return { username, avatar: null, xp, sessions: 1, createdAt: Date.now() };
}

export function readPlayerData(): PlayerData {
  getOrCreatePlayerId(); // ensure ID exists
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerData>;
      const defaults = buildDefaultData();
      // Merge: stored values win, defaults fill missing fields
      return {
        username:  typeof parsed.username  === 'string'  ? parsed.username  : defaults.username,
        avatar:    parsed.avatar != null                  ? parsed.avatar    : null,
        xp:        typeof parsed.xp        === 'number'  ? Math.min(parsed.xp, XP_MAX) : defaults.xp,
        sessions:  typeof parsed.sessions  === 'number'  ? parsed.sessions  : defaults.sessions,
        createdAt: typeof parsed.createdAt === 'number'  ? parsed.createdAt : defaults.createdAt,
      };
    }
  } catch { /* ignore */ }
  const fresh = buildDefaultData();
  // Persist immediately so subsequent reads are consistent
  localStorage.setItem(DATA_KEY, JSON.stringify(fresh));
  return fresh;
}

function writePlayerData(data: PlayerData): void {
  getOrCreatePlayerId();
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// ─── Selective field writers ──────────────────────────────────────────────────
// Each one reads → patches one field → writes. XP/sessions/etc are never touched
// by username or avatar saves.

export function saveUsername(name: string): void {
  const data = readPlayerData();
  data.username = name;
  writePlayerData(data);
}

export function saveAvatar(base64: string | null): void {
  const data = readPlayerData();
  data.avatar = base64;
  writePlayerData(data);
}

export function incrementSession(): void {
  const data = readPlayerData();
  data.sessions += 1;
  writePlayerData(data);
}

// ─── XP functions ─────────────────────────────────────────────────────────────

/**
 * Awards 10–30 XP for launching/trying a game or app.
 * XP is cumulative and caps at XP_MAX (100 000). No resets.
 */
export function awardGameTryXP(): { xp: number; gained: number } {
  const data = readPlayerData();
  const gained = randInt(10, 30);
  data.xp = Math.min(data.xp + gained, XP_MAX);
  writePlayerData(data);
  return { xp: data.xp, gained };
}

/**
 * Awards +90 XP for winning. Call in addition to awardGameTryXP on victory.
 */
export function awardVictoryBonus(): { xp: number; gained: number } {
  const data = readPlayerData();
  const gained = 90;
  data.xp = Math.min(data.xp + gained, XP_MAX);
  writePlayerData(data);
  return { xp: data.xp, gained };
}

/**
 * Defeat: no victory bonus. Returns current state for callers to react to.
 */
export function applyDefeatResult(): { xp: number } {
  return { xp: readPlayerData().xp };
}

// ─── Rank resolution ──────────────────────────────────────────────────────────

/**
 * Returns the rank tier the player is currently in, plus a bracketPercent
 * (0–100) showing how far they are through that tier's XP range.
 */
export function getRankForXP(xp: number): ResolvedRank {
  const tier =
    RANK_TIERS.find(t => xp <= t.max) ??
    RANK_TIERS[RANK_TIERS.length - 1];

  let bracketPercent: number;
  if (xp >= XP_MAX) {
    bracketPercent = 100;
  } else {
    const bracketRange = tier.max - tier.min;
    const bracketXP    = Math.max(0, xp - tier.min);
    bracketPercent     = Math.min((bracketXP / bracketRange) * 100, 100);
  }

  return { ...tier, bracketPercent };
}
