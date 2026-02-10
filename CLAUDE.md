# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chronos is a full-stack task management and calendar application built as a Bun monorepo with Qwik frontend, Hono backend, and Cloudflare deployment.

## Tech Stack

- **Package Manager**: Bun (workspace mode)
- **Frontend**: Qwik 1.x with QwikCity (file-based routing), Vite, FullCalendar
- **Backend**: Hono 4.x on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Deployment**: Cloudflare Pages (frontend) + Workers (backend)
- **Language**: TypeScript 5
- **Styling**: Custom CSS with design tokens (no Tailwind/Bootstrap)
- **Nix**: Optional reproducible dev environment via `flake.nix` (provides bun, cacert, dotenv-cli)

## Development Commands

```bash
bun install                                         # Install dependencies
bun dev                                             # Run all workspaces
bun --filter @chronos/backend dev                   # Backend on http://localhost:8787
bun --filter @chronos/frontend dev                  # Frontend on http://localhost:5173
bun build                                           # Build all workspaces

# Backend database
cd apps/backend
bun drizzle                                         # Open Drizzle Studio (localhost:4983)
bun migrate:dev --file=migrations/XXXX_name.sql     # Run migration on dev DB
bun migrate:pre --file=migrations/XXXX_name.sql     # Run migration on preview DB
bun migrate:prod --file=migrations/XXXX_name.sql    # Run migration on production DB

# Frontend
cd apps/frontend
bun lint                                            # Lint frontend code
```

## Architecture

### Monorepo Structure

```
chronos/
├── apps/
│   ├── backend/          # @chronos/backend - Hono API on Cloudflare Workers
│   │   ├── src/
│   │   │   ├── db/       # Drizzle schema (schema.ts) and query helpers (queries/)
│   │   │   ├── middleware/  # Auth middleware (JWT verification)
│   │   │   ├── routes/   # API route handlers (auth, users, tasks, events, ai, constraints)
│   │   │   ├── services/ # Business logic layer
│   │   │   ├── utils/    # JWT utils, response helpers
│   │   │   └── types/    # Backend-specific types (env.ts)
│   │   └── migrations/   # SQL migration files
│   └── frontend/         # @chronos/frontend - Qwik app on Cloudflare Pages
│       └── src/
│           ├── routes/   # File-based routing (QwikCity)
│           │   ├── (app)/      # Protected routes (tasks, calendars, settings)
│           │   ├── admin/      # Admin-only routes
│           │   ├── api/[...path]/ # API proxy for production same-origin requests
│           │   ├── login/ signup/ logout/
│           ├── components/
│           ├── services/ # API client singletons (auth, task, event, constraint, user)
│           ├── styles/   # CSS files with custom properties (dark theme)
│           └── config/   # Environment config (env.ts)
└── packages/
    └── types/            # @chronos/types - Shared TypeScript types
```

### Backend Request Flow

1. `src/index.ts`: Hono app with CORS middleware, routes mounted under `/api/*`
2. Protected routes apply `authMiddleware` which extracts userId from JWT Bearer token
3. Route handlers create service instances with `DrizzleClient`, delegate to services
4. Services contain business logic, return data
5. Routes use standardized response helpers (`successResponse`, `errorResponse`, etc.)

**Routes**: auth, users, tasks, events, ai, constraints — all under `/api/`

### Authentication

- Custom JWT implementation using **Web Crypto API** (no Node.js crypto) in `src/utils/jwt.ts`
- HMAC-SHA256 signatures, 7-day expiration
- Password hashing via PBKDF2 (100k iterations, SHA-256, 16-byte salt)
- Auth middleware (`src/middleware/auth.ts`) sets `userId` on context: `c.set("userId", userId)` / `getAuthUserId(c)`
- Frontend stores token in cookie (`chronos_auth_token`) for SSR auth checks

### Frontend Architecture

- **Protected routes**: `(app)/layout.tsx` uses `routeLoader$` to verify token via `/api/auth/me` call, redirects to `/login` if invalid
- **Server actions**: Form submissions use `routeAction$()` with `zod$()` validation
- **State management**: Qwik Signals (`useSignal`, `useStore`), not React-style useState
- **API clients**: Singleton service classes in `src/services/` with internal `request()` helper that auto-attaches Bearer token from localStorage
- **SSR/Browser URL handling**: `getApiBaseUrl()` in `src/config/env.ts` returns localhost in dev, full backend URL on server-side in prod, empty string in browser (uses same-origin API proxy)

