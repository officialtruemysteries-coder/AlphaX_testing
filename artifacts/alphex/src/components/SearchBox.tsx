import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Web Speech API type augmentation ─────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

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

// ── Themed error toast ────────────────────────────────────────────────────────
function VoiceErrorToast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1,  y: 0,   scale: 1    }}
      exit={{    opacity: 0,  y: -12, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="flex items-start gap-3 px-5 py-4 rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(12,4,4,0.97), rgba(20,6,6,0.98))',
        border: '1px solid rgba(239,68,68,0.5)',
        boxShadow: '0 0 32px rgba(239,68,68,0.2), 0 8px 32px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        maxWidth: 'min(90vw, 400px)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        pointerEvents: 'none',
      }}
    >
      <AlertTriangle
        size={16}
        style={{
          color: 'rgba(252,165,165,0.95)',
          filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))',
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <span
        className="font-sans text-sm leading-snug"
        style={{
          color: 'rgba(252,165,165,0.95)',
          textShadow: '0 0 10px rgba(239,68,68,0.4)',
        }}
      >
        {message}
      </span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SearchBox({ value, onChange }: SearchBoxProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused,   setIsFocused]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [toastMsg,    setToastMsg]    = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const toastTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Rotating placeholders ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Error sound via Web Audio API ─────────────────────────────────────────
  const playErrorSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx  = new AudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
      osc.onended = () => { try { ctx.close(); } catch (_) {} };
    } catch (_) { /* unsupported — silent */ }
  }, []);

  // ── Show themed error toast ───────────────────────────────────────────────
  const showError = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    playErrorSound();
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 4500);
  }, [playErrorSound]);

  // ── Voice search handler ──────────────────────────────────────────────────
  const handleVoiceClick = useCallback(() => {
    // Stop if already listening
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechAPI =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechAPI) {
      showError("Microphone access is turned off. Please allow microphone access.");
      return;
    }

    const recognition = new SpeechAPI();
    // Primary: English (India). The Google Speech backend handles bilingual
    // Hindi/English (hi-IN) code-switching seamlessly for Indian users.
    recognition.lang             = 'en-IN';
    recognition.interimResults   = true;
    recognition.continuous       = false;
    recognition.maxAlternatives  = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      // Stream interim text live into the search field → auto-filters
      if (interim) onChange(interim);
      if (final)   onChange(final);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      // Success path errors — silently ignore
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        showError("Microphone access is turned off. Please allow microphone access.");
      } else {
        // no-speech, audio-capture, network, language-not-supported, etc.
        showError("Didn't catch that. Please try again.");
      }
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (_) {
      setIsListening(false);
      showError("Microphone access is turned off. Please allow microphone access.");
    }
  }, [isListening, onChange, showError]);

  const isActive = isFocused || isListening;

  return (
    <>
      {/* ── Error toast — fixed, top-center, below navbar ──────────────── */}
      <div
        className="fixed top-20 left-1/2 z-[300] flex flex-col items-center"
        style={{ transform: 'translateX(-50%)', pointerEvents: 'none' }}
      >
        <AnimatePresence>
          {toastMsg && (
            <VoiceErrorToast key="voice-err" message={toastMsg} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-2xl mx-auto relative group">
        {/* Ambient glow */}
        <div
          className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          className={`relative flex items-center bg-card rounded-full border transition-colors duration-300 ${
            isActive
              ? 'border-primary shadow-[0_0_15px_rgba(0,255,204,0.3)]'
              : 'border-border'
          }`}
        >
          {/* Search icon — left */}
          <div className="pl-6 pr-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0">
            <Search size={20} />
          </div>

          {/* Input + animated placeholder */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={()  => setIsFocused(false)}
              className="w-full py-4 bg-transparent text-foreground placeholder-transparent focus:outline-none font-sans text-lg"
              placeholder={PLACEHOLDERS[placeholderIndex]}
            />
            {!value && (
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none overflow-hidden text-muted-foreground/70 text-lg">
                <span
                  key={placeholderIndex}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  {PLACEHOLDERS[placeholderIndex]}
                </span>
              </div>
            )}
          </div>

          {/* Mic button — right, inside bar */}
          <div className="pr-4 pl-2 shrink-0">
            <button
              onClick={handleVoiceClick}
              title="Search by Voice"
              aria-label="Search by Voice"
              className={`relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer focus:outline-none ${
                isListening ? 'mic-pulse-cyan' : ''
              }`}
              style={{
                width: 40,
                height: 40,
                background: isListening
                  ? 'rgba(0,255,204,0.14)'
                  : 'rgba(0,255,204,0.06)',
                border: isListening
                  ? '1px solid rgba(0,255,204,0.6)'
                  : '1px solid rgba(0,255,204,0.22)',
                padding: 8,
              }}
              onMouseEnter={e => {
                if (!isListening) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,204,0.12)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.45)';
                }
              }}
              onMouseLeave={e => {
                if (!isListening) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,204,0.06)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,204,0.22)';
                }
              }}
            >
              <img
                src="/assets/icons/icon_voice_search.png"
                alt="Voice Search"
                loading="eager"
                className="icon-crisp"
                style={{ width: '100%', height: '100%' }}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
