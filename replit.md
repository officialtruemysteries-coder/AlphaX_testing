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

- **Frontend** (`artifacts/alphex: web`) — `pnpm --filter @workspace/alphex run dev` → port 19883, proxied at `/`
- **API Server** (`artifacts/api-server: API Server`) — `pnpm --filter @workspace/api-server run dev` → port 8080, proxied at `/api`

## Key features

- Real-time multiplayer rooms via Socket.io
- Player profiles stored in browser localStorage (no server-side auth)
- Hidden server-side engagement timer for XP rewards
- Username claiming with conflict detection (in-memory)
- Online player count tracking

## Environment variables

- `SESSION_SECRET` — set (used for session security)
- `DATABASE_URL` / `PG*` — Replit built-in PostgreSQL (provisioned, currently unused)
- `PORT` — injected automatically per service by Replit

## User preferences

- Keep existing project structure and stack.
