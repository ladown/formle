# Contributing to Formle

Thanks for considering a contribution. Formle is a small project at an early stage, so contributions should be coordinated rather than surprise.

## Before you start

Open an issue describing what you intend to change before opening a PR. This protects your time: some changes may be out of scope (see `docs/ROADMAP.md`) or already in progress.

Bug fixes with a clear reproduction don't need an issue first — just open a PR.

## Project status

Formle is in pre-v0.1.0 development. The public API will change. Until v1.0.0, breaking changes ship as minor version bumps.

## Development setup

Prerequisites:

- Node.js 20.19.0 or later
- pnpm 9 or later

Setup:

```sh
git clone https://github.com/ladown/formle.git
cd formle
pnpm install
pnpm test
pnpm build
```

All commands should pass on a fresh clone.

## Local development scripts

| Command             | Purpose                           |
| ------------------- | --------------------------------- |
| `pnpm lint`         | Run oxlint across all packages    |
| `pnpm format`       | Check formatting with oxfmt       |
| `pnpm format:write` | Apply formatting                  |
| `pnpm typecheck`    | Type check via project references |
| `pnpm test`         | Run all tests                     |
| `pnpm build`        | Build all publishable packages    |
| `pnpm docs:dev`     | Serve docs site locally           |
| `pnpm docs:build`   | Build docs site                   |

Filter to a single package with `pnpm --filter formle <script>` or `pnpm --filter formle-vue <script>`.

## Code conventions

Conventions are documented in `docs/CONVENTIONS.md`. Key points:

- TypeScript strict mode, no `any`
- Conventional Commits (release tooling depends on them)
- Tests live in `tests/`, not co-located with source
- Files use `kebab-case.ts`; Vue components use `PascalCase.vue`

## PR checklist

Before opening a PR:

- [ ] Tests pass (`pnpm test`)
- [ ] Linter passes (`pnpm lint`)
- [ ] Formatter applied (`pnpm format:write`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] PR title follows Conventional Commits format
- [ ] CHANGELOG entries are not edited manually (they're generated)

## Architecture rules

Two rules are non-negotiable, regardless of how convenient violating them might seem:

1. **`packages/core` does not import from any framework.** It is pure TypeScript.
2. **`packages/vue` does not depend on `vue` directly.** It uses `vue` as a peer dependency.

See `docs/ARCHITECTURE.md` for the reasoning.

## What's in scope

In scope:

- Bug fixes with reproducers
- Test coverage improvements
- Documentation clarifications
- Performance improvements with benchmarks
- New features explicitly listed in `docs/ROADMAP.md`

Out of scope for v0.1.0 (see ROADMAP for the full list):

- React or Svelte adapters
- Styled components or theming
- Form builder UI
- Backend SDKs

Out of scope for the project, possibly forever:

- Coupling Formle to a specific design system
- Heavy abstractions that obscure the underlying form state

## Reporting bugs

Use the bug report template. A good report includes:

- Versions of `formle`, `formle-vue`, `vue`, and Node
- A minimal reproduction (CodeSandbox or repository)
- Expected vs actual behavior
- Stack trace if there's an error

## Suggesting features

Use the feature request template. Describe the use case, not the proposed solution — the solution is part of the discussion. Feature requests that don't align with the project's principles (headless, server-driven, no styling) will be declined, but the conversation is still welcome.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license.
