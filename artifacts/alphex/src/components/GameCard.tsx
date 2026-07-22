import React, { useState } from 'react';
import { Game } from '../lib/gameData';
import { TerminalModal } from './TerminalModal';
import { TicTacToeModal } from './TicTacToeModal';
import { Terminal, Play } from 'lucide-react';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate a random-looking but deterministic gradient based on game title length and id
  const hue1 = (game.title.length * 15 + parseInt(game.id) * 30) % 360;
  const hue2 = (hue1 + 60) % 360;

  // Tic-Tac-Toe gets a fixed neon cyan/purple gradient
  const isTicTacToe = game.id === 'ttt';
  const bgStyle = isTicTacToe
    ? { background: 'linear-gradient(135deg, #0d1f1a 0%, #0b0c10 60%, #160d2a 100%)' }
    : { background: `linear-gradient(135deg, hsl(${hue1} 80% 20%), hsl(${hue2} 60% 10%))` };

  return (
    <>
      <div
        className="group relative flex flex-col bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:animate-neon-pulse"
        style={{
          transform: 'translate3d(0,0,0)',
          willChange: 'transform',
          ...(isTicTacToe && { borderColor: 'rgba(0,255,204,0.3)' }),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate3d(0,-4px,0) scale(1.01)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate3d(0,0,0) scale(1)';
        }}
      >
        {/* Placeholder Image Area */}
        <div
          className="h-40 w-full relative flex items-center justify-center overflow-hidden"
          style={bgStyle}
        >
          {isTicTacToe ? (
            /* Tic-Tac-Toe preview board */
            <div className="opacity-70 group-hover:opacity-100 transition-opacity duration-500">
              <svg viewBox="0 0 120 120" width="90" height="90" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Grid lines */}
                <line x1="40" y1="8" x2="40" y2="112" stroke="rgba(0,255,204,0.45)" strokeWidth="2" strokeLinecap="round" />
                <line x1="80" y1="8" x2="80" y2="112" stroke="rgba(0,255,204,0.45)" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="40" x2="112" y2="40" stroke="rgba(0,255,204,0.45)" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="80" x2="112" y2="80" stroke="rgba(0,255,204,0.45)" strokeWidth="2" strokeLinecap="round" />
                {/* X top-left */}
                <line x1="14" y1="14" x2="32" y2="32" stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
                <line x1="32" y1="14" x2="14" y2="32" stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
                {/* O top-center */}
                <circle cx="60" cy="20" r="10" stroke="#8a2be2" strokeWidth="4" fill="none" style={{ filter: 'drop-shadow(0 0 4px #8a2be2)' }} />
                {/* X center */}
                <line x1="48" y1="48" x2="72" y2="72" stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
                <line x1="72" y1="48" x2="48" y2="72" stroke="#00ffcc" strokeWidth="4" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #00ffcc)' }} />
                {/* O bottom-right */}
                <circle cx="100" cy="100" r="10" stroke="#8a2be2" strokeWidth="4" fill="none" style={{ filter: 'drop-shadow(0 0 4px #8a2be2)' }} />
              </svg>
            </div>
          ) : (
            <div className="opacity-50 group-hover:opacity-100 transition-opacity duration-500">
              {game.isApp ? (
                <div className="w-16 h-16 rounded-lg border-2 border-primary/50 rotate-12 flex items-center justify-center bg-black/30">
                  <div className="w-8 h-8 rounded-full bg-primary/30 blur-sm"></div>
                </div>
              ) : (
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 4L58.8468 19.5V50.5L32 66L5.15321 50.5V19.5L32 4Z" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.5" />
                  <circle cx="32" cy="35" r="8" fill="hsl(var(--secondary))" fillOpacity="0.4" />
                </svg>
              )}
            </div>
          )}

          {/* Badge */}
          {game.isPlayable ? (
            <div
              className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border"
              style={{
                background: 'rgba(0,255,204,0.12)',
                border: '1px solid rgba(0,255,204,0.5)',
                color: '#00ffcc',
                textShadow: '0 0 8px rgba(0,255,204,0.6)',
                boxShadow: '0 0 10px rgba(0,255,204,0.15)',
              }}
            >
              ▶ Play Now
            </div>
          ) : (
            <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider box-shadow-neon-purple border border-secondary">
              Coming Soon
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-display text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {game.title}
          </h3>

          <div className="flex flex-wrap gap-2 mb-4">
            {game.categories.filter(c => c !== 'All Games').map(cat => (
              <span key={cat} className="text-xs bg-black/40 text-muted-foreground px-2 py-1 rounded border border-border/50">
                {cat}
              </span>
            ))}
          </div>

          <div className="mt-auto">
            {game.isPlayable ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2.5 px-4 flex items-center justify-center gap-2 rounded-md text-sm font-display tracking-widest uppercase transition-all duration-200 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,255,204,0.12), rgba(0,255,204,0.04))',
                  border: '1px solid rgba(0,255,204,0.45)',
                  color: '#00ffcc',
                  textShadow: '0 0 8px rgba(0,255,204,0.5)',
                  boxShadow: '0 0 16px rgba(0,255,204,0.08)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.8)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(0,255,204,0.18)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.45)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,255,204,0.08)';
                }}
              >
                <Play size={15} />
                Play Now
              </button>
            ) : (
              <>
                <div className="text-xs text-muted-foreground font-mono mb-4">
                  Expected: <span className="text-white/80">{game.expectedQuarter}</span>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-2.5 px-4 flex items-center justify-center gap-2 bg-black/50 hover:bg-primary/10 border border-primary/30 hover:border-primary text-primary transition-colors rounded-md text-sm font-display tracking-widest uppercase cursor-pointer"
                >
                  <Terminal size={16} />
                  Inspect Terminal
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal — Tic-Tac-Toe gets its own modal, others get TerminalModal */}
      {game.isPlayable ? (
        <TicTacToeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      ) : (
        <TerminalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
