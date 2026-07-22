# ALPHEX Gaming Hub

A neon-themed gaming hub where users can discover and play browser games. The first live game is **Tic-Tac-Toe** (AI vs human or Pass & Play). All other titles are "coming soon" placeholders.

## Run & Operate

- `pnpm --filter @workspace/alphex run dev` — run the React frontend (Vite, reads `PORT`)
- `pnpm --filter @workspace/api-server run dev` — run the Express 5 API server (reads `PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to Postgres (dev only)

### Required env vars
- `DATABASE_URL` — Postgres connection string (needed by `@workspace/db`; API server and frontend run without it if no DB routes are hit)
- `SESSION_SECRET` — already set as a Replit secret

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 18 + Vite, Tailwind CSS v4, shadcn/ui, Framer Motion, wouter (routing)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec`)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/alphex/` — React frontend
  - `src/lib/gameData.ts` — game catalogue (titles, categories, `isPlayable` flag)
  - `src/components/GameCard.tsx` — card with conditional Play/Inspect button
  - `src/components/TicTacToeModal.tsx` — splash → mode select → game overlay
  - `src/components/TicTacToeGame.tsx` — full game logic + scoreboard
  - `src/pages/DiscoverPage.tsx` — category filter + search grid
- `artifacts/api-server/` — Express API server
  - `src/routes/` — health, online player count, players, usernames
- `lib/db/` — Drizzle schema + pg pool
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/` — Zod schemas generated from spec
- `lib/api-client-react/` — React Query hooks generated from spec

## Architecture decisions

- Tic-Tac-Toe is fully client-side (no server round-trips) — minimax AI with 30% random moves to stay beatable for all ages.
- Games are registered in `gameData.ts` with `isPlayable: true`; `GameCard` conditionally renders the right modal.
- `DATABASE_URL` is only required when DB-backed routes are actually called; the API server starts without it.
- Pass & Play and Online Multiplayer slot is reserved in the mode-select UI for future expansion.

## Product

- **Discover page** — browse and filter games by category; search by title or tag
- **Tic-Tac-Toe** — play vs AI bot or pass & play with a friend; dark neon theme; live scoreboard (wins / draws / losses); responsive grid scales on mobile and desktop

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm install` from the workspace root before starting workflows; per-package `node_modules` are hoisted to the root.
- `TicTacToeGame.tsx` line ~292: use double quotes around the string containing the apostrophe in "Player 1's turn" — single quotes cause a parse error.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
