# Roadmap

This file is the source of truth for what is in scope for each release. Consult it before adding any feature.

## v0.1.0 — first public release

**Target:** 8-10 weeks from project start.

### In scope

- **Vue 3 adapter** (`formle-vue`)
  - `useForm({ schema, onSubmit })` composable
  - `useField(name)` composable
  - `<Form>` and `<Field>` components with slot-based rendering
  - Reactive form state (values, errors, touched, dirty, isSubmitting, isValid)
- **Framework-agnostic core** (`formle`)
  - Schema parser for the custom Formle format (see `docs/SCHEMA_SPEC.md`)
  - Validation engine, synchronous only
  - Form state machine
  - Submit lifecycle (idle → submitting → success | error)
- **Zod adapter** — `fromZod(zodSchema)` converts a Zod schema to a Formle schema
- **JSON Schema adapter** — `fromJsonSchema(jsonSchema)` converts a basic JSON Schema (Draft 2020-12) to a Formle schema. Supports common types and validation keywords; advanced features (oneOf, allOf, $ref) are deferred.
- **Field types**: `text`, `email`, `password`, `number`, `textarea`, `checkbox`, `radio`, `select`
- **Validation rules**: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `custom` (by registered ID)
- **Conditional rendering**: `showWhen` with simple equality conditions
- **English error messages**, default text — customizable via `messages` option
- **Documentation site** built with VitePress
- **npm publication** of both packages with `semantic-release-monorepo`

### Deferred to v0.2+

These are recognized needs but explicitly out of scope for v0.1.0. Do not implement them without an explicit roadmap update.

- React adapter
- Svelte adapter
- Async validation (e.g. "check if email is available")
- Cross-field validation (e.g. "passwordConfirm === password")
- Field arrays (dynamic add/remove of repeating field groups)
- File upload field type
- Date/time picker field types
- Multi-select field type
- Built-in i18n (custom message dictionaries per locale)
- Advanced layout (tabs, accordion, multi-column)
- Multi-step / wizard forms
- AI-assisted schema generation
- JSON Schema advanced features: `oneOf`, `allOf`, `$ref`, `if/then/else`

### Non-goals (out of scope, possibly forever)

- **Styled component library.** Formle is headless. There will be no built-in CSS, no theming system. Styling is the consumer's responsibility.
- **Form builder UI.** Formle does not include a visual schema editor.
- **Backend SDK.** Formle does not ship schema-generation libraries for any backend language. Users construct schemas with their existing tools.
- **Drag-and-drop reordering.** Out of scope.
- **Rich text editor field.** Out of scope; consumers should integrate their preferred editor.

## v0.2.0 — tentative

Roadmap firms up after v0.1.0 ships. Likely candidates, in priority order:

1. Async validation
2. Cross-field validation
3. Field arrays
4. React adapter
5. File upload field type

## Versioning policy

Until v1.0.0, minor version bumps may include breaking changes when documented in the release notes. Patch versions are non-breaking. After v1.0.0, semantic versioning is strict.
