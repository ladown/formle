# Tooling

This document describes Formle's build, lint, format, test, and release toolchain. It explains both **what** is used and **why**, so that future maintenance decisions stay aligned with original intent.

## Toolchain at a glance

| Layer             | Tool                                             | Status                  |
| ----------------- | ------------------------------------------------ | ----------------------- |
| Package manager   | `pnpm`                                           | v1+                     |
| Build (libraries) | `tsdown`                                         | pre-1.0, pinned exactly |
| Type checking     | TypeScript strict mode                           | latest                  |
| Linter            | `oxlint`                                         | v1+                     |
| Formatter         | `oxfmt`                                          | beta, pinned exactly    |
| Test runner       | `vitest`                                         | latest                  |
| Vue test utils    | `@vue/test-utils`                                | latest                  |
| Docs site         | `vitepress`                                      | latest                  |
| Release           | `semantic-release` + `semantic-release-monorepo` | latest                  |
| CI                | GitHub Actions                                   | —                       |

## Node version

Minimum: **Node 24.15.0** (current LTS as of project start). `tsdown` requires Node 20+; we pin higher to take advantage of modern Node features and align with the most recent LTS. Set in:

- `package.json` → `"engines": { "node": ">=24.15.0" }`
- `.nvmrc` → `24.15.0` (or higher LTS)
- `.github/workflows/*.yml` → `node-version: '24.15.0'`

## Why the Oxc stack

The build, lint, and format tools all belong to the Oxc / Rolldown / VoidZero family:

- `tsdown` uses Rolldown (Rust-based bundler) and Oxc for declaration generation
- `oxlint` is the Oxc linter
- `oxfmt` is the Oxc formatter

This is a deliberate choice. Sticking to one family means:

- Consistent performance characteristics (all sub-second, even at scale)
- Compatible AST internals (less double-parsing)
- A single ecosystem evolution to track, not three

The trade-off is that some of these tools are pre-1.0. We mitigate that by pinning exact versions.

## Pinned versions

These dependencies MUST be pinned to exact versions in every `package.json`:

```json
{
  "devDependencies": {
    "tsdown": "0.9.x",
    "oxfmt": "0.x.x",
    "oxlint": "1.x.x"
  }
}
```

Do NOT use caret (`^`) or tilde (`~`) ranges for these. They make breaking changes in minor and even patch versions:

- `oxfmt` is in beta. Formatting output can shift between patch versions.
- `tsdown` is pre-1.0 and changes config shapes.
- `oxlint` rule defaults evolve.

Coordinated upgrades are done deliberately, not automatically.

## Build (`tsdown`)

Each published package has its own `tsdown.config.ts`. Minimum config:

```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
});
```

For `packages/vue`, add Vue SFC support via a Rolldown-compatible plugin. Verify before adding:

```sh
pnpm --filter @formle/vue build
```

Should produce `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts`.

## Lint (`oxlint`)

Configuration lives in `.oxlintrc.json` at the repo root. Per-package overrides are added via `overrides` keyed by glob patterns, not separate config files.

Minimum config:

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "error",
    "perf": "warn",
    "style": "warn"
  },
  "rules": {
    "no-console": "error",
    "no-debugger": "error"
  }
}
```

For Vue SFC files, oxlint's native support is limited. If Vue-specific rules are needed (e.g. from `eslint-plugin-vue`), use the oxlint JS plugins API (alpha). For v0.1.0, prefer keeping Vue-specific lint minimal and relying on TypeScript strict + manual review.

Run:

```sh
pnpm lint        # check
pnpm lint --fix  # auto-fix
```

## Format (`oxfmt`)

Configuration in `.oxfmtrc.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxfmt/configuration_schema.json",
  "experimentalLanguages": ["vue"]
}
```

Run:

```sh
pnpm format            # check
pnpm format --write    # apply
```

Verify `.vue` formatting on a sample file before committing. If oxfmt formatting of `.vue` files produces unexpected output, file format may be flagged as experimental — fall back to Prettier for `.vue` only, while keeping oxfmt for `.ts/.js/.json`. Document any such exception in this file.

## Test (`vitest`)

Each package has `vitest.config.ts`. Tests live in `tests/`, not co-located with source.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node", // 'happy-dom' for packages/vue
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
  },
});
```

For `packages/vue`, use `happy-dom` (lighter than `jsdom`) and add `@vue/test-utils`.

Run:

```sh
pnpm test               # all packages
pnpm --filter @formle/core test  # one package
pnpm test --watch       # watch mode
```

## Release (`semantic-release` + `semantic-release-monorepo`)

Each package is versioned and released independently from its own commit history.

### Split config architecture

Configuration is split across one shared base file and one thin per-package file:

- `.releaserc.base.json` (repo root) — the full plugin chain and shared options (branches, commit-analyzer rules, release notes, changelog, publish, git, GitHub). All policy lives here, defined once.
- `packages/*/.releaserc.json` — extends both `semantic-release-monorepo` and the base file, and adds only what is package-specific: the `tagFormat`.

