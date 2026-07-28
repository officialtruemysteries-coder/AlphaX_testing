# ALPHEX Gaming Hub

A multiplayer browser gaming platform built as a pnpm monorepo.

## Architecture

| Package | Path | Role |
|---|---|---|
| `@workspace/alphex` | `artifacts/alphex/` | React + Vite frontend (Tailwind, shadcn/ui, Socket.io client) |
| `@workspace/api-server` | `artifacts/api-server/` | Express 5 API + Socket.io real-time server |
| `@workspace/db` | `lib/db/` | Drizzle ORM + PostgreSQL (schema currently unused — all state is in-memory) |
| `@workspace/api-spec` | `lib/api-spec/` | OpenAPI spec + codegen |
| `@workspace/api-zod` | `lib/api-zod/` | Zod schemas generated from API spec |
| `@workspace/api-client-react` | `lib/api-client-react/` | React Query hooks generated from API spec |

## How to run

Both services start automatically via managed workflows:

- **Frontend** (`artifacts/alphex: web`) — `pnpm --filter @workspace/alphex run dev` → proxied at `/`
- **API Server** (`artifacts/api-server: API Server`) — `pnpm --filter @workspace/api-server run dev` → proxied at `/api`

## Games

### Tic-Tac-Toe (`id: "ttt"`)
- `artifacts/alphex/src/components/TicTacToeGame.tsx` — game logic (minimax AI)
- `artifacts/alphex/src/components/TicTacToeModal.tsx` — modal flow (splash → mode → difficulty → playing)
- Modes: vs AI (Easy/Normal/Hard), Pass & Play, Online Multiplayer

### Snakes & Ladders — Neon Edition (`id: "sl"`)
- `artifacts/alphex/src/components/SnakesAndLaddersModal.tsx` — full game (board, dice, AI, XP)
- Modes: vs AI (1–6 bots, Easy/Normal/Hard) and Pass & Play (2–6 players)
- 100-tile SVG board with 8 ladders and 7 snakes, neon cyberpunk aesthetic
- AI difficulty: Easy (bots roll unluckily), Normal (pure random), Hard (bots roll luckily)
- Tile-by-tile step animation, bounce-back from 100, bonus roll on 6
- XP integration identical to Tic-Tac-Toe; Web Audio API sound effects

## Adding new games

1. Add entry to `artifacts/alphex/src/lib/gameData.ts` with `isPlayable: true`
2. For two-button games (AI + Pass & Play), set `twoModes: true`
3. Create a `<GameName>Modal.tsx` component following `TicTacToeModal.tsx` patterns
4. Register it in `artifacts/alphex/src/components/GameCard.tsx`

## Key features

- Real-time multiplayer rooms via Socket.io
- Player profiles stored in browser localStorage (no server-side auth)
- Hidden server-side engagement timer for XP rewards
- Smart search engine with voice input on the Discover page
- XP progression system with rank tiers and badge unlocks

## Environment variables

- `SESSION_SECRET` — set (used for session security)
- `DATABASE_URL` / `PG*` — Replit built-in PostgreSQL (provisioned, currently unused)
- `PORT` — injected automatically per service by Replit

## User preferences

- Keep existing project structure and stack.
