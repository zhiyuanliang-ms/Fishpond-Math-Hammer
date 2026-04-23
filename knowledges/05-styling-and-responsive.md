# Styling & Responsive Design

## Approach
- Plain CSS files in `src/styles/`, one per page/area. No CSS modules, no
  styled-components, no Tailwind.
- Each page component imports its own stylesheet at the top.
- `app.css` imports `tabs.css` globally so `<Tabs>` works everywhere.
- Dark theme. Background `#1a1a1a`–`#2a2a2a`, accents amber `#fbbf24` and
  blue `#60a5fa`.

## File map
| File | Owns |
|---|---|
| `index.css` | Global resets, body, generic inputs (incl. `input[type="number"]` width). |
| `app.css` | App shell layout (`.app`, `.main-wrapper`, `.main-content`, `.page h1`). Imports `tabs.css`. |
| `sidebar.css` | Sidebar nav. |
| `tabs.css` | `.tabs`, `.tab-button`. |
| `diceCalculator.css` | Both calculators (`.wound-success-container`, `.kill-probability-container`, `.form-row`, `.form-row--split`, `.result-stats`, `.stat-value`, `.chart-container`, etc.). |
| `cheatsheet.css` | Probability table. |
| `about.css`, `footer.css` | Self-explanatory. |

## Responsive breakpoints
Three tiers, applied consistently across files:

| Breakpoint | Trigger | What changes |
|---|---|---|
| `≤ 960px` | tablet | Sidebar collapses to a horizontal bar above content. Main padding reduces to `24px 16px`. |
| `≤ 768px` | small tablet / large phone | Calculator splits stack vertically. Form rows stack EXCEPT `.form-row--split` rows (two small numeric inputs) which stay side-by-side. Stat grid drops to 2 columns. Cheatsheet table padding/font shrinks. |
| `≤ 480px` | phone | Sidebar restacks vertically (title above nav). Stat grid drops to 1 column. Page H1 → 24px. Main padding → `16px 12px`. Cheatsheet table padding/font shrinks again. |

The `.form-row--split` class is the key trick: it lets two small inputs share
a row on phones without stacking awkwardly. Apply it on rows that contain
exactly two small fields.

## Number inputs
`input[type="number"]` has a fixed `width: 102px` for desktop alignment, but
also `max-width: 100%` so it never overflows narrow containers. On mobile
split rows the rule `.form-row.form-row--split input[type="number"] { width: 100% }`
makes them fill their flex column.

## Charts
- All charts are wrapped in recharts' `ResponsiveContainer` and shrink with
  the viewport.
- The chart container uses `overflow-x: hidden` on mobile to defeat any
  recharts internal overflow on very narrow widths.

## Color-coded probabilities (cheatsheet)
`Cheatsheet.jsx` has a `probabilityClass(p)` helper that returns one of:
`healthy`, `medium`, `risky`, `extremely-risky`, `suicide`. Style overrides
live in `cheatsheet.css`. If you add a new threshold, update both the helper
and the CSS.

## How to test responsive changes
See [`06-dev-workflow.md`](./06-dev-workflow.md) → "Mobile testing".
