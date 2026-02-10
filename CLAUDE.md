# CLAUDE.md

## Project Overview

better-auth-waitlist is a community plugin for Better Auth that adds
waitlist/early-access functionality. It gates new user registration behind
an invite-based waitlist system.

## Development Commands

```bash
pnpm install       # Install dependencies
pnpm build         # Build with tsdown
pnpm dev           # Watch mode
pnpm test          # Run tests with Vitest
pnpm typecheck     # TypeScript type checking
pnpm lint          # Biome lint
pnpm lint:fix      # Fix linting issues
pnpm format        # Format with Biome
pnpm format:check  # Check formatting
```

## Architecture

- `src/index.ts` - Server plugin (main export)
- `src/client.ts` - Client plugin (client export)
- `src/schema.ts` - Database schema (waitlist table)
- `src/types.ts` - TypeScript types
- `src/error-codes.ts` - Error code constants
- `src/routes/public.ts` - Public endpoints (join, status, verify-invite)
- `src/routes/admin.ts` - Admin endpoints (approve, reject, bulk-approve, list, stats)

## Code Style

- Formatter: Biome (tabs for code, 2 spaces for JSON)
- Import zod: `import * as z from "zod"` (NOT `import { z }`)
- Use `import type` for type-only imports
- No `any` types - use explicit types or `Record<string, unknown>`
- No `Buffer` - use `Uint8Array` or `crypto.randomUUID()`
- No classes - use functions and objects
- Follow Better Auth plugin conventions

## Testing

- Uses Vitest with `getTestInstance` from `better-auth/test`
- Run specific test: `vitest src/__tests__/waitlist.test.ts`

## Publishing

1. `pnpm build` - Verify clean build
2. `pnpm test` - All tests passing
3. `pnpm typecheck` - No type errors
4. `pnpm lint` - No lint errors
5. `pnpm publish` - Publish to npm
