# Chronos Monorepo

Bun workspaces monorepo with Qwik frontend and Hono backend.

## Commands
- `bun install` - Install all dependencies
- `bun dev` - Run all workspaces in dev mode
- `bun dev:backend` / `bun dev:frontend` - Run specific workspace
- `bun --filter @chronos/backend dev` - Filter syntax for any workspace
- `bun --filter @chronos/frontend lint` - Lint frontend (ESLint + TypeScript)
- `bun --filter @chronos/frontend build` - Build frontend

## Code Style
- **TypeScript**: Strict mode enabled, use explicit types for function params/returns
- **Imports**: Use `type` keyword for type-only imports (`import type { X } from "y"`)
- **Formatting**: 2-space indent, double quotes, trailing commas in multiline
- **Naming**: camelCase for variables/functions, PascalCase for types/components
- **Frontend JSX**: Uses `@builder.io/qwik` as jsxImportSource
- **Backend JSX**: Uses `hono/jsx` as jsxImportSource
- **Shared types**: Import from `@chronos/types` package

## Structure
- `apps/backend` - Hono API server (@chronos/backend)
- `apps/frontend` - Qwik application (@chronos/frontend)
- `packages/types` - Shared TypeScript types (@chronos/types)
