# Chronos

A modern full-stack monorepo using [Bun workspaces](https://bun.sh/docs/install/workspaces) with a Qwik frontend and Hono backend, deployable to Cloudflare.

## Project Structure

```
chronos-ws/
├── apps/
│   ├── backend/          # @chronos/backend - Hono API server
│   │   ├── src/
│   │   │   └── index.ts  # Main app entry point
│   │   └── wrangler.toml # Cloudflare Workers config
│   └── frontend/         # @chronos/frontend - Qwik application
│       ├── src/
│       │   ├── routes/   # File-based routing
│       │   └── components/
│       ├── public/       # Static assets
│       └── adapters/     # Cloudflare Pages adapter
├── packages/
│   └── types/            # @chronos/types - Shared TypeScript types
│       └── src/
│           └── index.ts  # Type definitions
├── package.json          # Root workspace configuration
└── tsconfig.json         # Base TypeScript config
```

## Quick Start

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd chronos

# Install dependencies
bun install
```

### Development

```bash
# Run all workspaces (backend + frontend)
bun dev

# Run backend only (http://localhost:3000)
bun dev:backend

# Run frontend only
bun dev:frontend

# Alternative: use filter syntax
bun --filter @chronos/backend dev
bun --filter @chronos/frontend dev
```

The backend API will be available at `http://localhost:3000` and the frontend at the port shown by Vite (usually `http://localhost:5173`).

## Building for Production

```bash
# Build all workspaces
bun build

# Build specific workspace
bun --filter @chronos/backend build
bun --filter @chronos/frontend build
```

Build outputs:
- **Backend**: `apps/backend/dist/index.js`
- **Frontend**: `apps/frontend/dist/`

## Deployment

### Backend (Cloudflare Workers)

```bash
cd apps/backend
bun deploy
```

### Frontend (Cloudflare Pages)

```bash
cd apps/frontend
bun deploy
```

Or connect your Git repository to Cloudflare Pages with these build settings:
- **Build command**: `bun install && bun build`
- **Build output directory**: `dist`
- **Root directory**: `apps/frontend`

## Development Guides

### Adding Dependencies

```bash
# Add to backend
bun add --filter @chronos/backend <package-name>

# Add to frontend
bun add --filter @chronos/frontend <package-name>

# Add shared dev dependency (at root)
bun add -d <package-name>
```

### Using Shared Types

All shared TypeScript types are in the `@chronos/types` package:

```typescript
// In any workspace
import type { User, ApiResponse, ApiError } from "@chronos/types";

// Example usage in backend
app.get("/api/users", (c): ApiResponse<User[]> => {
  return c.json({
    success: true,
    data: [{ id: "1", email: "user@example.com", name: "John" }]
  });
});

// Example usage in frontend
const response = await fetch("/api/users");
const data: ApiResponse<User[]> = await response.json();
```

## Workspaces

### @chronos/backend

Hono API server running on Bun runtime.

- **Framework**: [Hono](https://hono.dev/) 4.x
- **Runtime**: Bun (dev) / Cloudflare Workers (production)
- **Dev server**: `http://localhost:3000`
- **Hot reload**: Enabled via `bun run --hot`

### @chronos/frontend

Qwik application with file-based routing.

- **Framework**: [Qwik](https://qwik.dev/) 1.x
- **Routing**: [QwikCity](https://qwik.dev/qwikcity/overview/)
- **Dev server**: Vite with SSR
- **Adapter**: Cloudflare Pages

### @chronos/types

Shared TypeScript definitions.

- **Purpose**: Type definitions shared between backend and frontend
- **Current types**: `User`, `ApiResponse<T>`, `ApiError`
- **Import via**: `import type { ... } from "@chronos/types"`

## Tech Stack

- **Package Manager**: [Bun](https://bun.sh)
- **Frontend Framework**: [Qwik](https://qwik.dev/)
- **Backend Framework**: [Hono](https://hono.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) + [Workers](https://workers.cloudflare.com/)
- **Code Quality**: ESLint, Prettier
