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
│   └── dice/                   # PURE LOGIC — see 03-dice-library.md
│       ├── index.js            # Barrel export
│       ├── probability.js      # D6 success / crit math
│       ├── binomial.js         # binomialProbability + buildDistribution
│       ├── woundDistribution.js# WoundSuccessCalculator-specific dist
│       ├── simulation.js       # Monte Carlo kill simulation
│       ├── killProbability.js  # Thin wrapper that parses form strings
│       └── options.js          # react-select option arrays
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
│   │   ├── LabeledCheckbox.jsx
│   │   └── selectStyles.js
│   ├── DiceCalculator.jsx      # Hosts the two calculator tabs
│   ├── WoundSuccessCalculator.jsx
│   ├── KillProbabilityCalculator.jsx
│   ├── Cheatsheet.jsx
│   ├── About.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
└── styles/                     # Per-page CSS — see 05-styling-and-responsive.md
    ├── app.css                 # Imports tabs.css globally
    ├── index.css
    ├── sidebar.css
    ├── diceCalculator.css
    ├── cheatsheet.css
    ├── about.css
    ├── footer.css
    └── tabs.css
```

## Naming conventions
- React components: **PascalCase** files, **default export** (e.g. `StatCard.jsx`).
- Pure JS modules: **camelCase** files, **named exports** (e.g. `probability.js`).
- CSS classes: **kebab-case** (e.g. `.form-row--split`, BEM-ish modifier with `--`).
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
