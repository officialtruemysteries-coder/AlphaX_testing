import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecentlyVisited } from '../hooks/useRecentlyVisited';
import { Terminal, Shield, Award, Zap, Edit2, Check, Clock, Radio, Camera, ChevronDown } from 'lucide-react';
import { Link } from 'wouter';

import {
  readPlayerData,
  readBadges,
  equipBadge,
  saveUsername,
  saveAvatar,
  incrementSession,
  getRankForXP,
  BADGE_DEFS,
  BADGE_ORDER,
  type PlayerData,
  type BadgeState,
  type BadgeId,
} from '../lib/playerProfile';

// Re-export XP functions so external callers import from here
export { awardSessionXP, awardGameTryXP, awardVictoryBonus, applyDefeatResult } from '../lib/playerProfile';

// ─── Session flag ─────────────────────────────────────────────────────────────
const SESSION_FLAG = 'alphex-session-counted';

// ─── Live 12-hour clock hook ──────────────────────────────────────────────────
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

// ─── Equipped badge helper ────────────────────────────────────────────────────
function getEffectiveEquipped(state: BadgeState): BadgeId | null {
  if (state.unlocked.length === 0) return null;
  if (state.equipped && state.unlocked.includes(state.equipped)) return state.equipped;
  return state.unlocked[0];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { visited, totalVisits } = useRecentlyVisited();
  const liveTime = useLiveClock();

  // ── Player data
  const [playerData, setPlayerData] = useState<PlayerData>(() => readPlayerData());
  const [badgeState, setBadgeState] = useState<BadgeState>(() => readBadges());

  const refreshAll = () => {
    setPlayerData(readPlayerData());
    setBadgeState(readBadges());
  };

  // Sync from storage events (e.g. XP awarded by another component)
  useEffect(() => {
    window.addEventListener('storage', refreshAll);
    return () => window.removeEventListener('storage', refreshAll);
  }, []);

  // Count this browser session exactly once
  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, '1');
      incrementSession();
      refreshAll();
    }
  }, []);

  // ── Username editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(playerData.username);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed) { saveUsername(trimmed); refreshAll(); }
    else setEditValue(playerData.username);
    setIsEditing(false);
  };

  // ── Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { saveAvatar(reader.result as string); refreshAll(); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Badge selector
  const [showSelector, setShowSelector] = useState(false);
  const equippedId = getEffectiveEquipped(badgeState);
  const canSwap     = badgeState.unlocked.length >= 2;

  const handleEquip = (id: BadgeId) => {
    equipBadge(id);
    setBadgeState(readBadges());
    setShowSelector(false);
  };

  // ── Rank & XP
  const rank = getRankForXP(playerData.xp);

  return (
    <div className="min-h-[100dvh] pt-24 pb-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Profile Header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism border border-primary/30 p-8 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">

            {/* Avatar column — STATUS sits above the circle */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              {/* STATUS: ONLINE — now lives directly above the avatar */}
              <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                STATUS: ONLINE
              </div>

              {/* Hidden file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={handleAvatarChange}
              />

              {/* Clickable avatar */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change profile picture"
                className="group block w-24 h-24 rounded-full border-2 border-primary p-1 box-shadow-neon-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden relative">
                  {playerData.avatar ? (
                    <img
                      src={playerData.avatar}
                      alt="Player avatar"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCAyOGMyLjIgMCA0LTEuOCA0LTRWMThjMC0yLjItMS44LTQtNC00cy00IDEuOC00IDR2NmMwIDIuMiAxLjggNCA0IDR6bTAtMTJjMS4xIDAgMiAuOSAyIDJ2NmMwIDEuMS0uOSAyLTIgMnMtMi0uOS0yLTJ2LTZjMC0xLjEuOS0yIDItMnoiIGZpbGw9IiMwMGZmY2MiLz48cGF0aCBkPSJNMjAgMTRjLTIuMiAwLTQtMS44LTQtNHMxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNHptMC02Yy0xLjEgMC0yIC45LTIgMnMuOSAyIDIgMiAyLS45IDItMi0uOS0yLTItMnoiIGZpbGw9IiMwMGZmY2MiLz48cGF0aCBkPSJNMjggMjB2MmMwIDQuNC0zLjYgOC04IDhzLTgtMy42LTgtOHYtMmgtdjJjMCA1LjIgMy45IDkuNCA5IDEwaDJWMzZIMTR2MmgxMnYtMmgtNXYtLjRjNS4xLS42IDktNC44IDktMTB2LTJoLTJ6IiBmaWxsPSIjMDBmZmNjIi8+PC9zdmc+')] bg-center bg-no-repeat bg-[length:60%] opacity-50" />
                  )}
                  {/* Camera hover overlay */}
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera size={20} className="text-primary" />
                  </div>
                </div>
              </button>

              {/* Dynamic rank badge below avatar */}
              <div className="bg-black border border-primary px-3 py-0.5 rounded-full text-[10px] font-display text-primary whitespace-nowrap tracking-widest uppercase">
                {rank.name}
              </div>
            </div>

            {/* User info */}
            <div className="flex-1 text-center md:text-left min-w-0">

              {/* Username row */}
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
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
                      {playerData.username}
                    </h2>
                    <button
                      onClick={() => { setEditValue(playerData.username); setIsEditing(true); }}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Active equipped badge (below username, above XP bar) */}
              {equippedId && (
                <div className="mb-4">
                  {/* Title row — tappable when swap is available */}
                  <button
                    onClick={() => canSwap && setShowSelector(s => !s)}
                    className={`flex items-center gap-2 mx-auto md:mx-0 ${canSwap ? 'cursor-pointer' : 'cursor-default'}`}
                    aria-label={canSwap ? 'Switch equipped badge' : undefined}
                  >
                    <img
                      src={BADGE_DEFS[equippedId].img}
                      alt={BADGE_DEFS[equippedId].name}
                      style={{ width: 30, height: 30 }}
                      className="object-contain flex-shrink-0"
                    />
                    <span className="font-display text-sm text-primary tracking-widest uppercase leading-none">
                      {BADGE_DEFS[equippedId].name}
                    </span>
                    {canSwap && (
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${showSelector ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {/* Inline horizontal badge selector */}
                  <AnimatePresence>
                    {canSwap && showSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {badgeState.unlocked.map(id => {
                            const def = BADGE_DEFS[id];
                            const isActive = equippedId === id;
                            return (
                              <button
                                key={id}
                                onClick={() => handleEquip(id)}
                                className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-150 ${
                                  isActive
                                    ? 'border-primary bg-primary/10 shadow-[0_0_8px_rgba(0,255,204,0.3)]'
                                    : 'border-border bg-card/50 hover:border-primary/50'
                                }`}
                              >
                                <img
                                  src={def.img}
                                  alt={def.name}
                                  style={{ width: 30, height: 30 }}
                                  className="object-contain"
                                />
                                <span className="font-mono text-[9px] text-muted-foreground uppercase whitespace-nowrap">
                                  {def.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* XP Bar — bracket-relative fill */}
              <div className="max-w-md mx-auto md:mx-0">
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-primary flex items-center gap-1 flex-wrap">
                    <Zap size={12} /> XP PROGRESS
                    <span className="ml-1 text-muted-foreground">{rank.name} → {rank.max.toLocaleString()} XP</span>
                  </span>
                  <span className="text-white whitespace-nowrap">{playerData.xp.toLocaleString()} / 100K</span>
                </div>
                <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out box-shadow-neon-cyan"
                    style={{ width: `${rank.bracketPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] font-mono text-muted-foreground/60">
                  Explore &amp; Earn: +10–25 XP
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Main grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Main Column */}
          <div className="md:col-span-2 space-y-8">

            {/* Recent Logs — layout & clock logic fully unchanged */}
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
                  <div className="text-2xl font-bold font-display text-primary mb-1 text-shadow-neon-cyan">{playerData.sessions}</div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Total Sessions</div>
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
                {BADGE_ORDER.map(id => {
                  const def   = BADGE_DEFS[id];
                  const owned = badgeState.unlocked.includes(id);
                  const isEq  = equippedId === id;

                  return (
                    <div
                      key={id}
                      className={`flex items-start gap-3 glassmorphism p-3 rounded-lg border transition-colors ${
                        owned ? 'border-border' : 'border-border/40 opacity-60'
                      }`}
                    >
                      {/* Badge image */}
                      <div className="flex-shrink-0 w-[30px] h-[30px] mt-0.5">
                        <img
                          src={def.img}
                          alt={def.name}
                          style={{ width: 30, height: 30 }}
                          className={`object-contain ${owned ? '' : 'grayscale opacity-40'}`}
                        />
                      </div>

                      {/* Name + description */}
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm text-white uppercase">{def.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-snug">
                          {owned ? def.description : 'LOCKED'}
                        </div>
                      </div>

                      {/* Equip button (only if unlocked) */}
                      {owned && (
                        <button
                          onClick={() => handleEquip(id)}
                          className={`flex-shrink-0 text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all ${
                            isEq
                              ? 'border-primary text-primary bg-primary/10 cursor-default'
                              : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                          }`}
                          disabled={isEq}
                        >
                          {isEq ? 'Equipped' : 'Equip'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.section>

          </div>
        </div>

      </div>
    </div>
  );
}
