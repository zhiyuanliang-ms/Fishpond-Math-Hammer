# Architecture

## Layered design

```
┌─────────────────────────────────────────────────────┐
│  Pages (src/components/*.jsx)                       │
│  - Hold form state                                  │
│  - Call lib/dice for math                           │
│  - Compose ui/ primitives                           │
└─────────────────────────────────────────────────────┘
        │                            │
        ▼                            ▼
┌──────────────────────┐   ┌────────────────────────┐
│ src/lib/dice/        │   │ src/components/ui/     │
│ Pure JS math/sim.    │   │ Pure presentational    │
│ No React, no DOM.    │   │ React. No business     │
│                      │   │ logic, no lib/dice     │
│                      │   │ imports.               │
└──────────────────────┘   └────────────────────────┘
```

**Direction of dependencies is one-way.** Pages depend on both lower layers.
Lower layers never import from pages or from each other.

`src/macro-battleplan/` is a separate feature slice. It does not depend on
`src/lib/dice/`; instead it combines page-private React components,
`react-konva` canvas rendering, and a feature-scoped Zustand store.

## Folder map

```
src/
├── App.jsx                     # Router shell
├── main.jsx                    # ReactDOM.createRoot entry
├── lib/
│   ├── attackSimStorage.js      # localStorage helpers for Attack Simulator
│   └── dice/                   # PURE LOGIC — see 03-dice-library.md
│       ├── index.js            # Barrel export
│       ├── constants.js        # DEFAULT_SIMULATIONS, Z_95, REROLL_VALUES
│       ├── probability.js      # D6 success / crit math
│       ├── binomial.js         # binomialProbability + buildDistribution
│       ├── woundDistribution.js# WoundSuccessCalculator-specific dist
│       ├── simulation.js       # Monte Carlo kill simulation (single-weapon)
│       ├── attackSimulation.js # Full unit-vs-unit Monte Carlo (Attack Simulator)
│       ├── diceExpression.js   # Parse/roll dice expressions (4, D6, D3+3, 2D6-1)
│       ├── killProbability.js  # Thin wrapper that parses form strings
│       ├── options.js          # react-select option arrays
│       └── __tests__/          # Vitest unit tests for the pure logic
├── components/
│   ├── ui/                     # SHARED UI — see 04-ui-components.md
│   │   ├── index.js            # Barrel export
│   │   ├── Page.jsx
│   │   ├── Tabs.jsx
│   │   ├── CalculatorLayout.jsx
│   │   ├── StatGrid.jsx
│   │   ├── StatCard.jsx
│   │   ├── DistributionChart.jsx
│   │   ├── FormSelect.jsx
│   │   │   ├── SavedSetControls.jsx
│   │   │   ├── BuffChipGroup.jsx
│   │   └── selectStyles.js
│   ├── attackSim/              # Attack-Simulator-only sub-components
│   │   ├── IntInput.jsx
│   │   ├── ProfileCardShell.jsx
│   │   ├── WeaponProfileCard.jsx
│   │   ├── TargetProfileCard.jsx
│   │   │   └── ...
│   ├── DiceCalculator.jsx      # Hosts the two calculator tabs
│   ├── WoundSuccessCalculator.jsx
│   ├── KillProbabilityCalculator.jsx
│   ├── AttackSimulator.jsx     # Top-level Attack Simulator page
│   ├── Cheatsheet.jsx
│   ├── About.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
│   ├── macro-battleplan/
│   │   ├── MacroBattleplan.jsx     # Edition shell (11e / legacy 10e tabs)
│   │   ├── MacroBattleplan11e.jsx  # 11e battleplans — placeholder
│   │   ├── MacroBattleplan10e.jsx  # Deprecated 10e board-planning page
│   │   ├── legacyEdition.js        # 10e opt-in flag (toggled from About)
│   │   ├── components/             # Board canvas, sidebar, toolbar, tokens
│   │   ├── config/board.js         # Map geometry, base sizes, terrain presets
│   │   ├── hooks/                  # Feature-scoped keyboard / drag helpers
│   │   └── store/boardStore.js     # Zustand state + persistence + history
└── styles/                     # Per-page CSS — see 05-styling-and-responsive.md
  ├── app.css                 # App shell; imports uiShared.css globally
  ├── uiShared.css            # Shared Tabs / form / stats / chart primitives
    ├── index.css
    ├── sidebar.css
  ├── diceCalculator.css      # Calculator page layout only
    ├── attackSimulator.css
  ├── macroBattleplan.css     # Macro Battleplan layout + controls + canvas UI
  ├── diceRoller.css
    ├── cheatsheet.css
  ├── formCard.css            # Shared compact stat/reroll/buff primitives
    ├── about.css
  └── footer.css
```

## Naming conventions
- React components: **PascalCase** files, **default export** (e.g. `StatCard.jsx`).
- Pure JS modules: **camelCase** files, **named exports** (e.g. `probability.js`).
- CSS classes: **kebab-case** (e.g. `.toolbar-button--danger`, BEM-ish modifier with `--`).
- Use `import { calculateHitProbability } from '../lib/dice'` (the barrel),
  not deep imports, so internal restructure stays cheap.

## State conventions
- Form fields are stored as **strings** (they come straight from `<input>` /
  `<select>` value) and parsed at the calculation boundary. `lib/dice` accepts
  strings where the original code did and parses internally.
- Most calculators own their own local `useState`.
- `src/macro-battleplan/store/boardStore.js` is the main exception: it uses
  Zustand because the canvas, sidebar, toolbar, and overlay layers all need
  shared board state, selection state, undo history, and persistence actions.

## Why this layering
- The math is the value. Keeping it React-free means it can be re-used in a
  CLI, a worker, or unit tests later with zero refactor.
