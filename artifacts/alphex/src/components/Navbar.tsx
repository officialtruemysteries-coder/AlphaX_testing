import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useActiveUsers } from '../hooks/useActiveUsers';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [location] = useLocation();
  const { activeUsers } = useActiveUsers();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const links = [
    { path: '/', label: 'Home' },
    { path: '/discover', label: 'Discover' },
    { path: '/profile', label: 'Profile' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 glassmorphism border-b border-primary/30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src="/assets/images/corner.logo.png" 
              alt="ALPHEX AX Icon" 
              className="h-10 w-auto hover:brightness-125 transition-all"
            />
          </Link>

          {/* Center: Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {links.map((link) => {
              const isActive = location === link.path || (link.path !== '/' && location.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`
                    px-5 py-2 rounded-full font-display text-sm tracking-widest uppercase transition-all duration-300
                    ${isActive 
                      ? 'bg-primary/10 text-primary border border-primary box-shadow-neon-cyan' 
                      : 'text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Live Users Badge */}
          <div className="hidden md:flex items-center gap-2 bg-black/40 border border-border rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">
              <span className="text-white font-bold">{activeUsers}</span> ONLINE
            </span>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-muted-foreground hover:text-primary transition-colors p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-16 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-b border-primary/30 overflow-hidden md:hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {links.map((link) => {
                const isActive = location === link.path || (link.path !== '/' && location.startsWith(link.path));
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      w-full text-center px-4 py-3 rounded-lg font-display tracking-widest uppercase text-sm border transition-colors
                      ${isActive 
                        ? 'bg-primary/10 border-primary text-primary box-shadow-neon-cyan' 
                        : 'border-border text-muted-foreground'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              <div className="mt-4 flex items-center justify-center gap-2 bg-black/40 border border-border rounded-lg px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)] animate-pulse" />
                <span className="text-sm font-mono text-muted-foreground">
                  <span className="text-white font-bold">{activeUsers}</span> USERS ONLINE
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}