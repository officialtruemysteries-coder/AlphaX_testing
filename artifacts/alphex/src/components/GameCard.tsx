import React, { useState } from 'react';
import { Game } from '../lib/gameData';
import { TerminalModal } from './TerminalModal';
import { Terminal } from 'lucide-react';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate a random-looking but deterministic gradient based on game title length and id
  const hue1 = (game.title.length * 15 + parseInt(game.id) * 30) % 360;
  const hue2 = (hue1 + 60) % 360;

  return (
    <>
      <div 
        className="group relative flex flex-col bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:animate-neon-pulse"
        style={{ 
          transform: 'translate3d(0,0,0)',
          willChange: 'transform',
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
          style={{
            background: `linear-gradient(135deg, hsl(${hue1} 80% 20%), hsl(${hue2} 60% 10%))`
          }}
        >
          {/* Abstract Shape / Icon placeholder */}
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
          
          <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider box-shadow-neon-purple border border-secondary">
            Coming Soon
          </div>
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
          </div>
        </div>
      </div>
      
      <TerminalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}