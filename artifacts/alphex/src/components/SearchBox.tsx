import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
}

const PLACEHOLDERS = [
  "Search games...",
  "Search apps...",
  "Search 'Cyber'...",
  "Search 'Multiplayer'...",
  "Search 'Action'..."
];

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto relative group">
      <div className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`}></div>
      <div 
        className={`relative flex items-center bg-card rounded-full border transition-colors duration-300 ${
          isFocused ? 'border-primary shadow-[0_0_15px_rgba(0,255,204,0.3)]' : 'border-border'
        }`}
      >
        <div className="pl-6 pr-3 text-muted-foreground group-hover:text-primary transition-colors">
          <Search size={20} />
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full py-4 pr-6 bg-transparent text-foreground placeholder-transparent focus:outline-none font-sans text-lg"
            placeholder={PLACEHOLDERS[placeholderIndex]}
          />
          {/* Animated Placeholder Layer */}
          {!value && (
            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none overflow-hidden text-muted-foreground/70 text-lg">
              <span key={placeholderIndex} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {PLACEHOLDERS[placeholderIndex]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}