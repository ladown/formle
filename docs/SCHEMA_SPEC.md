# Schema specification

This document defines the Formle schema format — the structure of data that, when passed to `useForm`, produces a working form.

> **Status:** This document describes the full target schema format. Not all of
> it ships in v0.1.0 — sections that describe planned behaviour are labelled
> **Planned for v0.2+**. What ships today: the top-level shape, the `text`,
> `email`, and `password` field types, the `required` / `minLength` /
> `maxLength` / `pattern` rules, and the error-reporting behaviour. See
> `docs/ROADMAP.md` for the authoritative scope.
> Update this document whenever a behavioural decision is made. Do not implement
> behaviour not described here without first adding it to this spec.

## Format identity

Formle schemas are plain JSON objects (or TypeScript objects with the same shape). They are not based on JSON Schema, though a JSON Schema adapter is planned (see Adapters, below — **planned for v0.2+**).

This is a deliberate choice: JSON Schema is excellent for data validation but verbose and awkward for describing UI concerns. The Formle format optimizes for form rendering directly.

## Top-level shape

```ts
type FormSchema = {
  /** Schema format version. Always "1" for v0.x.x of the library. */
  version: "1";
  /** Optional identifier, useful for debugging and analytics. */
  id?: string;
  /** Ordered list of fields. The order in this array is the rendering order. */
  fields: Field[];
  /** Optional submit configuration for server-driven schemas. */
  submit?: SubmitConfig;
  /** Free-form metadata; not interpreted by Formle. */
  meta?: Record<string, unknown>;
};
```

The `version` field is mandatory. Parsers reject schemas without it. This allows future breaking changes to coexist.

## Field shape

```ts
type Field = {
  /** Unique within the schema. Used as the key in form state. */
  id: string;
  /** One of the supported field types. */
  type: FieldType;
  /** Human-readable label, displayed by the consumer's render layer. */
  label?: string;
  /** Long-form description shown alongside the field. */
  description?: string;
  /** Placeholder text for text-like inputs. */
  placeholder?: string;
  /** Default value, applied on form initialization. */
  default?: unknown;
  /** Validation rules; see Validation section. */
  validation?: ValidationRules;
  /** Conditional rendering predicate; see Conditional logic section. */
  showWhen?: Condition;
  /** Free-form metadata for the consumer's render layer. */
  ui?: Record<string, unknown>;
} & FieldTypeSpecific;
```

Each field type may add type-specific properties via the `FieldTypeSpecific` union (see Field types section).

## Field types

In v0.1.0 the parser accepts **`text`, `email`, and `password`**. The remaining
types below are part of the target `FieldType` union (and have TypeScript
definitions) but are rejected by the parser today — they are **planned for
v0.2+**. See `ROADMAP.md`.

| `type`     | Value type | Type-specific props | Status         |
| ---------- | ---------- | ------------------- | -------------- |
| `text`     | `string`   | —                   | v0.1.0         |
| `email`    | `string`   | —                   | v0.1.0         |
| `password` | `string`   | —                   | v0.1.0         |
| `number`   | `number`   | —                   | Planned v0.2+  |
| `textarea` | `string`   | `rows?: number`     | Planned v0.2+  |
| `checkbox` | `boolean`  | —                   | Planned v0.2+  |
| `radio`    | `string`   | `options: Option[]` | Planned v0.2+  |
| `select`   | `string`   | `options: Option[]` | Planned v0.2+  |

```ts
type Option = {
  value: string;
  label: string;
};
```

`text`, `email`, and `password` are all string-typed and accept the same
validation rules (`required`, `minLength`, `maxLength`, `pattern`). They differ
as follows:

- **`email`** adds a **built-in format check**. The format is validated only
  when the value is non-empty — emptiness is `required`'s concern, not the
  format check's. So an empty optional email is valid; an empty required email
  reports `required` (not an invalid-email error); a non-empty malformed value
  reports the `email` code. The check uses a pragmatic pattern
  (`^[^@\s]+@[^@\s]+\.[^@\s]+$`), not an RFC-5322-exhaustive grammar. If the
  field also declares an explicit `pattern`, **both** the built-in format check
  and the user pattern must pass.
