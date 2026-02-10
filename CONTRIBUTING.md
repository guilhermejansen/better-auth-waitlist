# Contributing to better-auth-waitlist

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/better-auth-waitlist.git
   cd better-auth-waitlist
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

## Development Workflow

### Commands

```bash
pnpm dev           # Watch mode (rebuild on changes)
pnpm build         # Production build with tsdown
pnpm test          # Run tests with Vitest
pnpm typecheck     # TypeScript type checking
pnpm lint          # Lint with Biome
pnpm lint:fix      # Auto-fix lint issues
pnpm format        # Format with Biome
pnpm format:check  # Check formatting
```

### Before Submitting

Make sure all checks pass:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Please format your commit messages accordingly:

- `feat:` -- a new feature
- `fix:` -- a bug fix
- `docs:` -- documentation changes
- `test:` -- adding or updating tests
- `refactor:` -- code restructuring without behavior changes
- `chore:` -- maintenance tasks (dependencies, CI, tooling)
- `perf:` -- performance improvements

**Examples:**

```
feat: add rate limiting to join endpoint
fix: handle expired invite codes in bulk approve
docs: add Nuxt.js setup example
test: add coverage for auto-approve callback
```

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/my-feature
   ```

2. Open a Pull Request targeting the `main` branch.

3. In your PR description:
   - Describe what changed and why
   - Link to any related issues (e.g., `Closes #12`)
   - Include steps to test the changes if applicable

4. Wait for CI to pass and a maintainer to review.

## Code Style

- **Formatter**: Biome (tabs for code, 2 spaces for JSON)
- **Imports**: Use `import type` for type-only imports
- **Types**: No `any` -- use explicit types or `Record<string, unknown>`
- **No classes** -- use functions and objects
- **No `Buffer`** -- use `Uint8Array` or `crypto.randomUUID()`
- Follow existing patterns in the codebase

## Reporting Issues

If you find a bug or have a feature request, please [open an issue](https://github.com/guilhermejansen/better-auth-waitlist/issues/new) with:

- A clear title and description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your environment (Node.js/Bun version, OS, Better Auth version)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
