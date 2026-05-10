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
│   │   └── selectStyles.js
│   ├── attackSim/              # Attack-Simulator-only sub-components
│   │   ├── IntInput.jsx
│   │   ├── ProfileCardShell.jsx
│   │   ├── SavedSetControls.jsx
│   │   ├── WeaponProfileCard.jsx
│   │   ├── TargetProfileCard.jsx
│   │   └── BuffChipGroup.jsx
│   ├── DiceCalculator.jsx      # Hosts the two calculator tabs
│   ├── WoundSuccessCalculator.jsx
│   ├── KillProbabilityCalculator.jsx
│   ├── AttackSimulator.jsx     # Top-level Attack Simulator page
│   ├── Cheatsheet.jsx
│   ├── About.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
└── styles/                     # Per-page CSS — see 05-styling-and-responsive.md
  ├── app.css                 # App shell; imports uiShared.css globally
  ├── uiShared.css            # Shared Tabs / form / stats / chart primitives
    ├── index.css
    ├── sidebar.css
  ├── diceCalculator.css      # Calculator page layout only
    ├── attackSimulator.css
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
- Each calculator owns its own local `useState`. No global store.

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