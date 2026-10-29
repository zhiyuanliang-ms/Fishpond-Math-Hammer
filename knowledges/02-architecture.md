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
│   ├── attackSimProfileLibrary.js # Profile library JSON shape and validation
│   ├── attackSimProfiles.js     # Profile defaults, hydration, and serialization
│   ├── attackSimComparison.js   # Saved Profile comparison runner
│   ├── attackSimReport.js       # Complete localized 40K report formatter
│   ├── aosAttackReport.js       # AoS Markdown report formatter
│   └── dice/                    # PURE LOGIC — see 03-dice-library.md
│       ├── index.js            # Barrel export
│       ├── constants.js        # DEFAULT_SIMULATIONS, Z_95, REROLL_VALUES
│       ├── probability.js      # Closed-form D6 success / crit math (test reference)
│       ├── aos.js              # AoS 4E exact damage math + Monte Carlo
│       ├── binomial.js         # binomialProbability + buildDistribution
│       ├── woundPool.js        # Exact wound distribution (Wound Success Calculator)
│       ├── d6Rerolls.js        # Shared D6 evaluation and reroll policies
│       ├── chargeProbability.js# 2D6/3D6 charge tables (Cheat Sheet)
│       ├── attackSimulation.js # Full unit-vs-unit Monte Carlo (Attack Simulator)
│       ├── unitBuffMerge.js    # Weapon/unit and target/unit buff merging
│       ├── diceExpression.js   # Parse/roll dice expressions (4, D6, D3+3, 2D6-1)
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
│   ├── attackSim/              # Shared simulator inputs, shell, and language
│   │   ├── IntInput.jsx
│   │   ├── ProfileCardShell.jsx
│   │   └── lang.jsx
│   ├── attackSimulator/        # 40K sub-pages, Profile editors, and previews
│   │   ├── WeaponProfileCard.jsx
│   │   ├── TargetProfileCard.jsx
│   │   └── ...
│   ├── DiceCalculator.jsx      # Hosts the two calculator tabs
│   ├── WoundSuccessCalculator.jsx
│   ├── AoSDamageCalculator.jsx
│   ├── AttackSimulator.jsx     # 40K simulation workspace
│   ├── AoSAttackSimulator.jsx  # Top-level AoS Attack Simulator page
│   ├── Cheatsheet.jsx
│   ├── About.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
│   ├── macro-battleplan/
│   │   ├── MacroBattleplan.jsx     # Macro Battleplan route component
│   │   ├── MacroBattleplan11e.jsx  # 11e board page
│   │   ├── board11e/               # 11e canvas, sidebar, map + mission dialogs
│   │   ├── components/             # Base controls, overlays, toolbar, scoreboard
│   │   ├── config/board.js         # Base sizes, colors, and drawing constants
│   │   ├── config/battleplans11e.js # 45 maps, mission matrix + asset URLs
│   │   ├── hooks/                  # Feature-scoped keyboard / drag helpers
│   │   └── store/board11eStore.js  # Zustand state (bases, drawings, setup)
└── styles/                     # Per-page CSS — see 05-styling-and-responsive.md
  ├── app.css                 # App shell; imports uiShared.css globally
  ├── uiShared.css            # Shared Tabs / form / stats / chart primitives
    ├── index.css
    ├── sidebar.css
  ├── diceCalculator.css      # Calculator page layout only
    ├── attackSimulator.css
    ├── attackSimulatorProfiles.css
    ├── attackSimulatorPages.css
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
- `src/macro-battleplan/store/board11eStore.js` is the main exception: it uses
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
`src/components/attackSim/` contains profile-card primitives shared by the
40K and AoS simulators. `src/components/attackSimulator/` contains the 40K
secondary pages and their shared Profile editing/preview components.
The rule: if a sub-component is only used by one page and is not generic
enough for `ui/`, put it in a same-named subfolder (`<page>Sim/`,
`<page>/`, etc.). This keeps `components/` from getting flat-cluttered
while staying out of the shared `ui/` namespace. `ProfileCardShell.jsx` and
`SavedSetControls.jsx` are good examples: reused inside the Attack Simulator,
but still too page-specific for the app-wide `ui/` layer.

