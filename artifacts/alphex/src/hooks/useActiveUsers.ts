/**
 * useActiveUsers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * True global online-player counter backed by the shared Express API server.
 *
 * Each browser session gets a stable ID (stored in sessionStorage so new tabs
 * generate new IDs).  The hook:
 *   1. Sends a heartbeat (POST /api/online/heartbeat) immediately on mount,
 *      then every HEARTBEAT_MS milliseconds.
 *   2. Polls the count (GET /api/online/count) every POLL_MS milliseconds as
 *      a secondary refresh so the badge stays current even if a heartbeat
 *      response is delayed.
 *
 * The server purges sessions that have been silent for > 35 s, so the count
 * across all connected devices reflects truly active global visitors.
 */

import { useState, useEffect, useRef } from 'react';

// ── Timings ──────────────────────────────────────────────────────────────────
const HEARTBEAT_MS = 15_000; // send presence every 15 s
const POLL_MS      = 25_000; // refresh count every 25 s (staggered from hb)

// ── API base — relative URL routes through the Replit proxy to the API server
const API = '/api';

// ── Stable per-tab session ID ─────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  const key = 'alphex-online-sid';
  let id = sessionStorage.getItem(key);
  if (!id) {
    // 22-char hex slug — enough entropy, no external dependency
    id = Array.from(crypto.getRandomValues(new Uint8Array(11)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function heartbeat(sessionId: string): Promise<number> {
  try {
    const res = await fetch(`${API}/online/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return 1;
    const data = await res.json() as { count?: number };
    return typeof data.count === 'number' ? Math.max(1, data.count) : 1;
  } catch {
    return 1; // network unavailable — graceful degradation
  }
}

async function fetchCount(): Promise<number> {
  try {
    const res = await fetch(`${API}/online/count`);
    if (!res.ok) return 1;
    const data = await res.json() as { count?: number };
    return typeof data.count === 'number' ? Math.max(1, data.count) : 1;
  } catch {
    return 1;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useActiveUsers() {
  const [activeUsers, setActiveUsers] = useState(1);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    // Initialise session ID inside effect (safe for SSR / concurrent mode)
    if (!sessionId.current) sessionId.current = getOrCreateSessionId();
    const sid = sessionId.current;

    let cancelled = false;

    // Initial heartbeat
    heartbeat(sid).then(n => { if (!cancelled) setActiveUsers(n); });

    // Recurring heartbeat
    const hbTimer = setInterval(() => {
      heartbeat(sid).then(n => { if (!cancelled) setActiveUsers(n); });
    }, HEARTBEAT_MS);

    // Staggered poll (catches remote sessions leaving without a farewell)
    const pollTimer = setInterval(() => {
      fetchCount().then(n => { if (!cancelled) setActiveUsers(n); });
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(hbTimer);
      clearInterval(pollTimer);
    };
  }, []);

  return { activeUsers };
}
