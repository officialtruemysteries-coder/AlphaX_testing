/**
 * usernames.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side unique display-name registry.
 *
 * Every device claims its display name here on page load and on every rename.
 * Two-way Maps give O(1) lookups in both directions — by name and by Player ID.
 * Names are compared case-insensitively so "Alpha" and "alpha" collide.
 *
 * ROUTES
 *   POST /api/usernames/claim
 *     Body: { name: string, playerId: string, previousName?: string }
 *     • If name is unclaimed  → claim it for playerId, release previousName, ok.
 *     • If name is already held by the same playerId → idempotent ok.
 *     • If name is held by a different playerId → 409 { ok: false, error: "taken" }.
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// ── Bidirectional registry ─────────────────────────────────────────────────
// normalizedName  → playerId   (who owns this name?)
// playerId        → normalizedName   (what name does this player hold?)
const nameToClaimer = new Map<string, string>();
const claimerToName = new Map<string, string>();

function norm(name: string): string {
  return name.trim().toLowerCase();
}

// ── POST /api/usernames/claim ──────────────────────────────────────────────
router.post("/usernames/claim", (req: Request, res: Response) => {
  const { name, playerId, previousName } = req.body as {
    name?:         string;
    playerId?:     string;
    previousName?: string;
  };

  // Validation
  if (
    typeof name     !== "string" || name.trim().length < 1 || name.trim().length > 15 ||
    typeof playerId !== "string" || playerId.length < 1    || playerId.length > 128
  ) {
    res.status(400).json({ ok: false, error: "invalid input" });
    return;
  }

  const key = norm(name);

  // Case 1: name already belongs to this same player — idempotent
  if (nameToClaimer.get(key) === playerId) {
    res.json({ ok: true });
    return;
  }

  // Case 2: name is claimed by a DIFFERENT player → deny
  if (nameToClaimer.has(key)) {
    res.status(409).json({ ok: false, error: "taken" });
    return;
  }

  // Case 3: name is free → claim it, release the player's previous name
  const prevKey = previousName ? norm(previousName) : claimerToName.get(playerId);
  if (prevKey && nameToClaimer.get(prevKey) === playerId) {
    nameToClaimer.delete(prevKey);
  }

  nameToClaimer.set(key, playerId);
  claimerToName.set(playerId, key);

  res.json({ ok: true });
});

export default router;
