import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Gamepad2, Trophy } from 'lucide-react';

interface HowToGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'what-is' | 'tictactoe' | 'profile';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'what-is',   label: 'WHAT IS ALPHA X',    icon: <BookOpen  size={11} /> },
  { id: 'tictactoe', label: 'GAMES & APPS',        icon: <Gamepad2  size={11} /> },
  { id: 'profile',   label: 'PROFILE SYSTEM & ETC', icon: <Trophy   size={11} /> },
];

export function HowToGuideModal({ isOpen, onClose }: HowToGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('what-is');

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

// ─── Tab 2: GAMES & APPS GUIDE ───────────────────────────────────────────────

function TabTicTacToe() {
  return (
    <div>
      {/* ── TIC-TAC-TOE ──────────────────────────────────────────────────── */}
      <div
        className="mb-6 pb-1"
        style={{ borderBottom: '2px solid rgba(0,255,204,0.12)' }}
      >
        <h3
          className="font-display text-sm font-bold uppercase tracking-widest mb-4"
          style={{ color: '#00ffcc', textShadow: '0 0 10px rgba(0,255,204,0.35)' }}
        >
          Tic-Tac-Toe
        </h3>

        <GuideSection label="Overview">
          <GuideEntry
            term="Classic 3×3 Strategy"
            text="Classic 3x3 grid strategy game where players take turns marking spaces. ALPHEX Tic-Tac-Toe features a neon-cyberpunk aesthetic, voice announcements, and three distinct play modes."
          />
        </GuideSection>

        <GuideSection label="Modes">
          <div className="space-y-3.5">
            <GuideEntry
              term="1v1 AI Mode"
              text="Single-player vs AI. Three difficulty levels:"
            />
            <BulletList items={[
              'Easy — AI plays randomly. Best for new players.',
              'Normal — AI mixes random moves with reactive blocking. A balanced challenge.',
              'Hard — AI uses optimal minimax strategy and will never lose.',
            ]} />
            <GuideEntry
              term="Pass & Play"
              text="Local two-player mode on the same device. Two players take turns on the same screen."
            />
            <GuideEntry
              term="Online Multiplayer"
              text="Real-time networked play against another player worldwide."
            />
            <BulletList items={[
              'Browse Public Rooms — Find and join open public game rooms.',
              'Create Public Room — Host a public room anyone can join.',
              'Create Private Room — Get a unique AlphaX Room Code to share.',
              'Join Room via AlphaX Room Code — Enter a code to join a private room.',
            ]} />
          </div>
        </GuideSection>
      </div>

      {/* ── SNAKES & LADDERS ─────────────────────────────────────────────── */}
      <div className="mb-4">
        <h3
          className="font-display text-sm font-bold uppercase tracking-widest mb-4"
          style={{ color: '#00ffcc', textShadow: '0 0 10px rgba(0,255,204,0.35)' }}
        >
          Snakes &amp; Ladders
        </h3>

        <GuideSection label="Overview">
          <GuideEntry
            term="Neon Edition"
            text="Roll the dice, move your piece, climb ladders to skip ahead, and dodge snakes on your way to victory across a dynamic neon 100-tile board. Race to tile 100 by exact roll to win."
          />
        </GuideSection>

        <GuideSection label="Game Modes & Features">
          <div className="space-y-3.5">
            <GuideEntry
              term="VS AI"
              text="Play solo from 1v1 up to 1v6 with selectable AI difficulties:"
            />
            <BulletList items={[
              'Easy — Bots roll unluckily. You have the edge.',
              'Normal — Pure random dice. Anyone can win.',
              'Hard — Bots roll luckily. You have the challenge.',
            ]} />
            <GuideEntry
              term="Pass & Play"
              text="Local multiplayer for 2 to 6 players. All players share the same device and take turns rolling."
            />
            <GuideEntry
              term="Online Multiplayer"
              text="Real-time networked play against players worldwide."
            />
            <BulletList items={[
              'Browse Public Rooms — Find and join open public game rooms.',
              'Create Public Room — Host a room anyone can join.',
              'Create Private Room — Generate a unique AlphaX Room Code to share.',
              'Join Room via AlphaX Room Code — Enter a code to join a private room.',
            ]} />
          </div>
        </GuideSection>
      </div>

      <GuideSection label="XP & Scoring">
        <div className="space-y-3.5">
          <GuideEntry
            term="Base XP"
            text="Every completed session awards XP regardless of outcome. Wins, losses, and draws all count toward progression."
          />
          <GuideEntry
            term="Engagement Bonus"
            text="Sessions lasting over 120 seconds qualify for an elevated XP range, rewarding longer play."
          />
        </div>
      </GuideSection>
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
