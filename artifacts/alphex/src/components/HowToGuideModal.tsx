import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Gamepad2, Trophy, Send, Bot } from 'lucide-react';

interface HowToGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'what-is' | 'tictactoe' | 'profile';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'tictactoe', label: 'ALPHAX AI',            icon: <Gamepad2  size={11} /> },
  { id: 'what-is',   label: 'WHAT IS ALPHA X',      icon: <BookOpen  size={11} /> },
  { id: 'profile',   label: 'PROFILE SYSTEM & ETC', icon: <Trophy    size={11} /> },
];

export function HowToGuideModal({ isOpen, onClose }: HowToGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tictactoe');

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
              maxWidth: 680,
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
                <BookOpen size={14} style={{ color: '#00ffcc', opacity: 0.8 }} />
                <h2
                  className="font-display text-sm font-bold uppercase tracking-widest"
                  style={{ color: '#00ffcc', textShadow: '0 0 10px rgba(0,255,204,0.35)' }}
                >
                  How-To Guide
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

            {/* ── Tab Bar ── */}
            <div
              className="flex shrink-0 px-4 pt-3 pb-0 gap-1 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-display text-[9px]
                               uppercase tracking-widest whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0"
                    style={isActive ? {
                      color: '#00ffcc',
                      background: 'rgba(0,255,204,0.06)',
                      borderBottom: '2px solid #00ffcc',
                      textShadow: '0 0 8px rgba(0,255,204,0.4)',
                    } : {
                      color: 'rgba(255,255,255,0.35)',
                      borderBottom: '2px solid transparent',
                    }}
                  >
                    <span style={{ opacity: isActive ? 0.9 : 0.5 }}>{tab.icon}</span>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab divider ── */}
            <div style={{ height: 1, background: 'rgba(0,255,204,0.07)', flexShrink: 0 }} />

            {/* ── Tab Content ── */}
            <div
              className="overflow-y-auto flex-1 px-6 py-5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,204,0.15) transparent' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'what-is'   && <TabWhatIsAlphaX />}
                  {activeTab === 'tictactoe' && <TabTicTacToe />}
                  {activeTab === 'profile'   && <TabProfile />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div
              className="shrink-0 py-3 text-center font-mono text-[9px] uppercase tracking-widest"
              style={{ color: 'rgba(0,255,204,0.20)', borderTop: '1px solid rgba(0,255,204,0.07)' }}
            >
              ALPHEX · All Rights Reserved
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function GuideSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 mb-7">
      <div
        className="flex items-center gap-2 pb-2"
        style={{ borderBottom: '1px solid rgba(0,255,204,0.07)' }}
      >
        <span
          className="w-1 h-1 rounded-full shrink-0"
          style={{ background: 'rgba(0,255,204,0.55)' }}
        />
        <h3
          className="font-display text-[9px] uppercase tracking-widest font-bold"
          style={{ color: 'rgba(0,255,204,0.60)' }}
        >
          {label}
        </h3>
      </div>
      {children}
    </section>
  );
}

