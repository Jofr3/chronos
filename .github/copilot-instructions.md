# Chronos - Copilot Instructions

## Project Overview

Chronos is a full-stack task management and calendar application built as a Bun monorepo, deployable to Cloudflare.

## Tech Stack

### Backend (`apps/backend`)
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Language**: TypeScript

### Frontend (`apps/frontend`)
- **Framework**: Qwik with QwikCity
- **Build Tool**: Vite
- **Deployment**: Cloudflare Pages
- **Calendar**: FullCalendar
- **Language**: TypeScript

### Shared (`packages/types`)
- Shared TypeScript types used by both frontend and backend
- Import as `@chronos/types`

## Architecture

```
chronos/
├── apps/
│   ├── backend/          # @chronos/backend - Hono API
│   │   ├── src/
│   │   │   ├── db/       # Drizzle schema and queries
│   │   │   ├── routes/   # API route handlers
│   │   │   ├── services/ # Business logic
│   │   │   └── types/    # Backend-specific types
│   │   └── migrations/   # D1 SQL migrations
│   └── frontend/         # @chronos/frontend - Qwik app
│       └── src/
│           ├── routes/   # File-based routing (QwikCity)
│           ├── components/
│           └── services/ # API client services
└── packages/
    └── types/            # @chronos/types - Shared types
```

## Code Conventions

### TypeScript
- Use strict TypeScript with proper type annotations
- Export types from `@chronos/types` for shared interfaces
- Use `type` imports when importing only types

### Backend (Hono)
- Routes are organized by resource in `src/routes/`
- Business logic goes in `src/services/`
- Database queries are in `src/db/queries/`
- Use Drizzle ORM for all database operations
- Environment bindings are typed in `src/types/env.ts`

```typescript
// Route handler example
import { Hono } from "hono";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  // ...
});
```

### Frontend (Qwik)
- Use file-based routing in `src/routes/`
- Components use `component$()` from Qwik
- Server-side code uses `routeLoader$()` and `routeAction$()`
- Use `$()` for lazy-loaded functions
- Layouts are in `layout.tsx` files

```typescript
// Component example
import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return <div>Hello</div>;
});
```

### Database Schema (Drizzle)
- Schema is defined in `apps/backend/src/db/schema.ts`
- Use `sqliteTable` for table definitions
- Always include `created_at` and `updated_at` timestamps
- Use text IDs (UUIDs) for new tables, except users (integer)

### API Design
- RESTful endpoints under `/api/`
- Routes: `/api/users`, `/api/auth`, `/api/tasks`, `/api/ai`
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return JSON responses with consistent structure

## Environment Variables

### Backend (wrangler.toml)
- `JWT_SECRET`: Secret for JWT token signing
- `DB`: D1 database binding
- `AI`: Workers AI binding

### Frontend (.env files)
- `.env.development`, `.env.preview`, `.env.production`
- `VITE_API_URL`: Backend API base URL

## Commands

```bash
# Install dependencies
bun install

# Development
bun dev                              # Run all workspaces
bun --filter @chronos/backend dev    # Backend only
bun --filter @chronos/frontend dev   # Frontend only

# Build
bun build                            # Build all
bun --filter @chronos/backend build  # Build backend
bun --filter @chronos/frontend build # Build frontend

# Database
cd apps/backend
bun drizzle                          # Open Drizzle Studio
bun migrate:dev                      # Run migrations (development)
```

## Project Wiki

The project wiki is located at `wiki/` and contains:
- Detailed codebase explanations
- Design principles and architectural decisions
- TODOs and task tracking
- Feature specifications
- **Changelog** (`wiki/changelog/`) - Detailed record of all codebase changes
- **Codebase docs** (`wiki/codebase/`) - In-depth code documentation

Always refer to the wiki for in-depth documentation and keep it updated when making significant changes.

**Important**: When making changes to the codebase, always create or update a changelog entry in `wiki/changelog/` with the format `short_description_YYYY-MM-DD.md` (e.g., `added_button_to_home_page_2025-01-01.md`) documenting what was changed.

### Custom Commands

- `/update-codebase-docs` - Scan the codebase and update wiki documentation

## Important Notes

1. **Cloudflare Workers Environment**: The backend runs on Workers, so use Web APIs (no Node.js APIs like `fs`, `path`, etc.)
2. **D1 Database**: SQLite-compatible, but runs on Cloudflare's edge
3. **Qwik Resumability**: Qwik components are resumable - avoid heavy client-side initialization
4. **Workspace Dependencies**: Use `workspace:*` for internal package references
5. **Type Safety**: Always use `@chronos/types` for shared types between frontend and backend
6. **Wiki as Context**: For in-depth understanding of the project architecture and codebase, inspect the `wiki/codebase/` documentation which contains detailed explanations of all modules, routes, services, and patterns used
