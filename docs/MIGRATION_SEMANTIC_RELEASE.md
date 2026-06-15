# Migration result: semantic-release pipeline

Outcome of migrating Formle's release pipeline to the conventions described in
[`HANDOFF_SEMANTIC_RELEASE.md`](./HANDOFF_SEMANTIC_RELEASE.md). Date: 2026-06-15.

The migration adapts the handoff (originally written for `@figle/*`) to Formle's
reality. Two Formle-specific facts shaped the result:

- `@formle/vue` depends on `@formle/core` via `workspace:*`. `@semantic-release/npm`
  publishes through `npm publish`, which does **not** rewrite the `workspace:*`
  protocol — it would publish a broken `package.json`. Publishing therefore stays
  on `pnpm publish` (via `@semantic-release/exec`), with `@semantic-release/npm`
  kept only for the in-`package.json` version bump (`npmPublish: false`).
- `pnpm` (v11) supports npm **OIDC trusted publishing**, so the token-free auth
  from the handoff works while keeping `pnpm publish`.

## Decisions taken

| Decision            | Choice                                              |
| ------------------- | --------------------------------------------------- |
| Config architecture | Split: `.releaserc.base.json` + per-package configs |
| npm authentication  | OIDC trusted publishing (no `NPM_TOKEN`)            |
| Prerelease branch   | Added `beta`                                         |
| Publish mechanism   | `pnpm publish` via `@semantic-release/exec` (kept)   |

## Changes made

### Added

- **`.releaserc.base.json`** (repo root) — single source of truth for the plugin
  chain and release rules:
  - branches: `master` (stable) + `beta` (prerelease);
  - `@semantic-release/commit-analyzer` with the `conventionalcommits` preset and
    `releaseRules` — `refactor`/`perf`/`docs(readme)` → patch; `chore`, `style`,
    `test`, `build`, `ci` → no release (`feat` → minor, `fix` → patch, breaking → major by default);
  - `@semantic-release/release-notes-generator` (same preset);
  - `@semantic-release/changelog` → writes `CHANGELOG.md`;
  - `@semantic-release/npm` with `npmPublish: false` → version bump only;
  - `@semantic-release/exec` → `pnpm publish --no-git-checks --access public`;
  - `@semantic-release/git` → commits `package.json` + `CHANGELOG.md` as
    `chore(release): <tag> [skip ci]`;
  - `@semantic-release/github` → GitHub Release.
- **`packages/core/.releaserc.json`** and **`packages/vue/.releaserc.json`** —
  thin configs: `extends: ["semantic-release-monorepo", "../../.releaserc.base.json"]`
  plus a unique `tagFormat` (`@formle/core@${version}`, `@formle/vue@${version}`).
- **Root `package.json`** — `release` script:
  `pnpm -r --workspace-concurrency=1 run release` (sequential, topological:
  core releases before vue).
- **`packages/core` & `packages/vue` `package.json`** — `release: "semantic-release"` script.
- **devDependencies** (root, exact-pinned per `TOOLING.md`):
  `@semantic-release/changelog@6.0.3`, `@semantic-release/github@12.0.8`,
  `conventional-changelog-conventionalcommits@9.3.1`.

### Changed

- **`.github/workflows/release.yml`**:
  - triggers on push to `master` **and** `beta`;
  - removed `NPM_TOKEN` / `NODE_AUTH_TOKEN` env (OIDC via `id-token: write` +
    `registry-url`);
  - the two per-package release steps replaced by one `pnpm release` step; pnpm's
    topological, single-concurrency ordering guarantees core publishes before vue.

### Removed

- **`release.config.mjs`** — the previous single dynamic ESM config, superseded by
  the split `.releaserc.base.json` + per-package configs.

## Validation

- All three `.releaserc*.json` files parse as valid JSON.
- `semantic-release --dry-run` in `packages/core` loads the full chain — every
  plugin (`changelog`, `npm`, `exec`, `git`, `github`) resolves, the
  `conventionalcommits` preset and `semantic-release-monorepo` apply, the
  per-package `tagFormat` is picked up, and it reaches
  *"Run automated release from branch master"*. (It then stops because the local
  branch is behind the remote — expected for a dry run, not a config error.)
- Lockfile refreshed with the exact-pinned new dependencies.

## Required follow-ups (action needed before the first real release)

1. **Configure npm trusted publisher** — one-time, per package, on npmjs.com.
   Without this, OIDC publishing fails. For **both** `@formle/core` and
   `@formle/vue`: package **Settings → Trusted Publisher → GitHub Actions**, with
   owner/repo `ladown/formle` and workflow filename `release.yml`. If a package
   does not yet exist on npm, publish its first version manually
   (`pnpm publish`) once, then enable the trusted publisher.
   - Fallback if pnpm OIDC publishing does not work in practice: add an `NPM_TOKEN`
     repository secret and `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` env back to
     the `Release` step in `release.yml`.

2. **Build step is missing — packages would publish without `dist`.**
   `core`/`vue` `package.json` set `files: ["dist"]` and `publishConfig` pointing
   at `./dist/*`, but there is no `build` script and no `tsdown.config.ts`
   (see `TOOLING.md` → "Build (`tsdown`)"). Until `tsdown` is wired up and a
   `pnpm build` step is added to `release.yml` before `pnpm release`, publishing
   ships an empty package. This was left out of this migration as it is a separate
   build-tooling task.

## Notes

- `docs/TOOLING.md` still says the release branch is `main` and lists `npm publish`;
  the repository's actual default branch is `master` and the pipeline uses
  `pnpm publish`. Worth reconciling that doc, but out of scope here.