function GuideEntry({ term, text }: { term: string; text: string }) {
  return (
    <div className="space-y-1">
      <p
        className="font-display text-[10px] uppercase tracking-wider"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        {term}
      </p>
      <p
        className="font-mono text-[11px] leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        {text}
      </p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span
            className="mt-[5px] w-1 h-1 rounded-full shrink-0"
            style={{ background: 'rgba(0,255,204,0.45)' }}
          />
          <p
            className="font-mono text-[11px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {item}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ─── Tab 1: WHAT IS ALPHA X ───────────────────────────────────────────────────

function TabWhatIsAlphaX() {
  return (
    <div>
      <GuideSection label="Platform Overview">
        <div className="space-y-3.5">
          <GuideEntry
            term="What is ALPHEX?"
            text="ALPHEX is a next-generation web-based gaming and utility app ecosystem designed for a worldwide audience of all ages. Zero downloads are required — every game and tool runs directly in your browser."
          />
          <GuideEntry
            term="Content Library"
            text="ALPHEX hosts dynamic mind games, board games, arcade logic challenges, and future utility apps — all under a single unified platform with one persistent player profile."
          />
          <GuideEntry
            term="Unified Progression"
            text="Every game played and every tool used on the platform contributes XP to your global profile rank. Progress never resets and carries forward across sessions."
          />
        </div>
      </GuideSection>

      <GuideSection label="Core Features">
        <div className="space-y-3.5">
          <GuideEntry
            term="No Account Required"
            text="A unique Player ID is automatically generated in your browser on first visit and stored locally. No email address, password, or sign-up is needed to start playing."
          />
          <GuideEntry
            term="Real-Time Multiplayer"
            text="ALPHEX supports live online multiplayer sessions powered by Socket.io. Players worldwide can create or join game rooms in real time, with isolated player cards and independent XP calculations per session."
          />
          <GuideEntry
            term="Global Online Count"
            text="The live player counter displayed in the navigation bar reflects the number of active browser sessions connected to the ALPHEX platform at any given moment."
          />
          <GuideEntry
            term="Sound & Audio"
            text="ALPHEX features a layered audio system: in-game sound effects (move clicks, board chimes, victory and defeat fanfares, XP and badge sparkles) are synthesized in-browser via the Web Audio API. Match outcome voice announcements are powered by ElevenLabs voice synthesis. All audio can coexist without conflict."
          />
          <GuideEntry
            term="Display Name"
            text="Your display name is set in Profile settings and appears in the navigation, game lobbies, and online player cards. It can be changed at any time without affecting your XP or rank."
          />
          <GuideEntry
            term="Cross-Session Persistence"
            text="Your XP, rank, equipped badge, display name, and session history are stored in your browser's localStorage. All progress persists across page refreshes and return visits on the same device and browser."
          />
        </div>
      </GuideSection>

      <GuideSection label="Platform Roadmap">
        <GuideEntry
          term="Expanding Ecosystem"
          text="ALPHEX is designed to grow. Future releases will introduce additional game titles, utility apps, seasonal challenges, and new badge tiers — all unified under the same progression system and player identity."
        />
      </GuideSection>
    </div>
  );
}

// ─── Tab 2: AlphaX AI Assistant ───────────────────────────────────────────────

interface ChatMessage {
  id: number;
  role: 'ai' | 'user';
  text: string;
}

const GREETING = "Hey! I'm the AlphaX AI Assistant 👾 I'm programmed exclusively for AlphaX games, apps, and platform features. Ask me anything about Tic-Tac-Toe, Snakes & Ladders, Online Multiplayer, XP, ranks, badges, or any other AlphaX feature!";
const OFF_TOPIC = "I am programmed exclusively for AlphaX games, apps, and platform features. Please ask me anything related to it!";

// ── AlphaX knowledge base ──────────────────────────────────────────────────
// Each entry: patterns to match (any substring of lowercase query), and the response.
const KB: { p: string[]; r: string }[] = [
  // Greetings
  { p: ['hello', 'hi', 'hey', 'sup', 'yo', 'what can you do', 'help', 'what do you know'],
    r: "Hey! I can answer questions about:\n• 🎮 Tic-Tac-Toe — rules, modes, AI difficulty\n• 🎲 Snakes & Ladders — board, rules, modes, AI\n• 🌐 Online Multiplayer — rooms, room codes, lobbies\n• ⚡ XP system — how to earn, engagement bonuses\n• 🏆 Ranks & Badges — all 9 tiers, badge unlock conditions\n• 👤 Profile — username, avatar, localStorage, player ID\n\nJust ask away!" },

  // What is AlphaX / platform
  { p: ['what is alphex', 'what is alpha x', 'what is alphax', 'about alphex', 'about alpha x', 'about the platform', 'what is this'],
    r: "ALPHEX is a next-generation browser-based gaming and utility platform — zero downloads required. Every game runs directly in your browser. It features a unified XP progression system, real-time online multiplayer, persistent player profiles stored locally, and a neon-cyberpunk aesthetic. Currently live games: Tic-Tac-Toe and Snakes & Ladders (Neon Edition)." },

  { p: ['download', 'install', 'app store', 'google play', 'native app'],
    r: "No downloads needed! ALPHEX runs 100% in your browser. Just open the site and start playing instantly — no installation, no account required." },

  // ── TIC-TAC-TOE ───────────────────────────────────────────────────────────
  { p: ['how to play tic', 'tic tac toe rules', 'tictactoe rules', 'how does tic', 'tic-tac-toe rules'],
    r: "Tic-Tac-Toe is played on a 3×3 grid. Two players take turns placing their mark (X or O). The first player to align 3 marks in a row — horizontally, vertically, or diagonally — wins. If all 9 cells are filled with no winner, the match is a draw. On ALPHEX you earn XP regardless of outcome." },

  { p: ['tic tac toe', 'tictactoe', 'tic-tac-toe', 'ttt', 'noughts and crosses', 'x and o', 'xo game'],
    r: "ALPHEX Tic-Tac-Toe is a neon-cyberpunk reimagining of the classic 3×3 strategy game. It has three play modes:\n• Play vs AI — 1v1 against an AI bot (Easy / Normal / Hard)\n• Pass & Play — 2 players on the same device, take turns\n• Online Multiplayer — real-time match against a player worldwide\n\nVoice announcements powered by ElevenLabs play on win, loss, and draw outcomes." },

  { p: ['tic tac toe ai', 'ttt ai', 'ai difficulty', 'tic tac toe difficulty', 'easy normal hard tic', 'minimax', 'beat the ai', 'beat ai tic'],
    r: "Tic-Tac-Toe has 3 AI difficulty levels:\n• Easy — AI picks cells randomly, no strategy. Great for beginners.\n• Normal — AI mixes random moves with occasional blocking. A fair challenge.\n• Hard — AI uses full minimax logic and literally cannot lose. You can only draw at best.\n\nSelect your difficulty from the mode selection screen after choosing Play vs AI." },

  { p: ['tic tac toe win', 'how to win tic', 'winning strategy', 'win ttt'],
    r: "To win Tic-Tac-Toe, align 3 of your marks in a row — horizontally, vertically, or diagonally. Pro tips:\n• Control the center cell — it's part of 4 winning lines\n• Corners are the next best positions\n• Block your opponent whenever they have 2 in a row\n• On Hard difficulty, the best you can achieve is a draw" },

  // ── SNAKES & LADDERS ──────────────────────────────────────────────────────
  { p: ['how to play snake', 'snakes and ladders rules', 'snake ladder rules', 'how does snake', 'snake ladder how'],
    r: "Snakes & Ladders is played on a 100-tile board. Players roll a dice and move their pawn forward by that many tiles. Land on a ladder foot → climb to the top (a big jump ahead). Land on a snake's head → slide down to its tail (a big drop back). Rolling a 6 gives you a bonus roll. First player to reach exactly tile 100 wins — if you overshoot, you bounce back." },

  { p: ['snakes', 'snake', 'ladders', 'ladder', 's&l', 'saap', 'dice game', 'board game snakes'],
    r: "ALPHEX Snakes & Ladders — Neon Edition! A 100-tile board with 8 ladders and 7 snakes. Modes:\n• Play vs AI — 1 human vs 1–6 AI bots (Easy / Normal / Hard difficulty)\n• Pass & Play — 2–6 players on the same device\n• Online Multiplayer — real-time multiplayer worldwide\n\nFeatures step-by-step pawn animation, neon glow effects, dice sound effects, and full XP integration." },

  { p: ['snake ai', 'snakes ai', 'snakes difficulty', 'snake difficulty', 'snake easy', 'snake normal', 'snake hard', 'bot difficulty snake', 'ai bots snake'],
    r: "Snakes & Ladders AI difficulties:\n• Easy — Bots use biased dice (tend to roll lower numbers). You have the advantage.\n• Normal — Pure random dice for everyone. Anyone can win.\n• Hard — Bots use biased dice (tend to roll higher numbers). A real challenge.\n\nYou can play vs 1 to 6 AI bots simultaneously!" },

  { p: ['100 tile', 'tile 100', 'reach 100', 'exact roll', 'overshoot', 'bounce back'],
    r: "To win Snakes & Ladders you must land on exactly tile 100. If your roll would take you past 100, you bounce back by the excess. For example, if you're on tile 98 and roll a 5, you go to 100 − (98+5−100) = tile 97. You need an exact roll to win!" },

  { p: ['snake pass and play', 'snakes pass', 'snake local', 'local snake', '2 to 6 players', '2-6 players'],
    r: "Snakes & Ladders Pass & Play supports 2 to 6 players on the same device. Each player gets a uniquely colored neon pawn. Players take turns rolling the dice. The game supports up to 6 players simultaneously — just pass the device between turns!" },

  { p: ['how many bots', 'how many ai', 'how many players snake', 'max players snake', 'snake 1v6', '1v6', '1v1 snake', '1v2', '1v3', '1v4', '1v5'],
    r: "In Snakes & Ladders vs AI mode, you can choose 1 to 6 AI opponents — so it can be 1v1 all the way up to 1v6! Each bot has a distinct neon pawn color. All bots share the same difficulty level you selected." },

  // ── ONLINE MULTIPLAYER ────────────────────────────────────────────────────
  { p: ['online multiplayer', 'multiplayer', 'play online', 'online game', 'real time', 'real-time'],
    r: "ALPHEX Online Multiplayer is powered by Socket.io for real-time play. Both Tic-Tac-Toe and Snakes & Ladders support it. Options:\n• Browse Public Rooms — see all open rooms and join any\n• Create Public Room — host a room anyone can find and join\n• Create Private Room — get a unique AlphaX Room Code to share privately\n• Join via Room Code — enter a code shared by a friend to join their private room\n\nXP is calculated independently for each player." },

  { p: ['room code', 'alphax code', 'alphex code', 'private room', 'room id', 'share code', 'join code', 'enter code', 'what is a room code'],
    r: "An AlphaX Room Code is a unique identifier generated when you create a Private Room. Share it with a friend so they can join your room directly — no browsing needed. To use it:\n1. Your friend opens Online Multiplayer\n2. They select 'Join via AlphaX Room Code'\n3. They enter the code you shared\n4. They join your room instantly!" },

  { p: ['create room', 'host room', 'make room', 'start room', 'new room', 'create a room'],
    r: "To create a room in Online Multiplayer:\n• Public Room — anyone browsing public rooms can find and join it. Great for meeting new players.\n• Private Room — only players with your unique AlphaX Room Code can join. Perfect for playing with friends.\n\nBoth options are available in the Online Multiplayer lobby of any game." },

  { p: ['join room', 'how to join', 'browse rooms', 'find room', 'public room'],
    r: "To join an Online Multiplayer game:\n• Browse Public Rooms — see a live list of open rooms and click Join on any of them\n• Join via AlphaX Room Code — if a friend shared their private room code, tap 'Join via Room Code' and enter it\n\nOnce matched, the game starts automatically when both players are in the room." },

  { p: ['socket', 'websocket', 'connection', 'disconnect', 'lag', 'latency'],
    r: "ALPHEX Online Multiplayer uses Socket.io WebSocket connections for low-latency real-time gameplay. If you get disconnected, simply close the modal and reopen it to reconnect. Your XP is awarded at the end of each completed match." },

  // ── XP SYSTEM ─────────────────────────────────────────────────────────────
  { p: ['xp', 'experience', 'earn xp', 'how to get xp', 'xp system', 'how xp works', 'xp reward', 'xp gain'],
    r: "XP (Experience Points) is earned every session on ALPHEX:\n• Base XP: 10–25 XP per completed game session\n• Engagement Bonus: sessions over 120 seconds earn a higher range (15–30 XP)\n• Win Bonus: additional XP on top of base for winning\n• XP accumulates permanently — it never resets\n• Cap: 100,000 total XP maximum\n\nEvery game played (win, loss, or draw) counts toward your XP total." },

  { p: ['xp cap', 'max xp', '100000', 'xp limit', 'maximum xp'],
    r: "The maximum XP cap on ALPHEX is 100,000 XP. Once you reach it, you hold the ELITE LEGEND rank permanently. XP below the cap continues to accumulate normally — there's no daily or weekly limit, just the lifetime 100,000 cap." },

  { p: ['engagement bonus', '120 seconds', 'session bonus', 'longer session', 'play longer'],
    r: "Sessions lasting more than 120 seconds (2 minutes) unlock a higher XP range — 15–30 XP instead of the base 10–25 XP. So the longer you play, the more XP you can earn per session!" },

  // ── RANKS ─────────────────────────────────────────────────────────────────
  { p: ['rank', 'ranks', 'ranking', 'tier', 'level up', 'rank up', 'how to rank', 'rank system'],
    r: "ALPHEX has 9 rank tiers based on total XP:\n• Starter — 0–500 XP\n• Explorer — 501–2,000 XP\n• Noob — 2,001–5,000 XP\n• Pro — 5,001–10,000 XP\n• Specialist — 10,001–20,000 XP\n• Advanced — 20,001–40,000 XP\n• Master — 40,001–65,000 XP\n• Legend — 65,001–90,000 XP\n• Elite Legend — 90,001–100,000 XP\n\nRanks advance automatically when you cross an XP threshold — no manual action needed." },

  { p: ['starter rank', 'explorer rank', 'noob rank', 'pro rank', 'specialist rank', 'advanced rank', 'master rank', 'legend rank', 'elite legend'],
    r: "Here are all 9 ALPHEX rank tiers:\n• Starter: 0–500 XP\n• Explorer: 501–2,000 XP\n• Noob: 2,001–5,000 XP\n• Pro: 5,001–10,000 XP\n• Specialist: 10,001–20,000 XP\n• Advanced: 20,001–40,000 XP\n• Master: 40,001–65,000 XP\n• Legend: 65,001–90,000 XP\n• Elite Legend: 90,001–100,000 XP" },

  { p: ['progress bar', 'xp bar', 'rank progress', 'how much xp', 'xp percentage'],
    r: "The XP progress bar on your Profile page shows your fill % within your current rank bracket — not your total progress to 100,000. For example, if you're a Starter with 250 XP, the bar shows 50% (halfway through the 0–500 Starter bracket)." },

  // ── BADGES ────────────────────────────────────────────────────────────────
  { p: ['badge', 'badges', 'achievement', 'unlock badge', 'how to get badge', 'badge unlock'],
    r: "ALPHEX currently has 3 unlockable badges:\n• 🌅 Early Riser — Play any game before 9:00 AM\n• 🌙 Sleepwalker — Play any game after 10:00 PM\n• 📅 Perfect Week — Log in and play on 7 consecutive calendar days\n\nBadges appear in your Profile's Badges Showcase. You can equip any unlocked badge to display on your profile card." },

  { p: ['early riser', 'morning badge', 'before 9', '9am badge'],
    r: "🌅 Early Riser badge: Play any game or use any ALPHEX app before 9:00 AM local time. Just launch a game session before 9 AM and the badge unlocks automatically — a sparkle sound confirms it!" },

  { p: ['sleepwalker', 'night badge', 'after 10', '10pm badge', 'late night'],
    r: "🌙 Sleepwalker badge: Play any game or use any ALPHEX app after 10:00 PM local time. Stay up late, launch a game after 10 PM, and the badge unlocks with a sparkle sound effect." },

  { p: ['perfect week', '7 days', 'consecutive', 'daily streak', 'streak badge', 'weekly badge'],
    r: "📅 Perfect Week badge: Log in and play on 7 consecutive calendar days in a row. Your daily streak is tracked on your Profile page. Miss a day and the streak resets to 0. Once you hit 7 consecutive days the badge unlocks!" },

  { p: ['equip badge', 'equipped badge', 'active badge', 'display badge', 'swap badge'],
    r: "To equip a badge: go to your Profile page → Badges Showcase section → click the badge you want to display. Your equipped badge appears on your profile card and in Online Multiplayer lobbies. You can swap badges at any time." },

  // ── PROFILE ───────────────────────────────────────────────────────────────
  { p: ['profile', 'my profile', 'profile page', 'player profile'],
    r: "Your ALPHEX Profile stores: display name, avatar/profile picture, total XP, current rank, unlocked badges, equipped badge, daily streak, and session count. Access it anytime via the PROFILE link in the navigation bar. All data is saved locally in your browser — no account required." },

  { p: ['username', 'display name', 'change name', 'edit name', 'player name', 'name limit', 'name characters'],
    r: "Your display name can be set or changed anytime from the Profile page — click the edit icon next to your current name. Rules:\n• 1 to 15 characters maximum\n• Cannot be entirely spaces\n• If the name is already taken by another active player, you'll be prompted to pick a different one\n\nChanging your name does not affect your XP, rank, or badges." },

  { p: ['avatar', 'profile picture', 'profile photo', 'upload photo', 'change avatar', 'pfp'],
    r: "You can set a custom profile picture from the Profile page. Click the camera icon on your avatar card, then upload any image from your device. It'll be cropped and displayed as your active profile picture. Your avatar is stored in your browser's localStorage." },

  { p: ['save progress', 'how is progress saved', 'local storage', 'localstorage', 'browser storage', 'data stored', 'where is data'],
    r: "All ALPHEX progress — XP, rank, badges, username, avatar, daily streak, session count — is stored in your browser's localStorage. No server-side account is needed. However, this means progress is tied to your specific browser and device. Clearing your browser's site data will reset everything." },

  { p: ['lose progress', 'reset progress', 'lost xp', 'xp gone', 'clear cache', 'clear data', 'incognito'],
    r: "Your ALPHEX progress is stored in browser localStorage. It will be lost if you:\n• Clear your browser's site data or cache\n• Switch to a different browser\n• Switch to a different device\n• Use Incognito/Private mode (data deleted on session end)\n\nTo preserve progress, always play on the same browser and device, and avoid clearing site data for ALPHEX." },

  { p: ['player id', 'unique id', 'anonymous', 'account', 'sign up', 'login', 'log in', 'register'],
    r: "No account needed on ALPHEX! A unique Player ID is automatically generated in your browser on your first visit and stored locally. This ID is used for online multiplayer room management and XP tracking. You'll never need an email address or password." },

  { p: ['cloud sync', 'sync', 'cross device', 'transfer progress', 'different device', 'another device'],
    r: "ALPHEX currently has no cross-device sync or cloud backup. Your progress is tied to the specific browser and device where you earned it. To keep your progress, continue playing on the same browser/device and avoid clearing browser data." },

  { p: ['session count', 'how many sessions', 'sessions played'],
    r: "Your session count on your Profile page tracks the total number of times you've opened ALPHEX (one count per browser tab load). It's a fun stat to track your loyalty to the platform!" },

  // ── AUDIO / SOUND ─────────────────────────────────────────────────────────
  { p: ['sound', 'audio', 'music', 'sfx', 'sound effect', 'voice', 'announcement', 'elevenlabs', 'no sound', 'mute'],
    r: "ALPHEX features a layered audio system:\n• In-game SFX — move clicks, dice rolls, ladder/snake sounds, XP sparkles, badge chimes — all synthesized via Web Audio API (no files needed)\n• Voice announcements — win, lose, and draw outcomes in Tic-Tac-Toe are voiced via ElevenLabs synthesis\n• Online player count chime — a soft ping when the online count updates\n\nAll audio coexists without conflict. If you hear no sound, make sure your device isn't muted and that you've interacted with the page first (browsers require user interaction before audio plays)." },

  // ── ONLINE COUNT ──────────────────────────────────────────────────────────
  { p: ['online count', 'players online', 'how many players', 'live players', 'player count', 'online indicator'],
    r: "The live player counter in the navigation bar shows the number of active browser sessions connected to ALPHEX at any given moment. It updates in real time via Socket.io. Every open browser tab counts as one active session." },

  // ── COMING SOON ────────────────────────────────────────────────────────────
  { p: ['coming soon', 'upcoming games', 'future games', 'new games', 'what games are coming', 'q3 2026', 'q4 2026', 'when will'],
    r: "Exciting titles are coming to ALPHEX! Games currently listed as 'Coming Soon' (Q3 2026):\n• 🔫 NeonStrike Online (Multiplayer Shooting)\n• ⚔️ Cyber Nexus (Action)\n• 🏎️ VoidRacer X (Racing)\n• 🧠 Phantom Tactics (Strategy)\n• 🥊 HyperBrawl Arena (Multiplayer Action)\n• 🕹️ GridRunner 2077 (Arcade)\n• 🎯 Eclipse Protocol (Shooting)\n• 🛸 Orbital Siege (Strategy)\n• 🧩 Neon Puzzler (Puzzle)\n• ✈️ SkyDrift Legends (Racing/Sports)\n\nThe ALPHEX ecosystem is designed to keep growing!" },

  // ── PASS AND PLAY GENERAL ─────────────────────────────────────────────────
  { p: ['pass and play', 'pass & play', 'local multiplayer', 'same device', 'couch', 'friend next to me'],
    r: "Pass & Play is local multiplayer on the same device — no internet needed! Both games support it:\n• Tic-Tac-Toe: 2 players take turns on the same screen\n• Snakes & Ladders: 2–6 players share the same device, passing it between turns\n\nGreat for playing with friends or family nearby." },
];

// ── AlphaX topic whitelist ─────────────────────────────────────────────────
const ALPHEX_KEYWORDS = [
  'alphex','alphax','alpha x','tic','tac','toe','ttt','snake','ladder','saap',
  'xp','rank','badge','profile','multiplayer','online','room','lobby','pass','play',
  'bot','ai','difficulty','easy','normal','hard','board','dice','roll','pawn','tile',
  'sound','audio','voice','avatar','username','player','session','streak','leader',
  'game','games','feature','platform','download','install','mode','win','lose','draw',
  'score','level','progress','sync','account','login','register','id','token',
];

function isAlphexRelated(q: string): boolean {
  const lower = q.toLowerCase();
  return ALPHEX_KEYWORDS.some(k => lower.includes(k));
}

function getAIResponse(query: string): string {
  const q = query.toLowerCase().trim();
  if (!q) return "Please type a question about ALPHEX!";

  // Check knowledge base
  for (const entry of KB) {
    if (entry.p.some(p => q.includes(p))) return entry.r;
  }

  // Is it AlphaX-related at all?
  if (isAlphexRelated(q)) {
    return "I don't have specific information on that detail, but I'm here for anything about ALPHEX games and features! Try asking about Tic-Tac-Toe rules, Snakes & Ladders, XP, ranks, badges, Online Multiplayer rooms, or your profile.";
  }

  return OFF_TOPIC;
}

// ── Chat bubble ────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAI = msg.role === 'ai';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className={`flex gap-2.5 ${isAI ? 'items-start' : 'items-end flex-row-reverse'}`}
    >
      {isAI && (
        <div
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,204,0.2), rgba(138,43,226,0.2))',
            border: '1px solid rgba(0,255,204,0.4)',
            boxShadow: '0 0 10px rgba(0,255,204,0.15)',
          }}
        >
          <Bot size={13} style={{ color: '#00ffcc' }} />
        </div>
      )}
      <div
        className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[11.5px] font-sans leading-relaxed whitespace-pre-wrap"
        style={isAI ? {
          background: 'linear-gradient(135deg, rgba(0,255,204,0.06), rgba(138,43,226,0.04))',
          border: '1px solid rgba(0,255,204,0.15)',
          color: 'rgba(255,255,255,0.78)',
          borderRadius: '4px 18px 18px 18px',
        } : {
          background: 'linear-gradient(135deg, rgba(0,255,204,0.18), rgba(0,255,204,0.10))',
          border: '1px solid rgba(0,255,204,0.35)',
          color: '#00ffcc',
          borderRadius: '18px 4px 18px 18px',
        }}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