- **`password`** is a **semantic type only**: it signals "render as a password
  input" to the consumer and carries **no built-in format rule**. Password
  policies vary too widely for the library to impose one, so a password field
  validates exactly like `text`. Length and complexity requirements are
  expressed with the ordinary `minLength` / `maxLength` / `pattern` rules.

When multiple rules fail on one field, issues are ordered
`required` → `email` format → `minLength` / `maxLength` / `pattern`.

## Validation

```ts
type ValidationRules = {
  required?: boolean;
  minLength?: number; // text, email, password, textarea
  maxLength?: number; // text, email, password, textarea
  min?: number; // number — planned for v0.2+
  max?: number; // number — planned for v0.2+
  pattern?: string; // RegExp source for text-like fields
  /** ID of a registered custom validator — planned for v0.2+. */
  custom?: string;
};
```

Each rule applies only to compatible field types. The parser rejects incompatible combinations (e.g. `minLength` on `checkbox`).

In v0.1.0 the parser accepts `required`, `minLength`, `maxLength`, and `pattern`
(on `text`, `email`, and `password` fields), and the validator enforces all
four — plus the built-in `email` format check on `email` fields. `min` and `max` arrive
with the `number` field type and `custom` with custom validators — both
**planned for v0.2+**.

Validation in v0.1.0 is **synchronous only**. Async validation is deferred to v0.2+.

Default error messages are English and built in. Schema authors don't write
error strings; the rendering layer does. A `messages` option on `useForm` for
overriding the defaults is **planned for v0.2+** — in v0.1.0 the messages are
fixed.

### Custom validators (planned for v0.2+)

> **Not in v0.1.0.** The `custom` rule and the validator registry described here
> are planned for v0.2+. `registerValidator` is not exported today.

The intended design: custom validators are registered globally and referenced by
ID in the schema, so the schema stays serializable as plain JSON (inline
functions are never allowed). A registration would name a validator:

```text
registerValidator("matchesIBAN", (value) =>
  /^[A-Z]{2}\d{2}/.test(value) ? null : "Invalid IBAN format")
```

and a schema would reference it by ID:

```json
{
  "id": "iban",
  "type": "text",
  "validation": { "custom": "matchesIBAN" }
}
```

This indirection is intentional: schemas should remain serializable as plain JSON. Inline functions are not allowed.

## Conditional logic (planned for v0.2+)

> **Not in v0.1.0.** `showWhen` is part of the target field shape and has a
> TypeScript definition, but the v0.1.0 parser and validator do not interpret
> it. The behaviour below is **planned for v0.2+**.

A field can be hidden based on other fields' values via `showWhen`:

```ts
type Condition = {
  /** ID of another field in the same schema. */
  field: string;
  /** Value equality check. */
  equals?: unknown;
  /** Inverse of equals. */
  notEquals?: unknown;
  /** Value is one of these. */
  in?: unknown[];
};
```

When `showWhen` evaluates to false, the field is:

- Excluded from rendered output
- Excluded from validation (its value is ignored)
- Excluded from submitted values

Only one of `equals`, `notEquals`, `in` may be set per condition. Complex boolean expressions are deferred to v0.2+; v0.1.0 supports simple single-condition predicates only.

## Submit configuration (server-driven only)

When a schema comes from a server, it may declare its submit endpoint:

```ts
type SubmitConfig = {
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
};
```

In v0.1.0 the `submit` block is carried on the schema type but the parser does
not interpret it, and there is no auto-submit. Opting in to auto-submit via a
`useForm` `auto` option is **planned for v0.2+**.

Note: `useForm` always accepts `onSubmit`. In v0.1.0 the consumer always
provides `onSubmit` themselves; the schema's `submit` is a hint, not a mandate.

