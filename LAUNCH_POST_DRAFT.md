Formle is a headless, schema-driven form library for Vue 3 where the schema is data, not code — so a form can be defined by your backend and rendered without a redeploy.

Most Vue form libraries assume the schema lives in your source. That breaks down the moment forms become configurable: think a multi-tenant SaaS where every tenant defines its own fields. You either ship a release for each change or build a bespoke renderer. Formle treats a schema fetched from an API as a first-class input — the same `useForm` call that takes a local TypeScript schema takes a remote one.

It's TypeScript-first, with inference flowing from the schema through to the submit handler. It's fully headless: no styled components, no CSS, no opinion about how your form looks — Formle owns state, validation, and the submit lifecycle; you own the markup. The Vue 3 adapter is the first release. It sits on a framework-agnostic core, with React/Svelte adapters planned for v0.2+. Built on the Oxc toolchain.

It's v0.1.0 — small on purpose, with a roadmap that's explicit about what it deliberately won't do. If you've built configurable or server-driven forms, I'd value the adversarial read: what would break this for your use case? The schema format and the headless boundary are the two decisions most worth pressure-testing.

GitHub: https://github.com/ladown/formle

Built it to scratch a real itch. Curious whether it scratches yours.

Screenshots and a quick demo in the comments.

#VueJS #TypeScript #OpenSource #Frontend

## First comment (post immediately after the main post)

One design decision worth calling out: `parseSchema` collects _every_ problem before it throws. Instead of failing on the first bad field and making you fix-and-rerun, it gathers all the schema-level issues and throws a single `FormleSchemaError` with the full `issues[]` array — each with a path and a message. For server-driven schemas that's the difference between debugging a remote payload one error at a time and seeing everything wrong at once. It's a small thing that matters a lot when the schema isn't in your source tree.

Schema format spec: https://github.com/ladown/formle/blob/master/docs/SCHEMA_SPEC.md
Runnable example: https://github.com/ladown/formle/tree/master/examples/basic
