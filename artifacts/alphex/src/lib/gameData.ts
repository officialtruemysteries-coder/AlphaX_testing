export type GameCategory = "All Games" | "Multiplayer" | "Single Player" | "Shooting" | "Action" | "Puzzle" | "Arcade" | "Racing" | "Sports" | "Strategy" | "Apps" | "Pass & Play";

export interface Game {
  id: string;
  title: string;
  categories: GameCategory[];
  expectedQuarter: string;
  isApp?: boolean;
  isPlayable?: boolean;
  /** Whether the card shows two separate mode buttons (Play vs AI / Pass & Play). */
  twoModes?: boolean;
  /** Single characters that should match this game (explicit opt-in only). */
  searchChars?: string[];
  /** Extended phrase/keyword list for smart search (multi-char queries). */
  searchTerms?: string[];
  /** Subtitle shown in the autocomplete suggestion tile. */
  searchSubtitle?: string;
}

export const CATEGORIES: GameCategory[] = [
  "All Games", "Multiplayer", "Single Player", "Shooting", "Action",
  "Puzzle", "Arcade", "Racing", "Sports", "Strategy", "Apps", "Pass & Play"
];

export const GAMES: Game[] = [
  {
    id: "ttt",
    title: "Tic-Tac-Toe",
    categories: ["Single Player", "Multiplayer", "Pass & Play", "Puzzle", "Arcade", "Strategy"],
    expectedQuarter: "Now",
    isPlayable: true,
    // Single chars that should explicitly match this game
    searchChars: ['t', 'x', 'o', '0'],
    // Phrase / keyword matches (used for multi-char queries only)
    searchTerms: [
      'tic tac toe', 'tictactoe', 'tic-tac-toe',
      'noughts and crosses', 'x and o', 'xo',
      'zero x', 'zero kata', 'zero kaat',
      '2 player', 'two player', 'local multiplayer',
      'board game', 'puzzle game', 'brain game',
      'mind game', 'strategy game', 'vs ai', 'bot game',
    ],
    searchSubtitle: 'Classic Board Game',
  },
  {
    id: "sl",
    title: "Snakes & Ladders",
    categories: ["Single Player", "Multiplayer", "Pass & Play", "Arcade", "Strategy"],
    expectedQuarter: "Now",
    isPlayable: true,
    twoModes: true,
    searchChars: ['s', 'l'],
    searchTerms: [
      'snakes and ladders', 'snakes & ladders', 'snake and ladder',
      'snakes', 'ladders', 'snake', 'ladder',
      's&l', 'sl', 'saap sidhi', 'saap sidi',
      'board game', 'dice game', 'vs ai', 'pass and play',
      'local multiplayer', 'neon snakes', 'cyber snakes',
    ],
    searchSubtitle: 'Neon Edition',
  },
  { id: "1",  title: "NeonStrike Online",      categories: ["Multiplayer", "Shooting"],                  expectedQuarter: "Q3 2026" },
  { id: "2",  title: "Cyber Nexus",             categories: ["Single Player", "Action"],                  expectedQuarter: "Q3 2026" },
  { id: "3",  title: "VoidRacer X",             categories: ["Racing"],                                   expectedQuarter: "Q3 2026" },
  { id: "4",  title: "Phantom Tactics",         categories: ["Strategy", "Single Player"],                expectedQuarter: "Q3 2026" },
  { id: "5",  title: "HyperBrawl Arena",        categories: ["Multiplayer", "Action"],                    expectedQuarter: "Q3 2026" },
  { id: "6",  title: "GridRunner 2077",         categories: ["Arcade"],                                   expectedQuarter: "Q3 2026" },
  { id: "7",  title: "Eclipse Protocol",        categories: ["Shooting", "Single Player"],                expectedQuarter: "Q3 2026" },
  { id: "8",  title: "Orbital Siege",           categories: ["Strategy", "Multiplayer"],                  expectedQuarter: "Q3 2026" },
  { id: "9",  title: "Neon Puzzler",            categories: ["Puzzle"],                                   expectedQuarter: "Q3 2026" },
  { id: "10", title: "SkyDrift Legends",        categories: ["Racing", "Sports"],                         expectedQuarter: "Q3 2026" },
  { id: "11", title: "ALPHEX Command Center",   categories: ["Apps"],                                     expectedQuarter: "Q3 2026", isApp: true },
  { id: "12", title: "BioSync Companion",       categories: ["Apps"],                                     expectedQuarter: "Q3 2026", isApp: true },
  { id: "13", title: "Pass & Play",             categories: ["Pass & Play", "Multiplayer"],               expectedQuarter: "Q3 2026" },
];

// ─── Smart search helpers ──────────────────────────────────────────────────────

/**
 * Returns true if `game` matches `rawQuery` using the smart algorithm:
 *
 * Single-char query (length === 1):
 *   - Title word starts with that character, OR
 *   - Character is in the game's explicit `searchChars` list.
 *   - Category substring matching is intentionally NOT used for single chars
 *     to prevent irrelevant matches (e.g. 'g' in "strate-G-y").
 *
 * Multi-char query (length > 1):
 *   - Title contains the query (substring), OR
 *   - A category starts with the query (word-prefix), OR
 *   - An extended `searchTerms` entry contains the query (substring).
 */
export function smartMatch(game: Game, rawQuery: string): boolean {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return true;

  const titleLower = game.title.toLowerCase();

  if (q.length === 1) {
    // Title word prefix
    const titleWords = titleLower.split(/[\s\-]+/);
    if (titleWords.some(w => w.startsWith(q))) return true;
    // Explicit single-char opt-in
    if (game.searchChars?.includes(q)) return true;
    return false;
  }

  // --- multi-char ---
  // Title substring
  if (titleLower.includes(q)) return true;

  // Category: full string prefix or word-boundary prefix
  // Normalise "Pass & Play" → "pass and play" for natural typing
  const catMatch = game.categories.some(c => {
    const norm = c.toLowerCase().replace(/\s*&\s*/g, ' and ');
    return norm.startsWith(q) || norm.includes(' ' + q);
  });
  if (catMatch) return true;

  // Extended search terms (substring)
  if (game.searchTerms?.some(t => t.toLowerCase().includes(q))) return true;

  return false;
}
