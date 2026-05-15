# CLAUDE.md

Entry point for agents working on Formle.

## Read these files in order

1. [`README.md`](./README.md) — what the project is, status, quick preview
2. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — current scope and explicit non-goals
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — package layout, layer separation, dependency rules
4. [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) — naming, file structure, commits, tests

Read the rest when relevant to the task:

- [`docs/SCHEMA_SPEC.md`](./docs/SCHEMA_SPEC.md) — when working on schemas, parsing, or validation
- [`docs/TOOLING.md`](./docs/TOOLING.md) — when working on build, lint, format, or release config
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — when setting up dev environment

## Behaviour expectations

This documentation is the source of truth. It is written for both human contributors and AI agents — there is no separate "agent doc" with hidden rules. If something is not in `docs/`, it has not been decided. Do not invent answers from general knowledge.

When a decision is needed and the path forward is ambiguous:

1. Choose the option that preserves the project's three core properties (headless, server-driven, DX-first TypeScript) — see `README.md`.
2. Choose the option with the smaller scope.
3. Document the decision in the appropriate file under `docs/`.

When scope expands beyond what is documented, push back. The project's value is in what it deliberately does not do.

## What to never do

- Add features not listed in `docs/ROADMAP.md` for the current version
- Violate the dependency rules in `docs/ARCHITECTURE.md` (especially: core never imports framework code)
- Use `any`, `@ts-ignore`, or unrestricted type assertions
- Add styled components, theming, or any UI opinion to the library
- Introduce browser storage APIs (`localStorage`, `sessionStorage`, etc.) in source

Everything else follows from the documented conventions.
