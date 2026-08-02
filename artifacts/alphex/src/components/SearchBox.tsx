import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Suggestion } from '../pages/DiscoverPage';

// ── Web Speech API type augmentation ─────────────────────────────────────────
// Speech recognition is not included in every TypeScript DOM lib version, so
// keep the small surface used here local instead of relying on browser-specific
// global declarations.
interface AlphaSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: AlphaSpeechRecognitionEvent) => void) | null;
  onerror: ((event: AlphaSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface AlphaSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface AlphaSpeechRecognitionErrorEvent {
  error: string;
}

type AlphaSpeechRecognitionConstructor = new () => AlphaSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition: AlphaSpeechRecognitionConstructor;
    webkitSpeechRecognition: AlphaSpeechRecognitionConstructor;
  }
}

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  suggestions?: Suggestion[];
  onSuggestionSelect?: (title: string) => void;
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
        background:      'linear-gradient(135deg, rgba(12,4,4,0.97), rgba(20,6,6,0.98))',
        border:          '1px solid rgba(239,68,68,0.5)',
        boxShadow:       '0 0 32px rgba(239,68,68,0.2), 0 8px 32px rgba(0,0,0,0.7)',
        backdropFilter:  'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        maxWidth:        'min(90vw, 400px)',
        whiteSpace:      'normal',
        wordBreak:       'break-word',
        pointerEvents:   'none',
      }}
    >
      <AlertTriangle
        size={16}
        style={{
          color:  'rgba(252,165,165,0.95)',
          filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))',
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <span
        className="font-sans text-sm leading-snug"
        style={{ color: 'rgba(252,165,165,0.95)', textShadow: '0 0 10px rgba(239,68,68,0.4)' }}
      >
        {message}
      </span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function SearchBox({ value, onChange, suggestions = [], onSuggestionSelect }: SearchBoxProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused,        setIsFocused]        = useState(false);
  const [isListening,      setIsListening]       = useState(false);
  const [toastMsg,         setToastMsg]          = useState<string | null>(null);
  const [showSuggestions,  setShowSuggestions]   = useState(false);

  const recognitionRef  = useRef<AlphaSpeechRecognition | null>(null);
  const toastTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef      = useRef<HTMLDivElement>(null);

  // ── Rotating placeholders ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // ── Show suggestions when focused + query + results exist ─────────────────
  useEffect(() => {
    setShowSuggestions(isFocused && value.trim().length > 0 && suggestions.length > 0);
  }, [isFocused, value, suggestions]);

  // ── Click-outside to close suggestions ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (toastTimerRef.current)  clearTimeout(toastTimerRef.current);
      if (blurTimerRef.current)   clearTimeout(blurTimerRef.current);
    };
  }, []);

  // ── Error sound via Web Audio API ─────────────────────────────────────────
  const playErrorSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    } catch (_) {}
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
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechAPI =
      (window as unknown as { SpeechRecognition?: AlphaSpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: AlphaSpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechAPI) {
      showError('Microphone access is turned off. Please allow microphone access.');
      return;
    }

    const recognition = new SpeechAPI();
    recognition.lang            = 'en-IN'; // handles bilingual Hindi/English via Google backend
    recognition.interimResults  = true;
    recognition.continuous      = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: AlphaSpeechRecognitionEvent) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final   += t;
        else                          interim += t;
      }
      if (interim) onChange(interim);
      if (final)   onChange(final);
    };

    recognition.onerror = (event: AlphaSpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === 'aborted') return; // user-cancelled — silent
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        showError('Microphone access is turned off. Please allow microphone access.');
      } else {
        showError("Didn't catch that. Please try again.");
      }
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (_) {
      setIsListening(false);
      showError('Microphone access is turned off. Please allow microphone access.');
    }
  }, [isListening, onChange, showError]);

  // ── Suggestion selection ──────────────────────────────────────────────────
  const handleSuggestionClick = useCallback((title: string) => {
    onSuggestionSelect?.(title);
    setShowSuggestions(false);
  }, [onSuggestionSelect]);

  const isActive = isFocused || isListening;

  return (
    <>
      {/* ── Error toast — fixed, top-center, below navbar ──────────────── */}
      <div
        className="fixed top-20 left-1/2 z-[300] flex flex-col items-center"
        style={{ transform: 'translateX(-50%)', pointerEvents: 'none' }}
      >
        <AnimatePresence>
          {toastMsg && <VoiceErrorToast key="voice-err" message={toastMsg} />}
        </AnimatePresence>
      </div>

      {/* ── Wrapper (click-outside ref) ─────────────────────────────────── */}
      <div ref={wrapperRef} className="w-full max-w-2xl mx-auto relative group">
        {/* Ambient glow */}
        <div
          className={`absolute inset-0 bg-primary/20 blur-xl rounded-full transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Bar */}
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
              onFocus={() => {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                setIsFocused(true);
              }}
              onBlur={() => {
                // Delay so suggestion clicks register before hiding
                blurTimerRef.current = setTimeout(() => setIsFocused(false), 150);
              }}
              className="w-full py-4 bg-transparent text-foreground placeholder-transparent focus:outline-none font-sans text-lg"
              placeholder={PLACEHOLDERS[placeholderIndex]}
              autoComplete="off"
            />
            {!value && (
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none overflow-hidden text-muted-foreground/70 text-lg">
                <span key={placeholderIndex} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                width:      40,
                height:     40,
                background: isListening ? 'rgba(0,255,204,0.14)' : 'rgba(0,255,204,0.06)',
                border:     isListening ? '1px solid rgba(0,255,204,0.6)' : '1px solid rgba(0,255,204,0.22)',
                padding:    3,          // 3 px → icon fills ~85% of 40 px container
              }}
              onMouseEnter={e => {
                if (!isListening) {
                  (e.currentTarget as HTMLElement).style.background    = 'rgba(0,255,204,0.12)';
                  (e.currentTarget as HTMLElement).style.borderColor   = 'rgba(0,255,204,0.45)';
                }
              }}
              onMouseLeave={e => {
                if (!isListening) {
                  (e.currentTarget as HTMLElement).style.background    = 'rgba(0,255,204,0.06)';
                  (e.currentTarget as HTMLElement).style.borderColor   = 'rgba(0,255,204,0.22)';
                }
              }}
            >
              <img
                src="/assets/icons/icon_voice_search.png"
                alt="Voice Search"
                loading="eager"
                className="icon-crisp"
              />
            </button>
          </div>
        </div>

        {/* ── Autocomplete suggestion dropdown ─────────────────────────── */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1,  y: 4,  scale: 1    }}
              exit={{    opacity: 0,  y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="absolute left-0 right-0 z-[200] rounded-2xl overflow-hidden"
              style={{
                top:            '100%',
                background:     'linear-gradient(160deg, rgba(11,14,22,0.97), rgba(9,11,18,0.98))',
                border:         '1px solid rgba(0,255,204,0.22)',
                boxShadow:      '0 8px 40px rgba(0,0,0,0.6), 0 0 24px rgba(0,255,204,0.08)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/25 px-1">
                  Suggestions
                </span>
              </div>
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onMouseDown={e => e.preventDefault()} // prevent blur before click
                  onClick={() => handleSuggestionClick(s.title)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 cursor-pointer group/sug"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLElement).style.background = 'rgba(0,255,204,0.07)')
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.background = 'transparent')
                  }
                >
                  {/* Search icon */}
                  <span style={{ color: 'rgba(0,255,204,0.45)', flexShrink: 0 }}>
                    <Search size={14} />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span
                      className="block font-display font-bold text-sm tracking-wide text-white group-hover/sug:text-[#00ffcc] transition-colors"
                    >
                      {s.title}
                    </span>
                    <span className="block text-xs font-sans text-white/35 mt-0.5">
                      {s.subtitle}
                    </span>
                  </span>

                  {/* Arrow hint */}
                  <span className="text-white/20 group-hover/sug:text-[#00ffcc]/50 transition-colors text-base shrink-0">
                    ›
                  </span>
                </button>
              ))}
              <div className="h-1.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
