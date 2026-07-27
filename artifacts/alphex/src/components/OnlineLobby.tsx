/**
 * OnlineLobby.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * All online-multiplayer lobby screens:
 *   main        → 4 option cards
 *   browse      → live public room list (auto-refreshes every 3 s)
 *   create      → public/private toggle → waiting for opponent
 *   join-code   → private room code input
 *   quick-join  → immediate; if no room found, shows waiting screen
 *
 * Calls onGameStart(state) when both players are in the room and the game
 * should begin.  Calls onBack() when the user exits to mode-select.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, Loader2, Lock, Globe, AlertTriangle } from 'lucide-react';
import { getSocket } from '../lib/socket';
import {
  getOrCreatePlayerId,
  readPlayerData,
  readBadges,
  getRankForXP,
  readOwnerRankOverride,
  getRankByName,
  BADGE_DEFS,
} from '../lib/playerProfile';
import type {
  ClientProfile,
  PublicRoomSummary,
  OnlineGameState,
  Cell,
} from '../lib/onlineTypes';

// ─── Build a ClientProfile snapshot from local storage ───────────────────────

function buildClientProfile(): ClientProfile {
  const data   = readPlayerData();
  const badges = readBadges();
  const override = readOwnerRankOverride();

  let rankDisplayName: string | null = null;
  if (override) {
    const tier = getRankByName(override);
    if (tier) rankDisplayName = tier.displayName;
  } else {
    rankDisplayName = getRankForXP(data.xp).displayName;
  }

  let equippedBadgeName: string | null = null;
  if (badges.equipped) {
    const def = BADGE_DEFS[badges.equipped];
    if (def) equippedBadgeName = def.name;
  }

  return {
    playerId: getOrCreatePlayerId(),
    username: data.username,
    xp: data.xp,
    rankDisplayName,
    equippedBadgeName,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LobbyPhase =
  | 'main'
  | 'browse'
  | 'create'
  | 'join-code'
  | 'waiting';          // shown for both "create" and "quick-join created" waits

interface WaitingMeta {
  roomId: string;
  code: string;
  isPrivate: boolean;
  myProfile: ClientProfile;
}

interface OnlineLobbyProps {
  onGameStart: (state: OnlineGameState) => void;
  onBack: () => void;           // back to mode-select
}

// ─── Neon button ──────────────────────────────────────────────────────────────

function NeonButton({
  onClick,
  children,
  color = '#00ffcc',
  disabled = false,
  fullWidth = true,
  small = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  small?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`${fullWidth ? 'w-full' : ''} flex items-center justify-center gap-2 rounded-xl font-display tracking-widest uppercase cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{
        padding: small ? '0.45rem 1rem' : '0.75rem 1rem',
        fontSize: small ? '0.7rem' : '0.8rem',
        background: hover && !disabled
          ? `linear-gradient(135deg, ${color}22, ${color}0a)`
          : `linear-gradient(135deg, ${color}14, ${color}06)`,
        border: `1px solid ${hover && !disabled ? color + 'cc' : color + '55'}`,
        color,
        textShadow: `0 0 10px ${color}66`,
        boxShadow: hover && !disabled ? `0 0 20px ${color}18` : 'none',
      }}
    >
      {children}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-white/40 font-mono text-xs uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

// ─── Copy code button ─────────────────────────────────────────────────────────

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
      style={{
        background: copied ? 'rgba(0,255,204,0.12)' : 'rgba(0,255,204,0.06)',
        border: '1px solid rgba(0,255,204,0.4)',
        color: '#00ffcc',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span className="font-mono text-sm font-bold tracking-widest">{code}</span>
      <span className="text-[10px] font-mono uppercase tracking-wider text-[#00ffcc]/60">
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnlineLobby({ onGameStart, onBack }: OnlineLobbyProps) {
  const [phase, setPhase]           = useState<LobbyPhase>('main');
  const [rooms, setRooms]           = useState<PublicRoomSummary[]>([]);
  const [isPrivate, setIsPrivate]   = useState(false);
  const [codeInput, setCodeInput]   = useState('');
  const [codeError, setCodeError]   = useState<string | null>(null);
  const [waiting, setWaiting]       = useState<WaitingMeta | null>(null);
  const [joining, setJoining]       = useState<string | null>(null); // roomId being joined
  const [connecting, setConnecting] = useState(false);

  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myProfile  = useRef<ClientProfile>(buildClientProfile());

  // ── Socket setup & event listeners ───────────────────────────────────────
  useEffect(() => {
    setConnecting(true);
    const socket = getSocket();

    const onConnect = () => setConnecting(false);

    const onRoomsList = ({ rooms: list }: { rooms: PublicRoomSummary[] }) => {
      setRooms(list);
    };

    const onRoomCreated = (data: {
      roomId: string; code: string; isPrivate: boolean;
      hostProfile: ClientProfile; waitingForOpponent?: boolean;
    }) => {
      setWaiting({
        roomId: data.roomId,
        code: data.code,
        isPrivate: data.isPrivate,
        myProfile: myProfile.current,
      });
      setPhase('waiting');
      setJoining(null);
    };

    const onRoomJoined = (data: {
      roomId: string; role: 'host' | 'guest';
      hostProfile: ClientProfile; guestProfile: ClientProfile;
      board: Cell[]; currentPlayer: 'X' | 'O';
      scores: { X: number; O: number; draw: number };
      gameResult: { winner: 'X' | 'O'; line: number[] } | null;
      isDraw: boolean;
    }) => {
      setJoining(null);
      setCodeError(null);
      const mySymbol: 'X' | 'O' = data.role === 'host' ? 'X' : 'O';
      onGameStart({
        roomId: data.roomId,
        mySymbol,
        hostProfile: data.hostProfile,
        guestProfile: data.guestProfile!,
        board: data.board,
        currentPlayer: data.currentPlayer,
        scores: data.scores,
        gameResult: data.gameResult,
        isDraw: data.isDraw,
      });
    };

    // Host receives this when the guest joins while waiting
    const onOpponentJoined = (data: { guestProfile: ClientProfile }) => {
      if (!waiting) return;
      onGameStart({
        roomId: waiting.roomId,
        mySymbol: 'X',
        hostProfile: waiting.myProfile,
        guestProfile: data.guestProfile,
        board: Array(9).fill(null) as Cell[],
        currentPlayer: 'X',
        scores: { X: 0, O: 0, draw: 0 },
        gameResult: null,
        isDraw: false,
      });
    };

    const onRoomError = ({ message }: { message: string }) => {
      setCodeError(message);
      setJoining(null);
    };

    if (socket.connected) setConnecting(false);
    socket.on('connect',          onConnect);
    socket.on('rooms-list',       onRoomsList);
    socket.on('room-created',     onRoomCreated);
    socket.on('room-joined',      onRoomJoined);
    socket.on('opponent-joined',  onOpponentJoined);
    socket.on('room-error',       onRoomError);

    return () => {
      socket.off('connect',         onConnect);
      socket.off('rooms-list',      onRoomsList);
      socket.off('room-created',    onRoomCreated);
      socket.off('room-joined',     onRoomJoined);
      socket.off('opponent-joined', onOpponentJoined);
      socket.off('room-error',      onRoomError);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  // ── Auto-refresh rooms list while in browse ───────────────────────────────
  useEffect(() => {
    if (phase === 'browse') {
      const fetchRooms = () => getSocket().emit('list-rooms');
      fetchRooms();
      refreshRef.current = setInterval(fetchRooms, 3000);
    } else {
      if (refreshRef.current) {
        clearInterval(refreshRef.current);
        refreshRef.current = null;
      }
    }
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleQuickJoin = useCallback(() => {
    getSocket().emit('quick-join', { profile: myProfile.current });
  }, []);

  const handleCreateRoom = useCallback(() => {
    getSocket().emit('create-room', { isPrivate, profile: myProfile.current });
  }, [isPrivate]);

  const handleJoinById = useCallback((roomId: string) => {
    setJoining(roomId);
    getSocket().emit('join-room-by-id', { roomId, profile: myProfile.current });
  }, []);

  const handleJoinByCode = useCallback(() => {
    const trimmed = codeInput.trim();
    if (!trimmed) { setCodeError('Please enter a room code.'); return; }
    setCodeError(null);
    setJoining('code');
    getSocket().emit('join-room-by-code', { code: trimmed, profile: myProfile.current });
  }, [codeInput]);

  const handleBack = useCallback(() => {
    if (phase === 'waiting') {
      // Emit leave-room so the server cleans up
      getSocket().emit('leave-room');
      setWaiting(null);
      setPhase('main');
    } else if (phase === 'main') {
      onBack();
    } else {
      setPhase('main');
      setCodeError(null);
      setCodeInput('');
    }
  }, [phase, onBack]);

  // ── Render: main lobby ────────────────────────────────────────────────────

  if (phase === 'main') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-3"
      >
        <SectionLabel>Online Multiplayer</SectionLabel>

        {connecting && (
          <div className="flex items-center justify-center gap-2 text-[#00ffcc]/50 text-xs font-mono py-2">
            <Loader2 size={12} className="animate-spin" />
            Connecting…
          </div>
        )}

        {/* Browse Public Rooms */}
        <button
          onClick={() => setPhase('browse')}
          className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
          style={{ background: 'rgba(0,255,204,0.05)', border: '1px solid rgba(0,255,204,0.18)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.5)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.18)'; }}
        >
          <div
            className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,204,0.08)', border: '1px solid rgba(0,255,204,0.2)', padding: '4px' }}
          >
            <img src="/assets/icons/icon_browse_rooms.png" alt="Browse Rooms"
              loading="eager" className="icon-crisp" />
          </div>
          <div className="flex-1">
            <div className="font-display text-white font-bold tracking-widest uppercase text-sm">Browse Public Rooms</div>
            <div className="text-white/40 text-xs font-sans mt-0.5">See all open rooms worldwide</div>
          </div>
          <span className="text-[#00ffcc]/40 group-hover:text-[#00ffcc] text-lg transition-colors">›</span>
        </button>

        {/* Quick Join */}
        <button
          onClick={handleQuickJoin}
          className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
          style={{ background: 'rgba(0,255,204,0.05)', border: '1px solid rgba(0,255,204,0.18)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.5)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.18)'; }}
        >
          <div
            className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,204,0.08)', border: '1px solid rgba(0,255,204,0.2)', padding: '4px' }}
          >
            <img src="/assets/icons/icon_quick_join.png" alt="Quick Join"
              loading="eager" className="icon-crisp" />
          </div>
          <div className="flex-1">
            <div className="font-display text-white font-bold tracking-widest uppercase text-sm">Quick Join</div>
            <div className="text-white/40 text-xs font-sans mt-0.5">Auto-match into an open room instantly</div>
          </div>
          <span className="text-[#00ffcc]/40 group-hover:text-[#00ffcc] text-lg transition-colors">›</span>
        </button>

        {/* Create Room */}
        <button
          onClick={() => setPhase('create')}
          className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
          style={{ background: 'rgba(138,43,226,0.05)', border: '1px solid rgba(138,43,226,0.18)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,43,226,0.5)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,43,226,0.18)'; }}
        >
          <div
            className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(138,43,226,0.08)', border: '1px solid rgba(138,43,226,0.2)', padding: '4px' }}
          >
            <img src="/assets/icons/icon_create_room.png" alt="Create Room"
              loading="eager" className="icon-crisp" />
          </div>
          <div className="flex-1">
            <div className="font-display text-white font-bold tracking-widest uppercase text-sm">Create Room</div>
            <div className="text-white/40 text-xs font-sans mt-0.5">Public or private with a room code</div>
          </div>
          <span className="text-[#8a2be2]/40 group-hover:text-[#8a2be2] text-lg transition-colors">›</span>
        </button>

        {/* Join via Code */}
        <button
          onClick={() => setPhase('join-code')}
          className="group flex items-center gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
          style={{ background: 'rgba(138,43,226,0.05)', border: '1px solid rgba(138,43,226,0.18)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,43,226,0.5)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,43,226,0.18)'; }}
        >
          <div
            className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(138,43,226,0.08)', border: '1px solid rgba(138,43,226,0.2)', padding: '4px' }}
          >
            <img src="/assets/icons/icon_room_code.png" alt="Room Code"
              loading="eager" className="icon-crisp" />
          </div>
          <div className="flex-1">
            <div className="font-display text-white font-bold tracking-widest uppercase text-sm">Join via Room Code</div>
            <div className="text-white/40 text-xs font-sans mt-0.5">Enter a friend's private room code</div>
          </div>
          <span className="text-[#8a2be2]/40 group-hover:text-[#8a2be2] text-lg transition-colors">›</span>
        </button>
      </motion.div>
    );
  }

  // ── Render: browse rooms ──────────────────────────────────────────────────

  if (phase === 'browse') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Public Rooms</SectionLabel>
          <button
            onClick={() => getSocket().emit('list-rooms')}
            className="text-[#00ffcc]/40 hover:text-[#00ffcc] transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-white/30">
            <Globe size={32} style={{ color: 'rgba(0,255,204,0.3)' }} />
            <span className="text-xs font-mono">No open rooms right now</span>
            <NeonButton onClick={handleQuickJoin} small>
              Quick Join (Create New)
            </NeonButton>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {rooms.map(room => (
              <div
                key={room.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(0,255,204,0.04)', border: '1px solid rgba(0,255,204,0.15)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display text-white text-sm font-bold tracking-wide truncate">
                    {room.hostUsername}
                  </div>
                  {room.hostRank && (
                    <div className="text-[10px] font-mono text-white/40 mt-0.5">{room.hostRank}</div>
                  )}
                </div>
                <NeonButton
                  onClick={() => handleJoinById(room.id)}
                  disabled={joining === room.id}
                  fullWidth={false}
                  small
                >
                  {joining === room.id ? <Loader2 size={11} className="animate-spin" /> : 'Join Game'}
                </NeonButton>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setPhase('main')} className="text-white/30 hover:text-white/60 text-xs font-mono text-center mt-1 transition-colors cursor-pointer">
          ← Back
        </button>
      </motion.div>
    );
  }

  // ── Render: create room ───────────────────────────────────────────────────

  if (phase === 'create') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-4"
      >
        <SectionLabel>Create Room</SectionLabel>

        {/* Public / Private toggle */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <div className="flex items-center gap-1.5 text-white/80 text-sm font-display tracking-wider uppercase font-bold">
              {isPrivate
                ? <Lock size={12} style={{ color: 'rgba(138,43,226,0.85)', flexShrink: 0 }} />
                : <Globe size={12} style={{ color: 'rgba(0,255,204,0.85)', flexShrink: 0 }} />
              }
              {isPrivate ? 'Private' : 'Public'}
            </div>
            <div className="text-white/35 text-xs font-sans mt-0.5">
              {isPrivate ? 'Hidden from list · Code only' : 'Visible in the public room list'}
            </div>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => setIsPrivate(p => !p)}
            className="relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 shrink-0"
            style={{
              background: isPrivate ? 'rgba(138,43,226,0.7)' : 'rgba(0,255,204,0.4)',
              border: `1px solid ${isPrivate ? 'rgba(138,43,226,0.8)' : 'rgba(0,255,204,0.6)'}`,
              boxShadow: isPrivate ? '0 0 10px rgba(138,43,226,0.3)' : '0 0 10px rgba(0,255,204,0.2)',
            }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300"
              style={{
                left: isPrivate ? 'calc(100% - 1.375rem)' : '0.125rem',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            />
          </button>
        </div>

        <NeonButton onClick={handleCreateRoom}>
          {isPrivate
            ? <><Lock size={13} style={{ flexShrink: 0 }} /> Create Private Room</>
            : <><Globe size={13} style={{ flexShrink: 0 }} /> Create Public Room</>
          }
        </NeonButton>

        <button onClick={() => setPhase('main')} className="text-white/30 hover:text-white/60 text-xs font-mono text-center transition-colors cursor-pointer">
          ← Back
        </button>
      </motion.div>
    );
  }

  // ── Render: join via code ─────────────────────────────────────────────────

  if (phase === 'join-code') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-4"
      >
        <SectionLabel>Join via Room Code</SectionLabel>

        <input
          type="text"
          value={codeInput}
          onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') handleJoinByCode(); }}
          placeholder="e.g. AX-89B2"
          maxLength={7}
          className="w-full px-4 py-3 rounded-xl text-center font-mono text-base font-bold uppercase tracking-widest outline-none transition-all duration-200"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: codeError ? '1px solid rgba(239,68,68,0.7)' : '1px solid rgba(0,255,204,0.3)',
            color: '#00ffcc',
            letterSpacing: '0.25em',
          }}
        />

        {/* Strict error UI */}
        <AnimatePresence>
          {codeError && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.35)',
                boxShadow: '0 0 16px rgba(239,68,68,0.08)',
              }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-px" style={{ color: 'rgba(252,165,165,0.9)', flexShrink: 0 }} />
              <p
                className="text-sm font-sans leading-snug"
                style={{ color: 'rgba(252,165,165,0.9)', textShadow: '0 0 8px rgba(239,68,68,0.3)' }}
              >
                {codeError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <NeonButton onClick={handleJoinByCode} disabled={joining === 'code'}>
          {joining === 'code' ? <Loader2 size={14} className="animate-spin" /> : 'Join Room'}
        </NeonButton>

        <button onClick={() => { setPhase('main'); setCodeError(null); setCodeInput(''); }}
          className="text-white/30 hover:text-white/60 text-xs font-mono text-center transition-colors cursor-pointer">
          ← Back
        </button>
      </motion.div>
    );
  }

  // ── Render: waiting for opponent ──────────────────────────────────────────

  if (phase === 'waiting' && waiting) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col items-center gap-5 py-4"
      >
        {/* Pulsing waiting indicator */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-20 h-20 rounded-full"
            style={{ background: 'rgba(0,255,204,0.12)' }}
          />
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,255,204,0.08)', border: '1px solid rgba(0,255,204,0.3)' }}
          >
            <Loader2 size={24} className="animate-spin" style={{ color: '#00ffcc' }} />
          </div>
        </div>

        <div className="text-center">
          <p
            className="font-display font-bold uppercase tracking-widest text-sm"
            style={{ color: '#00ffcc', textShadow: '0 0 12px rgba(0,255,204,0.5)' }}
          >
            Waiting for Opponent…
          </p>
          <p className="text-white/40 text-xs font-mono mt-1">You are the Host · Playing as X</p>
        </div>

        {/* Private room code */}
        {waiting.isPrivate && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest">
              Share this code with a friend
            </p>
            <CopyCodeButton code={waiting.code} />
          </div>
        )}

        <button
          onClick={handleBack}
          className="text-white/30 hover:text-white/60 text-xs font-mono transition-colors cursor-pointer mt-2"
        >
          Cancel &amp; Return to Lobby
        </button>
      </motion.div>
    );
  }

  return null;
}
