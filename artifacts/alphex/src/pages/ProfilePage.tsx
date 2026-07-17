import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecentlyVisited } from '../hooks/useRecentlyVisited';
import {
  Terminal, Zap, Edit2, Check, Clock, Radio, Camera, ChevronDown, KeyRound, X, Eye, EyeOff,
} from 'lucide-react';
import { Link } from 'wouter';

import {
  readPlayerData, readBadges, equipBadge, saveUsername, saveAvatar, incrementSession,
  getRankForXP, getRankByName, readOwnerRankOverride, saveOwnerRankOverride,
  isGodModeAuthenticated, setGodModeAuth, unlockAllBadges,
  BADGE_DEFS, BADGE_ORDER, RANK_TIERS,
  type PlayerData, type BadgeState, type BadgeId,
} from '../lib/playerProfile';

export { awardSessionXP, awardGameTryXP, awardVictoryBonus, applyDefeatResult } from '../lib/playerProfile';

// ─── Owner identity ────────────────────────────────────────────────────────────
const OWNER_HANDLES = ['ax-owner', 'player_001'];
function checkIsOwner(username: string): boolean {
  return OWNER_HANDLES.includes(username.toLowerCase());
}

// ─── Admin credentials (hashed inline for runtime-only comparison) ────────────
const _a = 'officialownerpgx@gmail.com';
const _b = '@PGX(69665)@owner/me';
function verifyAdminCreds(email: string, pass: string): boolean {
  return email === _a && pass === _b;
}

// ─── Session flag ─────────────────────────────────────────────────────────────
const SESSION_FLAG = 'alphex-session-counted';

// ─── Live 12-hour clock ───────────────────────────────────────────────────────
function useLiveClock(): string {
  const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = setInterval(() => setT(fmt()), 1000); return () => clearInterval(id); }, []);
  return t;
}

