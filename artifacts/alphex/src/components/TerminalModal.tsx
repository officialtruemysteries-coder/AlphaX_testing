import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeonSpinner } from './NeonSpinner';
import { X } from 'lucide-react';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalModal({ isOpen, onClose }: TerminalModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg glassmorphism border border-primary box-shadow-neon-cyan p-6 rounded-xl overflow-hidden"
            style={{ willChange: 'transform, opacity' }}
          >
            {/* Terminal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-primary/30">
              <h2 className="font-display text-xl text-primary text-shadow-neon-cyan uppercase tracking-wider">
                ALPHEX TERMINAL
              </h2>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Terminal Body */}
            <div className="space-y-6 font-mono text-sm sm:text-base text-foreground/90 leading-relaxed">
              <p>
                <span className="text-primary mr-2">&gt;</span>
                ALPHEX Terminal connecting...
              </p>
              <p>
                <span className="text-primary mr-2">&gt;</span>
                This application is currently in its design phase. Our developers are actively writing the code. Stay tuned!
              </p>
              <NeonSpinner />
            </div>
            
            {/* Terminal Footer */}
            <div className="mt-8 pt-4">
              <button 
                onClick={onClose}
                className="w-full py-3 px-4 bg-muted hover:bg-primary/20 border border-primary/50 hover:border-primary text-primary transition-all rounded font-display tracking-widest uppercase text-sm focus:outline-none"
              >
                Close Terminal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}