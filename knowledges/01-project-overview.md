# Project Overview

## What it is
**Math Hammer** — a single-page React app that helps Warhammer 40k players
compute dice probabilities for the attack sequence and a few related tools.
Pure client-side; no backend.

## Tech stack
- **React 19** + **Vite 7** (ES modules, JSX, no TypeScript).
- **react-router-dom v7** for client-side routing (`BrowserRouter`).
- **zustand** for shared Macro Battleplan board state.
- **react-konva** + **konva** for Macro Battleplan canvas rendering.
- **react-select 5** for dropdowns (custom dark theme via `selectStyles.js`).
- **recharts 3** for distribution charts.
- **react-katex** + **katex** for σ (sigma) symbols in stat cards.
- **Vitest 4** for pure-logic and selected UI-helper tests.
- **ESLint 9** flat config (`eslint.config.js`).

No CSS framework and no backend.

## Pages (routes)
| Route | Component | Purpose |
|---|---|---|
| `/` and `/dice-calculator` | `DiceCalculator` | Hosts two sub-tabs: Wound Success Calculator and Kill Probability Calculator. |
| `/macro-battleplan` | `MacroBattleplan` | Edition shell: 11e battleplans (placeholder) plus the deprecated, flag-gated 10e board planner. |
| `/attack-simulator` | `AttackSimulator` | Full unit-vs-unit Monte Carlo simulator (multiple weapon profiles vs multiple target profiles, all 10e buffs). |
| `/dice-roller` | `DiceRoller` | Roll up to 20 D6 and selectively reroll any face value (e.g. "reroll all 1s"). |
| `/cheat-sheet` | `Cheatsheet` | Static probability tables (1D6 success chances and 2D6 sums) with color-coded risk levels. |
| `/about` | `About` | Author / project info, legacy-content opt-in, and local-storage reset. |

Routing entry point: [App.jsx](../src/App.jsx).

## Calculators

### Wound Success Calculator
Closed-form math. Given a hit stat, wound stat, modifiers (sustained hits,
lethal hits, devastating wounds, anti-X, rerolls, crit threshold), it produces:
- Hit / wound probabilities (with crit branches)
- Expected hits / crits / wounds / mortal wounds
- A binomial distribution chart over wound count

### Kill Probability Calculator
Monte Carlo simulation (`simulateKillProbability`, default 10 000 trials).
Computes:
- Distribution of models killed
- Expected kills (with 95% CI)
- Probability of killing all target models (with 95% CI)
- Expected unsaved attacks (closed-form binomial, not simulated)

### Attack Simulator (`AttackSimulator`)
Monte Carlo simulator for the full 10e attack sequence end-to-end. Unlike
the Kill Probability Calculator (which models a single weapon vs a single
target profile with fixed damage), this one supports:
- **Multiple weapon profiles** that fire in user-defined order, each with
  its own attacks/S/AP/D dice expressions and full buff set
  (TORRENT, LETHAL HITS, SUSTAINED 1/2, DEVASTATING WOUNDS, ANTI-X+).
- **Multiple target profiles** (e.g. squad + leader), each with its own
  T/W/Sv/Inv and defensive buffs (FNP, FNP vs MORTAL, −1 to hit, −1 to
  wound, conditional −1 wound when S>T, HALF DAMAGE, DAMAGE −1, DAMAGE = 1).
- **Persistence**: scenario auto-saves to `localStorage`; named slots library;
  JSON Import/Export (desktop only).
- **Precision toggle**: 1,000 iterations by default, 10,000 with "High
  precision".
Results:
- Expected Models Killed (with 95% CI and σ)
- Expected Damage Dealt (only shown for the single-target / single-model
  case, since the metric is meaningless once the unit is wiped)
- Chance to Wipe Unit
- Per-profile breakdown table (when there are 2+ target profiles)
- Distribution chart of total models killed

### Macro Battleplan (`MacroBattleplan`)
`MacroBattleplan` is only a shell that picks an edition:

| Tab | Component | Status |
|---|---|---|
| 11th Edition (default) | `MacroBattleplan11e` | Placeholder. Will ship the official GW battleplans with the matchup-specific (primary-task colour vs colour) terrain layouts built in. |
| 10th Edition | `MacroBattleplan10e` | Deprecated. Hidden unless the user opts in. |

**Legacy 10e opt-in**
- Toggled from the **Legacy Content** checkbox on the About page.
- Backed by `src/macro-battleplan/legacyEdition.js`, which stores the choice in
  `localStorage` under `macroBattleplan:legacy10e`.
- `MacroBattleplan` reads the flag when it mounts. The last-selected tab is
  persisted under `macroBattleplan:edition`, and is forced back to 11e whenever
  the opt-in is off.

#### 10e board (deprecated, flag-gated)
Interactive deployment / movement board for a standard 60" × 44" 40k table.
It supports:
- **Bases, terrain, and objectives**: round and oval bases, 40 mm objective
  markers, and the built-in WTC terrain presets.
- **Board editing tools**: drag/rotate pieces, lock terrain/objectives,
  mirror the battlefield setup, show live movement distance, and use drawing /
  ruler overlays on top of the board.
- **Persistence**: named saved boards in browser storage plus full-board JSON
  import/export.
- **Battlefield sharing**: compact text codes for the current terrain and
  objective layout only.

Battlefield share codes are intentionally narrower than a full board save:
- They include only **terrain + objective** placement, not bases or drawings.
- The compact format stores a terrain preset id plus x/y/rotation, and
  objective x/y placement.
- Load accepts either the raw code itself or a URL / fragment containing
  `battlefield=...`.
- Loading a battlefield code clears the current board pieces, rebuilds the
  shared terrain/objective layout, and leaves drawings untouched.

## What the app does NOT do
- No backend, no analytics, no auth.
- No cloud sync or multiplayer state; saved boards and battlefield sharing are
  browser-local only.
- No accessibility audit beyond stock semantic HTML.
- The Wound Success / Kill Probability calculators do not persist their
  inputs (Attack Simulator and Macro Battleplan are the persistent tools).
