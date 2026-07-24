import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Zap } from 'lucide-react';
import { TicTacToeGame, GameMode, Difficulty } from './TicTacToeGame';
import { OnlineLobby } from './OnlineLobby';
import { OnlineGame } from './OnlineGame';
import {
  getOrCreatePlayerId,
  applyXPGain,
  awardSessionXP,
  BADGE_DEFS,
} from '../lib/playerProfile';
import type { BadgeId } from '../lib/playerProfile';
import { disconnectSocket } from '../lib/socket';
import type { OnlineGameState } from '../lib/onlineTypes';
import { useGameSounds } from '../hooks/useGameSounds';

interface TicTacToeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase =
  | 'splash'
  | 'mode-select'
  | 'difficulty-select'
  | 'playing'           // AI / Pass-and-Play
  | 'online';           // Online multiplayer (lobby + game managed inside)

// ─── Client-side XP fallback (mirrors server rules exactly) ──────────────────
function clientGameGain(seconds: number): number {
  if (seconds < 5)  return 0;
  if (seconds < 60) return Math.floor(Math.random() * 21) + 10; // 10–30
  return Math.floor(Math.random() * 16) + 15;                   // 15–30
}

// ─── Mini board thumbnail ─────────────────────────────────────────────────────
function MiniBoard() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="40" y1="8"  x2="40"  y2="112" stroke="rgba(0,255,204,0.4)" strokeWidth="2" strokeLinecap="round" />
      <line x1="80" y1="8"  x2="80"  y2="112" stroke="rgba(0,255,204,0.4)" strokeWidth="2" strokeLinecap="round" />
      <line x1="8"  y1="40" x2="112" y2="40"  stroke="rgba(0,255,204,0.4)" strokeWidth="2" strokeLinecap="round" />
      <line x1="8"  y1="80" x2="112" y2="80"  stroke="rgba(0,255,204,0.4)" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="14" x2="32"  y2="32"  stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
      <line x1="32" y1="14" x2="14"  y2="32"  stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
      <circle cx="60" cy="20" r="10" stroke="#8a2be2" strokeWidth="4" fill="none" style={{ filter: 'drop-shadow(0 0 4px #8a2be2)' }} />
      <line x1="48" y1="48" x2="72"  y2="72"  stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
      <line x1="72" y1="48" x2="48"  y2="72"  stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
      <circle cx="100" cy="100" r="10" stroke="#8a2be2" strokeWidth="4" fill="none" style={{ filter: 'drop-shadow(0 0 4px #8a2be2)' }} />
      <line x1="20" y1="20" x2="100" y2="100" stroke="rgba(0,255,204,0.22)" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Difficulty options ───────────────────────────────────────────────────────
const DIFFICULTY_OPTIONS: {
  value: Difficulty; emoji: string; label: string; accent: string; accentFaint: string;
}[] = [
  { value: 'easy',   emoji: '🟢', label: 'Easy',   accent: '#22c55e', accentFaint: 'rgba(34,197,94,0.15)'  },
  { value: 'normal', emoji: '🟡', label: 'Normal', accent: '#eab308', accentFaint: 'rgba(234,179,8,0.15)'  },
  { value: 'hard',   emoji: '🔴', label: 'Hard',   accent: '#ef4444', accentFaint: 'rgba(239,68,68,0.15)'  },
];

// ─── Toast types ──────────────────────────────────────────────────────────────

type ToastItem =
  | { id: number; type: 'xp';    gained: number }
  | { id: number; type: 'badge'; badgeName: string };

// ─── XP toast ─────────────────────────────────────────────────────────────────
function XPToast({ gained }: { gained: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1,  y: 0,   scale: 1   }}
      exit={{    opacity: 0,  y: -16, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap"
      style={{
        background: 'linear-gradient(135deg, rgba(0,20,14,0.96), rgba(0,14,10,0.98))',
        border: '1px solid rgba(0,255,204,0.55)',
        boxShadow: '0 0 32px rgba(0,255,204,0.22), 0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'none',
      }}
    >
      <Zap size={16} style={{ color: '#00ffcc', filter: 'drop-shadow(0 0 6px #00ffcc)' }} />
      <span
        className="font-display font-bold text-sm tracking-widest uppercase"
        style={{ color: '#00ffcc', textShadow: '0 0 12px rgba(0,255,204,0.7)' }}
      >
        +{gained} XP Earned
      </span>
    </motion.div>
  );
}

