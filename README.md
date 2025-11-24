# chronos

A monorepo using [Bun workspaces](https://bun.sh/docs/install/workspaces) with a Qwik frontend and Hono backend.

## Structure

```
chronos/
├── apps/
│   ├── backend/   # @chronos/backend - Hono API server
│   └── frontend/  # @chronos/frontend - Qwik application
├── packages/
│   └── types/     # @chronos/types - Shared TypeScript types
├── package.json   # Root workspace configuration
└── tsconfig.json  # Shared TypeScript config
```

## Setup

```bash
bun install
```

## Development

```bash
# Run all workspaces
bun dev

# Run specific workspace
bun dev:backend
bun dev:frontend

# Or use filter
bun --filter @chronos/backend dev
bun --filter @chronos/frontend dev
```

## Build

```bash
bun build
```

## Adding Dependencies

```bash
# Add to specific workspace
bun add --filter @chronos/backend hono
bun add --filter @chronos/frontend @builder.io/qwik

# Add shared dev dependency at root
bun add -d typescript
```

## Shared Packages

### @chronos/types

Shared TypeScript types used across apps. Import in any workspace:

```typescript
import type { User, ApiResponse } from "@chronos/types";
```
