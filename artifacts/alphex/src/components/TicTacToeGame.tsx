import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useGameSounds } from '../hooks/useGameSounds';

// ─── Types ────────────────────────────────────────────────────────────────────
type Cell = 'X' | 'O' | null;
export type GameMode = 'ai' | 'pass-and-play';
export type Difficulty = 'easy' | 'normal' | 'hard';

// ─── Constants ────────────────────────────────────────────────────────────────
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

// ─── Game Logic ───────────────────────────────────────────────────────────────
function checkWinner(board: Cell[]): { winner: 'X' | 'O'; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line };
    }
  }
  return null;
}

function minimax(board: Cell[], isMaximizing: boolean, depth: number, alpha: number, beta: number): number {
  const result = checkWinner(board);
  if (result?.winner === 'O') return 10 - depth;
  if (result?.winner === 'X') return depth - 10;
  if (board.every(c => c !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false, depth + 1, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true, depth + 1, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

function getBestMove(board: Cell[], difficulty: Difficulty): number {
  const boardCopy = [...board] as Cell[];
  const empty = boardCopy.map((c, i) => (c === null ? i : -1)).filter(i => i !== -1);

  // Easy: fully random
  if (difficulty === 'easy') {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Normal: 30% random "mistake" — stays beatable for all ages
  if (difficulty === 'normal' && Math.random() < 0.3 && empty.length > 1) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Hard (and Normal fallthrough): pure minimax
  let best = -Infinity;
  let bestMove = empty[0];
  for (const i of empty) {
    boardCopy[i] = 'O';
    const score = minimax(boardCopy, false, 0, -Infinity, Infinity);
    boardCopy[i] = null;
    if (score > best) {
      best = score;
      bestMove = i;
    }
  }
  return bestMove;
}

// ─── AI thinking delay by difficulty ─────────────────────────────────────────
function thinkDelay(difficulty: Difficulty): number {
  if (difficulty === 'easy') return 420;
  if (difficulty === 'normal') return 580;
  return 750; // Hard — pause for effect
}

// ─── Symbols ─────────────────────────────────────────────────────────────────
function XSymbol({ dim }: { dim?: boolean }) {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.2, rotate: -30 }}
      animate={{ opacity: dim ? 0.25 : 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      viewBox="0 0 100 100"
      className="w-full h-full"
      style={{ padding: '18%' }}
    >
      <line
        x1="18" y1="18" x2="82" y2="82"
        stroke="#00ffcc" strokeWidth="11" strokeLinecap="round"
        style={{ filter: dim ? 'none' : 'drop-shadow(0 0 8px #00ffcc)' }}
      />
      <line
        x1="82" y1="18" x2="18" y2="82"
        stroke="#00ffcc" strokeWidth="11" strokeLinecap="round"
        style={{ filter: dim ? 'none' : 'drop-shadow(0 0 8px #00ffcc)' }}
      />
    </motion.svg>
  );
}

function OSymbol({ dim }: { dim?: boolean }) {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: dim ? 0.25 : 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      viewBox="0 0 100 100"
      className="w-full h-full"
      style={{ padding: '18%' }}
    >
      <circle
        cx="50" cy="50" r="32"
        fill="none" stroke="#8a2be2" strokeWidth="11"
        style={{ filter: dim ? 'none' : 'drop-shadow(0 0 8px #8a2be2)' }}
      />
    </motion.svg>
  );
}

// ─── Difficulty badge ─────────────────────────────────────────────────────────
const DIFFICULTY_META: Record<Difficulty, { label: string; dot: string; color: string }> = {
  easy:   { label: 'Easy',   dot: '#22c55e', color: 'rgba(34,197,94,0.18)'  },
  normal: { label: 'Normal', dot: '#eab308', color: 'rgba(234,179,8,0.18)'  },
  hard:   { label: 'Hard',   dot: '#ef4444', color: 'rgba(239,68,68,0.18)'  },
};

// ─── Scoreboard ──────────────────────────────────────────────────────────────
interface ScoreboardProps {
  mode: GameMode;
  difficulty?: Difficulty;
  scores: { X: number; O: number; draw: number };
  onChangeMode: () => void;
  onNewGame: () => void;
}

function Scoreboard({ mode, difficulty, scores, onChangeMode, onNewGame }: ScoreboardProps) {
  const p1Label = 'Player 1';
  const p2Label = mode === 'ai' ? 'AI Bot' : 'Player 2';
  const meta = difficulty ? DIFFICULTY_META[difficulty] : null;

  return (
    <div className="w-full mb-3">
      {/* Difficulty chip (AI mode only) */}
      {meta && (
        <div className="flex justify-center mb-2">
          <span
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: meta.color, border: `1px solid ${meta.dot}55`, color: meta.dot }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: meta.dot, boxShadow: `0 0 4px ${meta.dot}` }}
            />
            {meta.label}
          </span>
        </div>
      )}

      {/* Score row */}
      <div className="flex items-stretch gap-2">
        {/* P1 */}
        <div className="flex-1 flex flex-col items-center py-2.5 px-2 rounded-lg bg-[#0d1f1a] border border-[#00ffcc]/30">
          <span className="text-[10px] font-mono text-[#00ffcc]/60 uppercase tracking-widest mb-0.5">{p1Label}</span>
          <span className="text-[10px] font-mono text-[#00ffcc]/50 mb-1">✕</span>
          <span
            className="text-2xl font-display font-bold text-[#00ffcc]"
            style={{ textShadow: '0 0 12px #00ffcc88' }}
          >
            {scores.X}
          </span>
        </div>

        {/* Draws */}
        <div className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg bg-[#111827] border border-white/10">
          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">Draw</span>
          <span className="text-2xl font-display font-bold text-white/50">{scores.draw}</span>
        </div>

        {/* P2 / AI */}
        <div className="flex-1 flex flex-col items-center py-2.5 px-2 rounded-lg bg-[#160d2a] border border-[#8a2be2]/30">
          <span className="text-[10px] font-mono text-[#8a2be2]/70 uppercase tracking-widest mb-0.5">{p2Label}</span>
          <span className="text-[10px] font-mono text-[#8a2be2]/50 mb-1">○</span>
          <span
            className="text-2xl font-display font-bold text-[#8a2be2]"
            style={{ textShadow: '0 0 12px #8a2be288' }}
          >
            {scores.O}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={onNewGame}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-black/40
                     border border-[#00ffcc]/20 hover:border-[#00ffcc]/60 hover:bg-[#00ffcc]/5
                     text-[#00ffcc]/70 hover:text-[#00ffcc] text-[11px] font-display tracking-widest
                     uppercase transition-all duration-200 cursor-pointer"
        >
          <RefreshCw size={11} />
          New Game
        </button>
        <button
          onClick={onChangeMode}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-black/40
                     border border-white/10 hover:border-white/30 hover:bg-white/5
                     text-white/40 hover:text-white/70 text-[11px] font-display tracking-widest
                     uppercase transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft size={11} />
          Change Mode
        </button>
      </div>
    </div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────
interface TicTacToeGameProps {
  mode: GameMode;
  difficulty?: Difficulty;
  onChangeMode: () => void;
  /** Called immediately when any game concludes (win, lose, or draw). */
  onGameEnd?: () => void;
  /** Raw winner/draw for per-mode voice routing. Not passed in Pass & Play. */
  onOutcome?: (winner: 'X' | 'O' | 'draw') => void;
}

export function TicTacToeGame({ mode, difficulty = 'normal', onChangeMode, onGameEnd, onOutcome }: TicTacToeGameProps) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X');
  const [gameResult, setGameResult] = useState<{ winner: 'X' | 'O'; line: number[] } | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });

  const { playMove, playLineComplete, playVictory, playDefeat, playDraw } = useGameSounds();

  // Guard: fire onGameEnd exactly once per round; reset when a new round begins
  const gameEndedRef = useRef(false);

  const notifyGameEnd = useCallback((winner: 'X' | 'O' | 'draw') => {
    if (!gameEndedRef.current) {
      gameEndedRef.current = true;
      onGameEnd?.();
      onOutcome?.(winner);
    }
  }, [onGameEnd, onOutcome]);

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setGameResult(null);
    setIsDraw(false);
    setIsAiThinking(false);
    gameEndedRef.current = false; // allow XP award for the next round
  }, []);

  const handleResetScores = useCallback(() => {
    setScores({ X: 0, O: 0, draw: 0 });
    resetBoard();
  }, [resetBoard]);

  // ── Resolve outcome sounds (fires when gameResult / isDraw changes) ─────────
  useEffect(() => {
    if (gameResult) {
      playLineComplete();
      if (mode === 'ai') {
        // In AI mode: X = human win, O = AI win
        if (gameResult.winner === 'X') setTimeout(playVictory, 10);
        else setTimeout(playDefeat, 10);
      } else {
        // Pass & play: both are victories
        setTimeout(playVictory, 10);
      }
    } else if (isDraw) {
      playDraw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameResult, isDraw]);

  // ── AI move effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'ai' || currentPlayer !== 'O' || gameResult || isDraw) return;
    const empty = board.filter(c => c === null);
    if (empty.length === 0) return;

    setIsAiThinking(true);
    const timer = setTimeout(() => {
      const move = getBestMove([...board], difficulty);
      const newBoard = [...board] as Cell[];
      newBoard[move] = 'O';
      setBoard(newBoard);
      playMove(); // AI places its piece

      const result = checkWinner(newBoard);
      if (result) {
        setGameResult(result);
        setScores(s => ({ ...s, [result.winner]: s[result.winner] + 1 }));
        notifyGameEnd(result.winner);
      } else if (newBoard.every(c => c !== null)) {
        setIsDraw(true);
        setScores(s => ({ ...s, draw: s.draw + 1 }));
        notifyGameEnd('draw');
      } else {
        setCurrentPlayer('X');
      }
      setIsAiThinking(false);
    }, thinkDelay(difficulty));

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, currentPlayer, mode, gameResult, isDraw, difficulty]);

  const handleClick = (index: number) => {
    if (board[index] || gameResult || isDraw || isAiThinking) return;
    if (mode === 'ai' && currentPlayer === 'O') return;

    const newBoard = [...board] as Cell[];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);
    playMove(); // Human places piece

    const result = checkWinner(newBoard);
    if (result) {
      setGameResult(result);
      setScores(s => ({ ...s, [result.winner]: s[result.winner] + 1 }));
      notifyGameEnd(result.winner);
    } else if (newBoard.every(c => c !== null)) {
      setIsDraw(true);
      setScores(s => ({ ...s, draw: s.draw + 1 }));
      notifyGameEnd('draw');
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  // Status message
  const p2Name = mode === 'ai' ? 'AI Bot' : 'Player 2';
  let statusText = '';
  let statusColor = '';
  if (gameResult) {
    if (mode === 'ai') {
      statusText  = gameResult.winner === 'X' ? 'You Win! 🎉' : 'You Lose! 💔';
    } else {
      statusText  = gameResult.winner === 'X' ? 'Player 1 Wins! 🎉' : 'Player 2 Wins! 🎉';
    }
    statusColor = gameResult.winner === 'X' ? '#00ffcc' : '#8a2be2';
  } else if (isDraw) {
    statusText = "It's a Draw! 🤝";
    statusColor = '#ffffff99';
  } else if (isAiThinking) {
    statusText = 'AI is thinking…';
    statusColor = '#8a2be2';
  } else {
    statusText = currentPlayer === 'X' ? "Player 1's turn  ✕" : `${p2Name}'s turn  ○`;
    statusColor = currentPlayer === 'X' ? '#00ffcc' : '#8a2be2';
  }

  const winningCells = new Set(gameResult?.line ?? []);

  return (
    <div className="flex flex-col items-center w-full select-none">
      <Scoreboard
        mode={mode}
        difficulty={mode === 'ai' ? difficulty : undefined}
        scores={scores}
        onChangeMode={onChangeMode}
        onNewGame={handleResetScores}
      />

      {/* Status bar */}
      <div
        className="w-full text-center py-2 mb-3 rounded-lg font-mono text-sm tracking-wider transition-all duration-300"
        style={{
          color: statusColor,
          textShadow: statusColor !== '#ffffff99' ? `0 0 10px ${statusColor}66` : 'none',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        {statusText}
      </div>

      {/* Game Grid */}
      <div
        className="w-full"
        style={{ maxWidth: 'min(100%, 300px)' }}
      >
        {/* Outer border */}
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{
            aspectRatio: '1',
            background: '#0b0c10',
            border: '2px solid rgba(0,255,204,0.18)',
            boxShadow: '0 0 30px rgba(0,255,204,0.06), inset 0 0 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Grid lines — 2 horizontal */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0"
              style={{
                top: 'calc(33.333% - 1px)',
                height: '2px',
                background: 'linear-gradient(90deg, transparent 2%, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent 98%)',
              }}
            />
            <div
              className="absolute left-0 right-0"
              style={{
                top: 'calc(66.666% - 1px)',
                height: '2px',
                background: 'linear-gradient(90deg, transparent 2%, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent 98%)',
              }}
            />
            {/* 2 vertical */}
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: 'calc(33.333% - 1px)',
                width: '2px',
                background: 'linear-gradient(180deg, transparent 2%, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent 98%)',
              }}
            />
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: 'calc(66.666% - 1px)',
                width: '2px',
                background: 'linear-gradient(180deg, transparent 2%, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent 98%)',
              }}
            />
          </div>

          {/* Cells — 3×3 absolute-positioned grid */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {board.map((cell, i) => {
              const isWinCell = winningCells.has(i);
              const isDimmed = (gameResult || isDraw) && !isWinCell;

              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  disabled={!!gameResult || isDraw || isAiThinking || (mode === 'ai' && currentPlayer === 'O')}
                  className="relative flex items-center justify-center transition-colors duration-150 focus:outline-none group"
                  style={{
                    background: isWinCell
                      ? cell === 'X'
                        ? 'rgba(0,255,204,0.07)'
                        : 'rgba(138,43,226,0.07)'
                      : 'transparent',
                    cursor: cell || gameResult || isDraw || isAiThinking ? 'default' : 'pointer',
                  }}
                >
                  {/* Hover highlight — only on empty cells */}
                  {!cell && !gameResult && !isDraw && !isAiThinking && (
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{ background: 'rgba(0,255,204,0.04)' }}
                    />
                  )}

                  {/* Winning cell glow ring */}
                  {isWinCell && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-1 rounded-lg"
                      style={{
                        border: `1px solid ${cell === 'X' ? 'rgba(0,255,204,0.4)' : 'rgba(138,43,226,0.4)'}`,
                        boxShadow: `inset 0 0 12px ${cell === 'X' ? 'rgba(0,255,204,0.15)' : 'rgba(138,43,226,0.15)'}`,
                      }}
                    />
                  )}

                  {/* Symbol */}
                  <AnimatePresence>
                    {cell && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {cell === 'X' ? <XSymbol dim={!!isDimmed} /> : <OSymbol dim={!!isDimmed} />}
                      </div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Game-over action */}
      <AnimatePresence>
        {(gameResult || isDraw) && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={resetBoard}
            className="mt-4 w-full py-2.5 rounded-xl font-display tracking-widest uppercase text-sm
                       border border-[#00ffcc]/40 hover:border-[#00ffcc] bg-[#00ffcc]/5
                       hover:bg-[#00ffcc]/10 text-[#00ffcc] transition-all duration-200 cursor-pointer"
            style={{ maxWidth: 'min(100%, 300px)', textShadow: '0 0 8px #00ffcc66' }}
          >
            Play Again
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
