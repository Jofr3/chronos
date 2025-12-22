---
description: Update the codebase documentation in the wiki
mode: agent
---

# Update Codebase Documentation

Analyze the current state of the Chronos codebase and update the wiki documentation at `chronos.wiki/codebase/`.

## Steps

1. **Scan the codebase** for any new or modified files in:
   - `apps/backend/src/` (routes, services, db, types)
   - `apps/frontend/src/` (routes, components, services)
   - `packages/types/src/`

2. **Compare** with existing documentation in `chronos.wiki/codebase/`

3. **Update** the relevant README.md files:
   - `chronos.wiki/codebase/backend/routes/README.md`
   - `chronos.wiki/codebase/backend/services/README.md`
   - `chronos.wiki/codebase/backend/database/README.md`
   - `chronos.wiki/codebase/frontend/routes/README.md`
   - `chronos.wiki/codebase/frontend/components/README.md`
   - `chronos.wiki/codebase/frontend/services/README.md`
   - `chronos.wiki/codebase/shared/types/README.md`

4. **Add detailed explanations** for any new or complex code patterns

5. **Create new documentation files** if needed for specific features

## Documentation Guidelines

- Keep documentation accurate and up-to-date
- Include code examples where helpful
- Document the "why" not just the "what"
- Update tables with new routes, services, or components
