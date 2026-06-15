# Roadmap

This file is the source of truth for what is in scope for each release. Consult it before adding any feature.

## v0.1.0 — first public release

**Target:** 8-10 weeks from project start.

### In scope (ships in v0.1.0)

This list reflects what is actually exported and tested. Everything else is in
"Deferred to v0.2+" below.

- **Framework-agnostic core** (`@formle/core`)
  - `parseSchema(input)` — strict parser for the Formle schema format. Collects
    every issue and throws a `FormleSchemaError` with the full `issues[]` array
    (see `docs/SCHEMA_SPEC.md`).
  - `validate(schema, values)` — synchronous validation engine.
  - Exported types (`FormSchema`, `Field`, `ValidationRules`, etc.).
  - **Note:** v0.1.0 parses and validates the `text`, `email`, and `password`
    field types. The other types in the `FieldType` union are declared for the
    v0.2+ surface but are rejected by the parser today.
- **Vue 3 adapter** (`@formle/vue`)
  - `useForm({ schema, onSubmit, initialValues })` composable
  - `useField(name, form)` composable
  - Reactive form state: `values`, `errors`, `isValid`, `isSubmitting`, plus
    `fields`, `handleSubmit`, and `reset`
- **Field types**: `text`, `email` (built-in format validation), `password`
  (semantic type — signals a password input; no built-in format rule)
- **Validation rules**: `required`, `minLength`, `maxLength`, `pattern`
- **English error messages** — built in, not yet customizable
- **npm publication** of both packages

### Deferred to v0.2+

These are recognized needs but explicitly out of scope for v0.1.0. Do not implement them without an explicit roadmap update.

- **Additional field types**: `number`, `textarea`, `checkbox`, `radio`, `select` (declared in the type union; not yet parsed or validated)
- **Validation rules**: `min`, `max` (require the `number` field type), and `custom` (registered validators)
- **`registerValidator` / custom validators by ID** — referencing a validator by registered ID from a schema
- **`<Form>` and `<Field>` Vue components** with slot-based rendering (only the `useForm` / `useField` composables ship in v0.1.0)
- **`touched` / `dirty` field state** on the `useForm` return shape
- **Single-argument `useField(name)`** ergonomics (the v0.1.0 signature is `useField(name, form)`)
- **Customizable error messages** via a `messages` option on `useForm`
- **Conditional rendering**: `showWhen` with simple equality conditions
- **Auto-submit** via the schema's `submit` block (the `auto` option on `useForm`)
- **Zod adapter** — `fromZod(zodSchema)` converts a Zod schema to a Formle schema
- **JSON Schema adapter** — `fromJsonSchema(jsonSchema)` converts a basic JSON Schema (Draft 2020-12) to a Formle schema
- **Documentation site** built with VitePress (the README is the docs surface for v0.1.0)
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
