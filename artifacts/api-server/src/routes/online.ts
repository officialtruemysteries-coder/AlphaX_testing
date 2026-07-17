/**
 * online.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * True global online-player counter.
 *
 * Clients POST a heartbeat every 15 s with a stable browser-session ID.
 * The server stores { sessionId → lastSeen } in memory and purges stale
 * entries (> 35 s old) every 30 s.  Both endpoints return the live count.
 *
 * Routes:
 *   POST /api/online/heartbeat  { sessionId: string } → { count, ok }
 *   GET  /api/online/count                           → { count }
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// ── In-memory presence map ─────────────────────────────────────────────────
// sessionId → epoch ms of last heartbeat
const sessions = new Map<string, number>();

const STALE_MS  = 35_000; // a session is "gone" if no heartbeat for 35 s
const SWEEP_MS  = 30_000; // sweep interval

// Remove sessions that have gone silent
setInterval(() => {
  const cutoff = Date.now() - STALE_MS;
  for (const [id, ts] of sessions) {
    if (ts < cutoff) sessions.delete(id);
  }
}, SWEEP_MS).unref(); // don't keep process alive just for this timer

// Count sessions active in the last STALE_MS milliseconds
function liveCount(): number {
  const cutoff = Date.now() - STALE_MS;
  let n = 0;
  for (const ts of sessions.values()) {
    if (ts >= cutoff) n++;
  }
  return Math.max(1, n); // always report at least 1 (the requester)
}

// ── POST /api/online/heartbeat ─────────────────────────────────────────────
router.post("/online/heartbeat", (req: Request, res: Response) => {
  const { sessionId } = req.body as Record<string, unknown>;
  if (
    typeof sessionId !== "string" ||
    sessionId.length < 1 ||
    sessionId.length > 128
  ) {
    res.status(400).json({ error: "invalid sessionId" });
    return;
  }
  sessions.set(sessionId, Date.now());
  res.json({ count: liveCount(), ok: true });
});

// ── GET /api/online/count ──────────────────────────────────────────────────
router.get("/online/count", (_req: Request, res: Response) => {
  res.json({ count: liveCount() });
});

export default router;