`src/macro-battleplan/components/` follows the same rule. Pieces such as the
base controls, selection overlays, scoreboard, and drawing toolbar are
feature-private and should not be moved into `src/components/ui/` unless they
become genuinely reusable outside Macro Battleplan.

The 11e Force Disposition matrix remains owned by
`config/battleplans11e.js`. `MacroBattleplan11e` resolves the current pairing
once and passes that result to both the map canvas and `MissionCardsButton`;
the dialog does not keep a second matchup state. The exhaustive directed-
pairing and mission-asset check lives in `config/__tests__/battleplans11e.test.js`.

## Persistence layer (`src/lib/attackSimStorage.js`)

The Attack Simulator persists two reusable Profile libraries to
**`localStorage`**:

| Key | Shape | Purpose |
|---|---|---|
| `attackSim:attackerProfiles` | `{ [name]: { weapons, unitBuffs } }` | Reusable attacker Profiles. |
| `attackSim:defenderProfiles` | `{ [name]: { targets, defenderUnitBuffs } }` | Reusable defender Profiles. |
| `attackSim_lang` | `'en'` or `'zh'` | 40K UI language (owned by `components/attackSim/lang.jsx`). |

About > Clear storage removes all three keys plus the Tactical Board keys.

Each side exports and imports independently. An import merges the file into
the existing library and overwrites same-name Profiles without prompting;
unrelated locally saved Profiles remain intact.

Profile save, create, rename, and duplicate actions use `ProfileNameDialog`
instead of browser-native prompts. The dialog validates names and confirms
overwrites in-page. A failed storage write keeps the dialog and entered name
open and displays the error; successful writes refresh the saved-name list.

### Why `localStorage` (and not IndexedDB)
The data is small and the API needs to be **synchronous** so React's lazy
`useState` initializers can read it during the first render with no
hydration / loading state. Sizing budget for the 5 MB per-origin quota
(Safari / iOS being the tightest):

- Single weapon JSON ≈ 280–400 B; single target ≈ 230–310 B.
- Pure attacker-set library: **~2,500** sets fit in 5 MB.

Realistic users save tens, not thousands, of slots, so localStorage is
~2–3 orders of magnitude away from being a constraint. The cost of
switching to IndexedDB (async API, hydration sequencing, more code) is
not justified.

### Quota handling
Writes from the explicit "Save attacker Profile…" / "Save defender Profile…"
and library-import handlers re-throw browser `QuotaExceededError` as
`StorageQuotaError`, which the UI catches and surfaces as a toast
(*"Browser storage is full…"*). Disabled-storage / private-mode failures
degrade gracefully to a non-persistent session and imports surface the
storage failure explicitly.

## Macro Battleplan persistence (`src/macro-battleplan/store/board11eStore.js`)

The Macro Battleplan keeps live bases, drawings, selection, undo history
(50 steps), setup, mission plan, and scoreboard state in one Zustand store.
Setup, mission plan, and scoreboard values persist automatically in small
`localStorage` entries:

| Key | Owner | Values | Purpose |
|---|---|---|---|
| `macroBattleplan11e:setup` | `board11eStore.js` | `{ mine, theirs, layout }` | Last selected Force Dispositions and terrain layout. |
| `macroBattleplan11e:scoreboard` | `board11eStore.js` | Player names and five rounds of scores | Legacy recorded scores, kept for exports. |
| `macroBattleplan11e:missionPlan` | `board11eStore.js` | Primary/secondary planning per side | Restores the Missions & VP planner. |

Bases and drawings stay in memory until the user exports them;
`MacroBattleplan11e` registers a `beforeunload` warning while any exist. The
sidebar exchanges one complete JSON format:

| Mechanism | Shape | Purpose |
|---|---|---|
| Full board JSON import/export | `{ schema: 'fishpond-mathhammer-battleplan-11e/v1', setup, bases, drawings, scoreboard, missionPlan }` | Download or restore the complete editable state layered over an official map. |

Base and drawing coordinates are serialized as inches from the top-left of the
44×60-inch board, so exports stay readable and independent of canvas pixels.