```json
{
  "extends": ["semantic-release-monorepo", "../../.releaserc.base.json"],
  "tagFormat": "@formle/core@${version}"
}
```

Why split: the plugin chain is identical for every package, so duplicating it per package would drift over time. Keeping it in one base file means a single edit updates every package's pipeline, while each package file stays a two-line declaration of its own tag namespace. `semantic-release-monorepo` filters each package's commit history to commits that touch its directory, so versions bump independently.

### Plugin chain

`.releaserc.base.json` runs these plugins in order:

1. `@semantic-release/commit-analyzer` (`conventionalcommits` preset) — determines the bump. Custom `releaseRules` extend the defaults: `refactor` and `perf` → patch; `docs` scoped `readme` → patch; `chore`, `style`, `test`, `build`, `ci` → no release.
2. `@semantic-release/release-notes-generator` (`conventionalcommits` preset) — generates release notes.
3. `@semantic-release/changelog` — writes per-package `CHANGELOG.md`.
4. `@semantic-release/npm` with `"npmPublish": false` — updates `package.json` version and prepares the tarball, but does **not** publish (publishing is delegated to the next plugin so pnpm handles workspace protocol rewriting).
5. `@semantic-release/exec` — `publishCmd: "pnpm publish --no-git-checks --access public"`. pnpm performs the actual publish, rewriting `workspace:*` dependencies to the concrete published version.
6. `@semantic-release/git` — commits the bumped `package.json` and `CHANGELOG.md` back with `chore(release): <tag> [skip ci]`.
7. `@semantic-release/github` — creates the GitHub Release.

### Branches

- `master` — stable releases.
- `beta` — prerelease channel (`{ "name": "beta", "prerelease": true }`).

The repo's default branch is **`master`** (it has always been on `master`, not `main`).

### Why pnpm publish via `exec`

The default `@semantic-release/npm` publish does not understand pnpm's `workspace:*` dependency protocol. By disabling its publish step and delegating to `pnpm publish` through `@semantic-release/exec`, the `workspace:*` ranges (e.g. `@formle/vue` depending on `@formle/core`) are rewritten to the real version at publish time. The root `release` script runs packages strictly sequentially in topological order:

```json
{ "release": "pnpm -r --workspace-concurrency=1 run release" }
```

so `@formle/core` publishes before `@formle/vue` and the version `@formle/vue` references already exists on npm.

### Authentication

The release workflow grants `id-token: write`, so the pipeline is **OIDC-ready**. Today the first publish still authenticates with an `NPM_TOKEN` secret; once each package exists on npm, migrating to an [npm OIDC trusted publisher](https://docs.npmjs.com/trusted-publishers) removes the long-lived token entirely. That migration is a future improvement, not a blocker.

## Why not Biome

Biome is a credible alternative to the Oxc stack. It is more mature in some areas (TypeScript, JSX). We chose Oxc because:

- Speed advantage (2-3x faster for our workload size)
- Tighter integration with the bundler (`tsdown` is in the same family)
- `oxfmt` supports `.vue`, `.yaml`, and `.toml` natively
- The VoidZero team is actively driving the ecosystem toward Oxc-based standards

If Oxc proves too unstable for a release, falling back to Biome is acceptable; falling back to ESLint + Prettier is not (toolchain mixing is worse than tool swap).

## Why not Storybook

Formle is a headless library. There are no styled components to render in isolation. The documentation site (VitePress) hosts interactive examples directly via Vue components defined in `packages/docs`. Adding Storybook would add infrastructure with no payoff.

## Why not Changesets

Changesets is a strong alternative to `semantic-release-monorepo` and is becoming the dominant pattern in OSS Vue/React libraries. We chose `semantic-release` because:

- It is well-understood by the maintainer (Egor)
- It works directly from commit messages without an extra contributor step
- For a solo project, no contributor friction is the priority

If Formle grows external contributors, migrating to Changesets is a reasonable future move.

## CI workflow

`.github/workflows/ci.yml` runs on every PR and push:

1. Install pnpm with frozen lockfile
2. Lint (`pnpm lint`)
3. Format check (`pnpm format`)
4. Type check (`pnpm typecheck`)
5. Test (`pnpm test`)
6. Build (`pnpm build`)
7. Build examples (`pnpm --filter './examples/**' build`)

`.github/workflows/release.yml` runs on push to `master` and `beta`:

1. Install (frozen lockfile), typecheck, test, build
2. `pnpm release` — `semantic-release` per package, sequentially in topological order

## Local development scripts

The root `package.json` defines:

```json
{
  "scripts": {
    "lint": "oxlint",
    "format": "oxfmt --check",
    "format:write": "oxfmt",
    "typecheck": "tsc --build",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "docs:dev": "pnpm --filter docs dev",
    "docs:build": "pnpm --filter docs build"
  }
}
```

Per-package scripts mirror these for filtered runs.
