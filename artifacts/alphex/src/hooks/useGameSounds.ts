import { useRef, useCallback } from 'react';

// ─── Web Audio API sound engine ───────────────────────────────────────────────
// All sounds are synthesised programmatically — no audio files required.
// The AudioContext is created lazily on the first sound call so we stay
// within browser autoplay policies (user must have interacted first).
//
// VOLUME LEVELS (~35% of original values so voice clips sit clearly on top):
//   playMove          0.05   (was 0.13)
//   playLineComplete  0.07   (was 0.18)
//   playVictory       0.06   (was 0.17)
//   playDefeat        0.05   (was 0.13)
//   playDraw          0.05   (was 0.13)
//   playXPChime       0.04   (was 0.07)
//   playBadgeUnlock   0.032  (was 0.065)

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
      gain.gain.setValueAtTime(0.05, t);
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
        gain.gain.setValueAtTime(0.07, t + i * 0.06);
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
        gain.gain.setValueAtTime(0.06, t + offset + i * 0.11);
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
        gain.gain.setValueAtTime(0.05, t + offset + i * 0.14);
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
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

      lfo.start(t);
      lfo.stop(t + 0.75);
      osc.start(t);
      osc.stop(t + 0.75);
    } catch (_) { /* noop */ }
  }, [ctx]);

  // ── XP reward chime: soft 3-note ascending sparkle ─────────────────────────
  // Deliberately quieter and shorter than victory/defeat so it feels like a
  // subtle reward notification rather than a second fanfare.
  const playXPChime = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      // E6 → G6 → C7 — gentle ascending sparkle, ~280 ms total
      const notes = [1318.51, 1567.98, 2093.0];
      notes.forEach((freq, i) => {
        const osc  = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.075);
        gain.gain.setValueAtTime(0.0,    t + i * 0.075);
        gain.gain.linearRampToValueAtTime(0.04, t + i * 0.075 + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.075 + 0.21);
        osc.start(t + i * 0.075);
        osc.stop(t  + i * 0.075 + 0.23);
      });
    } catch (_) { /* noop */ }
  }, [ctx]);

  // ── Badge unlock: 4-note ascending sparkle shimmer ─────────────────────────
  // More "magical" than the XP chime — a soft major arpeggio with a shimmer
  // layer that feels celebratory yet gentle for a global, all-age audience.
  const playBadgeUnlock = useCallback(() => {
    try {
      const c = ctx();
      const t = c.currentTime;

      // G6 → B6 → D7 → G7 — bright ascending major arpeggio, ~380 ms total
      const notes = [1567.98, 1975.53, 2349.32, 3135.96];
      notes.forEach((freq, i) => {
        const osc  = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0.0,     t + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.032, t + i * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.28);
        osc.start(t + i * 0.08);
        osc.stop(t  + i * 0.08 + 0.30);
      });

      // Soft shimmer layer — triangle wave at root note for warmth
      const shimmer  = c.createOscillator();
      const shimGain = c.createGain();
      shimmer.connect(shimGain);
      shimGain.connect(c.destination);
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(1567.98, t);
      shimGain.gain.setValueAtTime(0.0,   t);
      shimGain.gain.linearRampToValueAtTime(0.014, t + 0.02);
      shimGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
      shimmer.start(t);
      shimmer.stop(t + 0.47);
    } catch (_) { /* noop */ }
  }, [ctx]);

  return { playMove, playLineComplete, playVictory, playDefeat, playDraw, playXPChime, playBadgeUnlock };
}
