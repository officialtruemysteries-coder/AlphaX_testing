/**
 * playerProfile.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the player's persistent identity and progression.
 *
 * STORAGE LAYOUT
 *   alphex-player-id    → stable ID, generated once, never reset
 *   alphex-player-data  → { username, avatar, xp, sessions, createdAt }
 *   alphex-badges       → { unlocked: BadgeId[], equipped: BadgeId | null }
 *   alphex-streak       → { lastDate: "YYYY-MM-DD", days: number }
 *
 * XP SCALE:  cumulative 0 → 100,000 (hard cap, no resets)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerData {
  username: string;
  avatar: string | null;
  xp: number;
  sessions: number;
  createdAt: number;
}

export type BadgeId = 'earlyRiser' | 'sleepwalker' | 'perfectWeek';

export interface BadgeState {
  unlocked: BadgeId[];
  equipped: BadgeId | null;
}

export interface RankTier {
  name: string;
  min: number;
  max: number;
}

export interface ResolvedRank extends RankTier {
  bracketPercent: number;
}

// ─── Badge definitions (image paths, names, descriptions) ─────────────────────

export const BADGE_DEFS: Record<BadgeId, { id: BadgeId; name: string; img: string; description: string }> = {
  perfectWeek: {
    id: 'perfectWeek',
    name: 'PERFECT WEEK',
    img: 'assets/badges/perfect_week.png',
    description: 'Play any game or app daily for 7 days in a row!',
  },
  sleepwalker: {
    id: 'sleepwalker',
    name: 'SLEEPWALKER',
    img: 'assets/badges/sleepwalker.png',
    description: 'Play any game or app after 10:00 PM!',
  },
  earlyRiser: {
    id: 'earlyRiser',
    name: 'EARLY RISER',
    img: 'assets/badges/early_riser.png',
    description: 'Play any game or app before 9:00 AM!',
  },
};

/** Ordered list used when rendering badge panels */
export const BADGE_ORDER: BadgeId[] = ['perfectWeek', 'sleepwalker', 'earlyRiser'];

// ─── Rank table ───────────────────────────────────────────────────────────────

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

// ─── Internal helpers ─────────────────────────────────────────────────────────

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

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ID_KEY     = 'alphex-player-id';
const DATA_KEY   = 'alphex-player-data';
const BADGE_KEY  = 'alphex-badges';
const STREAK_KEY = 'alphex-streak';

// ─── Core player ID ───────────────────────────────────────────────────────────

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
  let username = generateDefaultUsername();
  let xp = 0;
  try {
    const legacyName = localStorage.getItem('alphex-username');
    if (legacyName) username = JSON.parse(legacyName);
  } catch { /* ignore */ }
  try {
    const legacyXP = parseInt(localStorage.getItem('alphex-xp') ?? '0', 10);
    if (!isNaN(legacyXP) && legacyXP > 0) xp = Math.min(legacyXP, XP_MAX);
  } catch { /* ignore */ }
  return { username, avatar: null, xp, sessions: 1, createdAt: Date.now() };
}

export function readPlayerData(): PlayerData {
  getOrCreatePlayerId();
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PlayerData>;
      const d = buildDefaultData();
      return {
        username:  typeof p.username  === 'string' ? p.username  : d.username,
        avatar:    p.avatar != null                ? p.avatar    : null,
        xp:        typeof p.xp        === 'number' ? Math.min(p.xp, XP_MAX) : d.xp,
        sessions:  typeof p.sessions  === 'number' ? p.sessions  : d.sessions,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : d.createdAt,
      };
    }
  } catch { /* ignore */ }
  const fresh = buildDefaultData();
  localStorage.setItem(DATA_KEY, JSON.stringify(fresh));
  return fresh;
}

