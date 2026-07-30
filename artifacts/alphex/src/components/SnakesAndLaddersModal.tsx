import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Zap, Trophy } from 'lucide-react';
import {
  getOrCreatePlayerId,
  applyXPGain,
  awardSessionXP,
  BADGE_DEFS,
} from '../lib/playerProfile';
import type { BadgeId } from '../lib/playerProfile';
import { useGameSounds } from '../hooks/useGameSounds';
import { OnlineLobby } from './OnlineLobby';
import { OnlineGame } from './OnlineGame';
import { disconnectSocket } from '../lib/socket';
import type { OnlineGameState } from '../lib/onlineTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SLInitialPhase = 'ai-count' | 'pp-count' | 'splash' | 'online';

interface SLModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhase?: SLInitialPhase;
}

type Phase = 'splash' | 'ai-count' | 'ai-difficulty' | 'pp-count' | 'playing' | 'game-over' | 'online';
type Difficulty = 'easy' | 'normal' | 'hard';

interface Player {
  id: number;
  name: string;
  color: string;
  glow: string;
  position: number; // 0 = not started, 1-100 = tile
  isAI: boolean;
}

// ─── Board constants ───────────────────────────────────────────────────────────

const BOARD_SIZE = 400;
const TILE_SIZE = 40;

// Ladders: foot tile → top tile
const LADDERS: Record<number, number> = {
   4: 14,
   9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,
};

// Snakes: head tile → tail tile
const SNAKES: Record<number, number> = {
  17:  7,
  54: 34,
  62: 19,
  87: 24,
  93: 73,
  95: 75,
  99: 78,
};

// ─── Pawn palette ─────────────────────────────────────────────────────────────

const PAWN_PALETTE = [
  { color: '#00ffcc', glow: 'rgba(0,255,204,0.7)', name: 'You' },
  { color: '#ff3366', glow: 'rgba(255,51,102,0.7)', name: 'Bot 1' },
  { color: '#00e676', glow: 'rgba(0,230,118,0.7)', name: 'Bot 2' },
  { color: '#ffd700', glow: 'rgba(255,215,0,0.7)', name: 'Bot 3' },
  { color: '#c084fc', glow: 'rgba(192,132,252,0.7)', name: 'Bot 4' },
  { color: '#ff7700', glow: 'rgba(255,119,0,0.7)', name: 'Bot 5' },
  { color: '#ff69b4', glow: 'rgba(255,105,180,0.7)', name: 'Bot 6' },
];

// ─── Board geometry ────────────────────────────────────────────────────────────

function getTileCenter(tile: number): { x: number; y: number } {
  if (tile < 1 || tile > 100) return { x: 0, y: 0 };
  const idx = tile - 1;
  const row = Math.floor(idx / 10);
  const col = row % 2 === 0 ? idx % 10 : 9 - (idx % 10);
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: (9 - row) * TILE_SIZE + TILE_SIZE / 2,
  };
}

// ─── Sound engine additions (S&L specific, programmatic) ─────────────────────

function useSLSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playDiceRoll = useCallback(() => {
    try {
      const c = getCtx(); const t = c.currentTime;
      for (let i = 0; i < 5; i++) {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.connect(g); g.connect(c.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(80 + Math.random() * 120, t + i * 0.06);
        g.gain.setValueAtTime(0.04, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.05);
        osc.start(t + i * 0.06); osc.stop(t + i * 0.06 + 0.06);
      }
    } catch { /* noop */ }
  }, [getCtx]);

  const playLadderClimb = useCallback(() => {
    try {
      const c = getCtx(); const t = c.currentTime;
      const freqs = [330, 415, 523, 659, 784];
      freqs.forEach((freq, i) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.connect(g); g.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.07);
        g.gain.setValueAtTime(0.06, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.22);
        osc.start(t + i * 0.07); osc.stop(t + i * 0.07 + 0.25);
      });
    } catch { /* noop */ }
  }, [getCtx]);

  const playSnakeBite = useCallback(() => {
    try {
      const c = getCtx(); const t = c.currentTime;
      const osc = c.createOscillator(); const g = c.createGain();
      osc.connect(g); g.connect(c.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.45);
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
    } catch { /* noop */ }
  }, [getCtx]);

  const playStep = useCallback(() => {
    try {
      const c = getCtx(); const t = c.currentTime;
      const osc = c.createOscillator(); const g = c.createGain();
      osc.connect(g); g.connect(c.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.start(t); osc.stop(t + 0.07);
    } catch { /* noop */ }
  }, [getCtx]);

  const playVictory = useCallback(() => {
    try {
      const c = getCtx(); const t = c.currentTime;
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = c.createOscillator(); const g = c.createGain();
        osc.connect(g); g.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + 0.2 + i * 0.12);
        g.gain.setValueAtTime(0.07, t + 0.2 + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2 + i * 0.12 + 0.44);
        osc.start(t + 0.2 + i * 0.12); osc.stop(t + 0.2 + i * 0.12 + 0.5);
      });
    } catch { /* noop */ }
  }, [getCtx]);

  return { playDiceRoll, playLadderClimb, playSnakeBite, playStep, playVictory };
}

// ─── Mini board thumbnail for GameCard ───────────────────────────────────────

