/**
 * playerProfile.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for player identity, XP, ranks, and badges.
 *
 * STORAGE LAYOUT
 *   alphex-player-id        → stable ID, generated once, never reset
 *   alphex-player-data      → { username, avatar, xp, sessions, createdAt }
 *   alphex-badges           → { unlocked: BadgeId[], equipped: BadgeId | null }
 *   alphex-streak           → { lastDate: "YYYY-MM-DD", days: number }
 *   alphex-owner-rank       → internal rank name string (owner override only)
 *   alphex-gm-auth          → "1" when owner god-mode is authenticated
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
  name: string;         // internal key ("STARTER", "EXPLORER", …)
  emoji: string;        // exactly one emoji
  displayName: string;  // "🥉 STARTER"
  min: number;
  max: number;
}

export interface ResolvedRank extends RankTier {
  bracketPercent: number;
}

// ─── Badge definitions ────────────────────────────────────────────────────────

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

export const BADGE_ORDER: BadgeId[] = ['perfectWeek', 'sleepwalker', 'earlyRiser'];

// ─── Rank table with single-emoji display names ───────────────────────────────

export const RANK_TIERS: RankTier[] = [
  { name: 'STARTER',      emoji: '🥉', displayName: '🥉 STARTER',      min: 0,      max: 500    },
  { name: 'EXPLORER',     emoji: '🧭', displayName: '🧭 EXPLORER',     min: 501,    max: 2_000  },
  { name: 'NOOB',         emoji: '🐣', displayName: '🐣 NOOB',         min: 2_001,  max: 5_000  },
  { name: 'PRO',          emoji: '⚡', displayName: '⚡ PRO',          min: 5_001,  max: 10_000 },
  { name: 'SPECIALIST',   emoji: '🎯', displayName: '🎯 SPECIALIST',   min: 10_001, max: 20_000 },
  { name: 'ADVANCED',     emoji: '🔥', displayName: '🔥 ADVANCED',     min: 20_001, max: 40_000 },
  { name: 'MASTER',       emoji: '💎', displayName: '💎 MASTER',       min: 40_001, max: 65_000 },
  { name: 'LEGEND',       emoji: '👑', displayName: '👑 LEGEND',       min: 65_001, max: 90_000 },
  { name: 'ELITE LEGEND', emoji: '🌌', displayName: '🌌 ELITE LEGEND', min: 90_001, max: 100_000 },
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
  const n = randInt(0, 999);
  return `Player_${String(n).padStart(3, '0')}`;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const ID_KEY        = 'alphex-player-id';
const DATA_KEY      = 'alphex-player-data';
const BADGE_KEY     = 'alphex-badges';
const STREAK_KEY    = 'alphex-streak';
const OWNER_RANK_KEY = 'alphex-owner-rank';
const GM_AUTH_KEY   = 'alphex-gm-auth';

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
    const v = localStorage.getItem('alphex-username');
    if (v) username = JSON.parse(v);
  } catch { /* ignore */ }
  try {
    const v = parseInt(localStorage.getItem('alphex-xp') ?? '0', 10);
    if (!isNaN(v) && v > 0) xp = Math.min(v, XP_MAX);
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
      const p = JSON.parse(raw) as Partial<BadgeState>;
      return {
        unlocked: Array.isArray(p.unlocked) ? p.unlocked : [],
        equipped: p.equipped ?? null,
      };
    }
  } catch { /* ignore */ }
  return { unlocked: [], equipped: null };
}

function writeBadges(state: BadgeState): void {
  localStorage.setItem(BADGE_KEY, JSON.stringify(state));
}

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

/** Owner bypass: instantly unlocks all three ALPHEX badges. */
export function unlockAllBadges(): void {
  const state = readBadges();
  const all: BadgeId[] = ['perfectWeek', 'sleepwalker', 'earlyRiser'];
  all.forEach(id => { if (!state.unlocked.includes(id)) state.unlocked.push(id); });
  if (!state.equipped) state.equipped = all[0];
  writeBadges(state);
}

// ─── Owner rank override ──────────────────────────────────────────────────────

