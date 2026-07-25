import { useCallback } from 'react';

/**
 * useVoiceAudio
 * ─────────────────────────────────────────────────────────────────────────────
 * Plays pre-recorded MP3 voice clips at their natural playback rate (1.0) and
 * 70% master volume.  These are ElevenLabs voice synthesis assets.
 *
 * Rules enforced here:
 *  • playbackRate is always 1.0 — no pitch-shifting or time-stretching.
 *  • volume is set to 0.70 (70%) — foreground, comfortable level.
 *  • A fresh Audio element per call so back-to-back triggers never cut off.
 *  • Errors (autoplay block, missing file) are silently swallowed.
 */
export function useVoiceAudio() {
  const play = useCallback((outcome: 'win' | 'lose' | 'draw') => {
    try {
      const src =
        outcome === 'win'  ? '/assets/audio/win.mp3'  :
        outcome === 'lose' ? '/assets/audio/lose.mp3' :
                             '/assets/audio/draw.mp3';

      const audio = new Audio(src);
      audio.playbackRate = 1.0; // natural speed — no manipulation
      audio.volume       = 0.70; // 70% master volume
      audio.play().catch(() => { /* browser autoplay policy may block first call */ });
    } catch { /* noop in restricted environments */ }
  }, []);

  const playWin  = useCallback(() => play('win'),  [play]);
  const playLose = useCallback(() => play('lose'), [play]);
  const playDraw = useCallback(() => play('draw'), [play]);

  return { play, playWin, playLose, playDraw };
}
