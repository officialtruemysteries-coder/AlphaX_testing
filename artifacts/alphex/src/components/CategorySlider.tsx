import React, { useRef, useState, useCallback, MouseEvent, TouchEvent } from 'react';
import { CATEGORIES, GameCategory } from '../lib/gameData';

interface CategorySliderProps {
  activeCategory: GameCategory;
  onSelect: (category: GameCategory) => void;
}

export function CategorySlider({ activeCategory, onSelect }: CategorySliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Inertia scroll after drag release
  const applyInertia = useCallback(() => {
    if (!scrollRef.current) return;
    velocityRef.current *= 0.92; // deceleration factor
    if (Math.abs(velocityRef.current) < 0.5) {
      velocityRef.current = 0;
      return;
    }
    scrollRef.current.scrollLeft -= velocityRef.current;
    rafRef.current = requestAnimationFrame(applyInertia);
  }, []);

  const stopInertia = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // ─── Mouse handlers ───────────────────────────────────────────────
  const handleMouseDown = (e: MouseEvent) => {
    if (!scrollRef.current) return;
    stopInertia();
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    lastXRef.current = e.pageX;
    velocityRef.current = 0;
    scrollRef.current.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const delta = x - startXRef.current;
    dragDistanceRef.current = Math.abs(delta);
    velocityRef.current = e.pageX - lastXRef.current;
    lastXRef.current = e.pageX;
    scrollRef.current.scrollLeft = scrollLeftRef.current - delta;
  };

  const handleMouseUp = () => {
    if (!scrollRef.current) return;
    isDraggingRef.current = false;
    scrollRef.current.style.cursor = 'grab';
    rafRef.current = requestAnimationFrame(applyInertia);
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) handleMouseUp();
  };

  // ─── Touch handlers ───────────────────────────────────────────────
  const handleTouchStart = (e: TouchEvent) => {
    if (!scrollRef.current) return;
    stopInertia();
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    startXRef.current = e.touches[0].pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    lastXRef.current = e.touches[0].pageX;
    velocityRef.current = 0;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const delta = x - startXRef.current;
    dragDistanceRef.current = Math.abs(delta);
    velocityRef.current = e.touches[0].pageX - lastXRef.current;
    lastXRef.current = e.touches[0].pageX;
    scrollRef.current.scrollLeft = scrollLeftRef.current - delta;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    rafRef.current = requestAnimationFrame(applyInertia);
  };

  // ─── Click guard: only fire if user did NOT drag ──────────────────
  const handlePillClick = (cat: GameCategory) => {
    // Threshold: 6px of drag distance means user was scrolling, not tapping
    if (dragDistanceRef.current > 6) return;
    onSelect(cat);
  };

  return (
    <div className="relative w-full overflow-hidden py-2">
      {/* Fade edge masks */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar px-8 cursor-grab select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onMouseUp={() => handlePillClick(cat)}
              onTouchEnd={(e) => {
                e.stopPropagation();
                handlePillClick(cat);
              }}
              className={`
                whitespace-nowrap rounded-full px-5 py-2 font-display text-sm tracking-wider transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 border-2 border-primary text-primary shadow-[0_0_12px_rgba(0,255,204,0.5),inset_0_0_8px_rgba(0,255,204,0.08)] scale-105'
                  : 'bg-card/50 border border-border/60 text-muted-foreground hover:bg-card hover:text-white hover:border-primary/40 hover:scale-105'
                }
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
