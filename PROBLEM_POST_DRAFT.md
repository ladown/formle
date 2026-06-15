There's a class of forms almost every fintech team in Europe ships, and almost no Vue or React form library treats as first-class: KYC and compliance flows.

The pattern is easy to spot. A team ships a solid onboarding form. Months later a regulator changes the rules for one jurisdiction - an extra source-of-funds question, a different national ID format, a new document for one country. The form didn't change; the schema behind it did. And the usual fix is to redeploy the frontend.

Most form libraries are excellent at building forms in code - TypeScript types, Zod, hand-written components. That's the right model for a form you ship once. It breaks the moment a field has to change outside your release cycle. KYC is just the sharpest version of a broader shape: forms where the schema is a runtime input, not a build-time artifact.

Genuine question to anyone shipping configurable or regulated forms: how do you handle schema changes that don't fit a release cycle? I'd rather hear your patterns than guess.