export function MiniSLBoard() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Grid */}
      {[0,1,2,3].map(r => (
        <React.Fragment key={r}>
          {[0,1,2,3].map(c => (
            <rect key={c} x={c*30+1} y={r*30+1} width={28} height={28}
              fill={( r+c)%2===0 ? 'rgba(0,255,204,0.06)' : 'rgba(138,43,226,0.06)'}
              stroke={(r+c)%2===0 ? 'rgba(0,255,204,0.15)' : 'rgba(138,43,226,0.15)'}
              strokeWidth={0.5} rx={2}
            />
          ))}
        </React.Fragment>
      ))}
      {/* Ladder */}
      <line x1="15" y1="105" x2="45" y2="45" stroke="#00ffcc" strokeWidth="2.5" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 3px #00ffcc)' }} />
      <line x1="25" y1="105" x2="55" y2="45" stroke="#00ffcc" strokeWidth="2.5" strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 3px #00ffcc)' }} />
      {[100,85,70,55].map((y,i) => (
        <line key={i} x1={15+i*1.5} y1={y} x2={25+i*1.5} y2={y} stroke="#00ffcc" strokeWidth="1.5"
          strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 2px #00ffcc)' }} />
      ))}
      {/* Snake */}
      <path d="M 105 15 C 90 15 90 35 75 35 C 60 35 60 50 75 65 C 80 72 80 82 65 90"
        stroke="#ff3366" strokeWidth="4" strokeLinecap="round" fill="none"
        style={{ filter: 'drop-shadow(0 0 4px #ff3366)' }} />
      <circle cx="105" cy="15" r="4" fill="#ff3366" style={{ filter: 'drop-shadow(0 0 4px #ff3366)' }} />
      {/* Pawn */}
      <circle cx="15" cy="105" r="5" fill="#00ffcc" style={{ filter: 'drop-shadow(0 0 6px #00ffcc)' }} />
    </svg>
  );
}

// ─── SVG Board component ──────────────────────────────────────────────────────

interface BoardProps {
  players: Player[];
  animatingTile?: number | null;
}

