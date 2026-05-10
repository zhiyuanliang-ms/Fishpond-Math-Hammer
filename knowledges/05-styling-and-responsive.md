# Styling & Responsive Design

## Approach
- Plain CSS files in `src/styles/`, one per page/area. No CSS modules, no
  styled-components, no Tailwind.
- `app.css` imports `uiShared.css` globally so shared UI primitives (`Tabs`,
  `StatCard`, `DistributionChart`, `calculator-form`, etc.) work everywhere.
- Page components still import their own stylesheet at the top for page-specific
  layout and one-off visuals.
- Dark theme. Background `#1a1a1a`–`#2a2a2a`, accents amber `#fbbf24` and
  blue `#60a5fa`.

## File map
| File | Owns |
|---|---|
| `index.css` | Global resets, body, generic inputs (incl. `input[type="number"]` width). |
| `app.css` | App shell layout (`.app`, `.main-wrapper`, `.main-content`, `.page h1`). Imports `uiShared.css`. |
| `uiShared.css` | Shared UI primitives: `.tabs`, `.tab-button`, `.calculator-form`, `.form-row`, `.form-group`, `.result-stats`, `.stat-card`, `.chart-container`. |
| `sidebar.css` | Sidebar nav. |
| `diceCalculator.css` | Calculator page layout: `.wound-success-container`, `.kill-probability-container`, `.form-side`, `.result-side`, `.simulation-note`. |
| `formCard.css` | Shared compact card primitives: `.stat-line`, `.stat-cell`, `.reroll-row`, `.reroll-cell`, `.buff-row`, `.buff-chip*`. |
| `attackSimulator.css` | Attack Simulator-specific layout and controls: `.attack-sim-toolbar`, `.toolbar-button`, `.toolbar-select`, `.profile-card`, `.precision-toggle`, etc. Same dark/amber palette as the rest. |
| `diceRoller.css` | Dice Roller-specific actions, tray, face counts, and result sections. |
| `cheatsheet.css` | Probability table. |
| `about.css`, `footer.css` | Self-explanatory. |

## Responsive breakpoints
Three tiers, applied consistently across files:

| Breakpoint | Trigger | What changes |
|---|---|---|
| `≤ 960px` | tablet | Sidebar collapses to a horizontal bar above content. Main padding reduces to `24px 16px`. |
| `≤ 768px` | small tablet / large phone | Calculator layouts stack vertically. Shared `.calculator-form` padding tightens. Shared `.form-row` stacks, while `formCard.css` rows (`.stat-line`, `.reroll-row`) keep wrapping compactly. Stat grid drops to 2 columns. Cheatsheet table padding/font shrinks. |
| `≤ 480px` | phone | Sidebar restacks vertically (title above nav). Stat grid drops to 1 column. Dice tray becomes denser. Page H1 → 24px. Main padding → `16px 12px`. Cheatsheet table padding/font shrinks again. |

Ownership rule of thumb: if a class is used by a shared component, it belongs
in `uiShared.css` or `formCard.css`. If it is tied to one page's structure, it
belongs in that page's stylesheet.

## Number inputs
`input[type="number"]` has a fixed `width: 102px` for desktop alignment, but
also `max-width: 100%` so it never overflows narrow containers. On mobile
layouts the shared `.form-row` stacks vertically, and the `formCard.css`
selectors inside `.stat-cell` make compact numeric inputs fill the available
cell width.

## Charts
- All charts are wrapped in recharts' `ResponsiveContainer` and shrink with
  the viewport.
- The shared `.chart-container` uses `overflow-x: hidden` on mobile to defeat any
  recharts internal overflow on very narrow widths.

## Color-coded probabilities (cheatsheet)
`Cheatsheet.jsx` has a `probabilityClass(p)` helper that returns one of:
`healthy`, `medium`, `risky`, `extremely-risky`, `suicide`. Style overrides
live in `cheatsheet.css`. If you add a new threshold, update both the helper
and the CSS.

## How to test responsive changes
See [`06-dev-workflow.md`](./06-dev-workflow.md) → "Mobile testing".
