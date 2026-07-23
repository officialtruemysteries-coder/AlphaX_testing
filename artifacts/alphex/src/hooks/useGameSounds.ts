import { useRef, useCallback } from 'react';

// ─── Web Audio API sound engine ───────────────────────────────────────────────
// All sounds are synthesised programmatically — no audio files required.
// The AudioContext is created lazily on the first sound call so we stay
// within browser autoplay policies (user must have interacted first).

export function useGameSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // ── Move click: soft crisp tap ──────────────────────────────────────────────
  const playMove = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(550, t + 0.07);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (_) { /* silence errors in restricted environments */ }
  }, [ctx]);

  // ── Line complete: ascending neon chime ─────────────────────────────────────
  const playLineComplete = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      const notes = [880, 1108, 1318]; // A5, C#6, E6
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.06);
        gain.gain.setValueAtTime(0.18, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.35);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.4);
      });
    } catch (_) { /* noop */ }
  }, [ctx]);

  // ── Victory fanfare: ascending synth arpeggio ──────────────────────────────
  const playVictory = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      // Slight delay so it doesn't clash with lineComplete chime
      const offset = 0.22;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + offset + i * 0.11);
        gain.gain.setValueAtTime(0.17, t + offset + i * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + i * 0.11 + 0.42);
        osc.start(t + offset + i * 0.11);
        osc.stop(t + offset + i * 0.11 + 0.5);
      });
    } catch (_) { /* noop */ }
  }, [ctx]);

  // ── Defeat: descending minor tone ──────────────────────────────────────────
  const playDefeat = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      const offset = 0.22;
      const notes = [392, 349.23, 311.13, 261.63]; // G4 F4 Eb4 C4
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + offset + i * 0.14);
        gain.gain.setValueAtTime(0.13, t + offset + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + i * 0.14 + 0.45);
        osc.start(t + offset + i * 0.14);
        osc.stop(t + offset + i * 0.14 + 0.5);
      });
    } catch (_) { /* noop */ }
  }, [ctx]);

  // ── Draw: neutral wobble / tie chime ───────────────────────────────────────
  const playDraw = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      const gain = c.createGain();

      lfo.frequency.setValueAtTime(7, t);
      lfoGain.gain.setValueAtTime(22, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

      lfo.start(t);
      lfo.stop(t + 0.75);
      osc.start(t);
      osc.stop(t + 0.75);
    } catch (_) { /* noop */ }
  }, [ctx]);

  return { playMove, playLineComplete, playVictory, playDefeat, playDraw };
}