function SLBoard({ players, animatingTile }: BoardProps) {
  // Tile background colors (alternating)
  const getTileFill = (tile: number) => {
    const idx = tile - 1;
    const row = Math.floor(idx / 10);
    const col = row % 2 === 0 ? idx % 10 : 9 - idx % 10;
    return (row + col) % 2 === 0
      ? 'rgba(0,255,204,0.04)'
      : 'rgba(138,43,226,0.05)';
  };

  const getTileStroke = (tile: number) => {
    if (LADDERS[tile]) return 'rgba(0,255,204,0.5)';
    if (Object.values(LADDERS).includes(tile)) return 'rgba(0,255,204,0.35)';
    if (SNAKES[tile]) return 'rgba(255,51,102,0.55)';
    if (Object.values(SNAKES).includes(tile)) return 'rgba(255,51,102,0.3)';
    return 'rgba(255,255,255,0.07)';
  };

  // Tile numbering display
  const getTileDisplay = (tile: number) => {
    if (tile === 1 || tile === 100) return tile.toString();
    if (tile % 10 === 0 || tile % 10 === 1) return tile.toString();
    if (tile % 25 === 0) return tile.toString();
    if (LADDERS[tile] || Object.values(LADDERS).includes(tile) || SNAKES[tile] || Object.values(SNAKES).includes(tile))
      return tile.toString();
    return '';
  };

  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      width="100%"
      style={{ display: 'block', maxWidth: BOARD_SIZE }}
    >
      {/* Background */}
      <rect width={BOARD_SIZE} height={BOARD_SIZE} fill="#080c10" rx={4} />

      {/* Grid lines */}
      {Array.from({ length: 11 }, (_, i) => (
        <React.Fragment key={i}>
          <line x1={i * TILE_SIZE} y1={0} x2={i * TILE_SIZE} y2={BOARD_SIZE}
            stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
          <line x1={0} y1={i * TILE_SIZE} x2={BOARD_SIZE} y2={i * TILE_SIZE}
            stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
        </React.Fragment>
      ))}

      {/* Tiles */}
      {Array.from({ length: 100 }, (_, i) => {
        const tile = i + 1;
        const { x, y } = getTileCenter(tile);
        const isAnimating = animatingTile === tile;
        return (
          <g key={tile}>
            <rect
              x={x - TILE_SIZE / 2 + 0.5}
              y={y - TILE_SIZE / 2 + 0.5}
              width={TILE_SIZE - 1}
              height={TILE_SIZE - 1}
              fill={isAnimating ? 'rgba(255,255,255,0.1)' : getTileFill(tile)}
              stroke={getTileStroke(tile)}
              strokeWidth={LADDERS[tile] || SNAKES[tile] ? 1.2 : 0.6}
              rx={2}
            />
            {getTileDisplay(tile) && (
              <text
                x={x - TILE_SIZE / 2 + 3}
                y={y - TILE_SIZE / 2 + 9}
                fontSize="6"
                fill="rgba(255,255,255,0.3)"
                fontFamily="monospace"
              >
                {tile}
              </text>
            )}
            {/* Ladder base marker */}
            {LADDERS[tile] && (
              <text x={x} y={y + 5} fontSize="10" textAnchor="middle" fill="#00ffcc"
                style={{ filter: 'drop-shadow(0 0 3px #00ffcc)' }}>🪜</text>
            )}
            {/* Snake head marker */}
            {SNAKES[tile] && (
              <text x={x} y={y + 5} fontSize="10" textAnchor="middle" fill="#ff3366"
                style={{ filter: 'drop-shadow(0 0 3px #ff3366)' }}>🐍</text>
            )}
          </g>
        );
      })}

      {/* Ladders (draw lines) */}
      {Object.entries(LADDERS).map(([foot, top]) => {
        const f = getTileCenter(Number(foot));
        const t = getTileCenter(top);
        const dx = t.x - f.x; const dy = t.y - f.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const ux = dx/len; const uy = dy/len;
        const px = -uy * 4; const py = ux * 4; // perpendicular offset
        return (
          <g key={`ladder-${foot}`} style={{ filter: 'drop-shadow(0 0 3px rgba(0,255,204,0.6))' }}>
            {/* Rail 1 */}
            <line x1={f.x-px} y1={f.y-py} x2={t.x-px} y2={t.y-py}
              stroke="#00ffcc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            {/* Rail 2 */}
            <line x1={f.x+px} y1={f.y+py} x2={t.x+px} y2={t.y+py}
              stroke="#00ffcc" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            {/* Rungs */}
            {Array.from({ length: Math.floor(len/14) + 1 }, (_, i) => {
              const frac = (i + 0.5) / (Math.floor(len/14) + 1);
              const rx = f.x + dx * frac; const ry = f.y + dy * frac;
              return (
                <line key={i} x1={rx-px} y1={ry-py} x2={rx+px} y2={ry+py}
                  stroke="#00ffcc" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              );
            })}
          </g>
        );
      })}

      {/* Snakes (bezier curves) */}
      {Object.entries(SNAKES).map(([head, tail]) => {
        const h = getTileCenter(Number(head));
        const t = getTileCenter(Number(tail));
        const midX = (h.x + t.x) / 2 + (t.y - h.y) * 0.4;
        const midY = (h.y + t.y) / 2 + (h.x - t.x) * 0.4;
        return (
          <g key={`snake-${head}`} style={{ filter: 'drop-shadow(0 0 4px rgba(255,51,102,0.7))' }}>
            <path d={`M${h.x},${h.y} Q${midX},${midY} ${t.x},${t.y}`}
              stroke="#ff3366" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.75" />
            {/* Head */}
            <circle cx={h.x} cy={h.y} r="5" fill="#ff3366" opacity="0.9" />
            {/* Tail */}
            <circle cx={t.x} cy={t.y} r="3" fill="#8b0020" opacity="0.8" />
          </g>
        );
      })}

      {/* Player pawns */}
      {players.map((player, pIdx) => {
        if (player.position === 0) return null;
        const { x, y } = getTileCenter(player.position);
        // Offset multiple players on same tile
        const samePos = players.filter(p => p.position === player.position);
        const myIndex = samePos.findIndex(p => p.id === player.id);
        const total = samePos.length;
        const angle = total > 1 ? (myIndex / total) * 2 * Math.PI : 0;
        const offsetR = total > 1 ? 9 : 0;
        const px = x + Math.cos(angle) * offsetR;
        const py = y + Math.sin(angle) * offsetR;
        return (
          <g key={player.id} style={{ filter: `drop-shadow(0 0 6px ${player.glow})` }}>
            <circle cx={px} cy={py} r="8" fill={player.color} opacity="0.9" />
            <circle cx={px} cy={py} r="4" fill="rgba(0,0,0,0.5)" />
            <text x={px} y={py + 4} fontSize="6" textAnchor="middle"
              fill="rgba(255,255,255,0.9)" fontFamily="monospace" fontWeight="bold">
              {pIdx + 1}
            </text>
          </g>
        );
      })}

      {/* Tile 100 special glow */}
      <rect x={BOARD_SIZE - TILE_SIZE + 0.5} y={0.5} width={TILE_SIZE - 1} height={TILE_SIZE - 1}
        fill="rgba(255,215,0,0.08)" stroke="rgba(255,215,0,0.5)" strokeWidth="1.5" rx={2} />
      <text x={BOARD_SIZE - TILE_SIZE / 2} y={TILE_SIZE / 2 + 4} fontSize="9" textAnchor="middle"
        fill="#ffd700" fontFamily="monospace" fontWeight="bold"
        style={{ filter: 'drop-shadow(0 0 4px #ffd700)' }}>🏆</text>
    </svg>
  );
}

// ─── Dice component ───────────────────────────────────────────────────────────

const DICE_DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

interface DiceProps {
  value: number;
  color: string;
  glow: string;
  rolling: boolean;
}

