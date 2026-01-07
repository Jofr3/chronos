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

## Development Commands

```bash
# Install dependencies
bun install

# Development (runs all workspaces)
bun dev

# Run specific workspace
bun --filter @chronos/backend dev      # Backend on http://localhost:3000
bun --filter @chronos/frontend dev     # Frontend on http://localhost:5173

# Build
bun build                               # Build all workspaces
bun --filter @chronos/backend build
bun --filter @chronos/frontend build

# Backend-specific commands
cd apps/backend
bun drizzle                             # Open Drizzle Studio (database GUI)
bun migrate:dev                         # Run migrations on development DB
bun migrate:pre                         # Run migrations on preview DB
bun migrate:prod                        # Run migrations on production DB

# Frontend-specific commands
cd apps/frontend
bun lint                                # Lint frontend code
```

## Architecture

### Monorepo Structure

```
chronos/
├── apps/
│   ├── backend/          # @chronos/backend - Hono API
│   │   ├── src/
│   │   │   ├── db/       # Drizzle schema and queries
│   │   │   ├── routes/   # API route handlers (auth, users, tasks, events, ai)
│   │   │   ├── services/ # Business logic layer
│   │   │   └── types/    # Backend-specific types (env.ts)
│   │   └── migrations/   # SQL migration files
│   └── frontend/         # @chronos/frontend - Qwik app
│       └── src/
│           ├── routes/   # File-based routing (QwikCity)
│           │   ├── (app)/      # Protected app routes (tasks, calendars)
│           │   ├── admin/      # Admin-only routes
│           │   ├── login/
│           │   ├── signup/
│           │   └── logout/
│           ├── components/
│           └── services/ # API client services
└── packages/
    └── types/            # @chronos/types - Shared types
```

### Backend Architecture

- **Routes** (`src/routes/*.ts`): HTTP route handlers organized by resource (auth, users, tasks, events, ai)
- **Services** (`src/services/*.ts`): Business logic layer (auth.service.ts, user.service.ts, task.service.ts)
- **Database** (`src/db/`): Drizzle schema and query functions
- **Entry Point** (`src/index.ts`): Hono app initialization with CORS middleware and route mounting

All routes are mounted under `/api/*` prefix.

### Frontend Architecture

- **File-based routing**: QwikCity uses filesystem structure in `src/routes/`
- **Layout files**: `layout.tsx` files define shared layouts for route groups
- **Route groups**: `(app)/` contains protected application routes
- **Server functions**: Use `routeLoader$()` and `routeAction$()` for server-side data fetching
- **Components**: Use `component$()` and `$()` for lazy loading

### Database Schema

Tables: `users`, `task_lists`, `tasks`, `events`

- **users**: id (integer), email, username, first_name, last_name, password_hash, role (user|developer)
- **task_lists**: id (text/UUID), user_id, name
- **tasks**: id (text/UUID), list_id, title, completed, due_date, is_recurring, recurring_days
- **events**: id (text/UUID), user_id, task_id (nullable), title, date, start_time, end_time

All tables have `created_at` and `updated_at` timestamps. Foreign keys cascade on delete.

## Database Workflow

### Creating Migrations

1. Update schema in `apps/backend/src/db/schema.ts`
2. Create migration file in `apps/backend/migrations/` with naming: `XXXX_description.sql`
3. Run migration: `cd apps/backend && bun migrate:dev`

### Working with Drizzle

```bash
cd apps/backend
bun drizzle  # Opens Drizzle Studio on localhost:4983
```

Drizzle config is in `apps/backend/drizzle.config.ts` pointing to local D1 SQLite file.

## Shared Types

Import shared types from `@chronos/types`:

```typescript
import type { User, ApiResponse, ApiError } from "@chronos/types";
```

Database types are exported from schema: `apps/backend/src/db/schema.ts`

## Cloudflare-Specific Constraints

**CRITICAL**: The backend runs on Cloudflare Workers, which uses Web APIs only.

- **No Node.js APIs**: Cannot use `fs`, `path`, `process`, or any Node.js built-ins
- **Use Web APIs**: `fetch()`, `URL`, `crypto`, etc.
- **Environment bindings**: Access via `c.env.DB`, `c.env.AI`, `c.env.JWT_SECRET` in Hono context

### Environment Bindings (wrangler.toml)

- `DB`: D1 database binding
- `AI`: Workers AI binding for AI features
- `JWT_SECRET`: Secret for JWT token signing (set per environment)

Three environments: `development`, `preview`, `production`

## Project Wiki

The `chronos.wiki/` directory contains:
- **changelog/**: Detailed record of all codebase changes (format: `short_description_YYYY-MM-DD.md`)
- **codebase/**: Consolidated documentation files
  - `backend.md` - Backend architecture, routes, services, database
  - `frontend.md` - Frontend architecture, routes, components, Qwik patterns
  - `shared-types.md` - Shared TypeScript types from `@chronos/types`
  - `infrastructure.md` - Deployment, environments, Cloudflare configuration

**IMPORTANT**: When making significant changes to the codebase, create a changelog entry in `chronos.wiki/changelog/` with format: `short_description_YYYY-MM-DD.md`

## Code Conventions

### TypeScript

- Use strict TypeScript with proper type annotations
- Use `type` imports for type-only imports
- Export shared types from `@chronos/types`

### Backend (Hono)

```typescript
import { Hono } from "hono";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  // Access bindings via c.env
});
```

### Frontend (Qwik)

```typescript
import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

// Server-side data loading
export const useData = routeLoader$(async () => {
  return { data: [] };
});

// Component
export default component$(() => {
  const data = useData();
  return <div>{data.value.data}</div>;
});
```

### Database (Drizzle)

- Use `sqliteTable` for table definitions
- Always include `created_at` and `updated_at` timestamps
- Use text IDs (UUIDs) for new tables (except users which uses integer)
- Add indexes on foreign keys and frequently queried columns

## Workspace Dependencies

Internal packages use `workspace:*` protocol:

```json
{
  "dependencies": {
    "@chronos/types": "workspace:*"
  }
}
```