function writePlayerData(data: PlayerData): void {
  getOrCreatePlayerId();
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

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

// ─── Badge state ──────────────────────────────────────────────────────────────

export function readBadges(): BadgeState {
  try {
    const raw = localStorage.getItem(BADGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BadgeState>;
      return {
        unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
        equipped: parsed.equipped ?? null,
      };
    }
  } catch { /* ignore */ }
  return { unlocked: [], equipped: null };
}

function writeBadges(state: BadgeState): void {
  localStorage.setItem(BADGE_KEY, JSON.stringify(state));
}

/** Unlocks a badge if not already unlocked. Auto-equips when it's the first badge. */
function tryUnlockBadge(id: BadgeId): BadgeId[] {
  const state = readBadges();
  if (state.unlocked.includes(id)) return [];
  state.unlocked.push(id);
  if (!state.equipped) state.equipped = id;
  writeBadges(state);
  return [id];
}

export function equipBadge(id: BadgeId): void {
  const state = readBadges();
  if (state.unlocked.includes(id)) {
    state.equipped = id;
    writeBadges(state);
  }
}

// ─── Streak tracking ──────────────────────────────────────────────────────────

interface StreakData {
  lastDate: string;
  days: number;
}

function updateStreak(now: Date): BadgeId[] {
  const today = dateKey(now);
  let streak: StreakData = { lastDate: '', days: 0 };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) streak = JSON.parse(raw);
  } catch { /* ignore */ }

  if (streak.lastDate === today) return []; // already counted today

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (streak.lastDate === dateKey(yesterday)) {
    streak.days += 1;
  } else {
    streak.days = 1; // chain broken — restart at 1
  }
  streak.lastDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));

  if (streak.days >= 7) return tryUnlockBadge('perfectWeek');
  return [];
}

/** Returns current streak progress (days, target 7) for UI display. */
export function readStreak(): { days: number; lastDate: string } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { days: 0, lastDate: '' };
}

// ─── Session XP award (main entry point) ─────────────────────────────────────

/**
 * Awards 10–25 XP whenever a player completes any game/app session.
 * sessionSeconds is passed internally by the session timer — it adjusts the
 * probability weight toward the upper range for longer engagements.
 * This weight logic is intentionally not reflected in any UI string.
 *
 * Also runs all time-based and streak-based badge unlock checks.
 * Returns { xp, gained, newBadges }.
 */
export function awardSessionXP(sessionSeconds?: number): { xp: number; gained: number; newBadges: BadgeId[] } {
  const data = readPlayerData();

  // Internal retention weight modifier — not shown in UI
  let gained: number;
  if (sessionSeconds !== undefined && sessionSeconds > 120) {
    // 50–70 % probability to land in the 15–25 XP tier
    const highChance = 0.50 + Math.random() * 0.20;
    gained = Math.random() < highChance ? randInt(15, 25) : randInt(10, 14);
  } else {
    gained = randInt(10, 25);
  }

  data.xp = Math.min(data.xp + gained, XP_MAX);
  writePlayerData(data);

  // Time-based badge unlocks
  const now    = new Date();
  const hour   = now.getHours();
  const newBadges: BadgeId[] = [];

  if (hour < 9)  newBadges.push(...tryUnlockBadge('earlyRiser'));
  if (hour >= 22) newBadges.push(...tryUnlockBadge('sleepwalker'));

  // Streak / perfect week
  newBadges.push(...updateStreak(now));

  return { xp: data.xp, gained, newBadges };
}

/** Backward-compatible alias — awardGameTryXP now calls awardSessionXP. */
export function awardGameTryXP(sessionSeconds?: number): { xp: number; gained: number; newBadges?: BadgeId[] } {
  return awardSessionXP(sessionSeconds);
}

/** Victory bonus is disabled. Kept as a no-op so existing callers don't break. */
export function awardVictoryBonus(): { xp: number; gained: number } {
  return { xp: readPlayerData().xp, gained: 0 };
}

/** Defeat: no XP change. Returns current state. */
export function applyDefeatResult(): { xp: number } {
  return { xp: readPlayerData().xp };
}

// ─── Rank resolution ──────────────────────────────────────────────────────────

export function getRankForXP(xp: number): ResolvedRank {
  const tier =
    RANK_TIERS.find(t => xp <= t.max) ??
    RANK_TIERS[RANK_TIERS.length - 1];

  let bracketPercent: number;
  if (xp >= XP_MAX) {
    bracketPercent = 100;
  } else {
    const range = tier.max - tier.min;
    bracketPercent = Math.min((Math.max(0, xp - tier.min) / range) * 100, 100);
  }

  return { ...tier, bracketPercent };
}
