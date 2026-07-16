import React from 'react';
import { useActiveUsers } from '../hooks/useActiveUsers';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function LiveStatsPanel() {
  const { activeUsers } = useActiveUsers();
  const [sessions] = useLocalStorage('alphex-total-sessions', 1);

  return (
    <div className="mt-12 glassmorphism border border-border rounded-xl p-1 relative max-w-md mx-auto overflow-hidden">
      {/* Background glow hint */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-blink" />
          <span className="text-xs font-mono uppercase text-muted-foreground tracking-widest">Live Network Status</span>
        </div>
        <div className="text-xs font-mono text-primary border border-primary/30 px-2 py-0.5 rounded bg-primary/10">
          SYS.OP.NOMINAL
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-px bg-border/50">
        <div className="bg-card p-6 flex flex-col items-center justify-center relative group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            {activeUsers}
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
          </div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest text-center">
            Active Users<br/>Online
          </div>
        </div>
        
        <div className="bg-card p-6 flex flex-col items-center justify-center relative group">
          <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl font-display font-bold text-white mb-2">
            {sessions.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest text-center">
            Sessions<br/>Today
          </div>
        </div>
      </div>
    </div>
  );
}