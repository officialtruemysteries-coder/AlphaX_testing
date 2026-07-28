import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Gamepad2, Trophy } from 'lucide-react';

interface HowToGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'what-is' | 'tictactoe' | 'profile';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'what-is',   label: 'WHAT IS ALPHA X',         icon: <BookOpen  size={11} /> },
  { id: 'tictactoe', label: 'TIC-TAC-TOE & GAMEPLAY',  icon: <Gamepad2  size={11} /> },
  { id: 'profile',   label: 'PROFILE, XP & RANKS',     icon: <Trophy    size={11} /> },
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

// ─── Tab 2: TIC-TAC-TOE & GAMEPLAY GUIDE ─────────────────────────────────────

function TabTicTacToe() {
  return (
    <div>
      <GuideSection label="Game Overview">
        <div className="space-y-3.5">
          <GuideEntry
            term="Classic Strategy, Reimagined"
            text="ALPHEX Tic-Tac-Toe is a reimagined take on the classic 3x3 strategy game, featuring a neon-cyberpunk visual aesthetic, custom voice announcements, and three distinct play modes."
          />
          <GuideEntry
            term="Audio Feedback"
            text="Every move, win, loss, and draw is accompanied by synthesized in-game sound effects. Match outcomes trigger distinct voice announcements generated via ElevenLabs synthesis. Audio runs independently per session and does not interfere with system sound settings."
          />
        </div>
      </GuideSection>

      <GuideSection label="Game Modes">
        <div className="space-y-3.5">
          <GuideEntry
            term="1. Play vs AI"
            text="Single-player mode where you compete against an AI opponent. Three difficulty levels are available:"
          />
          <BulletList items={[
            'Easy — The AI plays randomly, choosing any available cell without strategic intent. Best for new players.',
            'Normal — The AI mixes random moves with reactive blocking, occasionally threatening wins. A balanced challenge.',
            'Hard — The AI uses optimal strategy (minimax logic) and will never lose. Intended for experienced players seeking a draw or studying patterns.',
          ]} />

          <GuideEntry
            term="2. Pass & Play"
            text="Local two-player mode on the same device. Two players take turns using the same screen. No network connection is required. Ideal for head-to-head play with someone nearby."
          />

          <GuideEntry
            term="3. Online Multiplayer"
            text="Real-time networked play against another player anywhere in the world. Key mechanics:"
          />
          <BulletList items={[
            'Room Creation — One player creates a game room and receives a unique Room ID to share.',
            'Room Join — The second player enters the Room ID to connect to the active session.',
            'Isolated Player Cards — Each player sees their own isolated game card with their ID, role (X or O), and real-time move state.',
            'Fair Play — Both players receive independent, server-validated turn management to prevent desync.',
            'XP Calculation — XP rewards for online matches are calculated independently per player based on their individual match outcome.',
          ]} />
        </div>
      </GuideSection>

      <GuideSection label="Scoring & XP Mechanics">
        <div className="space-y-3.5">
          <GuideEntry
            term="Match Outcomes"
            text="Each completed match contributes to your XP total regardless of outcome. The base XP gain applies to all results — wins, losses, and draws — ensuring every session counts toward progression."
          />
          <GuideEntry
            term="Win Bonus"
            text="Winning a match provides an additional XP reward on top of the base session XP. The bonus is applied at match conclusion and reflected immediately on your Profile page."
          />
          <GuideEntry
            term="Session Engagement Bonus"
            text="Sessions lasting longer than 120 seconds qualify for an elevated XP range, rewarding sustained engagement with the platform."
          />
          <GuideEntry
            term="Unique Player IDs"
            text="Online multiplayer sessions assign each participant a unique, opaque session token for the duration of the match. This token isolates score attribution and prevents cross-player XP contamination in shared room environments."
          />
        </div>
      </GuideSection>

      <GuideSection label="Controls & Navigation">
        <BulletList items={[
          'Select a cell to place your mark (X or O).',
          'The active player\'s turn is indicated above the board.',
          'Completed matches display the result and offer a rematch option.',
          'Exit at any time using the close or back controls without penalty to XP.',
        ]} />
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
            term="No Downgrading"
            text="Ranks are permanently tied to your total XP earned. Standard users have no mechanism to lose a rank. Once a threshold is crossed, the associated rank is locked in."
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
            term="Badge Unlock Audio"
            text="Unlocking a new badge triggers a dedicated sparkle audio feedback effect to confirm the achievement. This sound fires once per new badge and does not repeat on subsequent visits."
          />
          <GuideEntry
            term="Equipping Badges"
            text="If you have unlocked more than one badge, you can choose which one is displayed on your active profile. Navigate to the Badges section on your Profile page and select your preferred badge to equip it."
          />
          <GuideEntry
            term="In-Game Display"
            text="During active gameplay, only your display name and current rank title are shown to other players. Badges are intentionally excluded from the in-game UI to keep the interface clean and focused."
          />
        </div>
      </GuideSection>

      <GuideSection label="Profile Settings">
        <div className="space-y-3.5">
          <GuideEntry
            term="Display Name"
            text="Your display name can be edited at any time from the Profile page. Changes take effect immediately across all platform surfaces. Editing your name does not affect your XP, rank, badges, or session history."
          />
          <GuideEntry
            term="Profile Avatar"
            text="You can upload a custom profile image from the Profile page. The avatar appears on your profile card and is stored locally in your browser."
          />
          <GuideEntry
            term="Session Counter"
            text="Your profile tracks the total number of sessions you have opened on the platform. This counter increments once per browser tab on load and is visible on your Profile page."
          />
          <GuideEntry
            term="Data Storage"
            text="All profile data — including XP, rank, badges, display name, avatar, and streak — is stored in your browser's localStorage. Clearing browser data or switching to a different browser will result in a fresh profile being generated."
          />
        </div>
      </GuideSection>
    </div>
  );
}