// ─── Badge unlock toast ────────────────────────────────────────────────────────
function BadgeToast({ badgeName }: { badgeName: string }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1,  y: 0,   scale: 1   }}
      exit={{    opacity: 0,  y: -16, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap"
      style={{
        background: 'linear-gradient(135deg, rgba(20,8,40,0.96), rgba(14,6,28,0.98))',
        border: '1px solid rgba(192,132,252,0.6)',
        boxShadow: '0 0 32px rgba(192,132,252,0.22), 0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>🏆</span>
      <span
        className="font-display font-bold text-sm tracking-widest uppercase"
        style={{ color: '#c084fc', textShadow: '0 0 12px rgba(192,132,252,0.7)' }}
      >
        Badge Unlocked: {badgeName}
      </span>
    </motion.div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function TicTacToeModal({ isOpen, onClose }: TicTacToeModalProps) {
  const [phase,      setPhase]      = useState<Phase>('splash');
  const [mode,       setMode]       = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  // Online game state — set by OnlineLobby once both players are in room
  const [onlineGameState, setOnlineGameState] = useState<OnlineGameState | null>(null);

  // ── Sounds ───────────────────────────────────────────────────────────────
  const { playBadgeUnlock, playXPChime } = useGameSounds();

  // ── Toast queue ───────────────────────────────────────────────────────────
  // Toasts stack vertically in a fixed container at the top-center of the screen.
  // Each auto-removes after 3.4 s.
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { ...item, id } as ToastItem]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3_400);
  }, []);

  const showXpToast = useCallback((gained: number) => {
    pushToast({ type: 'xp', gained });
    playXPChime(); // soft sparkle on every XP award
  }, [pushToast, playXPChime]);
  const showBadgeToast = useCallback((badgeName: string) => {
    pushToast({ type: 'badge', badgeName });
    playBadgeUnlock(); // sparkle chime on badge unlock
  }, [pushToast, playBadgeUnlock]);

  // ── Hidden game timer refs (for AI / P&P modes) ──────────────────────────
  const gameTokenRef = useRef<string | null>(null);
  const gameStartRef = useRef<number | null>(null);

  // Start hidden timer when entering the local playing phase
  useEffect(() => {
    if (phase === 'playing') {
      gameStartRef.current = Date.now();
      const playerId = getOrCreatePlayerId();
      fetch(`/api/players/${playerId}/game/start`, { method: 'POST' })
        .then(r => r.ok ? r.json() as Promise<{ token?: string }> : null)
        .then(data => { if (data?.token) gameTokenRef.current = data.token; })
        .catch(() => {});
    }
  }, [phase]);

  // Award XP when leaving the local playing phase.
  // Also evaluates and shows badge unlock notifications.
  const awardGameXP = useCallback(async () => {
    const token     = gameTokenRef.current;
    const startTime = gameStartRef.current;
    if (token === null && startTime === null) return;
    gameTokenRef.current = null;
    gameStartRef.current = null;

    const playerId = getOrCreatePlayerId();
    let gained = 0;

    if (token) {
      try {
        const res = await fetch(`/api/players/${playerId}/game/award`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = await res.json() as { gained?: number };
          if (typeof data.gained === 'number') gained = data.gained;
        }
      } catch { /* fall through */ }
    }

    if (gained === 0 && startTime !== null) {
      gained = clientGameGain((Date.now() - startTime) / 1_000);
    }

    if (gained > 0) {
      const result = applyXPGain(gained);
      showXpToast(result.gained);
      // Show badge unlock notification for each newly unlocked badge
      for (const id of result.newBadges) {
        showBadgeToast(BADGE_DEFS[id].name);
      }
    }
  }, [showXpToast, showBadgeToast]);

  // ── Immediate XP award for local game end (AI / Pass & Play) ─────────────
  // Called by TicTacToeGame the moment any game concludes (win/lose/draw).
  // Uses synchronous local XP so the toast appears instantly — no server
  // round-trip required.  Also nulls the async timer refs so that leaving
  // the modal afterwards never triggers a duplicate award.
  const handleLocalGameEnd = useCallback(() => {
    // Invalidate the server-timer path so awardGameXP is a no-op on leave
    gameTokenRef.current = null;
    gameStartRef.current = null;

    const result = awardSessionXP();
    if (result.gained > 0) {
      showXpToast(result.gained);
      for (const id of result.newBadges) {
        showBadgeToast(BADGE_DEFS[id].name);
      }
    }
  }, [showXpToast, showBadgeToast]);

  // ── Online game end handler ───────────────────────────────────────────────
  // Called by OnlineGame when a match concludes. Receives the XP + badges
  // already awarded (via awardSessionXP inside OnlineGame).
  const handleOnlineGameEnd = useCallback((result: { gained: number; newBadges: BadgeId[] }) => {
    if (result.gained > 0) showXpToast(result.gained);
    for (const id of result.newBadges) {
      showBadgeToast(BADGE_DEFS[id].name);
    }
  }, [showXpToast, showBadgeToast]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const resetToSplash = useCallback(() => {
    setPhase('splash');
    setMode(null);
    setDifficulty('normal');
    setOnlineGameState(null);
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'playing') awardGameXP();
    if (phase === 'online') {
      disconnectSocket();
      setOnlineGameState(null);
    }
    onClose();
    setTimeout(resetToSplash, 320);
  }, [phase, awardGameXP, onClose, resetToSplash]);

  const handleBack = useCallback(() => {
    if (phase === 'mode-select')        { setPhase('splash'); }
    else if (phase === 'difficulty-select') { setPhase('mode-select'); }
    else if (phase === 'playing')       {
      awardGameXP();
      setPhase('mode-select');
      setMode(null);
      setDifficulty('normal');
    }
    else if (phase === 'online') {
      // If in the online lobby (no game started yet), just go back
      if (!onlineGameState) {
        disconnectSocket();
        setPhase('mode-select');
      }
      // If game is active, "Back" is handled inside OnlineGame (Leave button)
    }
  }, [phase, onlineGameState, awardGameXP]);

  const handleSelectMode = (m: GameMode | 'online') => {
    if (m === 'online') {
      setMode(null);
      setPhase('online');
    } else if (m === 'ai') {
      setMode(m);
      setPhase('difficulty-select');
    } else {
      setMode(m);
      setPhase('playing');
    }
  };

  const handleSelectDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    setPhase('playing');
  };

  const handleChangeMode = useCallback(() => {
    if (phase === 'playing') awardGameXP();
    setPhase('mode-select');
    setMode(null);
    setDifficulty('normal');
  }, [phase, awardGameXP]);

  // Online: game started — called by OnlineLobby when both players are in
  const handleOnlineGameStart = useCallback((state: OnlineGameState) => {
    setOnlineGameState(state);
  }, []);

  // Online: player left game — return to online lobby
  const handleOnlineGameLeave = useCallback(() => {
    setOnlineGameState(null);
    // Keep socket connected; user is back in the lobby
  }, []);

  // Online: player wants to go back to mode-select from lobby
  const handleOnlineBack = useCallback(() => {
    disconnectSocket();
    setOnlineGameState(null);
    setPhase('mode-select');
  }, []);

  const showBack = phase !== 'splash' && !(phase === 'online' && onlineGameState !== null);
  const headerTitle = phase === 'online' ? 'Online Multiplayer' : 'Tic-Tac-Toe';

  return (
    <>
      {/* ── Toast stack — fixed at top-center, stacks vertically ─────────── */}
      <div
        className="fixed top-6 left-1/2 z-[200] flex flex-col items-center gap-2"
        style={{ transform: 'translateX(-50%)', pointerEvents: 'none' }}
      >
        <AnimatePresence>
          {toasts.map(toast =>
            toast.type === 'xp'
              ? <XPToast    key={toast.id} gained={toast.gained} />
              : <BadgeToast key={toast.id} badgeName={toast.badgeName} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Panel */}
            <motion.div
              key={phase}
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full flex flex-col"
              style={{
                maxWidth: 420,
                maxHeight: 'calc(100dvh - 1.5rem)',
                background: 'linear-gradient(160deg, #0f1923 0%, #0b0c10 100%)',
                border: '1px solid rgba(0,255,204,0.25)',
                borderRadius: 20,
                boxShadow: '0 0 60px rgba(0,255,204,0.08), 0 24px 64px rgba(0,0,0,0.6)',
                willChange: 'transform, opacity',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header ─────────────────────────────────────────────── */}
              <div
                className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(0,255,204,0.1)' }}
              >
                {showBack ? (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 text-white/40 hover:text-[#00ffcc] transition-colors duration-150 cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                    <span className="text-xs font-mono uppercase tracking-wider">Back</span>
                  </button>
                ) : (
                  <div className="w-16" />
                )}

                <h2
                  className="font-display text-base font-bold uppercase tracking-widest text-[#00ffcc]"
                  style={{ textShadow: '0 0 12px rgba(0,255,204,0.5)' }}
                >
                  {headerTitle}
                </h2>

                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/40
                             hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Body ───────────────────────────────────────────────── */}
              <div className="overflow-y-auto flex-1 px-5 pb-5 pt-4" style={{ scrollbarWidth: 'none' }}>

                {/* SPLASH */}
                {phase === 'splash' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5">
                    <div className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: 'radial-gradient(ellipse at center, #0d1f1a 0%, #0b0c10 100%)',
                        border: '1px solid rgba(0,255,204,0.15)', aspectRatio: '16/9', maxHeight: 180, padding: '8%',
                      }}>
                      <MiniBoard />
                    </div>
                    <p className="text-center text-white/50 text-sm font-sans leading-relaxed">
                      Align 3 X's or O's in a row to win. Play with AI, enjoy Pass &amp; Play with 2 players,
                      or challenge players worldwide in real-time Online Multiplayer.
                    </p>
                    <button
                      onClick={() => setPhase('mode-select')}
                      className="w-full py-3.5 rounded-xl font-display tracking-widest uppercase text-sm font-bold
                                 transition-all duration-200 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(0,255,204,0.05))',
                        border: '1px solid rgba(0,255,204,0.5)', color: '#00ffcc',
                        textShadow: '0 0 10px rgba(0,255,204,0.6)', boxShadow: '0 0 20px rgba(0,255,204,0.1)',
                      }}
                    >
                      ▶ &nbsp; Play Now
                    </button>
                  </motion.div>
                )}

                {/* MODE SELECT */}
                {phase === 'mode-select' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4">
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest mb-1">
                      Select Game Mode
                    </p>

                    {([
                      {
                        id: 'ai' as const, emoji: '🤖', label: 'Play vs AI',
                        sub: 'Single player · Play with AI', accent: '#00ffcc',
                        bg: 'rgba(0,255,204,0.06)', bgH: 'rgba(0,255,204,0.11)',
                        border: 'rgba(0,255,204,0.2)', borderH: 'rgba(0,255,204,0.55)',
                      },
                      {
                        id: 'pass-and-play' as const, emoji: '👥', label: 'Pass & Play',
                        sub: '2 players · Same device', accent: '#8a2be2',
                        bg: 'rgba(138,43,226,0.06)', bgH: 'rgba(138,43,226,0.11)',
                        border: 'rgba(138,43,226,0.2)', borderH: 'rgba(138,43,226,0.55)',
                      },
                      {
                        id: 'online' as const, emoji: '🌐', label: 'Online Multiplayer',
                        sub: 'Real-time · Play worldwide', accent: '#00ffcc',
                        bg: 'rgba(0,255,204,0.06)', bgH: 'rgba(0,255,204,0.11)',
                        border: 'rgba(0,255,204,0.2)', borderH: 'rgba(0,255,204,0.55)',
                      },
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectMode(opt.id)}
                        className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                        style={{ background: opt.bg, border: `1px solid ${opt.border}` }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = opt.borderH;
                          (e.currentTarget as HTMLElement).style.background = opt.bgH;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = opt.border;
                          (e.currentTarget as HTMLElement).style.background = opt.bg;
                        }}
                      >
                        <div className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl"
                          style={{ background: `${opt.accent}14`, border: `1px solid ${opt.accent}33` }}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-white font-bold tracking-widest uppercase text-sm mb-0.5">
                            {opt.label}
                          </div>
                          <div className="text-white/40 text-xs font-sans leading-snug">{opt.sub}</div>
                        </div>
                        <span className="text-lg transition-colors shrink-0" style={{ color: `${opt.accent}80` }}>›</span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* DIFFICULTY SELECT */}
                {phase === 'difficulty-select' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4">
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest mb-1">
                      Select Difficulty
                    </p>
                    {DIFFICULTY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectDifficulty(opt.value)}
                        className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                        style={{ background: opt.accentFaint, border: `1px solid ${opt.accent}33` }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${opt.accent}99`;
                          (e.currentTarget as HTMLElement).style.background = opt.accentFaint.replace('0.15', '0.25');
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${opt.accent}33`;
                          (e.currentTarget as HTMLElement).style.background = opt.accentFaint;
                        }}
                      >
                        <div className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl"
                          style={{ background: `${opt.accent}14`, border: `1px solid ${opt.accent}33` }}>
                          {opt.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-display font-bold tracking-widest uppercase text-base"
                            style={{ color: opt.accent, textShadow: `0 0 10px ${opt.accent}55` }}>
                            {opt.label}
                          </div>
                        </div>
                        <span className="text-lg shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                          style={{ color: opt.accent }}>›</span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* LOCAL PLAYING (AI / P&P) */}
                {phase === 'playing' && mode && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <TicTacToeGame
                      mode={mode}
                      difficulty={difficulty}
                      onChangeMode={handleChangeMode}
                      onGameEnd={handleLocalGameEnd}
                    />
                  </motion.div>
                )}

                {/* ONLINE MULTIPLAYER */}
                {phase === 'online' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    {onlineGameState === null ? (
                      /* Lobby screens — browse / create / quick-join / join-code / waiting */
                      <OnlineLobby
                        onGameStart={handleOnlineGameStart}
                        onBack={handleOnlineBack}
                      />
                    ) : (
                      /* Real-time game board */
                      <OnlineGame
                        initialState={onlineGameState}
                        onLeave={handleOnlineGameLeave}
                        onGameEnd={handleOnlineGameEnd}
                      />
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
