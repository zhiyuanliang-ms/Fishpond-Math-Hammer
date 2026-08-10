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
| `/` and `/attack-simulator` | `AttackSimulatorV2` | Full unit-vs-unit Monte Carlo simulator with profile and unit-wide buffs. |
| `/dice-calculator` | `DiceCalculator` | Hosts two sub-tabs: Wound Success Calculator and Kill Probability Calculator. |
| `/macro-battleplan` | `MacroBattleplan` | Official 11e battleplans with base, drawing, ruler, mission-card, and scoring tools. |
| `/dice-roller` | `DiceRoller` | Roll up to 20 D6 and selectively reroll any face value (e.g. "reroll all 1s"). |
| `/cheat-sheet` | `Cheatsheet` | Static probability tables (1D6 success chances and 2D6 sums) with color-coded risk levels. |
| `/about` | `About` | Author / project info and local-storage reset. |

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

### Attack Simulator (`AttackSimulatorV2`)
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
The official GW battleplan for the chosen Force Disposition pairing is the
board, with base, drawing, ruler, mission-card, and scoring tools on top.

- 5 Force Dispositions × 15 pairings × 3 terrain layouts (A/B/C) = 45 official maps,
  indexed in `src/macro-battleplan/config/battleplans11e.js`.
- Two image variants per map in `public/battleplans-11e/`, built by
  `tools/build_11e_map_assets.py`: `map_XX.webp` is the clean board (880×1200 =
  20 px/inch, matching `PX_PER_INCH`) and `map_XX_ref.webp` is the original
  annotated page map shown by the reference pop-up on the canvas.
- The book button on the canvas opens both Primary Mission cards for the
  current Force Disposition matchup. Mirror matchups share one card; the 11
  two-sided missions include a flip control. The 25 fronts and 11 backs live
  under `public/battleplans-11e/primary-missions/`.
- Terrain, objectives and deployment zones are part of the printed layout and
  are not user-editable; only bases and drawings are.

## What the app does NOT do
- No backend, no analytics, no auth.
- No cloud sync or multiplayer state; saved boards and battlefield sharing are
  browser-local only.
- No accessibility audit beyond stock semantic HTML.
- The Wound Success / Kill Probability calculators do not persist their
  inputs (Attack Simulator and Macro Battleplan are the persistent tools).
