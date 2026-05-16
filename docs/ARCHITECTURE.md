# Architecture

This document describes Formle's package layout, layer separation, and dependency rules. These rules are enforced; violations should be rejected in code review.

## Repository layout

```
formle/
├── packages/
│   ├── core/                 → published as "formle"
│   │   ├── src/
│   │   │   ├── schema/       → schema parser and normalization
│   │   │   ├── validation/   → validation engine
│   │   │   ├── state/        → form state machine
│   │   │   ├── adapters/     → fromZod, fromJsonSchema
│   │   │   └── index.ts      → public API
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsdown.config.ts
│   ├── vue/                  → published as "formle-vue"
│   │   ├── src/
│   │   │   ├── composables/  → useForm, useField
│   │   │   ├── components/   → Form.vue, Field.vue
│   │   │   └── index.ts      → public API
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsdown.config.ts
│   └── docs/                 → VitePress site, not published
├── examples/
│   └── basic/                → minimal Vue + Vite demo (server-driven example planned for a later session)
├── .changeset/               → not used; we use semantic-release-monorepo
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── package.json              → root, private: true
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json             → project references
├── .oxlintrc.json
├── .oxfmtrc.json
└── CLAUDE.md
```

## Published packages

Two packages are published. Both are unscoped.

| Package      | Description                                        | Depends on                      |
| ------------ | -------------------------------------------------- | ------------------------------- |
| `formle`     | Framework-agnostic core: schema, validation, state | Runtime: none                   |
| `formle-vue` | Vue 3 adapter: composables, components             | Runtime: `formle`, `vue` (peer) |

The consumer installs both:

```sh
pnpm add formle formle-vue
```

Future adapters (`formle-react`, `formle-svelte`) follow the same pattern and depend on `formle`.

## Dependency rules

These rules are enforced via package.json dependencies and conventions. Violations break the architecture.

1. **`packages/core` must not import from `vue`, `react`, or any framework.** The core is pure TypeScript. Its only runtime dependency is the standard library.
2. **`packages/vue` may import from `packages/core` (as `formle`) and from `vue`.** Nothing else as a runtime dependency.
3. **No circular dependencies.** Core has no knowledge of adapters.
4. **`vue` is a peer dependency in `packages/vue`, not a regular dependency.** This is critical: consumers bring their own Vue.

## Core package layers

Inside `packages/core/src`, layers are stacked. Each layer depends only on layers below it.

```
┌─────────────────────────────────┐
│  Public API (index.ts)          │
├─────────────────────────────────┤
│  Adapters (fromZod, fromJson)   │
├─────────────────────────────────┤
│  State machine                  │
├─────────────────────────────────┤
│  Validation engine              │
├─────────────────────────────────┤
│  Schema parser & AST            │
└─────────────────────────────────┘
```

- The **schema parser** reads a Formle schema (JSON, plain object, or via an adapter) and produces a normalized internal AST.
- The **validation engine** consumes the AST plus current values and produces an errors map.
- The **state machine** holds reactive form state (values, errors, touched, dirty, submitting) and orchestrates lifecycle events.
- **Adapters** are pure converters from external formats (Zod, JSON Schema) to the internal Formle schema.
- The **public API** exports a stable surface; internals are not re-exported.

## Vue package layers

Inside `packages/vue/src`:

```
┌─────────────────────────────────┐
│  Public API (index.ts)          │
├─────────────────────────────────┤
│  Components (Form, Field)       │
├─────────────────────────────────┤
│  Composables (useForm, etc.)    │
├─────────────────────────────────┤
│  Reactivity bridge              │
└─────────────────────────────────┘
```

The **reactivity bridge** is the only file that connects core state to Vue reactivity. It uses `reactive`, `ref`, `computed`. All other Vue package files consume the bridge's output, never the core directly.

This separation matters: when we add a React adapter, it has its own bridge (using `useSyncExternalStore` or similar) — the rest of the adapter logic ports over.

## Build output

Each published package builds to:

```
packages/<name>/dist/
├── index.js          (ESM)
├── index.cjs         (CJS)
├── index.d.ts        (types)
└── index.d.cts       (CJS types)
```

`tsdown` handles all four outputs from a single config. Source maps are generated; minification is off (libraries should not minify).

## Internal vs public API

Anything exported from `packages/<name>/src/index.ts` is **public** and subject to semver. Everything else is **internal** and may change in any release. Do not re-export internal helpers from the public API.

Type-only exports are marked with `export type`. Runtime helpers and types are exported separately to keep the runtime bundle minimal.

## Testing layout

Tests live in each package under `tests/` (not co-located with source). This keeps `dist/` clean and allows test-only utilities to be excluded from publication.

- `tests/unit/` — pure unit tests, no setup
- `tests/integration/` — multi-module tests within a package
- `tests/fixtures/` — sample schemas, expected outputs

The `examples/` directory is not part of test runs but is build-checked in CI to ensure example code stays valid.

## Why monorepo, not separate repos

A single repository serves Formle better than per-package repos because:

- Cross-package refactors are atomic
- Versioning via `semantic-release-monorepo` is consistent
- Issues, discussions, and PRs are in one place
- Consumers want a single source of truth

The cost (slightly more complex tooling) is well worth the coordination win.
