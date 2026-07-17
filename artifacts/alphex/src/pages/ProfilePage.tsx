import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRecentlyVisited } from '../hooks/useRecentlyVisited';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Terminal, Shield, Award, Zap, Edit2, Check, Clock, Radio } from 'lucide-react';
import { Link } from 'wouter';

// ─── XP System ────────────────────────────────────────────────────────────────
// Persists all XP state in localStorage under 'alphex-xp'.
// Max XP before level-up reset: 1000.
// awardGameTryXP()  — call when a player launches/tries a game (awards 10–30 XP)
// awardVictoryBonus() — call on win (+90 XP)
// applyDefeatResult() — call on loss (0 victory bonus; keeps the try XP already awarded)
// All functions return the updated XP total.

const XP_MAX = 1000;
const XP_KEY = 'alphex-xp';
const XP_LEVEL_KEY = 'alphex-level';

function readXP(): number {
  return parseInt(localStorage.getItem(XP_KEY) ?? '0', 10) || 0;
}
function readLevel(): number {
  return parseInt(localStorage.getItem(XP_LEVEL_KEY) ?? '1', 10) || 1;
}
function writeXP(xp: number, level: number) {
  localStorage.setItem(XP_KEY, String(xp));
  localStorage.setItem(XP_LEVEL_KEY, String(level));
}

/** Returns a random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Awards 10–30 XP for launching/trying a game or app.
 * Triggers a level-up reset if the total crosses XP_MAX.
 * Returns { xp, level, gained }.
 */
export function awardGameTryXP(): { xp: number; level: number; gained: number } {
  const gained = randInt(10, 30);
  let xp = readXP() + gained;
  let level = readLevel();
  if (xp >= XP_MAX) { xp = xp - XP_MAX; level += 1; }
  writeXP(xp, level);
  return { xp, level, gained };
}

/**
 * Awards exactly +90 XP for winning a game.
 * Call this IN ADDITION to awardGameTryXP on victory.
 * Returns { xp, level, gained }.
 */
export function awardVictoryBonus(): { xp: number; level: number; gained: number } {
  const gained = 90;
  let xp = readXP() + gained;
  let level = readLevel();
  if (xp >= XP_MAX) { xp = xp - XP_MAX; level += 1; }
  writeXP(xp, level);
  return { xp, level, gained };
}

/**
 * Records a defeat. No victory bonus is applied — the player keeps only
 * the try XP already awarded by awardGameTryXP(). This function is a
 * no-op XP-wise but returns current state so callers can react.
 * Returns { xp, level }.
 */
export function applyDefeatResult(): { xp: number; level: number } {
  const xp = readXP();
  const level = readLevel();
  return { xp, level };
}

