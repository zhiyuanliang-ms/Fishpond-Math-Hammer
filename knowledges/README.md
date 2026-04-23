# Project Knowledge Base

This folder is the **handoff packet** for any AI agent (or human dev) taking
over this project. Read these in order:

1. [`01-project-overview.md`](./01-project-overview.md) — what the app is and the user-facing features.
2. [`02-architecture.md`](./02-architecture.md) — folder layout, layering rules, and naming conventions.
3. [`03-dice-library.md`](./03-dice-library.md) — the pure-logic `src/lib/dice/` library reference.
4. [`04-ui-components.md`](./04-ui-components.md) — shared presentational components in `src/components/ui/`.
5. [`05-styling-and-responsive.md`](./05-styling-and-responsive.md) — CSS organization, theme, and mobile breakpoints.
6. [`06-dev-workflow.md`](./06-dev-workflow.md) — commands, lint/build, branching, common pitfalls.
7. [`07-extending-the-app.md`](./07-extending-the-app.md) — recipes for adding a new calculator, page, or stat card.
8. [`08-glossary.md`](./08-glossary.md) — Warhammer 40k terminology used in the code (BS/WS, AP, FNP, etc.).

## Golden rules (read first)

- **Pure logic stays in `src/lib/dice/`** — no React, no DOM, no CSS. Everything
  there must be unit-testable in isolation.
- **Reusable presentational components live in `src/components/ui/`** — they
  must not import anything from `src/lib/dice/` and must not own business
  state. They take props and render.
- **Page-level components in `src/components/`** are thin glue: they call
  `lib/dice` for math, hold form state, and compose `ui/` primitives.
- **Always run `npm run lint` and `npm run build` before declaring done.**
  Both must pass with zero errors.
- **Do not add features the user did not ask for.** This codebase is
  intentionally small.