## Example: complete schema

This example exercises the full target format and therefore uses features
**planned for v0.2+** (the `select` field type and `showWhen`). The `text`,
`email`, and `password` fields it uses ship in v0.1.0. For a schema that runs
in full against v0.1.0 today, see [`examples/basic`](../examples/basic).

```json
{
  "version": "1",
  "id": "signup-form",
  "fields": [
    {
      "id": "accountType",
      "type": "select",
      "label": "Account type",
      "options": [
        { "value": "personal", "label": "Personal" },
        { "value": "business", "label": "Business" }
      ],
      "default": "personal",
      "validation": { "required": true }
    },
    {
      "id": "companyName",
      "type": "text",
      "label": "Company name",
      "validation": { "required": true, "minLength": 2 },
      "showWhen": { "field": "accountType", "equals": "business" }
    },
    {
      "id": "email",
      "type": "email",
      "label": "Email address",
      "validation": { "required": true }
    },
    {
      "id": "password",
      "type": "password",
      "label": "Password",
      "validation": { "required": true, "minLength": 8 }
    }
  ],
  "submit": {
    "url": "/api/signup",
    "method": "POST"
  }
}
```

## Parser behavior

The schema parser, in v0.1.0:

1. Rejects schemas without `version: "1"` with a clear error
2. Rejects field types other than `text`, `email`, and `password` (the types implemented in v0.1.0)
3. Rejects validation rules incompatible with the field type (e.g. `min` on a `text` field)
4. Rejects duplicate field IDs
5. Rejects fields with a missing or empty `id`
6. Returns the validated input as a typed `FormSchema` (it does not currently transform into a separate normalized AST)

Planned for v0.2+:

- Rejecting `showWhen` that refers to a non-existent field ID (once `showWhen` is interpreted)
- Rejecting `pattern` strings that are not valid regex syntax — currently this fails at runtime in the validator instead

The parser is strict by design. Invalid schemas fail fast, not at runtime.

## Error reporting

The parser collects all issues before throwing. On invalid input, it throws
a `FormleSchemaError` containing an `issues: SchemaIssue[]` array, where each
issue has `{ path: string; message: string }`. The error's `.message` includes
a human-readable summary of all issues for direct logging.

Paths follow a dot-and-bracket notation rooted at the schema object:
`fields[0].validation.minLength`, `version`, `fields`, or `''` (root).

This behaviour allows consumers to surface all problems at once, rather than
fix one and rerun to discover the next.

## Adapters (input formats)

In v0.1.0 there is **one** input path: a Formle schema (a plain object), passed
through `parseSchema`. The bridge adapters below are **planned for v0.2+** and
are **not exported today**.

| Input                        | Adapter                      | Result       | Status        |
| ---------------------------- | ---------------------------- | ------------ | ------------- |
| Formle schema (plain object) | `parseSchema` (identity)     | `FormSchema` | v0.1.0        |
| Zod schema                   | `fromZod(zodSchema)`         | `FormSchema` | Planned v0.2+ |
| JSON Schema (Draft 2020-12)  | `fromJsonSchema(jsonSchema)` | `FormSchema` | Planned v0.2+ |

Adapters are intended to be pure converters: they produce a `FormSchema` and have no runtime cost beyond the conversion itself.

When `fromJsonSchema` lands it is expected to support common types (`string`, `number`, `boolean`, `object`) and common validation keywords (`required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `enum`, `format`). Advanced features (`oneOf`, `allOf`, `$ref`, `if/then/else`) are deferred further.

## Open questions

These are intentionally left undecided pending implementation. When making the decision, document the choice here.

- Should `default` values be set on form init, or only on first interaction?
- Should disabled fields participate in validation or not?
- What is the AST shape downstream layers consume? (Define in implementation.)
- Should the parser validate that `pattern` is a syntactically valid regex, rather than letting it fail at validation time? Decision: yes, defer to parser; not yet implemented.
