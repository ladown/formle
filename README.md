# Formle

Headless, schema-driven form library for Vue 3 with first-class support for server-driven schemas.

> **Status:** Pre-v0.1.0 development. Not yet published to npm. Public release planned for late 2026.

## Why Formle

The Vue ecosystem has good form libraries — but most assume the schema lives in your code. Formle is built around a different assumption: **schemas are data, and data can come from anywhere**, including a backend response.

This makes Formle a natural fit for:

- Admin panels and CRMs with user-configurable forms
- Compliance and KYC flows where forms change without redeployment
- Multi-tenant SaaS where each tenant defines custom fields
- Dynamic surveys and questionnaires
- Any product where forms are content, not code

You can still write schemas in TypeScript — that path is fully supported and recommended for most use cases. Server-driven is an additional capability, not a replacement.

## Design principles

- **Headless** — Formle provides state, validation, and lifecycle. Rendering is yours.
- **Server-driven first-class** — a schema from your API renders a working form, no codegen required.
- **TypeScript DX** — full type inference from schema to submit handler. Nothing is `unknown`.
- **No magic** — every behaviour is explicit. No hidden global state, no auto-imports.

## Architecture

Formle is a monorepo of two published packages:

- **`@formle/core`** — framework-agnostic core (schema parsing, validation engine, form state)
- **`@formle/vue`** — Vue 3 adapter (composables, components, slot-based rendering)

Future adapters (React, Svelte) will follow the same pattern. See `docs/ARCHITECTURE.md`.

## Quick preview

The API below is the target shape for v0.1.0. It is not yet implemented.

```vue
<script setup lang="ts">
import { useForm } from "@formle/vue";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { fields, handleSubmit, isSubmitting } = useForm({
  schema,
  onSubmit: async (values) => {
    await api.signIn(values);
  },
});
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-bind="fields.email" />
    <input v-bind="fields.password" type="password" />
    <button :disabled="isSubmitting">Sign in</button>
  </form>
</template>
```

Server-driven path:

```ts
const remoteSchema = await fetch("/api/forms/signup").then((r) => r.json());
const { fields, handleSubmit } = useForm({ schema: remoteSchema, onSubmit });
```

## Documentation

| Topic                     | File                                           |
| ------------------------- | ---------------------------------------------- |
| What's in v0.1.0          | [docs/ROADMAP.md](./docs/ROADMAP.md)           |
| Schema format spec        | [docs/SCHEMA_SPEC.md](./docs/SCHEMA_SPEC.md)   |
| Architecture and packages | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Toolchain                 | [docs/TOOLING.md](./docs/TOOLING.md)           |
| Contributing              | [CONTRIBUTING.md](./CONTRIBUTING.md)           |

## License

MIT — see [LICENSE](./LICENSE).
