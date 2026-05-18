# Schema specification

This document defines the Formle schema format — the structure of data that, when passed to `useForm`, produces a working form.

> **Status:** v0 skeleton. Details are filled in during implementation. Update this document whenever a behavioural decision is made. Do not implement behaviour not described here without first adding it to this spec.

## Format identity

Formle schemas are plain JSON objects (or TypeScript objects with the same shape). They are not based on JSON Schema, though a JSON Schema adapter exists separately.

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

## Field types (v0.1.0)

| `type`     | Value type | Type-specific props |
| ---------- | ---------- | ------------------- |
| `text`     | `string`   | —                   |
| `email`    | `string`   | —                   |
| `password` | `string`   | —                   |
| `number`   | `number`   | —                   |
| `textarea` | `string`   | `rows?: number`     |
| `checkbox` | `boolean`  | —                   |
| `radio`    | `string`   | `options: Option[]` |
| `select`   | `string`   | `options: Option[]` |

```ts
type Option = {
  value: string;
  label: string;
};
```

Field types beyond this list are deferred to v0.2+. See `ROADMAP.md`.

## Validation

```ts
type ValidationRules = {
  required?: boolean;
  minLength?: number; // text, email, password, textarea
  maxLength?: number; // text, email, password, textarea
  min?: number; // number
  max?: number; // number
  pattern?: string; // RegExp source for text-like fields
  /** ID of a registered custom validator. See Custom validators below. */
  custom?: string;
};
```

Each rule applies only to compatible field types. The parser rejects incompatible combinations (e.g. `minLength` on `checkbox`).

Validation in v0.1.0 is **synchronous only**. Async validation is deferred to v0.2+.

Default error messages are English. They are customizable via the `useForm` `messages` option (not via the schema). Schema authors don't write error strings; the rendering layer does.

### Custom validators

Custom validators are registered globally and referenced by ID in the schema:

```ts
import { registerValidator } from "@formle/core";

registerValidator("matchesIBAN", (value: string) => {
  return /^[A-Z]{2}\d{2}/.test(value) ? null : "Invalid IBAN format";
});
```

Then in a schema:

```json
{
  "id": "iban",
  "type": "text",
  "validation": { "custom": "matchesIBAN" }
}
```

This indirection is intentional: schemas should remain serializable as plain JSON. Inline functions are not allowed.

## Conditional logic

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

If `submit` is present, the consumer may opt in to auto-submit via the `useForm` `auto` option. If `submit` is absent, the consumer provides `onSubmit` themselves.

Note: `useForm` always accepts `onSubmit` regardless of `submit` presence. The schema's `submit` is a hint, not a mandate.

## Example: complete schema

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

The schema parser:

1. Rejects schemas without `version: "1"` with a clear error
2. Rejects unknown field types
3. Rejects validation rules incompatible with the field type
4. Rejects `showWhen` referring to a non-existent field ID
5. Rejects duplicate field IDs
6. Produces a normalized AST that all downstream layers consume
7. (Planned) Rejects schemas with `pattern` strings that are not valid regex syntax — currently this fails at runtime in the validator instead.

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

Formle accepts schemas via three input paths:

| Input                        | Adapter                      | Result       |
| ---------------------------- | ---------------------------- | ------------ |
| Formle schema (plain object) | Identity                     | `FormSchema` |
| Zod schema                   | `fromZod(zodSchema)`         | `FormSchema` |
| JSON Schema (Draft 2020-12)  | `fromJsonSchema(jsonSchema)` | `FormSchema` |

Adapters are pure converters: they produce a `FormSchema` and have no runtime cost beyond the conversion itself.

`fromJsonSchema` in v0.1.0 supports common types (`string`, `number`, `boolean`, `object`) and common validation keywords (`required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `enum`, `format`). Advanced features (`oneOf`, `allOf`, `$ref`, `if/then/else`) are deferred to v0.2+.

## Open questions

These are intentionally left undecided pending implementation. When making the decision, document the choice here.

- Should `default` values be set on form init, or only on first interaction?
- Should disabled fields participate in validation or not?
- What is the AST shape downstream layers consume? (Define in implementation.)
- Should the parser validate that `pattern` is a syntactically valid regex, rather than letting it fail at validation time? Decision: yes, defer to parser; not yet implemented.