function Dice({ value, color, glow, rolling }: DiceProps) {
  const display = rolling ? Math.ceil(Math.random() * 6) : value;
  const dots = DICE_DOTS[display] ?? DICE_DOTS[1];
  return (
    <div
      className={rolling ? 'animate-bounce' : ''}
      style={{
        width: 56, height: 56, borderRadius: 12,
        background: `linear-gradient(135deg, ${color}22, ${color}0a)`,
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${glow}, inset 0 0 10px ${color}18`,
        position: 'relative', flexShrink: 0,
        transition: 'all 0.2s',
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="10" fill={color}
            style={{ filter: `drop-shadow(0 0 3px ${glow})` }} />
        ))}
      </svg>
    </div>
  );
}

// ─── Toast types ──────────────────────────────────────────────────────────────

type ToastItem =
  | { id: number; type: 'xp'; gained: number }
  | { id: number; type: 'badge'; badgeName: string };

function XPToast({ gained }: { gained: number }) {
  return (
    <motion.div layout
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap"
      style={{
        background: 'linear-gradient(135deg, rgba(0,20,14,0.96), rgba(0,14,10,0.98))',
        border: '1px solid rgba(0,255,204,0.55)',
        boxShadow: '0 0 32px rgba(0,255,204,0.22), 0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)', pointerEvents: 'none',
      }}
    >
      <Zap size={16} style={{ color: '#00ffcc', filter: 'drop-shadow(0 0 6px #00ffcc)' }} />
      <span className="font-display font-bold text-sm tracking-widest uppercase"
        style={{ color: '#00ffcc', textShadow: '0 0 12px rgba(0,255,204,0.7)' }}>
        +{gained} XP Earned
      </span>
    </motion.div>
  );
}

function BadgeToast({ badgeName }: { badgeName: string }) {
  return (
    <motion.div layout
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="flex items-center gap-2.5 px-5 py-3 rounded-2xl whitespace-nowrap"
      style={{
        background: 'linear-gradient(135deg, rgba(20,8,40,0.96), rgba(14,6,28,0.98))',
        border: '1px solid rgba(192,132,252,0.6)',
        boxShadow: '0 0 32px rgba(192,132,252,0.22), 0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)', pointerEvents: 'none',
      }}
    >
      <Trophy size={15} style={{ color: '#c084fc', filter: 'drop-shadow(0 0 6px rgba(192,132,252,0.6))' }} />
      <span className="font-display font-bold text-sm tracking-widest uppercase"
        style={{ color: '#c084fc', textShadow: '0 0 12px rgba(192,132,252,0.7)' }}>
        Badge Unlocked: {badgeName}
      </span>
    </motion.div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// AI roll with difficulty bias
function aiRoll(difficulty: Difficulty): number {
  const base = rollD6();
  if (difficulty === 'easy') {
    // 30% chance to re-roll and take the worse outcome
    if (Math.random() < 0.3) return Math.min(base, rollD6());
    return base;
  }
  if (difficulty === 'hard') {
    // 30% chance to re-roll and take the better outcome
    if (Math.random() < 0.3) return Math.max(base, rollD6());
    return base;
  }
  return base;
}

// ─── Client-side XP fallback ──────────────────────────────────────────────────

function clientGameGain(seconds: number): number {
  if (seconds < 5) return 0;
  if (seconds < 60) return Math.floor(Math.random() * 21) + 10;
  return Math.floor(Math.random() * 16) + 15;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function SnakesAndLaddersModal({ isOpen, onClose, initialPhase = 'splash' }: SLModalProps) {
  const [phase, setPhase] = useState<Phase>(initialPhase as Phase);
  const [aiCount, setAiCount] = useState(1);
  const [ppCount, setPpCount] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  // Online game state
  const [onlineGameState, setOnlineGameState] = useState<OnlineGameState | null>(null);

  // Game state
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingTile, setAnimatingTile] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [bonusRoll, setBonusRoll] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameOverPhase, setGameOverPhase] = useState(false);

  // XP
  const gameStartRef = useRef<number | null>(null);
  const gameTokenRef = useRef<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  // Sounds
  const { playDiceRoll, playLadderClimb, playSnakeBite, playStep, playVictory } = useSLSounds();
  const { playXPChime, playBadgeUnlock } = useGameSounds();

  const pushToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { ...item, id } as ToastItem]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3400);
  }, []);

  const showXpToast = useCallback((gained: number) => {
    pushToast({ type: 'xp', gained } as Omit<ToastItem, 'id'>);
    playXPChime();
  }, [pushToast, playXPChime]);

  const showBadgeToast = useCallback((badgeName: string) => {
    pushToast({ type: 'badge', badgeName } as Omit<ToastItem, 'id'>);
    playBadgeUnlock();
  }, [pushToast, playBadgeUnlock]);

  // Reset when initialPhase changes (modal reopens)
  useEffect(() => {
    if (isOpen) {
      setPhase(initialPhase as Phase);
      setWinner(null);
      setGameOverPhase(false);
      setPlayers([]);
      setCurrentIdx(0);
      setIsAnimating(false);
      setBonusRoll(false);
      setStatusMsg('');
    }
  }, [isOpen, initialPhase]);

  // ── XP helpers ──────────────────────────────────────────────────────────────

  const awardXP = useCallback(async () => {
    const token = gameTokenRef.current;
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
      } catch { /* fallthrough */ }
    }

    if (gained === 0 && startTime !== null) {
      gained = clientGameGain((Date.now() - startTime) / 1000);
    }

    if (gained > 0) {
      const result = applyXPGain(gained);
      showXpToast(result.gained);
      for (const id of result.newBadges) showBadgeToast(BADGE_DEFS[id].name);
    }
  }, [showXpToast, showBadgeToast]);

  // Online callbacks
  const handleOnlineGameStart = useCallback((state: OnlineGameState) => {
    setOnlineGameState(state);
  }, []);
  const handleOnlineGameLeave = useCallback(() => {
    setOnlineGameState(null);
  }, []);
  const handleOnlineGameEnd = useCallback((result: { gained: number; newBadges: BadgeId[] }) => {
    if (result.gained > 0) showXpToast(result.gained);
    for (const id of result.newBadges) showBadgeToast(BADGE_DEFS[id].name);
  }, [showXpToast, showBadgeToast]);
  const handleOnlineBack = useCallback(() => {
    disconnectSocket();
    setOnlineGameState(null);
    setPhase('splash');
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'playing' && !gameOverPhase) awardXP();
    if (phase === 'online') { disconnectSocket(); setOnlineGameState(null); }
    onClose();
    setTimeout(() => {
      setPhase(initialPhase as Phase);
      setWinner(null); setGameOverPhase(false);
      setPlayers([]); setCurrentIdx(0);
      setIsAnimating(false); setBonusRoll(false); setStatusMsg('');
      setOnlineGameState(null);
    }, 320);
  }, [phase, gameOverPhase, awardXP, onClose, initialPhase]);

  const handleBack = useCallback(() => {
    if (phase === 'ai-difficulty') setPhase('ai-count');
    else if (phase === 'ai-count') setPhase('splash');
    else if (phase === 'pp-count') setPhase('splash');
    else if (phase === 'online') {
      if (!onlineGameState) {
        disconnectSocket();
        setPhase('splash');
      }
    }
    else if (phase === 'playing' || phase === 'game-over') {
      if (phase === 'playing') awardXP();
      setWinner(null); setGameOverPhase(false);
      setPlayers([]); setCurrentIdx(0);
      setIsAnimating(false); setBonusRoll(false);
      setPhase('splash');
    }
    else setPhase('splash');
  }, [phase, onlineGameState, awardXP]);

  // ── Game setup ──────────────────────────────────────────────────────────────

  const startGame = useCallback((newPlayers: Player[]) => {
    setPlayers(newPlayers);
    setCurrentIdx(0);
    setDiceValue(1);
    setIsRolling(false);
    setIsAnimating(false);
    setBonusRoll(false);
    setWinner(null);
    setGameOverPhase(false);
    setStatusMsg(`${newPlayers[0].name}'s turn — Roll the dice!`);
    setPhase('playing');

    // Start XP timer
    gameStartRef.current = Date.now();
    const playerId = getOrCreatePlayerId();
    fetch(`/api/players/${playerId}/game/start`, { method: 'POST' })
      .then(r => r.ok ? r.json() as Promise<{ token?: string }> : null)
      .then(data => { if (data?.token) gameTokenRef.current = data.token; })
      .catch(() => {});
  }, []);

  const startAIGame = () => {
    const newPlayers: Player[] = [
      { id: 0, name: 'You', color: PAWN_PALETTE[0].color, glow: PAWN_PALETTE[0].glow, position: 0, isAI: false },
      ...Array.from({ length: aiCount }, (_, i) => ({
        id: i + 1,
        name: `Bot ${i + 1}`,
        color: PAWN_PALETTE[i + 1].color,
        glow: PAWN_PALETTE[i + 1].glow,
        position: 0,
        isAI: true,
      })),
    ];
    startGame(newPlayers);
  };

  const startPPGame = () => {
    const names = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'];
    const newPlayers: Player[] = Array.from({ length: ppCount }, (_, i) => ({
      id: i,
      name: names[i],
      color: PAWN_PALETTE[i].color,
      glow: PAWN_PALETTE[i].glow,
      position: 0,
      isAI: false,
    }));
    startGame(newPlayers);
  };

  // ── Core move logic ─────────────────────────────────────────────────────────

  const executeMove = useCallback(async (playerIdx: number, roll: number, currentPlayers: Player[]) => {
    setIsAnimating(true);
    const player = currentPlayers[playerIdx];
    const from = player.position;
    const rawTarget = from + roll;

    let target: number;
    if (rawTarget > 100) {
      // Bounce back from 100
      target = 100 - (rawTarget - 100);
    } else {
      target = rawTarget;
    }

    // Animate step by step
    let current = from;
    const stepCount = Math.abs(target - from);
    const direction = target > from ? 1 : -1;

    for (let s = 0; s < stepCount; s++) {
      current += direction;
      setAnimatingTile(current);
      setPlayers(prev => prev.map((p, i) =>
        i === playerIdx ? { ...p, position: current } : p
      ));
      playStep();
      await delay(120);
    }
    setAnimatingTile(null);

    // Check win
    if (target === 100) {
      const winPlayer = currentPlayers[playerIdx];
      setPlayers(prev => prev.map((p, i) =>
        i === playerIdx ? { ...p, position: 100 } : p
      ));
      setStatusMsg(`🏆 ${winPlayer.name} wins!`);
      setWinner(winPlayer);
      setGameOverPhase(true);
      setPhase('game-over');
      playVictory();

      // Award XP
      gameTokenRef.current = null;
      gameStartRef.current = null;
      const result = awardSessionXP();
      if (result.gained > 0) {
        showXpToast(result.gained);
        for (const id of result.newBadges) showBadgeToast(BADGE_DEFS[id].name);
      }
      setIsAnimating(false);
      return { won: true };
    }

    // Check snake or ladder
    const ladderTop = LADDERS[target];
    const snakeTail = SNAKES[target];

    let finalPos = target;

    if (ladderTop) {
      setStatusMsg(`🪜 ${player.name} climbs a ladder! ${target} → ${ladderTop}`);
      playLadderClimb();
      await delay(300);
      setPlayers(prev => prev.map((p, i) =>
        i === playerIdx ? { ...p, position: ladderTop } : p
      ));
      finalPos = ladderTop;
      await delay(400);
    } else if (snakeTail) {
      setStatusMsg(`🐍 ${player.name} got bitten! ${target} → ${snakeTail}`);
      playSnakeBite();
      await delay(300);
      setPlayers(prev => prev.map((p, i) =>
        i === playerIdx ? { ...p, position: snakeTail } : p
      ));
      finalPos = snakeTail;
      await delay(400);
    }

    setIsAnimating(false);
    return { won: false, finalPos, gotBonus: roll === 6 };
  }, [playStep, playLadderClimb, playSnakeBite, playVictory, showXpToast, showBadgeToast]);

  // ── Player turn ─────────────────────────────────────────────────────────────

  const doTurn = useCallback(async (playerIdx: number, roll: number, currentPlayers: Player[]) => {
    const result = await executeMove(playerIdx, roll, currentPlayers);
    if (!result || result.won) return;

    const total = currentPlayers.length;
    if (result.gotBonus) {
      setBonusRoll(true);
      const bonusPlayer = currentPlayers[playerIdx];
      setStatusMsg(`🎲 ${bonusPlayer.name} rolled a 6 — bonus roll!`);

      if (bonusPlayer.isAI) {
        await delay(900);
        setBonusRoll(false);
        const bonusRollVal = aiRoll(difficulty);
        setDiceValue(bonusRollVal);
        setIsRolling(true);
        playDiceRoll();
        await delay(600);
        setIsRolling(false);
        // Get updated players
        setPlayers(prev => {
          doTurn(playerIdx, bonusRollVal, prev);
          return prev;
        });
      }
      return;
    }

    setBonusRoll(false);
    const nextIdx = (playerIdx + 1) % total;
    setCurrentIdx(nextIdx);

    const nextPlayer = currentPlayers[nextIdx];
    setStatusMsg(`${nextPlayer.name}'s turn — Roll the dice!`);

    if (nextPlayer.isAI) {
      await delay(800);
      const aiRollVal = aiRoll(difficulty);
      setDiceValue(aiRollVal);
      setIsRolling(true);
      playDiceRoll();
      await delay(600);
      setIsRolling(false);
      setStatusMsg(`${nextPlayer.name} rolled a ${aiRollVal}`);
      await delay(300);
      setPlayers(prev => {
        doTurn(nextIdx, aiRollVal, prev);
        return prev;
      });
    }
  }, [executeMove, difficulty, playDiceRoll]);

  // ── Human roll ──────────────────────────────────────────────────────────────

  const handleRoll = useCallback(async () => {
    if (isRolling || isAnimating) return;
    const roll = rollD6();
    setDiceValue(roll);
    setIsRolling(true);
    playDiceRoll();
    await delay(600);
    setIsRolling(false);
    setBonusRoll(false);
    setStatusMsg(`You rolled a ${roll}`);
    await delay(200);
    setPlayers(prev => {
      doTurn(currentIdx, roll, prev);
      return prev;
    });
  }, [isRolling, isAnimating, currentIdx, doTurn, playDiceRoll]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const currentPlayer = players[currentIdx];
  const showBack = phase !== 'splash' && phase !== 'playing' && phase !== 'game-over'
    && !(phase === 'online' && onlineGameState !== null);
  const canRoll = phase === 'playing' && !isRolling && !isAnimating && currentPlayer && !currentPlayer.isAI && !gameOverPhase;

  const headerTitle =
    phase === 'ai-count' || phase === 'ai-difficulty' ? 'vs AI Setup' :
    phase === 'pp-count' ? 'Pass & Play Setup' :
    phase === 'online' ? 'Online Multiplayer' :
    'Snakes & Ladders';

  return (
    <>
      {/* Toast stack */}
      <div className="fixed top-6 left-1/2 z-[200] flex flex-col items-center gap-2"
        style={{ transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(toast =>
            toast.type === 'xp'
              ? <XPToast key={toast.id} gained={toast.gained} />
              : <BadgeToast key={toast.id} badgeName={toast.badgeName} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
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
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full flex flex-col"
              style={{
                maxWidth: (phase === 'playing' || phase === 'game-over') ? 480 : 420,
                maxHeight: 'calc(100dvh - 1.5rem)',
                background: 'linear-gradient(160deg, #0f1923 0%, #0b0c10 100%)',
                border: '1px solid rgba(0,255,204,0.25)',
                borderRadius: 20,
                boxShadow: '0 0 60px rgba(0,255,204,0.08), 0 24px 64px rgba(0,0,0,0.6)',
                willChange: 'transform, opacity',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(0,255,204,0.1)' }}>
                {showBack ? (
                  <button onClick={handleBack}
                    className="flex items-center gap-1 text-white/40 hover:text-[#00ffcc] transition-colors duration-150 cursor-pointer">
                    <ChevronLeft size={18} />
                    <span className="text-xs font-mono uppercase tracking-wider">Back</span>
                  </button>
                ) : (phase === 'playing' || phase === 'game-over') ? (
                  <button onClick={handleBack}
                    className="flex items-center gap-1 text-white/40 hover:text-[#00ffcc] transition-colors duration-150 cursor-pointer">
                    <ChevronLeft size={18} />
                    <span className="text-xs font-mono uppercase tracking-wider">Quit</span>
                  </button>
                ) : (
                  <div className="w-16" />
                )}

                <h2 className="font-display text-base font-bold uppercase tracking-widest text-[#00ffcc]"
                  style={{ textShadow: '0 0 12px rgba(0,255,204,0.5)' }}>
                  {headerTitle}
                </h2>

                <button onClick={handleClose}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-white/40
                             hover:text-white hover:bg-white/10 transition-all duration-150 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 px-4 pb-4 pt-3" style={{ scrollbarWidth: 'none' }}>

                {/* ── SPLASH / MODE SELECT ─────────────────────────────── */}
                {phase === 'splash' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4">
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest mb-1">
                      Select Game Mode
                    </p>

                    {([
                      {
                        id: 'ai-count' as const, icon: '/assets/icons/icon_ai_bot.png', label: 'Play vs AI',
                        sub: 'Solo · 1v1 up to 1v6 vs AI', accent: '#00ffcc',
                        bg: 'rgba(0,255,204,0.06)', bgH: 'rgba(0,255,204,0.11)',
                        border: 'rgba(0,255,204,0.2)', borderH: 'rgba(0,255,204,0.55)',
                      },
                      {
                        id: 'pp-count' as const, icon: '/assets/icons/icon_local_multiplayer.png', label: 'Pass & Play',
                        sub: '2–6 players · Local multiplayer', accent: '#8a2be2',
                        bg: 'rgba(138,43,226,0.06)', bgH: 'rgba(138,43,226,0.11)',
                        border: 'rgba(138,43,226,0.2)', borderH: 'rgba(138,43,226,0.55)',
                      },
                      {
                        id: 'online' as const, icon: '/assets/icons/icon_global_multiplayer.png', label: 'Online Multiplayer',
                        sub: 'Real-time · Play worldwide', accent: '#00ffcc',
                        bg: 'rgba(0,255,204,0.06)', bgH: 'rgba(0,255,204,0.11)',
                        border: 'rgba(0,255,204,0.2)', borderH: 'rgba(0,255,204,0.55)',
                      },
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPhase(opt.id)}
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
                        <div
                          className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center"
                          style={{ background: `${opt.accent}14`, border: `1px solid ${opt.accent}33`, padding: '4px' }}
                        >
                          <img src={opt.icon} alt={opt.label} loading="eager" className="icon-crisp" />
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

                {/* ── AI COUNT ─────────────────────────────────────────────── */}
                {phase === 'ai-count' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4">
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest">
                      How many AI opponents?
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[1,2,3,4,5,6].map(n => (
                        <button key={n} onClick={() => setAiCount(n)}
                          className="py-4 rounded-xl font-display text-xl font-bold transition-all duration-200 cursor-pointer"
                          style={{
                            background: aiCount === n ? 'rgba(0,255,204,0.18)' : 'rgba(0,255,204,0.05)',
                            border: `1px solid ${aiCount === n ? 'rgba(0,255,204,0.7)' : 'rgba(0,255,204,0.2)'}`,
                            color: '#00ffcc',
                            textShadow: aiCount === n ? '0 0 12px rgba(0,255,204,0.8)' : 'none',
                            boxShadow: aiCount === n ? '0 0 20px rgba(0,255,204,0.15)' : 'none',
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-white/30 text-xs font-mono">
                      1 human vs {aiCount} AI bot{aiCount > 1 ? 's' : ''}
                    </p>
                    <button onClick={() => setPhase('ai-difficulty')}
                      className="w-full py-3.5 rounded-xl font-display tracking-widest uppercase text-sm font-bold transition-all duration-200 cursor-pointer mt-2"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(0,255,204,0.05))',
                        border: '1px solid rgba(0,255,204,0.5)', color: '#00ffcc',
                        textShadow: '0 0 10px rgba(0,255,204,0.6)',
                      }}>
                      Next →
                    </button>
                  </motion.div>
                )}

                {/* ── AI DIFFICULTY ─────────────────────────────────────────── */}
                {phase === 'ai-difficulty' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4">
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest">
                      Select Difficulty
                    </p>
                    {([
                      { value: 'easy' as const, label: 'Easy', accent: '#22c55e', accentFaint: 'rgba(34,197,94,0.1)', sub: 'Bots roll unluckily — you have the edge' },
                      { value: 'normal' as const, label: 'Normal', accent: '#eab308', accentFaint: 'rgba(234,179,8,0.1)', sub: 'Pure random dice — anyone can win' },
                      { value: 'hard' as const, label: 'Hard', accent: '#ef4444', accentFaint: 'rgba(239,68,68,0.1)', sub: 'Bots roll luckily — you have the challenge' },
                    ]).map(opt => (
                      <button key={opt.value} onClick={() => { setDifficulty(opt.value); startAIGame(); }}
                        className="flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
                        style={{ background: opt.accentFaint, border: `1px solid ${opt.accent}44` }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${opt.accent}99`;
                          (e.currentTarget as HTMLElement).style.background = opt.accentFaint.replace('0.1)', '0.2)');
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = `${opt.accent}44`;
                          (e.currentTarget as HTMLElement).style.background = opt.accentFaint;
                        }}>
                        <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center"
                          style={{ background: `${opt.accent}18`, border: `1px solid ${opt.accent}33` }}>
                          <div className="w-4 h-4 rounded-full"
                            style={{ background: opt.accent, boxShadow: `0 0 10px ${opt.accent}` }} />
                        </div>
                        <div className="flex-1">
                          <div className="font-display font-bold tracking-widest uppercase text-base"
                            style={{ color: opt.accent }}>{opt.label}</div>
                          <div className="text-white/40 text-xs mt-0.5">{opt.sub}</div>
                        </div>
                        <span className="text-lg opacity-50" style={{ color: opt.accent }}>›</span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* ── PP COUNT ─────────────────────────────────────────────── */}
                {phase === 'pp-count' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-4">
                    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest">
                      How many players?
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {[2,3,4,5,6].map(n => (
                        <button key={n} onClick={() => setPpCount(n)}
                          className="py-4 rounded-xl font-display text-xl font-bold transition-all duration-200 cursor-pointer"
                          style={{
                            background: ppCount === n ? 'rgba(138,43,226,0.2)' : 'rgba(138,43,226,0.06)',
                            border: `1px solid ${ppCount === n ? 'rgba(138,43,226,0.7)' : 'rgba(138,43,226,0.2)'}`,
                            color: '#c084fc',
                            textShadow: ppCount === n ? '0 0 12px rgba(138,43,226,0.8)' : 'none',
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {Array.from({ length: ppCount }, (_, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono"
                          style={{ background: `${PAWN_PALETTE[i].color}18`, border: `1px solid ${PAWN_PALETTE[i].color}44`, color: PAWN_PALETTE[i].color }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: PAWN_PALETTE[i].color }} />
                          P{i+1}
                        </div>
                      ))}
                    </div>
                    <button onClick={startPPGame}
                      className="w-full py-3.5 rounded-xl font-display tracking-widest uppercase text-sm font-bold transition-all duration-200 cursor-pointer mt-1"
                      style={{
                        background: 'linear-gradient(135deg, rgba(138,43,226,0.15), rgba(138,43,226,0.05))',
                        border: '1px solid rgba(138,43,226,0.5)', color: '#c084fc',
                        textShadow: '0 0 10px rgba(138,43,226,0.6)',
                      }}>
                      ▶ Start Game
                    </button>
                  </motion.div>
                )}

                {/* ── ONLINE MULTIPLAYER ───────────────────────────────────── */}
                {phase === 'online' && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    {onlineGameState === null ? (
                      <OnlineLobby
                        onGameStart={handleOnlineGameStart}
                        onBack={handleOnlineBack}
                      />
                    ) : (
                      <OnlineGame
                        initialState={onlineGameState}
                        onLeave={handleOnlineGameLeave}
                        onGameEnd={handleOnlineGameEnd}
                      />
                    )}
                  </motion.div>
                )}

                {/* ── PLAYING ──────────────────────────────────────────────── */}
                {(phase === 'playing' || phase === 'game-over') && players.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col gap-3">

                    {/* Board */}
                    <div className="w-full rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(0,255,204,0.15)', background: '#080c10' }}>
                      <SLBoard players={players} animatingTile={animatingTile} />
                    </div>

                    {/* Status message */}
                    <div className="text-center font-mono text-xs uppercase tracking-widest min-h-[20px]"
                      style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {statusMsg}
                    </div>

                    {/* Game over overlay */}
                    {phase === 'game-over' && winner && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl p-5 text-center flex flex-col items-center gap-3"
                        style={{
                          background: 'linear-gradient(135deg, rgba(0,20,14,0.95), rgba(0,14,10,0.98))',
                          border: '1px solid rgba(0,255,204,0.4)',
                          boxShadow: '0 0 40px rgba(0,255,204,0.12)',
                        }}>
                        <div className="text-3xl">🏆</div>
                        <div className="font-display font-bold text-lg uppercase tracking-widest"
                          style={{ color: winner.color, textShadow: `0 0 12px ${winner.glow}` }}>
                          {winner.name} Wins!
                        </div>
                        <div className="text-white/40 text-sm font-sans">
                          Reached Tile 100 first!
                        </div>
                        <div className="flex gap-3 w-full mt-1">
                          <button onClick={handleBack}
                            className="flex-1 py-2.5 rounded-xl font-display text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer"
                            style={{
                              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
                            }}>
                            Menu
                          </button>
                          <button
                            onClick={() => {
                              const mode = players.some(p => p.isAI) ? 'ai' : 'pp';
                              if (mode === 'ai') startAIGame();
                              else startPPGame();
                            }}
                            className="flex-1 py-2.5 rounded-xl font-display text-sm tracking-widest uppercase transition-all duration-200 cursor-pointer"
                            style={{
                              background: 'linear-gradient(135deg, rgba(0,255,204,0.15), rgba(0,255,204,0.05))',
                              border: '1px solid rgba(0,255,204,0.5)', color: '#00ffcc',
                              textShadow: '0 0 10px rgba(0,255,204,0.6)',
                            }}>
                            Play Again
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Controls */}
                    {phase === 'playing' && (
                      <div className="flex items-center gap-3">
                        {/* Dice */}
                        <Dice
                          value={diceValue}
                          color={currentPlayer?.color ?? '#00ffcc'}
                          glow={currentPlayer?.glow ?? 'rgba(0,255,204,0.7)'}
                          rolling={isRolling}
                        />

                        {/* Roll button */}
                        <button
                          onClick={handleRoll}
                          disabled={!canRoll}
                          className="flex-1 py-3.5 rounded-xl font-display tracking-widest uppercase text-sm font-bold transition-all duration-200"
                          style={{
                            background: canRoll
                              ? `linear-gradient(135deg, ${currentPlayer?.color}22, ${currentPlayer?.color}0a)`
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${canRoll ? currentPlayer?.color + '88' : 'rgba(255,255,255,0.1)'}`,
                            color: canRoll ? currentPlayer?.color : 'rgba(255,255,255,0.25)',
                            cursor: canRoll ? 'pointer' : 'not-allowed',
                            boxShadow: canRoll ? `0 0 20px ${currentPlayer?.glow?.replace('0.7', '0.15')}` : 'none',
                          }}>
                          {isRolling ? '⚡ Rolling...' :
                           isAnimating ? '⏳ Moving...' :
                           currentPlayer?.isAI ? '🤖 AI thinking...' :
                           bonusRoll ? '🎲 Bonus Roll!' :
                           '🎲 Roll Dice'}
                        </button>
                      </div>
                    )}

                    {/* Player list */}
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(players.length, 4)}, 1fr)` }}>
                      {players.map((p, i) => (
                        <div key={p.id}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs"
                          style={{
                            background: i === currentIdx && phase === 'playing'
                              ? `${p.color}18` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${i === currentIdx && phase === 'playing' ? p.color + '55' : 'rgba(255,255,255,0.07)'}`,
                          }}>
                          <div className="w-3 h-3 rounded-full shrink-0"
                            style={{ background: p.color, boxShadow: `0 0 6px ${p.glow}` }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono truncate" style={{ color: p.color, fontSize: 9 }}>
                              {p.name}
                            </div>
                            <div className="text-white/30 font-mono" style={{ fontSize: 9 }}>
                              Tile {p.position || '—'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
