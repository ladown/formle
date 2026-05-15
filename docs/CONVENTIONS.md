# Conventions

This document defines code conventions for Formle. These rules are enforced via tooling where possible and via review otherwise.

## Naming

### Files

- **Source files**: `kebab-case.ts` (e.g. `schema-parser.ts`, `validation-engine.ts`)
- **Vue components**: `PascalCase.vue` (e.g. `Form.vue`, `Field.vue`)
- **Test files**: mirror source with `.test.ts` suffix (e.g. `schema-parser.test.ts`)
- **Configuration files**: as required by the tool (e.g. `tsdown.config.ts`, `vitest.config.ts`)

### Identifiers

- **Functions**: `camelCase` — `parseSchema`, `validateField`
- **Constants**: `SCREAMING_SNAKE_CASE` only for true constants (e.g. `DEFAULT_MESSAGES`); use `camelCase` for module-level values that happen to not be reassigned
- **Types and interfaces**: `PascalCase` — `FormSchema`, `ValidationRules`
- **Generics**: single uppercase letter (`T`, `U`) for one-off, `PascalCase` (`TSchema`, `TValues`) for semantic types

### Public API names

The library's public surface uses these prefixes consistently:

- `use*` — Vue composables (`useForm`, `useField`)
- `from*` — adapters (`fromZod`, `fromJsonSchema`)
- `create*` — factory functions returning state objects
- `register*` — global registrations (`registerValidator`)

Match the established prefix before introducing a new one.

## File organization

### Module exports

Every directory has an `index.ts` that re-exports the directory's public surface. Imports cross directory boundaries via the `index.ts`, never via deep paths.

```ts
// Good
import { parseSchema } from "./schema";

// Bad
import { parseSchema } from "./schema/schema-parser";
```

This makes refactoring within a directory invisible to consumers.

### One concept per file

Each file exports one primary concept (function, class, or type group). Helper functions live in the same file. Avoid catch-all `utils.ts` files; if a helper is shared, give it a named home (e.g. `string-helpers.ts`).

### Tests next to source, not co-located

Tests live under `packages/<name>/tests/`, mirroring `src/` structure:

```
src/
├── schema/
│   └── schema-parser.ts
tests/
├── schema/
│   └── schema-parser.test.ts
```

This keeps `dist/` clean and makes test-only utilities easy to exclude from publication.

## TypeScript

- **Strict mode is mandatory** in every `tsconfig.json`: `strict: true`
- **No `any`.** If a type is genuinely unknown, use `unknown` and narrow.
- **No `@ts-ignore`.** If suppression is needed, use `@ts-expect-error` with an inline comment explaining the specific limitation.
- **Prefer `type` over `interface`** for public types, except when declaration merging is needed (rare in Formle).
- **Export types separately** with `export type` to keep runtime bundles minimal.
- **No barrel re-exports of types and runtime mixed** when it complicates tree-shaking. When in doubt, separate.

### Type-driven design

Type signatures come before implementation. When adding a new exported function:

1. Write the type signature first
2. Write a test that exercises the signature
3. Implement to satisfy the test

This is not TDD dogma; it's a check that the API shape is considered before code is written.

## Code style

Style is enforced by `oxfmt`. Do not argue with the formatter; if its choice seems wrong, raise it as a discussion rather than working around it locally.

A few rules `oxfmt` does not enforce, but Formle expects:

- **No default exports** in library code. Named exports only. Default exports complicate refactoring and IDE rename.
- **No long inline ternaries.** If the expression spans more than one line, extract to an `if/else` or a named variable.
- **Early returns** are preferred over nested conditions.
- **Comments explain `why`, not `what`.** The code shows `what`. If a comment restates the code, delete it.

## Tests

### Framework

- Test runner: `vitest`
- Vue testing: `@vue/test-utils`
- DOM: `happy-dom` (in `packages/vue` only)

### Test structure

```ts
import { describe, it, expect } from "vitest";
import { parseSchema } from "../src";

describe("parseSchema", () => {
  it("accepts a minimal valid schema", () => {
    const result = parseSchema({ version: "1", fields: [] });
    expect(result.fields).toEqual([]);
  });

  it("rejects schemas without a version", () => {
    expect(() => parseSchema({ fields: [] } as never)).toThrow();
  });
});
```

### Test naming

`it('verb-phrase describing behaviour')`:

- Good: `it('rejects duplicate field IDs')`
- Good: `it('returns a normalized schema when input is valid')`
- Bad: `it('test schema parser')`
- Bad: `it('works')`

### Test scope

- **Unit tests**: pure functions, single module
- **Integration tests**: multi-module behaviour within a package
- **Example builds**: `examples/*` directories are built in CI as smoke tests, not asserted on

There are no end-to-end tests in v0.1.0. The docs site and examples serve as manual validation.

### Coverage

Coverage is reported in CI but not gated. Target high coverage organically rather than chasing a number. Test the behaviour, not the implementation.

## Commits

Formle uses **Conventional Commits**. The release tooling (`semantic-release-monorepo`) reads commit messages to determine version bumps.

### Format

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
```

### Types

- `feat` — new feature, triggers minor bump
- `fix` — bug fix, triggers patch bump
- `perf` — performance improvement, triggers patch bump
- `refactor` — code change without behaviour change, no version bump
- `docs` — documentation only, no version bump
- `test` — test only, no version bump
- `build` — build/tooling changes, no version bump
- `ci` — CI changes, no version bump
- `chore` — other, no version bump

### Scope

Scope is the package name without the `formle-` prefix:

- `core` for `packages/core`
- `vue` for `packages/vue`
- `docs` for `packages/docs`

Omit scope only for repo-wide changes.

### Examples

```
feat(core): add JSON Schema adapter

Adds fromJsonSchema function that converts JSON Schema Draft 2020-12
to the internal Formle format. Supports string, number, boolean, object.
Advanced features (oneOf, allOf, $ref) deferred to v0.2+.
```

```
fix(vue): submit handler not awaited when async

The handleSubmit composable was not awaiting onSubmit, causing
isSubmitting to flip back to false before the promise resolved.
```

```
docs: clarify conditional logic in SCHEMA_SPEC
```

### Breaking changes

Until v1.0.0, breaking changes ship as minor versions and are flagged in commit body:

```
feat(core): rename parseSchema to parseFormSchema

BREAKING CHANGE: The exported parseSchema function is now named
parseFormSchema for consistency with related APIs.
```

After v1.0.0, this same footer triggers a major bump.

## PR conventions

- One concern per PR. Refactors and features ship separately.
- PR title follows the Conventional Commit format
- The squash-merge commit message becomes the release entry — make it clean
- CI must pass before merge (linting, formatting, type checking, tests, builds)

## Dependencies

- **No new runtime dependency** in `packages/core` or `packages/vue` without explicit justification. The library should remain small.
- **Dev dependencies** are added freely if they serve a clear purpose.
- **Pin exact versions** for `tsdown`, `oxfmt`, `oxlint`. See `docs/TOOLING.md`.
- **`vue` is always a peer dependency** in `packages/vue`, never a regular dependency.

When in doubt about adding a dependency, prefer writing the helper directly. Formle aims to have a small, auditable dependency footprint.
