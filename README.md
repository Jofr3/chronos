# Chronos

## Setup

```bash
# Install dependencies
bun install
```

## Development

```bash
# nix
nix develop

# frontend
cd apps/frontend
bun run dev

# backend
cd apps/backend
bun run dev

# drizzle
cd apps/backend
bun run drizzle
```

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
