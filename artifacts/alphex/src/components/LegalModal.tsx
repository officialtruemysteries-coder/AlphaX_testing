import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Volume2, AlertTriangle } from 'lucide-react';

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
              maxWidth: 580,
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
                  Terms &amp; Legal Notice
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
                    term="Brand Identity"
                    text='All visual branding, including the official "AlphaX" name, color grading, stylized wordmarks, watermarked graphics, user interface layouts, and official logos, are protected intellectual property.'
                  />
                  <LegalEntry
                    term="Unauthorized Distribution &amp; Mirroring"
                    text="Unapproved copying, hosting, repackaging into mobile APKs, iframe embedding, or claiming ownership of this website, its game assets, or sound effects on third-party platforms is strictly prohibited."
                  />
                </div>
              </section>

              {/* B. Audio Attribution */}
              <section>
                <SectionHead icon={<Volume2 size={12} />} label="B. Audio &amp; Third-Party Asset Attribution" />
                <div className="mt-3 space-y-3.5">
                  <LegalEntry
                    term="Voice Synthesis"
                    text="Match outcome voice announcements (win.mp3, lose.mp3, draw.mp3) utilized across game modes are generated using voice synthesis models powered by ElevenLabs (ElevenLabs.io)."
                  />
                  <LegalEntry
                    term="Audio Licensing Notice"
                    text="Voice synthesis assets provided via ElevenLabs are integrated in compliance with platform usage standards and creative attribution protocols. All sound effects, music tracks, and voice assets belong to their respective creators and licensors."
                  />
                </div>
              </section>

              {/* C. Disclaimer */}
              <section>
                <SectionHead icon={<AlertTriangle size={12} />} label="C. Disclaimer of Liability" />
                <p
                  className="mt-3 font-mono text-[11px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.40)' }}
                >
                  AlphaX is provided on an &ldquo;as-is&rdquo; basis for gaming and entertainment purposes.
                  We reserve the right to modify game assets, audio configurations, and platform
                  functionality at any time without prior notice.
                </p>
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

function LegalEntry({ term, text }: { term: string; text: string }) {
  return (
    <div className="space-y-1">
      <p
        className="font-display text-[10px] uppercase tracking-wider"
        style={{ color: 'rgba(255,255,255,0.55)' }}
        dangerouslySetInnerHTML={{ __html: term }}
      />
      <p
        className="font-mono text-[11px] leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        {text}
      </p>
    </div>
  );
}