### Database Schema

Tables: `users`, `task_lists`, `tasks`, `events`, `time_constraints`

Key patterns:
- **Soft deletes**: `tasks` and `time_constraints` use `deleted_at` field — always filter with `isNull(table.deleted_at)`
- **UUIDs**: Text IDs for all tables except `users` (integer auto-increment)
- **Recurring items**: `is_recurring` boolean + `recurring_days` as JSON string `"[0,1,2,3,4,5,6]"` (0=Sunday, 6=Saturday). Parse with helper functions
- **Time format**: `HH:MM` 24-hour strings for `start_time`/`end_time`
- **Date format**: ISO `YYYY-MM-DD` strings
- All tables have `created_at` and `updated_at` timestamps
- Foreign keys cascade on delete

### Standardized API Responses

Backend uses `src/utils/responses.ts` for consistent responses:
- `successResponse(c, data, message?, status?)` — wraps in `ApiResponse<T>`
- `errorResponse(c, code, message, status?)` — uses `ErrorCodes` enum (UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND, etc.)
- `handleError(c, error, context)` — catches unknown errors with logging

### CSS Architecture

Dark theme with CSS custom properties in `frontend/src/global.css`:
- `--bg-primary: #0f0f0f`, `--bg-secondary: #1a1a1a`
- `--accent-primary: #ff4444` (red), `--accent-secondary: #ff8833` (orange)
- `--accent-gradient: linear-gradient(135deg, #ff4444 0%, #ff8833 100%)`
- Component-specific CSS in `styles/dashboard/` (tasks.css, calendar.css, modals.css, settings.css)

## Database Workflow

1. Update schema in `apps/backend/src/db/schema.ts`
2. Create migration file in `apps/backend/migrations/` with naming: `XXXX_description.sql`
3. Run migration: `cd apps/backend && bun migrate:dev --file=migrations/XXXX_name.sql`

Drizzle config points to local D1 SQLite at `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*/db.sqlite`.

## Cloudflare-Specific Constraints

**CRITICAL**: The backend runs on Cloudflare Workers — Web APIs only.

- **No Node.js APIs**: Cannot use `fs`, `path`, `process`, `crypto` (Node), `bcrypt`
- **Use Web APIs**: `fetch()`, `URL`, `crypto.subtle` (Web Crypto), `Headers`, `Response`
- **Environment bindings**: Access via `c.env.DB`, `c.env.AI`, `c.env.JWT_SECRET` in Hono context

Environment bindings (wrangler.toml):
- `DB`: D1 database binding
- `AI`: Workers AI binding (`@cf/qwen/qwq-32b` for scheduling, `@cf/meta/llama-3.1-8b-instruct` for chat)
- `JWT_SECRET`: Secret for JWT signing (set per environment)

Three environments: `development` (local D1), `preview`, `production`

## Shared Types

Import from `@chronos/types`:
```typescript
import type { User, Task, Event, TimeConstraint, ApiResponse, ApiError } from "@chronos/types";
```

Database types exported from schema: `apps/backend/src/db/schema.ts`

Internal packages use `workspace:*` protocol in package.json dependencies.

## Code Conventions

- Use `type` imports for type-only imports
- Backend routes: `new Hono<{ Bindings: Env; Variables: { userId: string } }>()`
- Backend services: Constructor accepts `DrizzleClient`, methods take `userId` for ownership scoping
- Frontend components: `component$()` with `$()` for lazy-loaded callbacks
- Frontend data loading: `routeLoader$()` for server-side, `useVisibleTask$()` for client-side effects
- Avoid N+1 queries: Use `Promise.all()` for parallel data fetching in services
- `sqliteTable` for Drizzle table definitions; always include timestamps; add indexes on foreign keys

## Project Wiki

The `wiki/` directory contains:
- **changelog/**: Record of all codebase changes (format: `short_description_YYYY-MM-DD.md`)
- **codebase/**: Consolidated docs (backend.md, frontend.md, shared-types.md, infrastructure.md)

**IMPORTANT**: When making significant changes to the codebase, create a changelog entry in `wiki/changelog/` with format: `short_description_YYYY-MM-DD.md`