// ── Main AI assistant tab ──────────────────────────────────────────────────
function TabTicTacToe() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'ai', text: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const msgIdRef = useRef(1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const send = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');

    const userMsg: ChatMessage = { id: msgIdRef.current++, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate a brief "thinking" delay for natural feel
    const delay = 320 + Math.random() * 280;
    setTimeout(() => {
      const response = getAIResponse(text);
      setMessages(prev => [...prev, { id: msgIdRef.current++, role: 'ai', text: response }]);
      setIsTyping(false);
    }, delay);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col" style={{ height: 420 }}>

      {/* AI Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3 shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,204,0.05), rgba(138,43,226,0.05))',
          border: '1px solid rgba(0,255,204,0.12)',
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,255,204,0.2), rgba(138,43,226,0.2))',
            border: '1px solid rgba(0,255,204,0.5)',
            boxShadow: '0 0 16px rgba(0,255,204,0.2)',
          }}
        >
          <Bot size={17} style={{ color: '#00ffcc' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-display font-bold text-xs uppercase tracking-widest"
            style={{ color: '#00ffcc', textShadow: '0 0 8px rgba(0,255,204,0.4)' }}
          >
            AlphaX AI Assistant
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
            />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Online · Ready
            </span>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,255,204,0.12) transparent' }}
      >
        <AnimatePresence initial={false}>
          {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5"
          >
            <div
              className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,204,0.2), rgba(138,43,226,0.2))',
                border: '1px solid rgba(0,255,204,0.4)',
              }}
            >
              <Bot size={13} style={{ color: '#00ffcc' }} />
            </div>
            <div
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl"
              style={{
                background: 'rgba(0,255,204,0.06)',
                border: '1px solid rgba(0,255,204,0.15)',
                borderRadius: '4px 18px 18px 18px',
              }}
            >
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#00ffcc' }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input row */}
      <div
        className="flex items-center gap-2 mt-3 shrink-0 rounded-xl px-3 py-2"
        style={{
          background: 'rgba(0,255,204,0.04)',
          border: '1px solid rgba(0,255,204,0.14)',
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about any game, app, or feature..."
          className="flex-1 bg-transparent outline-none font-sans text-xs"
          style={{ color: 'rgba(255,255,255,0.75)', caretColor: '#00ffcc' }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || isTyping}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 shrink-0"
          style={{
            background: input.trim() && !isTyping
              ? 'linear-gradient(135deg, rgba(0,255,204,0.3), rgba(0,255,204,0.15))'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${input.trim() && !isTyping ? 'rgba(0,255,204,0.6)' : 'rgba(255,255,255,0.08)'}`,
            cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={12} style={{ color: input.trim() && !isTyping ? '#00ffcc' : 'rgba(255,255,255,0.2)' }} />
        </button>
      </div>

      {/* Footer */}
      <div
        className="text-center font-mono text-[9px] uppercase tracking-widest mt-2.5 shrink-0"
        style={{ color: 'rgba(0,255,204,0.25)' }}
      >
        Powered by AlphaX
      </div>
    </div>
  );
}

// ─── Tab 3: PROFILE, XP, RANKS & BADGES ──────────────────────────────────────

const RANK_TABLE: { xp: string; rank: string; range: string }[] = [
  { xp: '0 – 500 XP',           rank: 'STARTER',      range: 'Starter Tier' },
  { xp: '501 – 2,000 XP',       rank: 'EXPLORER',     range: 'Explorer Tier' },
  { xp: '2,001 – 5,000 XP',     rank: 'NOOB',         range: 'Noob Tier' },
  { xp: '5,001 – 10,000 XP',    rank: 'PRO',          range: 'Pro Tier' },
  { xp: '10,001 – 20,000 XP',   rank: 'SPECIALIST',   range: 'Specialist Tier' },
  { xp: '20,001 – 40,000 XP',   rank: 'ADVANCED',     range: 'Advanced Tier' },
  { xp: '40,001 – 65,000 XP',   rank: 'MASTER',       range: 'Master Tier' },
  { xp: '65,001 – 90,000 XP',   rank: 'LEGEND',       range: 'Legend Tier' },
  { xp: '90,001 – 100,000 XP',  rank: 'ELITE LEGEND', range: 'Elite Tier' },
];

function TabProfile() {
  return (
    <div>
      <GuideSection label="Profile Customization">
        <div className="space-y-3.5">
          <GuideEntry
            term="Display Name"
            text="Your display name can be edited at any time from the Profile page by selecting the edit icon next to your current name. Changes take effect immediately across all platform surfaces including the navigation bar, game lobbies, and online player cards."
          />
          <GuideEntry
            term="Character Limits"
            text="Display names must be between 1 and 15 characters. Names that consist entirely of spaces are rejected. The 15-character hard cap is enforced at input — no additional characters can be entered beyond the limit."
          />
          <GuideEntry
            term="Profile Picture / Avatar"
            text="You can set or change your profile picture from the Profile page using the camera icon on your avatar card. Upload any image from your device and it will be cropped and displayed as your active profile picture. Your avatar appears on your profile card and is stored locally in your browser."
          />
          <GuideEntry
            term="Name Availability"
            text="Display names are checked for conflicts against other active sessions on the platform. If a chosen name is already in use, you will be prompted to select an alternative. Editing your name does not reset or affect your XP, rank, badges, or session history."
          />
        </div>
      </GuideSection>

      <GuideSection label="Browser Storage & Account Mechanics">
        <div className="space-y-3.5">
          <GuideEntry
            term="How Progress is Saved"
            text="All player progress — including XP, unlocked badges, current rank, equipped badge, display name, avatar, daily streak, and session count — is saved locally in your browser's storage (localStorage). No account registration or server-side profile is required."
          />
          <GuideEntry
            term="Progress is Device & Browser Bound"
            text="Your progress is tied exclusively to the specific browser and device where you earned it. Switching to a different browser on the same device, clearing your browser's site data or cache, or using a different device will start a completely fresh session with a new Player ID and zero XP."
          />
          <GuideEntry
            term="No Cloud Sync"
            text="There is currently no cross-device sync or account export feature. To preserve your progress, avoid clearing browser data for the ALPHEX site and continue playing on the same browser where your session was started."
          />
          <GuideEntry
            term="Session Tracking"
            text="Your profile tracks the total number of sessions opened on the platform. This counter increments once per browser tab on load and is visible on your Profile page as part of your session history."
          />
        </div>
      </GuideSection>

      <GuideSection label="XP Progression System">
        <div className="space-y-3.5">
          <GuideEntry
            term="How XP is Earned"
            text="XP is awarded at the end of every game session and when engaging with ALPHEX tools. The base award is 10–25 XP per session, with a higher range applied to sessions lasting more than 120 seconds. XP is cumulative, permanent, and capped at 100,000 total."
          />
          <GuideEntry
            term="XP Progress Bar"
            text="The progress bar on your Profile page shows your fill percentage within your current rank bracket only — not your progress toward the global 100,000 XP cap. For example, a STARTER player at 250 XP will see 50% fill (halfway through 0–500), not 0.25%."
          />
          <GuideEntry
            term="Rank Advancement"
            text="Ranks advance automatically and instantly when your XP total crosses the next bracket boundary. There is no delay, cooldown, or manual action required — the new rank takes effect the moment the threshold is reached."
          />
          <GuideEntry
            term="Ranks are Permanent Milestones"
            text="Ranks are permanently tied to your total XP earned and cannot be manually downgraded or upgraded without reaching the corresponding XP target. Once a rank threshold is crossed, the associated rank is locked in for all standard users. There is no mechanism for a standard player to lose or lower their rank."
          />
        </div>
      </GuideSection>

      <GuideSection label="Rank Tiers">
        <div className="mt-1 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,255,204,0.09)' }}>
          {RANK_TABLE.map((row, i) => (
            <div
              key={row.rank}
              className="flex items-center px-4 py-2.5 gap-4"
              style={{
                background: i % 2 === 0 ? 'rgba(0,255,204,0.02)' : 'transparent',
                borderBottom: i < RANK_TABLE.length - 1 ? '1px solid rgba(0,255,204,0.05)' : 'none',
              }}
            >
              <span
                className="font-display text-[9px] uppercase tracking-widest font-bold shrink-0"
                style={{ color: '#00ffcc', opacity: 0.75, minWidth: 84 }}
              >
                {row.rank}
              </span>
              <span
                className="font-mono text-[10px] shrink-0"
                style={{ color: 'rgba(255,255,255,0.30)', minWidth: 120 }}
              >
                {row.xp}
              </span>
              <span
                className="font-mono text-[9px] uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              >
                {row.range}
              </span>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection label="Badges">
        <div className="space-y-3.5">
          <GuideEntry
            term="What Are Badges?"
            text="Badges are achievement markers unlocked by meeting specific platform milestones. They are displayed exclusively on the Profile page in the Badges Showcase section and do not appear during active gameplay."
          />
          <GuideEntry
            term="Available Badges"
            text="Three badges are currently available on ALPHEX:"
          />
          <BulletList items={[
            'EARLY RISER — Earned by playing any game or using any app before 9:00 AM.',
            'SLEEPWALKER — Earned by playing any game or using any app after 10:00 PM.',
            'PERFECT WEEK — Earned by logging in and playing on 7 consecutive calendar days.',
          ]} />
          <GuideEntry
            term="Equipping & Swapping Badges"
            text="Unlocked badges can be equipped or swapped at any time directly from the Badges section on your Profile page. If you have unlocked more than one badge, select your preferred badge to set it as your active displayed badge. The equipped badge appears on your profile card and in your public player showcase."
          />
          <GuideEntry
            term="Badge Unlock Audio"
            text="Unlocking a new badge triggers a dedicated sparkle audio feedback effect to confirm the achievement. This sound fires once per new badge unlock and does not repeat on subsequent visits."
          />
          <GuideEntry
            term="In-Game Display"
            text="During active gameplay, only your display name and current rank title are shown to other players. Badges are intentionally excluded from the in-game UI to keep the interface clean and focused."
          />
        </div>
      </GuideSection>
    </div>
  );
}
