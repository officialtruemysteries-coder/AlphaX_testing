/**
 * OnlineGame.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time online Tic-Tac-Toe board for two remote players.
 *
 * Design rules (from spec):
 *  • Host = X = always first. Guest = O = always second.
 *  • Turn indicators: "Your Turn" vs "Opponent's Turn"
 *  • Optimistic move updates → server broadcast reconciles state
 *  • Strict profile rendering: rank shown only if rankDisplayName is set,
 *    badge shown only if equippedBadgeName is set, never empty placeholders
 *  • Opponent disconnect banner ONLY shown if game was still in progress
 *  • All existing sounds preserved (move, lineComplete, victory, defeat, draw)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { getSocket } from '../lib/socket';
import { useGameSounds } from '../hooks/useGameSounds';
import { awardSessionXP } from '../lib/playerProfile';
import type { BadgeId } from '../lib/playerProfile';
import type { OnlineGameState, Cell } from '../lib/onlineTypes';

// ─── Win logic (mirrors server) ───────────────────────────────────────────────

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board: Cell[]): { winner: 'X' | 'O'; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line };
    }
  }
  return null;
}

// ─── Symbols ──────────────────────────────────────────────────────────────────

function XSymbol({ dim }: { dim?: boolean }) {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.2, rotate: -30 }}
      animate={{ opacity: dim ? 0.25 : 1, scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      viewBox="0 0 100 100" className="w-full h-full" style={{ padding: '18%' }}
    >
      <line x1="18" y1="18" x2="82" y2="82" stroke="#00ffcc" strokeWidth="11" strokeLinecap="round"
        style={{ filter: dim ? 'none' : 'drop-shadow(0 0 8px #00ffcc)' }} />
      <line x1="82" y1="18" x2="18" y2="82" stroke="#00ffcc" strokeWidth="11" strokeLinecap="round"
        style={{ filter: dim ? 'none' : 'drop-shadow(0 0 8px #00ffcc)' }} />
    </motion.svg>
  );
}

function OSymbol({ dim }: { dim?: boolean }) {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: dim ? 0.25 : 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      viewBox="0 0 100 100" className="w-full h-full" style={{ padding: '18%' }}
    >
      <circle cx="50" cy="50" r="32" fill="none" stroke="#8a2be2" strokeWidth="11"
        style={{ filter: dim ? 'none' : 'drop-shadow(0 0 8px #8a2be2)' }} />
    </motion.svg>
  );
}

// ─── Player card (strict conditional rendering) ───────────────────────────────

interface PlayerCardProps {
  username: string;
  rankDisplayName: string | null;
  equippedBadgeName: string | null;
  symbol: 'X' | 'O';
  score: number;
  isMe: boolean;
  isCurrentTurn: boolean;
}

function PlayerCard({ username, rankDisplayName, equippedBadgeName, symbol, score, isMe, isCurrentTurn }: PlayerCardProps) {
  const accent = symbol === 'X' ? '#00ffcc' : '#8a2be2';
  const bg     = symbol === 'X' ? 'rgba(0,255,204,0.05)' : 'rgba(138,43,226,0.05)';
  const border = symbol === 'X'
    ? isCurrentTurn ? 'rgba(0,255,204,0.55)' : 'rgba(0,255,204,0.2)'
    : isCurrentTurn ? 'rgba(138,43,226,0.55)' : 'rgba(138,43,226,0.2)';

  return (
    <div
      className="flex-1 flex flex-col items-center py-2.5 px-2 rounded-lg transition-all duration-300"
      style={{ background: bg, border: `1px solid ${border}`, boxShadow: isCurrentTurn ? `0 0 12px ${accent}22` : 'none' }}
    >
      {/* Symbol */}
      <span className="text-[10px] font-mono mb-0.5" style={{ color: `${accent}80` }}>
        {symbol === 'X' ? '✕' : '○'}
      </span>

      {/* Score */}
      <span className="text-2xl font-display font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}88` }}>
        {score}
      </span>

      {/* Username — always shown */}
      <span
        className="text-[10px] font-mono mt-1 text-center truncate max-w-full"
        style={{ color: `${accent}cc` }}
        title={username}
      >
        {username}
      </span>

      {/* Rank — ONLY if rankDisplayName is set */}
      {rankDisplayName && (
        <span className="text-[9px] font-mono text-white/40 mt-0.5 text-center truncate max-w-full"
          title={rankDisplayName}>
          {rankDisplayName}
        </span>
      )}

      {/* Badges are NOT shown in-game — displayed on Profile page only */}

      {/* YOU chip */}
      {isMe && (
        <span
          className="text-[8px] font-mono uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded"
          style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}44` }}
        >
          YOU
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OnlineGameProps {
  initialState: OnlineGameState;
  onLeave: () => void;
  onGameEnd?: (result: { gained: number; newBadges: BadgeId[] }) => void;
}

export function OnlineGame({ initialState, onLeave, onGameEnd }: OnlineGameProps) {
  const [board,         setBoard]         = useState<Cell[]>(initialState.board);
  const [currentPlayer, setCurrentPlayer] = useState<'X'|'O'>(initialState.currentPlayer);
  const [gameResult,    setGameResult]    = useState(initialState.gameResult);
  const [isDraw,        setIsDraw]        = useState(initialState.isDraw);
  const [scores,        setScores]        = useState(initialState.scores);
  const [opponentLeft,  setOpponentLeft]  = useState(false);

  // Track profiles (may be updated if a reconnection sends fresh data)
  const [hostProfile,  setHostProfile]  = useState(initialState.hostProfile);
  const [guestProfile, setGuestProfile] = useState(initialState.guestProfile);

  const { mySymbol } = initialState;
  const myMoveRef = useRef(false);     // optimistic-move guard for sound dedup
  const prevResultRef = useRef(initialState.gameResult);
  const prevDrawRef   = useRef(initialState.isDraw);

  // ── Refs used to avoid stale closures in socket callbacks ─────────────────
  // These mirror gameResult/isDraw state so the disconnect handler can check
  // whether the game was already concluded without a stale closure.
  const gameResultRef = useRef(initialState.gameResult);
  const isDrawRef     = useRef(initialState.isDraw);

  // XP awarded guard — award exactly once per game round
  const xpAwardedRef = useRef(false);

  const { playMove, playLineComplete, playVictory, playDefeat, playDraw } = useGameSounds();

  // ── Award XP once when the game concludes (any outcome) ──────────────────
  useEffect(() => {
    const gameOver = !!gameResult || isDraw || opponentLeft;
    if (!gameOver || xpAwardedRef.current) return;
    xpAwardedRef.current = true;

    const result = awardSessionXP();
    if (result.gained > 0) {
      onGameEnd?.({ gained: result.gained, newBadges: result.newBadges });
    }
  // onGameEnd is stable (useCallback in parent) — safe to include
  }, [gameResult, isDraw, opponentLeft, onGameEnd]);

  // ── Socket event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onMoveSynced = (data: {
      board: Cell[];
      currentPlayer: 'X' | 'O';
      gameResult: { winner: 'X' | 'O'; line: number[] } | null;
      isDraw: boolean;
      scores: { X: number; O: number; draw: number };
      bySocketId: string;
    }) => {
      const isOpponentMove = !myMoveRef.current;
      myMoveRef.current = false;

      if (isOpponentMove) playMove();

      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      setScores(data.scores);

      // Outcome sounds — fire only on transition
      if (data.gameResult && !prevResultRef.current) {
        playLineComplete();
        setTimeout(() => {
          if (data.gameResult!.winner === mySymbol) playVictory();
          else playDefeat();
        }, 10);
      } else if (data.isDraw && !prevDrawRef.current) {
        playDraw();
      }

      prevResultRef.current = data.gameResult;
      prevDrawRef.current   = data.isDraw;

      // Keep refs in sync so disconnect handler sees current state
      gameResultRef.current = data.gameResult;
      isDrawRef.current     = data.isDraw;

      setGameResult(data.gameResult);
      setIsDraw(data.isDraw);
    };

    const onGameReset = (data: {
      board: Cell[]; currentPlayer: 'X' | 'O'; scores: { X: number; O: number; draw: number };
    }) => {
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
      setScores(data.scores);
      setGameResult(null);
      setIsDraw(false);
      setOpponentLeft(false);
      prevResultRef.current = null;
      prevDrawRef.current   = false;
      gameResultRef.current = null;
      isDrawRef.current     = false;
      xpAwardedRef.current  = false; // allow XP for the next round
    };

    const onOpponentDisconnected = () => {
      // ── CRITICAL: only trigger default-win if the game was still in progress.
      // If it already concluded (natural win/loss/draw), do nothing — the result
      // stands and we must NOT override it with a disconnect banner.
      if (gameResultRef.current || isDrawRef.current) return;
      setOpponentLeft(true);
    };

    socket.on('move-synced',           onMoveSynced);
    socket.on('game-reset',            onGameReset);
    socket.on('opponent-disconnected', onOpponentDisconnected);

    return () => {
      socket.off('move-synced',           onMoveSynced);
      socket.off('game-reset',            onGameReset);
      socket.off('opponent-disconnected', onOpponentDisconnected);
    };
  }, [mySymbol, playMove, playLineComplete, playVictory, playDefeat, playDraw]);

  // ── Move handler (optimistic) ─────────────────────────────────────────────
  const handleClick = useCallback((index: number) => {
    if (board[index]) return;
    if (gameResult || isDraw) return;
    if (currentPlayer !== mySymbol) return;
    if (opponentLeft) return;

    // Optimistic update
    myMoveRef.current = true;
    const newBoard = [...board] as Cell[];
    newBoard[index] = mySymbol;
    setBoard(newBoard);
    playMove();

    const result = checkWinner(newBoard);
    if (result) {
      setGameResult(result);
      gameResultRef.current = result; // keep ref in sync
      setScores(s => ({ ...s, [result.winner]: s[result.winner] + 1 }));
      prevResultRef.current = result;
      playLineComplete();
      setTimeout(() => {
        if (result.winner === mySymbol) playVictory(); else playDefeat();
      }, 10);
    } else if (newBoard.every(c => c !== null)) {
      setIsDraw(true);
      isDrawRef.current = true; // keep ref in sync
      setScores(s => ({ ...s, draw: s.draw + 1 }));
      prevDrawRef.current = true;
      playDraw();
    } else {
      setCurrentPlayer(mySymbol === 'X' ? 'O' : 'X');
    }

    getSocket().emit('make-move', { index });
  }, [board, gameResult, isDraw, currentPlayer, mySymbol, opponentLeft,
      playMove, playLineComplete, playVictory, playDefeat, playDraw]);

  const handleNewGame = useCallback(() => {
    getSocket().emit('reset-game');
  }, []);

  const handleLeave = useCallback(() => {
    getSocket().emit('leave-room');
    onLeave();
  }, [onLeave]);

  // ── Derived values ────────────────────────────────────────────────────────
  const isMyTurn     = currentPlayer === mySymbol && !gameResult && !isDraw && !opponentLeft;
  const winningCells = new Set(gameResult?.line ?? []);

  const hostIsMe  = mySymbol === 'X';
  const guestIsMe = mySymbol === 'O';

  let statusText  = '';
  let statusColor = '#ffffff55';
  if (opponentLeft) {
    // Only reached when game was in progress — so "You win by default" is correct
    statusText  = 'You Win by Default! 🎉';
    statusColor = '#00ffcc';
  } else if (gameResult) {
    if (gameResult.winner === mySymbol) { statusText = 'You Win! 🎉';    statusColor = '#00ffcc'; }
    else                                { statusText = 'You Lose! 💔';   statusColor = '#8a2be2'; }
  } else if (isDraw) {
    statusText = "It's a Draw! 🤝"; statusColor = '#ffffff99';
  } else {
    statusText  = isMyTurn ? 'Your Turn' : "Opponent's Turn";
    statusColor = isMyTurn ? '#00ffcc' : '#8a2be2';
  }

  return (
    <div className="flex flex-col items-center w-full select-none">

      {/* ── Opponent disconnected banner (only shown when game was active) ── */}
      <AnimatePresence>
        {opponentLeft && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -10               }}
            className="w-full mb-3 px-4 py-3 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))',
              border: '1px solid rgba(239,68,68,0.45)',
              boxShadow: '0 0 20px rgba(239,68,68,0.1)',
            }}
          >
            <p
              className="font-display text-sm font-bold uppercase tracking-widest"
              style={{ color: '#fca5a5', textShadow: '0 0 12px rgba(239,68,68,0.5)' }}
            >
              ⚠️ Opponent Disconnected!
            </p>
            <p className="text-white/40 text-xs font-mono mt-0.5">You win by default</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scoreboard ───────────────────────────────────────────────────── */}
      <div className="w-full mb-3">
        <div className="flex items-stretch gap-2">
          {/* Host (X) */}
          <PlayerCard
            username={hostProfile.username}
            rankDisplayName={hostProfile.rankDisplayName}
            equippedBadgeName={hostProfile.equippedBadgeName}
            symbol="X"
            score={scores.X}
            isMe={hostIsMe}
            isCurrentTurn={currentPlayer === 'X' && !gameResult && !isDraw}
          />

          {/* Draw */}
          <div className="flex flex-col items-center justify-center py-2.5 px-3 rounded-lg bg-[#111827] border border-white/10">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-0.5">Draw</span>
            <span className="text-2xl font-display font-bold text-white/50">{scores.draw}</span>
          </div>

          {/* Guest (O) */}
          <PlayerCard
            username={guestProfile.username}
            rankDisplayName={guestProfile.rankDisplayName}
            equippedBadgeName={guestProfile.equippedBadgeName}
            symbol="O"
            score={scores.O}
            isMe={guestIsMe}
            isCurrentTurn={currentPlayer === 'O' && !gameResult && !isDraw}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleNewGame}
            disabled={(!gameResult && !isDraw && !opponentLeft)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-black/40
                       border border-[#00ffcc]/20 hover:border-[#00ffcc]/60 hover:bg-[#00ffcc]/5
                       text-[#00ffcc]/70 hover:text-[#00ffcc] text-[11px] font-display tracking-widest
                       uppercase transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RefreshCw size={11} />
            New Game
          </button>
          <button
            onClick={handleLeave}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-black/40
                       border border-white/10 hover:border-white/30 hover:bg-white/5
                       text-white/40 hover:text-white/70 text-[11px] font-display tracking-widest
                       uppercase transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft size={11} />
            Leave
          </button>
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div
        className="w-full text-center py-2 mb-3 rounded-lg font-mono text-sm tracking-wider transition-all duration-300"
        style={{
          color: statusColor,
          textShadow: statusColor !== '#ffffff55' && statusColor !== '#ffffff99' ? `0 0 10px ${statusColor}66` : 'none',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        {statusText}
      </div>

      {/* ── Game board ───────────────────────────────────────────────────── */}
      <div className="w-full" style={{ maxWidth: 'min(100%, 300px)' }}>
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{
            aspectRatio: '1',
            background: '#0b0c10',
            border: '2px solid rgba(0,255,204,0.18)',
            boxShadow: '0 0 30px rgba(0,255,204,0.06), inset 0 0 20px rgba(0,0,0,0.5)',
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {[33.333, 66.666].map(pct => (
              <React.Fragment key={pct}>
                <div className="absolute left-0 right-0" style={{ top: `calc(${pct}% - 1px)`, height: 2,
                  background: 'linear-gradient(90deg, transparent 2%, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent 98%)' }} />
                <div className="absolute top-0 bottom-0" style={{ left: `calc(${pct}% - 1px)`, width: 2,
                  background: 'linear-gradient(180deg, transparent 2%, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent 98%)' }} />
              </React.Fragment>
            ))}
          </div>

          {/* Cells */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {board.map((cell, i) => {
              const isWinCell = winningCells.has(i);
              const isDimmed  = (gameResult || isDraw) && !isWinCell;
              const clickable = !cell && !gameResult && !isDraw && isMyTurn && !opponentLeft;

              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  disabled={!clickable}
                  className="relative flex items-center justify-center transition-colors duration-150 focus:outline-none group"
                  style={{
                    background: isWinCell
                      ? (cell === 'X' ? 'rgba(0,255,204,0.07)' : 'rgba(138,43,226,0.07)')
                      : 'transparent',
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                >
                  {clickable && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{ background: 'rgba(0,255,204,0.04)' }} />
                  )}
                  {isWinCell && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-1 rounded-lg"
                      style={{
                        border: `1px solid ${cell === 'X' ? 'rgba(0,255,204,0.4)' : 'rgba(138,43,226,0.4)'}`,
                        boxShadow: `inset 0 0 12px ${cell === 'X' ? 'rgba(0,255,204,0.15)' : 'rgba(138,43,226,0.15)'}`,
                      }}
                    />
                  )}
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

      {/* ── Play Again / Leave after disconnect ──────────────────────────── */}
      <AnimatePresence>
        {(gameResult || isDraw || opponentLeft) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="mt-4 w-full flex flex-col gap-2"
            style={{ maxWidth: 'min(100%, 300px)' }}
          >
            {!opponentLeft && (
              <button
                onClick={handleNewGame}
                className="w-full py-2.5 rounded-xl font-display tracking-widest uppercase text-sm
                           border border-[#00ffcc]/40 hover:border-[#00ffcc] bg-[#00ffcc]/5
                           hover:bg-[#00ffcc]/10 text-[#00ffcc] transition-all duration-200 cursor-pointer"
                style={{ textShadow: '0 0 8px #00ffcc66' }}
              >
                Play Again
              </button>
            )}
            {opponentLeft && (
              <button
                onClick={handleLeave}
                className="w-full py-2.5 rounded-xl font-display tracking-widest uppercase text-sm
                           border border-white/20 hover:border-white/40 bg-white/5
                           hover:bg-white/8 text-white/60 transition-all duration-200 cursor-pointer"
              >
                Return to Lobby
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