/** Saves an owner-selected rank name override to localStorage. */
export function saveOwnerRankOverride(rankName: string): void {
  localStorage.setItem(OWNER_RANK_KEY, rankName);
}

/** Reads the owner-selected rank override, or null if none set. */
export function readOwnerRankOverride(): string | null {
  return localStorage.getItem(OWNER_RANK_KEY);
}

export function clearOwnerRankOverride(): void {
  localStorage.removeItem(OWNER_RANK_KEY);
}

// ─── God-mode auth ────────────────────────────────────────────────────────────

/** Marks god-mode as authenticated for this session and beyond. */
export function setGodModeAuth(active: boolean): void {
  if (active) localStorage.setItem(GM_AUTH_KEY, '1');
  else        localStorage.removeItem(GM_AUTH_KEY);
}

export function isGodModeAuthenticated(): boolean {
  return localStorage.getItem(GM_AUTH_KEY) === '1';
}

// ─── Streak tracking ──────────────────────────────────────────────────────────

interface StreakData { lastDate: string; days: number; }

function updateStreak(now: Date): BadgeId[] {
  const today = dateKey(now);
  let streak: StreakData = { lastDate: '', days: 0 };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) streak = JSON.parse(raw);
  } catch { /* ignore */ }
  if (streak.lastDate === today) return [];
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  streak.days = streak.lastDate === dateKey(yesterday) ? streak.days + 1 : 1;
  streak.lastDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  if (streak.days >= 7) return tryUnlockBadge('perfectWeek');
  return [];
}

export function readStreak(): { days: number; lastDate: string } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { days: 0, lastDate: '' };
}

// ─── Session XP award ─────────────────────────────────────────────────────────

export function awardSessionXP(sessionSeconds?: number): { xp: number; gained: number; newBadges: BadgeId[] } {
  const data = readPlayerData();
  let gained: number;
  // Internal retention weight modifier — not exposed in UI
  if (sessionSeconds !== undefined && sessionSeconds > 120) {
    const highChance = 0.50 + Math.random() * 0.20;
    gained = Math.random() < highChance ? randInt(15, 25) : randInt(10, 14);
  } else {
    gained = randInt(10, 25);
  }
  data.xp = Math.min(data.xp + gained, XP_MAX);
  writePlayerData(data);
  const now  = new Date();
  const hour = now.getHours();
  const newBadges: BadgeId[] = [];
  if (hour < 9)   newBadges.push(...tryUnlockBadge('earlyRiser'));
  if (hour >= 22) newBadges.push(...tryUnlockBadge('sleepwalker'));
  newBadges.push(...updateStreak(now));
  return { xp: data.xp, gained, newBadges };
}

export function awardGameTryXP(sessionSeconds?: number) { return awardSessionXP(sessionSeconds); }
export function awardVictoryBonus(): { xp: number; gained: number } { return { xp: readPlayerData().xp, gained: 0 }; }
export function applyDefeatResult(): { xp: number } { return { xp: readPlayerData().xp }; }

// ─── Server-computed XP application ──────────────────────────────────────────
// Applies a server-determined XP gain (from the hidden engagement timer) to
// localStorage, then runs the same local badge/streak checks as awardSessionXP.
// This keeps devices fully isolated — the server only computes the gain amount;
// it never stores or merges any player state.
export function applyXPGain(gained: number): { xp: number; gained: number; newBadges: BadgeId[] } {
  const data = readPlayerData();
  data.xp = Math.min(data.xp + Math.max(0, gained), XP_MAX);
  writePlayerData(data);
  const now  = new Date();
  const hour = now.getHours();
  const newBadges: BadgeId[] = [];
  if (hour < 9)   newBadges.push(...tryUnlockBadge('earlyRiser'));
  if (hour >= 22) newBadges.push(...tryUnlockBadge('sleepwalker'));
  newBadges.push(...updateStreak(now));
  return { xp: data.xp, gained, newBadges };
}

// ─── Server state merge ───────────────────────────────────────────────────────
// Called by the frontend after receiving a response from the server-side player
// endpoints.  Merges authoritative server data into localStorage (take-max for
// XP, additive merge for badges, take-higher for streak) so the local cache
// always holds the best known state.

