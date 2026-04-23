# Project Overview

## What it is
**Math Hammer** — a single-page React app that helps Warhammer 40k players
compute dice probabilities for the attack sequence and a few related tools.
Pure client-side; no backend.

## Tech stack
- **React 19** + **Vite 7** (ES modules, JSX, no TypeScript).
- **react-router-dom v7** for client-side routing (`BrowserRouter`).
- **react-select 5** for dropdowns (custom dark theme via `selectStyles.js`).
- **recharts 3** for distribution charts.
- **react-katex** + **katex** for σ (sigma) symbols in stat cards.
- **ESLint 9** flat config (`eslint.config.js`).

No state library, no CSS framework, no test runner is currently configured.

## Pages (routes)
| Route | Component | Purpose |
|---|---|---|
| `/` and `/dice-calculator` | `DiceCalculator` | Hosts two sub-tabs: Wound Success Calculator and Kill Probability Calculator. |
| `/dice-roller` | `DiceRoller` | Roll up to 20 D6 and selectively reroll any face value (e.g. "reroll all 1s"). |
| `/cheat-sheet` | `Cheatsheet` | Static probability tables (1D6 success chances and 2D6 sums) with color-coded risk levels. |
| `/about` | `About` | Author / project info. |

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

## What the app does NOT do
- No save/load of profiles.
- No backend, no analytics, no auth.
- No test suite (yet).
- No accessibility audit beyond stock semantic HTML.