// ─── Live 12-hour clock hook ─────────────────────────────────────────────────
function useLiveClock(): string {
  const fmt = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { visited, totalVisits } = useRecentlyVisited();
  const [username, setUsername] = useLocalStorage('alphex-username', 'PLAYER_001');
  const [sessions] = useLocalStorage('alphex-total-sessions', 1);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);
  const liveTime = useLiveClock();

  // XP from localStorage — react to external changes via storage event
  const [xpState, setXpState] = useState<{ xp: number; level: number }>(() => ({
    xp: readXP(),
    level: readLevel(),
  }));

  useEffect(() => {
    const sync = () => setXpState({ xp: readXP(), level: readLevel() });
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim()) setUsername(editValue.trim());
    else setEditValue(username);
    setIsEditing(false);
  };

  const xpPercentage = Math.min((xpState.xp / XP_MAX) * 100, 100);

  const BADGES = [
    { id: 'explorer', name: 'Explorer',    icon: <Terminal size={20} />, color: 'text-primary border-primary' },
    { id: 'pioneer',  name: 'Pioneer',     icon: <Shield size={20} />,   color: 'text-secondary border-secondary' },
    { id: 'beta',     name: 'Beta Tester', icon: <Award size={20} />,    color: 'text-yellow-400 border-yellow-400/50' },
  ];

  return (
    <div className="min-h-[100dvh] pt-24 pb-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism border border-primary/30 p-8 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-2 border-primary p-1 box-shadow-neon-cyan">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCAyOGMyLjIgMCA0LTEuOCA0LTRWMThjMC0yLjItMS44LTQtNC00cy00IDEuOC00IDR2NmMwIDIuMiAxLjggNCA0IDR6bTAtMTJjMS4xIDAgMiAuOSAyIDJ2NmMwIDEuMS0uOSAyLTIgMnMtMi0uOS0yLTJ2LTZjMC0xLjEuOS0yIDItMnoiIGZpbGw9IiMwMGZmY2MiLz48cGF0aCBkPSJNMjAgMTRjLTIuMiAwLTQtMS44LTQtNHMxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNHptMC02Yy0xLjEgMC0yIC45LTIgMnMuOSAyIDIgMiAyLS45IDItMi0uOS0yLTItMnoiIGZpbGw9IiMwMGZmY2MiLz48cGF0aCBkPSJNMjggMjB2MmMwIDQuNC0zLjYgOC04IDhzLTgtMy42LTgtOHYtMmgtdjJjMCA1LjIgMy45IDkuNCA5IDEwaDJWMzZIMTR2MmgxMnYtMmgtNXYtLjRjNS4xLS42IDktNC44IDktMTB2LTJoLTJ6IiBmaWxsPSIjMDBmZmNjIi8+PC9zdmc+')] bg-center bg-no-repeat bg-[length:60%] opacity-50" />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border border-primary px-3 py-0.5 rounded-full text-[10px] font-display text-primary whitespace-nowrap tracking-widest uppercase">
                Commander
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSave()}
                      className="bg-black/50 border border-primary text-white font-display text-2xl px-3 py-1 rounded focus:outline-none focus:box-shadow-neon-cyan max-w-[200px]"
                      maxLength={15}
                    />
                    <button onClick={handleSave} className="text-green-400 hover:text-white p-1">
                      <Check size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-3xl font-display font-bold text-white tracking-wide">
                      {username}
                    </h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="font-mono text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                STATUS: ONLINE
              </div>

              {/* XP Bar */}
              <div className="mt-6 max-w-md">
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-primary flex items-center gap-1">
                    <Zap size={12} /> XP PROGRESS
                    <span className="ml-2 text-muted-foreground">LVL {xpState.level}</span>
                  </span>
                  <span className="text-white">{xpState.xp} / {XP_MAX}</span>
                </div>
                <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out box-shadow-neon-cyan"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] font-mono text-muted-foreground/60">
                  <span>Try a game: +10–30 XP</span>
                  <span>Victory: +90 XP</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="md:col-span-2 space-y-8">
            {/* Recent Logs */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-display text-xl text-white mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Clock className="text-primary" size={20} />
                Recent Logs
              </h3>
              <div className="space-y-3">
                {visited.length > 0 ? (
                  visited.map((v, i) => {
                    const isProfileEntry = v.path.includes('/profile');
                    return (
                      <Link key={i} href={v.path}>
                        <div className="group glassmorphism border border-border p-4 rounded-lg flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                              {isProfileEntry ? <Radio size={16} /> : <Terminal size={16} />}
                            </div>
                            <div>
                              <div className="font-display text-white group-hover:text-primary transition-colors">
                                {isProfileEntry ? 'Current Time' : v.name}
                              </div>
                              <div className="font-mono text-xs text-muted-foreground">
                                {isProfileEntry ? 'Live Status' : v.path}
                              </div>
                            </div>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                            {isProfileEntry
                              ? <span className="text-primary/90">{liveTime}</span>
                              : new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            }
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-muted-foreground font-mono text-sm border border-dashed border-border rounded-lg bg-card/30">
                    NO RECENT ACTIVITY DETECTED
                  </div>
                )}
              </div>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Telemetry */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-display text-xl text-white mb-4 border-b border-border pb-2">Telemetry</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="glassmorphism p-4 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold font-display text-white mb-1">{totalVisits}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Page Views</div>
                </div>
                <div className="glassmorphism p-4 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold font-display text-primary mb-1 text-shadow-neon-cyan">{sessions}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Sessions</div>
                </div>
              </div>
            </motion.section>

            {/* Badges */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-display text-xl text-white mb-4 border-b border-border pb-2">Badges</h3>
              <div className="space-y-3">
                {BADGES.map(badge => (
                  <div key={badge.id} className="flex items-center gap-4 glassmorphism p-3 rounded-lg border border-border">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-lg border bg-black/50 ${badge.color}`}>
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-sm text-white">{badge.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">UNLOCKED</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

      </div>
    </div>
  );
}
