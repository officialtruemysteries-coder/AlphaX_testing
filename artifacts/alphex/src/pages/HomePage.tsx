import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { LiveStatsPanel } from '../components/LiveStatsPanel';

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container px-4 flex flex-col items-center justify-center text-center z-10 py-12">
        {/* Logo */}
        <motion.img 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          src="/assets/images/center.logo2.png" 
          alt="ALPHEX Full Branding" 
          className="w-full max-w-[320px] h-auto mb-8 drop-shadow-[0_0_30px_rgba(0,255,204,0.25)]"
        />

        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-2xl mx-auto space-y-6 mb-12"
        >
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white text-shadow-neon-cyan leading-tight">
            Welcome to ALPHEX
          </h1>
          <p className="text-lg text-muted-foreground font-sans max-w-xl mx-auto">
            ALPHEX is building the ultimate hub. Be the first to explore what's coming.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Link 
            href="/discover"
            className="group relative inline-flex items-center justify-center px-8 py-4 font-display font-bold text-lg tracking-widest uppercase text-background bg-gradient-to-r from-primary to-[#00ccaa] rounded-md overflow-hidden transition-all hover:scale-105 box-shadow-neon-cyan"
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full -translate-x-full transition-transform duration-500 ease-out skew-x-12" />
            <span className="relative z-10">Start Playing</span>
          </Link>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="w-full mt-8"
        >
          <LiveStatsPanel />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-16 flex flex-col items-center gap-2 text-muted-foreground/50 animate-bounce"
        >
          <span className="text-xs font-mono uppercase tracking-widest">Scroll to discover</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </motion.div>
      </div>
    </div>
  );
}