export interface ServerPlayerState {
  xp?:     number;
  badges?: { unlocked?: string[]; equipped?: string | null };
  streak?: { days?: number; lastDate?: string };
}

export function applyServerState(state: ServerPlayerState): void {
  // ── XP: server wins if it has a higher value
  if (typeof state.xp === 'number') {
    const data = readPlayerData();
    if (state.xp > data.xp) {
      data.xp = Math.min(state.xp, XP_MAX);
      writePlayerData(data);
    }
  }

  // ── Badges: additive merge — never revoke what local already has
  if (state.badges) {
    const current = readBadges();
    let changed = false;
    if (Array.isArray(state.badges.unlocked)) {
      for (const id of state.badges.unlocked) {
        const bid = id as BadgeId;
        if (!current.unlocked.includes(bid)) {
          current.unlocked.push(bid);
          changed = true;
        }
      }
    }
    if (
      state.badges.equipped != null &&
      current.unlocked.includes(state.badges.equipped as BadgeId) &&
      !current.equipped
    ) {
      current.equipped = state.badges.equipped as BadgeId;
      changed = true;
    }
    if (changed) writeBadges(current);
  }

  // ── Streak: take the higher day count
  if (state.streak && typeof state.streak.days === 'number') {
    try {
      const raw = localStorage.getItem(STREAK_KEY);
      const local: StreakData = raw ? JSON.parse(raw) : { lastDate: '', days: 0 };
      if (state.streak.days > local.days) {
        localStorage.setItem(STREAK_KEY, JSON.stringify({
          days:     state.streak.days,
          lastDate: state.streak.lastDate ?? local.lastDate,
        }));
      }
    } catch { /* ignore */ }
  }
}

// ─── Rank resolution ──────────────────────────────────────────────────────────
//
// Bracket membership (strict, non-overlapping, ascending):
//   0 – 500        → 🥉 STARTER
//   501 – 2,000    → 🧭 EXPLORER
//   2,001 – 5,000  → 🐣 NOOB
//   5,001 – 10,000 → ⚡ PRO
//   10,001–20,000  → 🎯 SPECIALIST
//   20,001–40,000  → 🔥 ADVANCED
//   40,001–65,000  → 💎 MASTER
//   65,001–90,000  → 👑 LEGEND
//   90,001–100,000 → 🌌 ELITE LEGEND
//
// Rules enforced here:
//  • Input XP is clamped to [0, XP_MAX] before any calculation.
//  • Rank advances INSTANTLY when the XP value crosses a bracket boundary —
//    there is no hysteresis, cooldown, or manual override for standard users.
//  • bracketPercent is progress within the current bracket only (0–100%),
//    NOT a fraction of the full 100 K cap.
//  • Standard users have no code path to downgrade their rank; only the
//    owner god-mode system (in ProfilePage) can override display rank.

export function getRankForXP(xp: number): ResolvedRank {
  // 1. Clamp to valid XP range so stale / corrupt storage never breaks the UI.
  const clamped = Math.max(0, Math.min(xp, XP_MAX));

  // 2. Walk tiers from lowest to highest — first tier whose max >= clamped wins.
  //    The final tier (ELITE LEGEND, max = 100,000) catches everything at the cap.
  let tier = RANK_TIERS[RANK_TIERS.length - 1];
  for (const t of RANK_TIERS) {
    if (clamped <= t.max) {
      tier = t;
      break;
    }
  }

  // 3. Bracket-relative fill: 0% at tier.min, 100% at tier.max.
  const bracketSize     = tier.max - tier.min;
  const bracketProgress = Math.max(0, clamped - tier.min);
  const bracketPercent  = bracketSize > 0
    ? Math.min((bracketProgress / bracketSize) * 100, 100)
    : 100; // degenerate guard (should never fire with current tiers)

  return { ...tier, bracketPercent };
}

/** Resolves a rank by internal name string (for owner override). */
export function getRankByName(name: string): RankTier | null {
  return RANK_TIERS.find(t => t.name === name) ?? null;
}
