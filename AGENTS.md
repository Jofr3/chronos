# Chronos Monorepo - Agent Instructions

Bun workspaces monorepo with Qwik frontend and Hono backend.

## Project Overview

Chronos is a full-stack application built with:
- **Frontend**: Qwik (resumable web framework) with Cloudflare Pages adapter
- **Backend**: Hono (lightweight web framework) running on Bun
- **Package Manager**: Bun for fast dependency management and workspaces
- **Deployment**: Cloudflare Pages (frontend) and Cloudflare Workers (backend via wrangler)

## Commands

### Development
- `bun install` - Install all dependencies across workspaces
- `bun dev` - Run all workspaces in dev mode (parallel)
- `bun dev:backend` - Run backend only (http://localhost:3000)
- `bun dev:frontend` - Run frontend only (Vite dev server with SSR)
- `bun --filter @chronos/backend dev` - Alternative filter syntax for backend
- `bun --filter @chronos/frontend dev` - Alternative filter syntax for frontend

### Building
- `bun build` - Build all workspaces
- `bun --filter @chronos/backend build` - Build backend to dist/index.js
- `bun --filter @chronos/frontend build` - Build frontend for production (Cloudflare Pages)

### Linting & Formatting
- `bun --filter @chronos/frontend lint` - Lint frontend (ESLint + TypeScript)
- `bun --filter @chronos/frontend fmt` - Format frontend with Prettier
- `bun --filter @chronos/frontend fmt.check` - Check formatting

### Deployment
- `bun --filter @chronos/backend deploy` - Deploy backend using wrangler
- `bun --filter @chronos/frontend deploy` - Deploy frontend using wrangler pages
- `bun --filter @chronos/frontend serve` - Preview production build with wrangler

### Other
- `bun add --filter @chronos/backend <package>` - Add dependency to backend
- `bun add --filter @chronos/frontend <package>` - Add dependency to frontend
- `bun add -d <package>` - Add dev dependency at root level

## Code Style

### TypeScript
- **Strict mode**: Enabled across all workspaces
- **Explicit types**: Always type function parameters and return values
- **Type imports**: Use `import type { X } from "y"` for type-only imports
- **No any**: Avoid `any`, use `unknown` if type is truly unknown

### Formatting
- **Indent**: 2 spaces (no tabs)
- **Quotes**: Double quotes for strings
- **Semicolons**: Not required but consistent across project
- **Trailing commas**: Use in multiline arrays/objects for cleaner diffs
- **Line length**: 100 characters (soft limit)

### Naming Conventions
- **Variables/Functions**: camelCase (e.g., `getUserData`, `isAuthenticated`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `ApiResponse`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRIES`)
- **Files**: kebab-case for files (e.g., `user-service.ts`), PascalCase for components (e.g., `Button.tsx`)

### JSX Configuration
- **Frontend**: Uses `@builder.io/qwik` as jsxImportSource (configured in tsconfig.json)
- **Backend**: Uses `hono/jsx` as jsxImportSource if JSX is needed for templates
- **Components**: Qwik components use `component$` and `$` suffix for optimized functions

### Shared Types
- Import from `@chronos/types` package using workspace protocol
- Example: `import type { User, ApiResponse } from "@chronos/types"`
- All shared types live in `packages/types/src/index.ts`
- Always use explicit exports (no `export *`)

## Project Structure

```
chronos-ws/
├── apps/
│   ├── backend/              # @chronos/backend
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── queries/  # Database query layer (data access)
│   │   │   ├── services/     # Business logic layer
│   │   │   ├── routes/       # HTTP route handlers
│   │   │   ├── types/        # Backend-specific types (env bindings)
│   │   │   └── index.ts      # Hono app entry point
│   │   ├── migrations/       # D1 database migrations
│   │   ├── package.json      # Backend dependencies
│   │   ├── tsconfig.json     # Backend TS config
│   │   └── wrangler.toml     # Cloudflare Workers config
│   └── frontend/             # @chronos/frontend
│       ├── src/
│       │   ├── routes/       # File-based routing (QwikCity)
│       │   ├── components/   # Reusable components
│       │   └── entry.*.tsx   # Entry points (dev, SSR, preview, Cloudflare Pages)
│       ├── public/           # Static assets
│       ├── adapters/         # Platform adapters (Cloudflare Pages)
│       ├── package.json      # Frontend dependencies
│       ├── tsconfig.json     # Frontend TS config
│       └── vite.config.ts    # Vite configuration
├── packages/
│   └── types/                # @chronos/types
│       ├── src/
│       │   ├── index.ts      # Barrel exports
│       │   ├── user.ts       # User domain types
│       │   ├── api.ts        # API response types
│       │   └── database.ts   # D1 database types
│       ├── package.json      # Types package config
│       └── tsconfig.json     # Types TS config
├── package.json              # Root workspace config
├── tsconfig.json             # Base TS config (extended by all workspaces)
├── AGENTS.md                 # This file (agent instructions)
└── README.md                 # User-facing documentation
```

## Workspace Details

### Backend (@chronos/backend)
- **Framework**: Hono 4.x (fast, lightweight web framework)
- **Runtime**: Bun (Node.js compatible, but optimized for Bun)
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Port**: 3000 (in dev mode)
- **Entry**: `src/index.ts` exports a Hono app instance
- **Hot reload**: Enabled via `bun run --hot`
- **Build output**: `dist/index.js` (single file)
- **Architecture**: Three-layer architecture (queries → services → routes)
  - **Queries** (`src/db/queries/`): Pure database operations, SQL queries
  - **Services** (`src/services/`): Business logic, validation, orchestration
  - **Routes** (`src/routes/`): HTTP handlers, request/response formatting

### Frontend (@chronos/frontend)
- **Framework**: Qwik 1.x (resumable, no hydration)
- **Routing**: QwikCity (file-based, SSR by default)
- **Dev server**: Vite with SSR mode
- **Adapter**: Cloudflare Pages (supports edge SSR)
- **Components**: Use `component$` API for optimal lazy loading
- **State management**: Signals (`useSignal`, `useStore`)

### Types (@chronos/types)
- **Purpose**: Shared TypeScript interfaces and types
- **Structure**: Organized by domain (user, api, database)
- **Current types**: `User`, `ApiResponse`, `ApiError`, `D1Database`, `D1Result`
- **Usage**: Imported in both backend and frontend
- **Versioning**: Uses `workspace:*` protocol for local development
- **Import styles**: 
  - Barrel: `import type { User } from "@chronos/types"`
  - Direct: `import type { User } from "@chronos/types/user"`

## Architecture Guidelines

### API Design (Backend)
- Use RESTful conventions where appropriate
- Return consistent response format using `ApiResponse<T>`
- Use proper HTTP status codes (200, 201, 400, 404, 500, etc.)
- Handle errors with `ApiError` format
- Keep routes organized (use route groups if app grows)
- **Three-layer architecture**:
  1. **Queries layer**: Database operations only, no validation
  2. **Services layer**: Business logic, validation, orchestration
  3. **Routes layer**: HTTP handling, response formatting
- **Database naming**: DB uses snake_case, TypeScript uses camelCase (map in queries)
- **Prepared statements**: Always use `.bind()` to prevent SQL injection
- **Type safety**: Type all DB query results, map to shared types from `@chronos/types`

### Component Design (Frontend)
- Keep components small and focused (single responsibility)
- Use `useSignal` for local state, `useStore` for nested/complex state
- Use `component$` for all components
- Use `$` suffix for functions that need serialization (event handlers, effects)
- Leverage Qwik's resumability - avoid unnecessary `useEffect` equivalents

### State Management
- **Local state**: `useSignal` or `useStore` within components
- **Shared state**: Context API (`createContextId`, `useContext`, `useContextProvider`)
- **Server state**: Use `routeLoader$` and `routeAction$` for data fetching

### Type Safety
- All API responses should be typed with `ApiResponse<T>`
- Frontend should use types from `@chronos/types` for API contracts
- Use `satisfies` operator when possible to maintain type inference
- Avoid casting unless absolutely necessary

## Best Practices

### Performance
- Backend: Use Hono's built-in performance optimizations (context reuse, etc.)
- Frontend: Leverage Qwik's lazy loading - don't import everything upfront
- Minimize bundle size by code splitting at route level
- Use `noSerialize` for large objects that shouldn't serialize to client

### Security
- Validate all inputs on backend
- Sanitize data before rendering in frontend
- Use environment variables for secrets (never commit secrets)
- Follow OWASP guidelines for API security

### Testing
- Unit tests: Use Bun's built-in test runner (`bun test`)
- Integration tests: Test API endpoints with actual requests
- Frontend tests: Use Qwik's testing utilities (to be added)

### Error Handling
- Backend: Use try-catch and return proper error responses
- Frontend: Handle loading states, error states, and empty states
- Log errors appropriately (consider structured logging in production)

## Common Tasks

### Adding a New API Endpoint
1. Open `apps/backend/src/index.ts`
2. Add route handler: `app.get('/api/users', (c) => { ... })`
3. Define response type in `packages/types/src/index.ts` if needed
4. Test endpoint: `curl http://localhost:3000/api/users`

### Adding a New Frontend Route
1. Create file in `apps/frontend/src/routes/` (e.g., `about/index.tsx`)
2. Export a `component$` as default
3. Use `routeLoader$` if data fetching is needed
4. Navigate to route: `/about`

### Adding a Shared Type
1. Open `packages/types/src/index.ts`
2. Add interface/type export: `export interface NewType { ... }`
3. Import in backend/frontend: `import type { NewType } from "@chronos/types"`

## Troubleshooting

### Workspace dependency not found
- Run `bun install` at root to link workspace packages
- Check `package.json` has correct `workspace:*` dependency

### TypeScript errors in IDE
- Ensure IDE is using workspace TypeScript version
- Run `bun install` to generate proper type declarations
- Restart TypeScript server in IDE

### Build errors
- Check `tsconfig.json` extends from root config
- Ensure all imports are resolvable
- Run `bun --filter <workspace> build` to isolate issue

### Port already in use
- Backend default port: 3000 (change in `src/index.ts` if needed)
- Frontend dev server: Usually auto-assigns (check Vite output)

## Notes for AI Agents

- **Read before writing**: Always read existing files before making changes
- **Type safety first**: Add types to `@chronos/types` before implementing features
- **Test locally**: Suggest running dev server after changes
- **Follow conventions**: Match existing code style and patterns
- **Workspace awareness**: Use filter commands for workspace-specific operations
- **Deployment ready**: Backend uses wrangler, frontend deploys to Cloudflare Pages
