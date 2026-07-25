import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Lock, Volume2, AlertTriangle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegalModal({ isOpen, onClose }: LegalModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/78 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.94, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full flex flex-col"
            style={{
              maxWidth: 600,
              maxHeight: 'calc(100dvh - 2rem)',
              background: 'linear-gradient(160deg, #0d1520 0%, #090d13 100%)',
              border: '1px solid rgba(0,255,204,0.18)',
              borderRadius: 20,
              boxShadow: '0 0 60px rgba(0,255,204,0.05), 0 24px 64px rgba(0,0,0,0.75)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(0,255,204,0.09)' }}
            >
              <div className="flex items-center gap-2.5">
                <Shield size={14} style={{ color: '#00ffcc', opacity: 0.8 }} />
                <h2
                  className="font-display text-sm font-bold uppercase tracking-widest"
                  style={{ color: '#00ffcc', textShadow: '0 0 10px rgba(0,255,204,0.35)' }}
                >
                  Terms &amp; Conditions
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full
                           text-white/35 hover:text-white hover:bg-white/10
                           transition-all duration-150 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div
              className="overflow-y-auto flex-1 px-6 py-5 space-y-7"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,204,0.15) transparent' }}
            >

              {/* A. Intellectual Property */}
              <section>
                <SectionHead icon={<Shield size={12} />} label="A. Intellectual Property &amp; Brand Protection" />
                <div className="mt-3 space-y-3.5">
                  <LegalEntry
                    term="Brand Ownership"
                    text='All visual assets, graphic elements, stylized wordmarks, color schemes, user interface designs, and the official "AlphaX" brand identity are protected intellectual property.'
                  />
                  <LegalEntry
                    term="Unauthorized Mirroring &amp; Distribution"
                    text="Copying, mirroring, re-hosting, embedding via iframe, or distributing this web application, its codebase, or its visual assets on unauthorized third-party platforms is strictly prohibited without explicit written consent."
                    html
                  />
                </div>
              </section>

              {/* B. Platform Integrity */}
              <section>
                <SectionHead icon={<Lock size={12} />} label="B. Platform Integrity, Anti-Tampering &amp; Usage Restrictions" />
                <div className="mt-3 space-y-3.5">
                  <LegalEntry
                    term="Prohibited Modifications"
                    text='Users and third parties are strictly forbidden from creating, hosting, patching, or distributing modified or altered versions of this application (including, but not limited to, Modded APKs, "Unlimited XP" cracks, injected client scripts, or unauthorized web mirrors).'
                  />
                  <LegalEntry
                    term="Security &amp; Fair Play"
                    text="Attempting to reverse-engineer game logic, exploit multiplayer communication protocols, manipulate leaderboard rankings, or inject malicious payloads into the system will result in permanent IP restriction and potential legal action."
                    html
                  />
                </div>
              </section>

              {/* C. Audio Attribution */}
              <section>
                <SectionHead icon={<Volume2 size={12} />} label="C. Audio &amp; Third-Party Asset Attribution" />
                <div className="mt-3 space-y-3.5">
                  <LegalEntry
                    term="Voice Synthesis"
                    text="Match outcome voice announcements (win.mp3, lose.mp3, draw.mp3) utilized across single-player and multiplayer modes are generated using voice synthesis technology powered by ElevenLabs (ElevenLabs.io)."
                  />
                  <LegalEntry
                    term="Licensing Compliance"
                    text="Third-party audio elements and voice synthesis assets provided via ElevenLabs are integrated in strict compliance with platform usage terms and attribution requirements. All background sound effects, board chimes, and media assets remain the property of their respective creators."
                  />
                </div>
              </section>

              {/* D. Disclaimer */}
              <section>
                <SectionHead icon={<AlertTriangle size={12} />} label="D. Disclaimer of Liability" />
                <div className="mt-3 space-y-3.5">
                  <LegalEntry
                    term="Service Provision"
                    text='AlphaX is provided on an "as-is" and "as-available" basis for casual gaming and entertainment purposes.'
                  />
                  <LegalEntry
                    term="Modifications"
                    text="The developers reserve the right to update game mechanics, modify audio assets, change ranking algorithms, or alter platform features at any time without prior obligation or liability."
                  />
                </div>
              </section>

              {/* Footer */}
              <div
                className="pt-3 pb-1 text-center font-mono text-[9px] uppercase tracking-widest"
                style={{ color: 'rgba(0,255,204,0.20)', borderTop: '1px solid rgba(0,255,204,0.07)' }}
              >
                ALPHEX · All Rights Reserved
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-2 pb-2"
      style={{ borderBottom: '1px solid rgba(0,255,204,0.07)' }}
    >
      <span style={{ color: 'rgba(0,255,204,0.55)' }}>{icon}</span>
      <h3
        className="font-display text-[9px] uppercase tracking-widest font-bold"
        style={{ color: 'rgba(0,255,204,0.60)' }}
        dangerouslySetInnerHTML={{ __html: label }}
      />
    </div>
  );
}

function LegalEntry({ term, text, html = false }: { term: string; text: string; html?: boolean }) {
  return (
    <div className="space-y-1">
      <p
        className="font-display text-[10px] uppercase tracking-wider"
        style={{ color: 'rgba(255,255,255,0.55)' }}
        dangerouslySetInnerHTML={{ __html: term }}
      />
      {html ? (
        <p
          className="font-mono text-[11px] leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ) : (
        <p
          className="font-mono text-[11px] leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