- The `ui/` layer keeps the dark theme, react-select wiring, and chart config
  in one place. Adding a new calculator should mostly mean wiring existing
  primitives, not reinventing them.
- Shared classes used by `src/components/ui/` live in `src/styles/uiShared.css`.
  Page styles should own page layout only; they should not be the styling home
  for shared components.

## Page-specific sub-component folders
`src/components/attackSim/` is the first example of a **page-private**
sub-component folder — sub-components used only by `AttackSimulator.jsx`.
The rule: if a sub-component is only used by one page and is not generic
enough for `ui/`, put it in a same-named subfolder (`<page>Sim/`,
`<page>/`, etc.). This keeps `components/` from getting flat-cluttered
while staying out of the shared `ui/` namespace. `ProfileCardShell.jsx` and
`SavedSetControls.jsx` are good examples: reused inside the Attack Simulator,
but still too page-specific for the app-wide `ui/` layer.

`src/macro-battleplan/components/` follows the same rule. Pieces such as the
board canvas, board/sidebar controls, selection overlays, and terrain/base
tokens are feature-private and should not be moved into `src/components/ui/`
unless they become genuinely reusable outside Macro Battleplan.

## Persistence layer (`src/lib/attackSimStorage.js`)

The Attack Simulator persists four things to **`localStorage`**:

| Key | Shape | Purpose |
|---|---|---|
| `attackSim:scenario:v1` | `{ weapons, targets, highPrecision }` | Auto-saved current scenario (debounced 300 ms). |
| `attackSim:library:v1` | `{ [name]: scenario }` | Named scenario slots ("Save As…"). |
| `attackSim:weaponSets:v1` | `{ [name]: { weapons } }` | Reusable attacker profile sets. |
| `attackSim:targetSets:v1` | `{ [name]: { targets } }` | Reusable defender profile sets. |

### Why `localStorage` (and not IndexedDB)
The data is small and the API needs to be **synchronous** so React's lazy
`useState` initializers can read it during the first render with no
hydration / loading state. Sizing budget for the 5 MB per-origin quota
(Safari / iOS being the tightest):

- Single weapon JSON ≈ 280–400 B; single target ≈ 230–310 B.
- Typical scenario (5 weapons + 3 targets) ≈ 3 KB → **~1,600** fit in 5 MB.
- Big scenario (20 weapons + 10 targets) ≈ 11 KB → **~450** fit in 5 MB.
- Pure attacker-set library: **~2,500** sets fit in 5 MB.

Realistic users save tens, not thousands, of slots, so localStorage is
~2–3 orders of magnitude away from being a constraint. The cost of
switching to IndexedDB (async API, hydration sequencing, more code) is
not justified.

### Quota handling
Writes from the explicit "Save As…" / "Save attacker set…" / "Save defender
set…" handlers re-throw browser `QuotaExceededError` as
`StorageQuotaError`, which the UI catches and surfaces as a toast
(*"Browser storage is full…"*). The debounced auto-save swallows it
silently — the user already sees the error on their explicit action, and
the on-screen scenario remains intact. Disabled-storage / private-mode
failures (anything other than quota) are also swallowed silently, so
the app degrades gracefully to a non-persistent session.

## Macro Battleplan persistence (`src/macro-battleplan/store/boardStore.js`)

Two small `localStorage` keys live outside the board store:

| Key | Owner | Values | Purpose |
|---|---|---|---|
| `macroBattleplan:legacy10e` | `legacyEdition.js` | `'1'` or absent | Opt-in that reveals the deprecated 10e tab. Toggled by the **Legacy Content** checkbox on the About page. |
| `macroBattleplan:edition` | `MacroBattleplan.jsx` | `'11e'` \| `'10e'` | Last-selected edition tab. Ignored (forced to `11e`) while the opt-in is off. |

Macro Battleplan keeps board state in a Zustand store because several UI
surfaces mutate the same data: the Konva canvas, the sidebar actions, the
selection inspector, the drawing toolbar, and undo history.

It persists / exchanges three related formats:

| Mechanism | Shape | Purpose |
|---|---|---|
| Saved boards in `localStorage` | `fishpond-mathhammer-macro-battleplan:boards` -> `[{ name, savedAt, pieces, drawings }]` | Named full-board saves loaded from the sidebar. The store also reads the legacy key `40k-macro-battleplan:boards` for continuity. |
| Full board JSON import/export | `{ schema: 'fishpond-mathhammer-macro-battleplan/v1', savedAt, pieces, drawings }` | Download / upload complete board snapshots, including bases and drawings. |
| Battlefield share code | Compact `bf1|t=...|o=...` string, plus legacy base64url JSON with schema `fishpond-mathhammer-macro-battlefield/v1` | Share only terrain + objective layout in a much shorter text form. |

### Compact battlefield share format
- Prefix: `bf1`
- Terrain section: `t=` with entries shaped as `presetId,x,y,rotation`
- Objective section: `o=` with entries shaped as `x,y`
- Numeric values are rounded to whole pixels / degrees and encoded in base 36
  to keep the string short.

Example shape:

```text
bf1|t=3sr,lo,5u,0;2sr,pf,5u,2i|o=sc,bo;vf,bo
```

### Share/import behavior
- Share codes intentionally exclude **bases** and **drawings**.
- Terrain is reconstructed from its preset id (`3sr`, `2sr`, `cont`) plus
  placement, rather than exporting the full rendered terrain object.
- Import accepts either a raw code or a URL / fragment containing
  `battlefield=...`.
- The importer keeps backward compatibility with the earlier long base64url
  battlefield payload.
- Loading a battlefield code clears the current board pieces, replaces them
  with the shared terrain/objective layout, and leaves drawings untouched.