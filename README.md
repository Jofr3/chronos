# Chronos

A modern full-stack monorepo using [Bun workspaces](https://bun.sh/docs/install/workspaces) with a Qwik frontend and Hono backend, deployable to Cloudflare.

## Features

- **Fast Development**: Bun for lightning-fast package management and runtime
- **Resumable Frontend**: Qwik framework with zero hydration overhead
- **Lightweight Backend**: Hono framework for minimal API server
- **Type Safety**: Shared TypeScript types across all workspaces
- **Edge Deployment**: Cloudflare Pages (frontend) and Workers (backend)
- **Modern Tooling**: Vite, ESLint, Prettier, and TypeScript 5

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

### Prerequisites

- [Bun](https://bun.sh) 1.0 or later
- Node.js 18+ (required by some frontend dependencies)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd chronos-ws

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

Configure your Worker in `wrangler.toml`. See [Cloudflare Workers docs](https://developers.cloudflare.com/workers/) for setup.

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

### Creating New Routes

**Backend (Hono):**

```typescript
// apps/backend/src/index.ts
app.get("/api/hello", (c) => {
  return c.json({ message: "Hello World" });
});
```

**Frontend (Qwik):**

```typescript
// apps/frontend/src/routes/hello/index.tsx
import { component$ } from "@builder.io/qwik";

export default component$(() => {
  return <div>Hello World</div>;
});
```

### Linting and Formatting

```bash
# Lint frontend
bun --filter @chronos/frontend lint

# Format frontend with Prettier
bun --filter @chronos/frontend fmt

# Check formatting
bun --filter @chronos/frontend fmt.check
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

## Scripts Reference

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun dev` | Run all workspaces in dev mode |
| `bun dev:backend` | Run backend only |
| `bun dev:frontend` | Run frontend only |
| `bun build` | Build all workspaces |
| `bun --filter <workspace> <script>` | Run script in specific workspace |

## Tech Stack

- **Package Manager**: [Bun](https://bun.sh)
- **Frontend Framework**: [Qwik](https://qwik.dev/)
- **Backend Framework**: [Hono](https://hono.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) + [Workers](https://workers.cloudflare.com/)
- **Code Quality**: ESLint, Prettier

## Troubleshooting

### Workspace dependencies not found

```bash
bun install  # Re-link workspace packages
```

### TypeScript errors

Ensure your IDE is using the workspace TypeScript version and restart the TypeScript server.

### Port already in use

The backend runs on port 3000 by default. You can change this in `apps/backend/src/index.ts` or kill the process using the port.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Your License Here]

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Qwik Documentation](https://qwik.dev/)
- [Qwik City Routing](https://qwik.dev/qwikcity/routing/overview/)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
