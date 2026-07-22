export type GameCategory = "All Games" | "Multiplayer" | "Single Player" | "Shooting" | "Action" | "Puzzle" | "Arcade" | "Racing" | "Sports" | "Strategy" | "Apps" | "Pass & Play";

export interface Game {
  id: string;
  title: string;
  categories: GameCategory[];
  expectedQuarter: string;
  isApp?: boolean;
  isPlayable?: boolean;
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
  },
  { id: "1", title: "NeonStrike Online", categories: ["Multiplayer", "Shooting"], expectedQuarter: "Q3 2026" },
  { id: "2", title: "Cyber Nexus", categories: ["Single Player", "Action"], expectedQuarter: "Q3 2026" },
  { id: "3", title: "VoidRacer X", categories: ["Racing"], expectedQuarter: "Q3 2026" },
  { id: "4", title: "Phantom Tactics", categories: ["Strategy", "Single Player"], expectedQuarter: "Q3 2026" },
  { id: "5", title: "HyperBrawl Arena", categories: ["Multiplayer", "Action"], expectedQuarter: "Q3 2026" },
  { id: "6", title: "GridRunner 2077", categories: ["Arcade"], expectedQuarter: "Q3 2026" },
  { id: "7", title: "Eclipse Protocol", categories: ["Shooting", "Single Player"], expectedQuarter: "Q3 2026" },
  { id: "8", title: "Orbital Siege", categories: ["Strategy", "Multiplayer"], expectedQuarter: "Q3 2026" },
  { id: "9", title: "Neon Puzzler", categories: ["Puzzle"], expectedQuarter: "Q3 2026" },
  { id: "10", title: "SkyDrift Legends", categories: ["Racing", "Sports"], expectedQuarter: "Q3 2026" },
  { id: "11", title: "ALPHEX Command Center", categories: ["Apps"], expectedQuarter: "Q3 2026", isApp: true },
  { id: "12", title: "BioSync Companion", categories: ["Apps"], expectedQuarter: "Q3 2026", isApp: true },
  { id: "13", title: "Pass & Play", categories: ["Pass & Play", "Multiplayer"], expectedQuarter: "Q3 2026" },
];