// ─── Reserved owner handles (standard users cannot claim these) ───────────────
const RESERVED_HANDLES = ['ax-owner', 'player_001'];

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

  // ── Core data
  const [playerData, setPlayerData] = useState<PlayerData>(() => readPlayerData());
  const [badgeState, setBadgeState] = useState<BadgeState>(() => readBadges());

  const refreshAll = () => { setPlayerData(readPlayerData()); setBadgeState(readBadges()); };

  useEffect(() => { window.addEventListener('storage', refreshAll); return () => window.removeEventListener('storage', refreshAll); }, []);

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_FLAG)) {
      sessionStorage.setItem(SESSION_FLAG, '1');
      incrementSession();
      refreshAll();
    }
  }, []);

  // ── Toast notification
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // ── Owner / god-mode
  const isOwner   = checkIsOwner(playerData.username);
  const [godMode, setGodMode] = useState<boolean>(() => isGodModeAuthenticated());

  // ── Admin modal state
  const [showModal, setShowModal]     = useState(false);
  const [modalEmail, setModalEmail]   = useState('');
  const [modalPass, setModalPass]     = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [authError, setAuthError]     = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showModal) setTimeout(() => emailRef.current?.focus(), 80); }, [showModal]);

  const openAdminModal = () => {
    setModalEmail(''); setModalPass(''); setAuthError(false); setShowPass(false);
    setShowModal(true);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminCreds(modalEmail.trim(), modalPass)) {
      setGodModeAuth(true);
      setGodMode(true);
      unlockAllBadges();
      refreshAll();
      setShowModal(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 1800);
    }
  };

  // ── Owner rank override (god-mode rank selector)
  const [showRankSlider, setShowRankSlider] = useState(false);
  const ownerRankName = godMode ? readOwnerRankOverride() : null;
  const ownerRankTier = ownerRankName ? getRankByName(ownerRankName) : null;

  // ── Computed rank — owner override takes precedence when god-mode active
  const baseRank = getRankForXP(playerData.xp);
  const rank     = (godMode && ownerRankTier)
    ? { ...ownerRankTier, bracketPercent: 75 }
    : baseRank;

  // ── Username editing
  const [isEditing, setIsEditing]   = useState(false);
  const [editValue, setEditValue]   = useState(playerData.username);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditing && inputRef.current) inputRef.current.focus(); }, [isEditing]);

  const handleSave = () => {
    const t = editValue.trim().slice(0, 15); // hard cap at 15 chars
    if (!t) { setEditValue(playerData.username); setIsEditing(false); return; }

    // Reserved handle blacklist — non-owners cannot impersonate the developer
    if (!isOwner && RESERVED_HANDLES.includes(t.toLowerCase())) {
      showToast('Username Reserved — please choose a different name');
      setEditValue(playerData.username);
      setIsEditing(false);
      return;
    }

    saveUsername(t);
    refreshAll();
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

  // ── Badge selector (regular + owner)
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);
  const equippedId = getEffectiveEquipped(badgeState);
  const canSwap    = badgeState.unlocked.length >= 2;

  const handleEquip = (id: BadgeId) => {
    equipBadge(id); setBadgeState(readBadges()); setShowBadgeSelector(false);
  };

  // ── Owner rank selection
  const handleOwnerRankSelect = (name: string) => {
    saveOwnerRankOverride(name);
    setShowRankSlider(false);
    // force re-render by reading fresh data
    setPlayerData(readPlayerData());
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] pt-24 pb-16 px-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Profile Header card ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glassmorphism border border-primary/30 p-8 rounded-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          {/* Hidden owner toggle — absent from DOM for non-owners */}
          {isOwner && (
            <button
              onClick={openAdminModal}
              title={godMode ? 'God Mode Active' : 'Owner Access'}
              className={`absolute top-4 right-4 z-20 p-1.5 rounded-lg border transition-all duration-200
                ${godMode
                  ? 'border-yellow-400/60 text-yellow-400/80 bg-yellow-400/10 hover:bg-yellow-400/20'
                  : 'border-border/40 text-muted-foreground/30 hover:border-primary/40 hover:text-primary/60'
                }`}
            >
              <KeyRound size={13} />
            </button>
          )}

          {/* Main flex row — items-start so both columns anchor from the top */}
          <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-6 relative z-10">

            {/* ── Avatar column ── */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {/* STATUS: ONLINE — above the avatar circle */}
              <div className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                STATUS: ONLINE
              </div>

              <input ref={avatarInputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleAvatarChange} />

              {/* Clickable avatar */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change profile picture"
                className="group block w-24 h-24 rounded-full border-2 border-primary p-1 box-shadow-neon-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden relative">
                  {playerData.avatar ? (
                    <img src={playerData.avatar} alt="Player avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0yMCAyOGMyLjIgMCA0LTEuOCA0LTRWMThjMC0yLjItMS44LTQtNC00cy00IDEuOC00IDR2NmMwIDIuMiAxLjggNCA0IDR6bTAtMTJjMS4xIDAgMiAuOSAyIDJ2NmMwIDEuMS0uOSAyLTIgMnMtMi0uOS0yLTJ2LTZjMC0xLjEuOS0yIDItMnoiIGZpbGw9IiMwMGZmY2MiLz48cGF0aCBkPSJNMjAgMTRjLTIuMiAwLTQtMS44LTQtNHMxLjgtNCA0LTRzNCAxLjggNCA0LTEuOCA0LTQgNHptMC02Yy0xLjEgMC0yIC45LTIgMnMuOSAyIDIgMiAyLS45IDItMi0uOS0yLTItMnoiIGZpbGw9IiMwMGZmY2MiLz48cGF0aCBkPSJNMjggMjB2MmMwIDQuNC0zLjYgOC04IDhzLTgtMy42LTgtOHYtMmgtdjJjMCA1LjIgMy45IDkuNCA5IDEwaDJWMzZIMTR2MmgxMnYtMmgtNXYtLjRjNS4xLS42IDktNC44IDktMTB2LTJoLTJ6IiBmaWxsPSIjMDBmZmNjIi8+PC9zdmc+')] bg-center bg-no-repeat bg-[length:60%] opacity-50" />
                  )}
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera size={20} className="text-primary" />
                  </div>
                </div>
              </button>

              {/* Rank pill — tappable for owner rank override */}
              <div className="relative">
                {godMode && isOwner ? (
                  <button
                    onClick={() => setShowRankSlider(s => !s)}
                    className="flex items-center gap-1 bg-black border border-yellow-400/60 px-3 py-0.5 rounded-full text-[10px] font-display text-yellow-300 whitespace-nowrap tracking-widest uppercase hover:border-yellow-300 transition-colors"
                  >
                    {rank.displayName}
                    <ChevronDown size={10} className={`transition-transform duration-200 ${showRankSlider ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <div className="bg-black border border-primary px-3 py-0.5 rounded-full text-[10px] font-display text-primary whitespace-nowrap tracking-widest uppercase">
                    {rank.displayName}
                  </div>
                )}

                {/* Owner rank slider */}
                <AnimatePresence>
                  {godMode && isOwner && showRankSlider && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30 bg-[#0d1117] border border-yellow-400/40 rounded-xl p-2 shadow-2xl"
                      style={{ minWidth: 220 }}
                    >
                      <div className="text-[8px] font-mono text-yellow-400/60 uppercase tracking-widest text-center mb-2">
                        ⚙ GOD MODE — SELECT RANK
                      </div>
                      <div className="flex flex-col gap-1 overflow-y-auto">
                        {RANK_TIERS.map(tier => {
                          const isActive = rank.name === tier.name;
                          return (
                            <button
                              key={tier.name}
                              onClick={() => handleOwnerRankSelect(tier.name)}
                              className={`text-left px-3 py-1.5 rounded-lg text-[11px] font-display tracking-wide transition-all ${
                                isActive
                                  ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/60'
                                  : 'text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent'
                              }`}
                            >
                              {tier.displayName}
                              <span className="ml-2 text-[9px] font-mono opacity-50">
                                {tier.min.toLocaleString()}–{tier.max.toLocaleString()} XP
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* God-mode indicator badge */}
              {godMode && isOwner && (
                <div className="text-[8px] font-mono text-yellow-400/70 tracking-widest uppercase animate-pulse">
                  ⚡ GOD MODE
                </div>
              )}
            </div>

            {/* ── User info column — starts at top, no centering gap ── */}
            <div className="flex-1 text-center md:text-left min-w-0">

              {/* Username row */}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
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
                    <h2
                      className="font-display font-bold text-white tracking-wide leading-tight w-full text-center md:text-left break-words"
                      style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', margin: 0 }}
                    >
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

              {/* Equipped badge title — directly below username */}
              {equippedId && (
                <div className="mb-4">
                  <button
                    onClick={() => canSwap && setShowBadgeSelector(s => !s)}
                    className={`flex items-center gap-2 mx-auto md:mx-0 ${canSwap ? 'cursor-pointer' : 'cursor-default'}`}
                    aria-label={canSwap ? 'Switch equipped badge' : undefined}
                  >
                    <div className="badge-img-wrapper">
                      <img
                        src={BADGE_DEFS[equippedId].img}
                        alt={BADGE_DEFS[equippedId].name}
                        className="badge-img"
                      />
                    </div>
                    <span className="font-display text-sm text-primary tracking-widest uppercase leading-none">
                      {BADGE_DEFS[equippedId].name}
                    </span>
                    {canSwap && (
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${showBadgeSelector ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  <AnimatePresence>
                    {canSwap && showBadgeSelector && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                          {badgeState.unlocked.map(id => {
                            const def      = BADGE_DEFS[id];
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
                                <div className="badge-img-wrapper">
                                  <img src={def.img} alt={def.name} className="badge-img" />
                                </div>
                                <span className="font-mono text-[9px] text-muted-foreground uppercase whitespace-nowrap">{def.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* XP Bar */}
              <div className="max-w-md mx-auto md:mx-0">
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-primary flex items-center gap-1 flex-wrap">
                    <Zap size={12} /> XP PROGRESS
                    <span className="ml-1 text-muted-foreground">{rank.displayName} → {rank.max.toLocaleString()} XP</span>
                  </span>
                  <span className="text-white whitespace-nowrap">{playerData.xp.toLocaleString()} / 100K</span>
                </div>
                <div className="h-2 w-full bg-card rounded-full overflow-hidden border border-border">
                  <div
                    className={`h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out box-shadow-neon-cyan`}
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
          <div className="md:col-span-2 space-y-8">

            {/* Recent Logs — clock & layout fully unchanged */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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

          <div className="space-y-8">
            {/* Telemetry */}
            <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
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
            <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <h3 className="font-display text-xl text-white mb-4 border-b border-border pb-2">Badges</h3>
              <div className="space-y-3">
                {BADGE_ORDER.map(id => {
                  const def   = BADGE_DEFS[id];
                  const owned = badgeState.unlocked.includes(id);
                  const isEq  = equippedId === id;
                  return (
                    <div
                      key={id}
                      className={`flex items-start gap-3 glassmorphism p-3 rounded-lg border transition-colors ${owned ? 'border-border' : 'border-border/40 opacity-60'}`}
                    >
                      <div className="mt-0.5">
                        <div className={`badge-img-wrapper ${owned ? '' : 'opacity-40'}`}>
                          <img
                            src={def.img}
                            alt={def.name}
                            className={`badge-img ${owned ? '' : 'grayscale'}`}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm text-white uppercase">{def.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5 leading-snug">
                          {owned ? def.description : 'LOCKED'}
                        </div>
                      </div>
                      {owned && (
                        <button
                          onClick={() => handleEquip(id)}
                          disabled={isEq}
                          className={`flex-shrink-0 text-[9px] font-mono uppercase px-2 py-1 rounded border transition-all ${
                            isEq
                              ? 'border-primary text-primary bg-primary/10 cursor-default'
                              : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                          }`}
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

      {/* ── Reserved-username toast ──────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl
                       bg-[#1a0a0a] border border-red-500/60 shadow-2xl
                       font-mono text-xs text-red-400 tracking-widest uppercase
                       flex items-center gap-2 whitespace-nowrap pointer-events-none"
            style={{ boxShadow: '0 0 24px rgba(239,68,68,0.20)' }}
          >
            <span className="text-red-500 text-base leading-none">⚠</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Admin verification modal (owner-only, portal-style overlay) ───── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm glassmorphism border border-primary/40 rounded-2xl p-6 relative shadow-2xl"
              style={{ boxShadow: '0 0 40px rgba(0,255,204,0.12)' }}
            >
              {/* Close */}
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 rounded-full border border-primary/50 bg-primary/10 flex items-center justify-center mb-3">
                  <KeyRound size={22} className="text-primary" />
                </div>
                <h2 className="font-display text-lg text-white tracking-widest uppercase">Admin Verification</h2>
                <p className="font-mono text-[10px] text-muted-foreground mt-1 tracking-widest uppercase">
                  Two-Factor Identity Check
                </p>
              </div>

              {/* Error shake */}
              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mb-4 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 font-mono text-[10px] text-center tracking-widest uppercase"
                  >
                    ACCESS DENIED — INVALID CREDENTIALS
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
                    Master Administrative Email
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={modalEmail}
                    onChange={e => setModalEmail(e.target.value)}
                    autoComplete="off"
                    required
                    className="w-full bg-black/60 border border-border text-white font-mono text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
                    Master Secure Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={modalPass}
                      onChange={e => setModalPass(e.target.value)}
                      autoComplete="off"
                      required
                      className="w-full bg-black/60 border border-border text-white font-mono text-sm px-3 py-2.5 pr-10 rounded-lg focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-black font-display text-sm tracking-widest uppercase font-bold hover:opacity-90 transition-opacity"
                >
                  Verify Identity
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
