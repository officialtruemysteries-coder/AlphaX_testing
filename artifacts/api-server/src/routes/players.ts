/**
 * players.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hidden server-side engagement timer only.
 *
 * Player XP, badges, and streaks are stored exclusively in each device's
 * localStorage — devices are fully isolated.  The only server-side state
 * is an opaque start-timestamp keyed by a random session token, so the
 * server can compute elapsed time without the client ever seeing it.
 *
 * ENGAGEMENT LOGIC (never exposed to the client):
 *   Base award            : 10–25 XP (random)
 *   High-Engagement (>120s): apply a random 70–90% probability threshold;
 *                            on success award 15–30 XP instead.
 *
 * ROUTES
 *   POST /api/players/:playerId/session/start  → { token, ok }
 *   POST /api/players/:playerId/session/award  → { gained }
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { webcrypto } from "node:crypto";

const router: IRouter = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionRecord {
  playerId:  string;
  startTime: number; // epoch ms — the hidden timer origin
  awarded:   boolean; // true after first award → prevents replay
}

// ── In-memory session store ───────────────────────────────────────────────────

const sessions = new Map<string, SessionRecord>();

const SESSION_TTL = 45 * 60 * 1_000; // 45 min — abandon dead sessions

// Sweep orphaned sessions every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [token, s] of sessions) {
    if (s.startTime < cutoff) sessions.delete(token);
  }
}, 10 * 60 * 1_000).unref();

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length >= 1 && id.length <= 128;
}

// Hidden engagement decision — the client receives ONLY the number, never
// the elapsed time or which probability branch fired.
function computeGain(sessionSeconds: number): number {
  if (sessionSeconds > 120) {
    const threshold = 0.70 + Math.random() * 0.20; // 70%–90%
    if (Math.random() < threshold) return randInt(15, 30); // premium boost
  }
  return randInt(10, 25); // base award
}

// ── Game-specific XP rules (hidden from client) ───────────────────────────────
// < 5 s  → 0 XP  (prevents instant-exit exploit)
// 5–59 s → 10–30 XP (random integer, inclusive)
// ≥ 60 s → 15–30 XP (random integer, inclusive)
function computeGameGain(sessionSeconds: number): number {
  if (sessionSeconds < 5)  return 0;
  if (sessionSeconds < 60) return randInt(10, 30);
  return randInt(15, 30);
}

// ── POST /api/players/:playerId/game/start ────────────────────────────────────
// Starts a hidden per-game timer. Returns an opaque token.
router.post("/players/:playerId/game/start", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidId(playerId)) { res.status(400).json({ error: "invalid playerId" }); return; }
  const token = generateToken();
  sessions.set(token, { playerId, startTime: Date.now(), awarded: false });
  res.json({ token, ok: true });
});

// ── POST /api/players/:playerId/game/award ────────────────────────────────────
// Computes elapsed game time, applies game-specific XP rules.
// Returns ONLY { gained } — the client never sees elapsed seconds.
router.post("/players/:playerId/game/award", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidId(playerId)) { res.status(400).json({ error: "invalid playerId" }); return; }

  const { token } = req.body as { token?: string };
  let sessionSeconds = 0;
  if (typeof token === "string") {
    const sess = sessions.get(token);
    if (sess && sess.playerId === playerId && !sess.awarded) {
      sessionSeconds = (Date.now() - sess.startTime) / 1_000;
      sess.awarded = true;
    }
  }

  res.json({ gained: computeGameGain(sessionSeconds) });
});

// ── POST /api/players/:playerId/session/start ─────────────────────────────────
// Starts the hidden engagement timer. Returns an opaque token.
router.post("/players/:playerId/session/start", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }
  const token = generateToken();
  sessions.set(token, { playerId, startTime: Date.now(), awarded: false });
  res.json({ token, ok: true });
});

// ── POST /api/players/:playerId/session/award ─────────────────────────────────
// Looks up the hidden start time, computes elapsed, applies engagement logic.
// Returns ONLY { gained } — no XP state is stored server-side.
router.post("/players/:playerId/session/award", (req: Request, res: Response) => {
  const { playerId } = req.params;
  if (!isValidId(playerId)) {
    res.status(400).json({ error: "invalid playerId" });
    return;
  }

  const { token } = req.body as { token?: string };

  let sessionSeconds = 0;
  if (typeof token === "string") {
    const sess = sessions.get(token);
    if (sess && sess.playerId === playerId && !sess.awarded) {
      sessionSeconds = (Date.now() - sess.startTime) / 1_000;
      sess.awarded = true; // idempotent — prevents double-award on retry
    }
  }

  // Hidden decision — client never sees sessionSeconds or which branch fired
  const gained = computeGain(sessionSeconds);

  res.json({ gained });
});

export default router;
