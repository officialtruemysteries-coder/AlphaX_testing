/**
 * players.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side player identity, XP, badge, and streak tracking.
 *
 * All data lives in in-memory Maps keyed by stable Player ID.  The same
 * Player ID generated once in the browser's localStorage is used as the
 * primary key here, so any device that knows a player's ID can retrieve and
 * update their state in real-time.
 *
 * ROUTES
 *   GET  /api/players/:playerId               → current player state
 *   POST /api/players/:playerId/sync          → merge local→server (first-load hydration)
 *   POST /api/players/:playerId/session/start → start hidden engagement timer
 *   POST /api/players/:playerId/session/award → compute duration, award XP, check badges
 *   POST /api/players/:playerId/badges        → update equipped badge
 *   POST /api/players/:playerId/unlock-all    → owner god-mode: unlock every badge
 *
 * ENGAGEMENT LOGIC (hidden from client)
 *   Base award        : 10–25 XP (random)
 *   High-Engagement   : if session duration > 120 s, apply a 70–90 % probability
 *                       modifier; on success award 15–30 XP (random within range).
 *   The session token is an opaque random hex string — the client never sees
 *   elapsed time or which branch fired.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { webcrypto } from "node:crypto";

const router: IRouter = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeId = "earlyRiser" | "sleepwalker" | "perfectWeek";

interface BadgeState {
  unlocked: BadgeId[];
  equipped: BadgeId | null;
}

interface StreakData {
  lastDate: string; // "YYYY-MM-DD" in UTC
  days: number;
}

interface PlayerRecord {
  xp: number;
  badges: BadgeState;
  streak: StreakData;
  lastSeen: number;
}

interface SessionRecord {
  playerId: string;
  startTime: number; // epoch ms — the hidden timer origin
  awarded: boolean;  // prevents double-award on replay
}

// ── In-memory stores ──────────────────────────────────────────────────────────

const players = new Map<string, PlayerRecord>();
const sessions = new Map<string, SessionRecord>();

const XP_MAX       = 100_000;
const SESSION_TTL  = 45 * 60 * 1_000; // 45 min — abandon dead sessions

// Sweep orphaned sessions every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [token, s] of sessions) {
    if (s.startTime < cutoff) sessions.delete(token);
  }
}, 10 * 60 * 1_000).unref();

// ── Internal helpers ──────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateToken(): string {
  const bytes = new Uint8Array(20);
  webcrypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function isValidPlayerId(id: unknown): id is string {
  return typeof id === "string" && id.length >= 1 && id.length <= 128;
}

function getOrCreate(playerId: string): PlayerRecord {
  if (!players.has(playerId)) {
    players.set(playerId, {
      xp:      0,
      badges:  { unlocked: [], equipped: null },
      streak:  { lastDate: "", days: 0 },
      lastSeen: Date.now(),
    });
  }
  return players.get(playerId)!;
}

// ── Hidden engagement logic ───────────────────────────────────────────────────
// The client NEVER receives elapsed time or which branch fired.
function computeGain(sessionSeconds: number): number {
  if (sessionSeconds > 120) {
    // 70 %–90 % probability threshold — randomised each call
    const threshold = 0.70 + Math.random() * 0.20;
    if (Math.random() < threshold) {
      return randInt(15, 30); // premium engagement reward
    }
  }
  return randInt(10, 25); // standard base reward
}

// ── Badge & streak side-effects ───────────────────────────────────────────────

function tryUnlock(badges: BadgeState, id: BadgeId): BadgeId | null {
  if (badges.unlocked.includes(id)) return null;
  badges.unlocked.push(id);
  if (!badges.equipped) badges.equipped = id;
  return id;
}

function runBadgeChecks(player: PlayerRecord, nowTs: number): BadgeId[] {
  const now   = new Date(nowTs);
  const hour  = now.getHours();
  const today = dateKey(nowTs);
  const earned: BadgeId[] = [];

  // ── Time-of-day badges
  if (hour < 9) {
    const b = tryUnlock(player.badges, "earlyRiser");
    if (b) earned.push(b);
  }
  if (hour >= 22) {
    const b = tryUnlock(player.badges, "sleepwalker");
    if (b) earned.push(b);
  }

  // ── Streak / perfectWeek
  if (player.streak.lastDate !== today) {
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const wasYesterday = player.streak.lastDate === dateKey(yesterday.getTime());
    player.streak.days     = wasYesterday ? player.streak.days + 1 : 1;
    player.streak.lastDate = today;

    if (player.streak.days >= 7) {
      const b = tryUnlock(player.badges, "perfectWeek");
      if (b) earned.push(b);
    }
  }

  return earned;
}

// ── Route helpers ─────────────────────────────────────────────────────────────

function playerSnapshot(p: PlayerRecord) {
  return { xp: p.xp, badges: p.badges, streak: p.streak };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/players/:playerId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/players/:playerId", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }
  const p = getOrCreate(playerId);
  p.lastSeen = Date.now();
  res.json(playerSnapshot(p));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/players/:playerId/sync
// Body: { xp?, badges?, streak? }
// Merges local browser state into the server record (take-max strategy).
// Called once on app load so the server has a starting point.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/players/:playerId/sync", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }

  const { xp, badges, streak } = req.body as {
    xp?:     number;
    badges?: { unlocked?: string[]; equipped?: string | null };
    streak?: { days?: number; lastDate?: string };
  };

  const p = getOrCreate(playerId);
  p.lastSeen = Date.now();

  // XP — take the higher value (local progress beats a fresh server record)
  if (typeof xp === "number" && xp > p.xp) {
    p.xp = Math.min(xp, XP_MAX);
  }

  // Badges — merge; never remove what server already has
  if (badges && Array.isArray(badges.unlocked)) {
    for (const id of badges.unlocked) {
      const bid = id as BadgeId;
      if (!p.badges.unlocked.includes(bid)) p.badges.unlocked.push(bid);
    }
    if (badges.equipped && !p.badges.equipped) {
      p.badges.equipped = badges.equipped as BadgeId;
    }
  }

  // Streak — take the higher day count
  if (streak && typeof streak.days === "number" && streak.days > p.streak.days) {
    p.streak.days     = streak.days;
    p.streak.lastDate = streak.lastDate ?? p.streak.lastDate;
  }

  res.json(playerSnapshot(p));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/players/:playerId/session/start
// Starts the hidden engagement timer. Returns an opaque token.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/players/:playerId/session/start", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }
  getOrCreate(playerId).lastSeen = Date.now();
  const token = generateToken();
  sessions.set(token, { playerId, startTime: Date.now(), awarded: false });
  // Return only the opaque token — no timing info leaks to client
  res.json({ token, ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/players/:playerId/session/award
// Body: { token }
// Looks up the hidden start time, computes elapsed, applies engagement logic,
// awards XP, runs badge checks. Returns { xp, gained, newBadges, badges, streak }.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/players/:playerId/session/award", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }

  const { token } = req.body as { token?: string };
  const p = getOrCreate(playerId);
  p.lastSeen = Date.now();

  // Compute elapsed from hidden server-side timer
  let sessionSeconds = 0;
  if (typeof token === "string") {
    const sess = sessions.get(token);
    if (sess && sess.playerId === playerId && !sess.awarded) {
      sessionSeconds = (Date.now() - sess.startTime) / 1_000;
      sess.awarded = true; // idempotent — won't fire twice on retry
    }
  }

  // Hidden engagement decision — client never sees sessionSeconds or which branch
  const gained = computeGain(sessionSeconds);
  p.xp = Math.min(p.xp + gained, XP_MAX);

  const newBadges = runBadgeChecks(p, Date.now());

  res.json({
    xp:        p.xp,
    gained,                   // only the awarded amount, not the duration
    newBadges,
    badges:    p.badges,
    streak:    p.streak,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/players/:playerId/badges
// Body: { equipped: BadgeId }
// Updates the player's equipped badge.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/players/:playerId/badges", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }
  const { equipped } = req.body as { equipped?: string };
  const p = getOrCreate(playerId);
  p.lastSeen = Date.now();
  if (typeof equipped === "string" && p.badges.unlocked.includes(equipped as BadgeId)) {
    p.badges.equipped = equipped as BadgeId;
  }
  res.json({ badges: p.badges });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/players/:playerId/unlock-all
// Owner god-mode bypass: instantly unlocks every badge.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/players/:playerId/unlock-all", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }
  const p = getOrCreate(playerId);
  p.lastSeen = Date.now();
  const all: BadgeId[] = ["perfectWeek", "sleepwalker", "earlyRiser"];
  for (const id of all) {
    if (!p.badges.unlocked.includes(id)) p.badges.unlocked.push(id);
  }
  if (!p.badges.equipped) p.badges.equipped = all[0];
  res.json({ badges: p.badges });
});

export default router;
