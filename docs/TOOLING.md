# Tooling

This document describes Formle's build, lint, format, test, and release toolchain. It explains both **what** is used and **why**, so that future maintenance decisions stay aligned with original intent.

## Toolchain at a glance

| Layer             | Tool                                             | Status                  |
| ----------------- | ------------------------------------------------ | ----------------------- |
| Package manager   | `pnpm`                                           | v9+                     |
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

Minimum: **Node 20.19.0**. This is `tsdown`'s minimum requirement and pins the rest of the toolchain to a modern baseline. Set in:

- `package.json` → `"engines": { "node": ">=20.19.0" }`
- `.nvmrc` → `20.19.0` (or higher LTS)
- `.github/workflows/*.yml` → `node-version: '20.19.0'`

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
pnpm --filter formle-vue build
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
pnpm --filter formle test  # one package
pnpm test --watch       # watch mode
```

## Release (`semantic-release-monorepo`)

Each package is versioned and released independently. The release workflow:

1. Push to `main` triggers `.github/workflows/release.yml`
2. `semantic-release-monorepo` runs per package
3. Each package's commit history is filtered to commits touching its directory
4. Conventional commit prefixes determine version bumps:
   - `feat:` → minor
   - `fix:`, `perf:` → patch
   - `BREAKING CHANGE:` in body → major (until v1.0.0, breaking changes go via minor)
5. Tags are created per package: `formle@0.1.0`, `formle-vue@0.1.0`
6. Changelog entries are generated per package
7. npm publish per package

This is documented further in CI workflow files.

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

`.github/workflows/release.yml` runs on push to `main`:

1. All of CI above
2. `semantic-release-monorepo` per package

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
