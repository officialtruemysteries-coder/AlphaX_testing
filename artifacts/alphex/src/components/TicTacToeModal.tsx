import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Zap } from 'lucide-react';
import { TicTacToeGame, GameMode, Difficulty } from './TicTacToeGame';
import { getOrCreatePlayerId, applyXPGain } from '../lib/playerProfile';

interface TicTacToeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'splash' | 'mode-select' | 'difficulty-select' | 'playing';

// ─── Client-side fallback XP rules (mirrors server logic exactly) ─────────────
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
  value: Difficulty;
  emoji: string;
  label: string;
  accent: string;
  accentFaint: string;
}[] = [
  { value: 'easy',   emoji: '🟢', label: 'Easy',   accent: '#22c55e', accentFaint: 'rgba(34,197,94,0.15)'  },
  { value: 'normal', emoji: '🟡', label: 'Normal', accent: '#eab308', accentFaint: 'rgba(234,179,8,0.15)'  },
  { value: 'hard',   emoji: '🔴', label: 'Hard',   accent: '#ef4444', accentFaint: 'rgba(239,68,68,0.15)'  },
];

// ─── XP toast (fixed, above everything) ──────────────────────────────────────
function XPToast({ gained }: { gained: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -16, scale: 0.9  }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="fixed top-6 left-1/2 z-[200] flex items-center gap-2.5 px-5 py-3 rounded-2xl"
      style={{
        transform: 'translateX(-50%)',
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

// ─── Modal ────────────────────────────────────────────────────────────────────
export function TicTacToeModal({ isOpen, onClose }: TicTacToeModalProps) {
  const [phase, setPhase]           = useState<Phase>('splash');
  const [mode, setMode]             = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [xpToast, setXpToast]       = useState<number | null>(null);

  // ── Hidden game timer refs ───────────────────────────────────────────────────
  const gameTokenRef = useRef<string | null>(null);
  const gameStartRef = useRef<number | null>(null);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showXpToast = (gained: number) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setXpToast(gained);
    toastTimer.current = setTimeout(() => setXpToast(null), 3400);
  };

  // ── Start hidden game timer when entering playing phase ────────────────────
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

  // ── Award XP when leaving playing phase (or closing modal) ────────────────
  const awardGameXP = useCallback(async () => {
    // Only fire once — both refs are nulled after first call
    const token     = gameTokenRef.current;
    const startTime = gameStartRef.current;
    if (token === null && startTime === null) return;
    gameTokenRef.current = null;
    gameStartRef.current = null;

    const playerId = getOrCreatePlayerId();
    let gained = 0;

    // Try server-side award (server holds the authoritative elapsed time)
    if (token) {
      try {
        const res = await fetch(`/api/players/${playerId}/game/award`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = await res.json() as { gained?: number };
          if (typeof data.gained === 'number') gained = data.gained;
        }
      } catch { /* fall through to client fallback */ }
    }

    // Client-side fallback (server unreachable or token missing)
    if (gained === 0 && startTime !== null) {
      gained = clientGameGain((Date.now() - startTime) / 1_000);
    }

    if (gained > 0) {
      applyXPGain(gained);
      showXpToast(gained);
    }
  }, []);

  // ─── Navigation helpers ───────────────────────────────────────────────────
  const handleClose = () => {
    if (phase === 'playing') awardGameXP();
    onClose();
    setTimeout(() => {
      setPhase('splash');
      setMode(null);
      setDifficulty('normal');
    }, 320);
  };

  const handlePlay = () => setPhase('mode-select');

  const handleSelectMode = (m: GameMode) => {
    setMode(m);
    if (m === 'ai') setPhase('difficulty-select');
    else            setPhase('playing');
  };

  const handleSelectDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    setPhase('playing');
  };

  const handleChangeMode = () => {
    if (phase === 'playing') awardGameXP();
    setPhase('mode-select');
    setMode(null);
    setDifficulty('normal');
  };

  const handleBack = () => {
    if (phase === 'mode-select')        setPhase('splash');
    else if (phase === 'difficulty-select') setPhase('mode-select');
    else if (phase === 'playing')       handleChangeMode();
  };

  const showBack = phase !== 'splash';

  return (
    <>
      {/* ── Global XP toast — fixed to viewport, above modal ─────────────── */}
      <AnimatePresence>
        {xpToast !== null && <XPToast gained={xpToast} />}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Modal panel */}
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
                  Tic-Tac-Toe
                </h2>

                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-8 h-8 rounded-full
                             text-white/40 hover:text-white hover:bg-white/10
                             transition-all duration-150 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Scrollable body ─────────────────────────────────────── */}
              <div className="overflow-y-auto flex-1 px-5 pb-5 pt-4" style={{ scrollbarWidth: 'none' }}>

                {/* PHASE: splash ─────────────────────────────────────────── */}
                {phase === 'splash' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5"
                  >
                    <div
                      className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: 'radial-gradient(ellipse at center, #0d1f1a 0%, #0b0c10 100%)',
                        border: '1px solid rgba(0,255,204,0.15)',
                        aspectRatio: '16/9',
                        maxHeight: 180,
                        padding: '8%',
                      }}
                    >
                      <MiniBoard />
                    </div>

                    <p className="text-center text-white/50 text-sm font-sans leading-relaxed">
                      Align 3 X's or O's in a row to win. Play with AI or enjoy Pass &amp; Play with 2 players on the same device.
                    </p>

                    <button
                      onClick={handlePlay}
                      className="w-full py-3.5 rounded-xl font-display tracking-widest uppercase text-sm font-bold transition-all duration-200 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(0,255,204,0.05))',
                        border: '1px solid rgba(0,255,204,0.5)',
                        color: '#00ffcc',
                        textShadow: '0 0 10px rgba(0,255,204,0.6)',
                        boxShadow: '0 0 20px rgba(0,255,204,0.1)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,255,204,0.2)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.8)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(0,255,204,0.1)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.5)';
                      }}
                    >
                      ▶ &nbsp; Play Now
                    </button>
                  </motion.div>
                )}

                {/* PHASE: mode-select ──────────────────────────────────────── */}
                {phase === 'mode-select' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest mb-1">
                      Select Game Mode
                    </p>

                    {/* Play vs AI */}
                    <button
                      onClick={() => handleSelectMode('ai')}
                      className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,255,204,0.06), rgba(0,255,204,0.02))',
                        border: '1px solid rgba(0,255,204,0.2)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.55)';
                        (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,255,204,0.11), rgba(0,255,204,0.04))';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.2)';
                        (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(0,255,204,0.06), rgba(0,255,204,0.02))';
                      }}
                    >
                      <div
                        className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: 'rgba(0,255,204,0.08)', border: '1px solid rgba(0,255,204,0.2)' }}
                      >
                        🤖
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-white font-bold tracking-widest uppercase text-sm mb-0.5">
                          Play vs AI
                        </div>
                        <div className="text-white/40 text-xs font-sans leading-snug">
                          Single player · Play with AI
                        </div>
                      </div>
                      <span className="text-[#00ffcc]/50 group-hover:text-[#00ffcc] text-lg transition-colors shrink-0">›</span>
                    </button>

                    {/* Pass & Play */}
                    <button
                      onClick={() => handleSelectMode('pass-and-play')}
                      className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                      style={{
                        background: 'linear-gradient(135deg, rgba(138,43,226,0.06), rgba(138,43,226,0.02))',
                        border: '1px solid rgba(138,43,226,0.2)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,43,226,0.55)';
                        (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(138,43,226,0.11), rgba(138,43,226,0.04))';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,43,226,0.2)';
                        (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(138,43,226,0.06), rgba(138,43,226,0.02))';
                      }}
                    >
                      <div
                        className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: 'rgba(138,43,226,0.08)', border: '1px solid rgba(138,43,226,0.2)' }}
                      >
                        👥
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-white font-bold tracking-widest uppercase text-sm mb-0.5">
                          Pass &amp; Play
                        </div>
                        <div className="text-white/40 text-xs font-sans leading-snug">
                          2 players · Same device
                        </div>
                      </div>
                      <span className="text-[#8a2be2]/50 group-hover:text-[#8a2be2] text-lg transition-colors shrink-0">›</span>
                    </button>

                    {/* Online Multiplayer — coming soon */}
                    <div
                      className="flex items-center gap-4 w-full p-4 rounded-2xl opacity-40"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div
                        className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        🌐
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-white/60 font-bold tracking-widest uppercase text-sm mb-0.5">
                          Online Multiplayer
                        </div>
                        <div className="text-white/30 text-xs font-sans leading-snug">
                          Coming soon · Play with anyone worldwide
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
                      >
                        Soon
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* PHASE: difficulty-select ───────────────────────────────── */}
                {phase === 'difficulty-select' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest mb-1">
                      Select Difficulty
                    </p>

                    {DIFFICULTY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleSelectDifficulty(opt.value)}
                        className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                        style={{
                          background: opt.accentFaint,
                          border: `1px solid ${opt.accent}33`,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${opt.accent}99`;
                          (e.currentTarget as HTMLElement).style.background   = opt.accentFaint.replace('0.15', '0.25');
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${opt.accent}33`;
                          (e.currentTarget as HTMLElement).style.background   = opt.accentFaint;
                        }}
                      >
                        <div
                          className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl"
                          style={{ background: `${opt.accent}14`, border: `1px solid ${opt.accent}33` }}
                        >
                          {opt.emoji}
                        </div>

                        {/* Title only — no subtitle */}
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-display font-bold tracking-widest uppercase text-base"
                            style={{ color: opt.accent, textShadow: `0 0 10px ${opt.accent}55` }}
                          >
                            {opt.label}
                          </div>
                        </div>

                        <span
                          className="text-lg transition-colors shrink-0 group-hover:opacity-100 opacity-50"
                          style={{ color: opt.accent }}
                        >
                          ›
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* PHASE: playing ─────────────────────────────────────────── */}
                {phase === 'playing' && mode && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <TicTacToeGame
                      mode={mode}
                      difficulty={difficulty}
                      onChangeMode={handleChangeMode}
                    />
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
