import React, { useRef, useState, MouseEvent, TouchEvent } from 'react';
import { CATEGORIES, GameCategory } from '../lib/gameData';

interface CategorySliderProps {
  activeCategory: GameCategory;
  onSelect: (category: GameCategory) => void;
}

export function CategorySlider({ activeCategory, onSelect }: CategorySliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const startDragging = (pageX: number) => {
    setIsDragging(true);
    if (!scrollRef.current) return;
    setStartX(pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  const move = (pageX: number) => {
    if (!isDragging || !scrollRef.current) return;
    const x = pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Mouse handlers
  const handleMouseDown = (e: MouseEvent) => startDragging(e.pageX);
  const handleMouseLeave = () => stopDragging();
  const handleMouseUp = () => stopDragging();
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      move(e.pageX);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: TouchEvent) => startDragging(e.touches[0].pageX);
  const handleTouchEnd = () => stopDragging();
  const handleTouchMove = (e: TouchEvent) => move(e.touches[0].pageX);

  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Fade Gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth px-6 cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', willChange: 'transform' }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                if (!isDragging) onSelect(cat);
              }}
              className={`
                whitespace-nowrap rounded-full px-6 py-2.5 font-display text-sm uppercase tracking-wider transition-all duration-300
                ${isActive 
                  ? 'bg-primary/10 border-primary text-primary box-shadow-neon-cyan scale-105' 
                  : 'bg-card/50 border-border text-muted-foreground hover:bg-card hover:text-white hover:scale-105 hover:border-primary/50'
                } border
              `}
              style={{ transform: 'translate3d(0,0,0)' }}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}