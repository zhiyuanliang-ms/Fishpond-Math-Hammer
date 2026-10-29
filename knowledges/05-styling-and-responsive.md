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
| `diceCalculator.css` | Calculator page layout: `.wound-success-container`, `.form-side`, `.result-side`, `.simulation-note`. |
| `formCard.css` | Shared compact card primitives: `.stat-line`, `.stat-cell`, `.reroll-row`, `.reroll-cell`, `.buff-row`, `.buff-chip*`. |
| `attackSimulator.css` | Attack Simulator-specific layout and controls: title badge, language toggle, `.profile-card`, `.precision-toggle`, etc. Same dark/amber palette as the rest. |
| `attackSimulatorProfiles.css` | Profile summaries, unit-buff panels, and buff-dialog layout for the Attack Simulator. |
| `attackSimulatorPages.css` | Secondary navigation plus Library and Comparison layouts. |
| `diceRoller.css` | Dice Roller-specific actions, tray, face counts, and result sections. |
| `cheatsheet.css` | Probability table. |
| `about.css`, `footer.css` | Self-explanatory. |

## Tabs
Simulator's secondary routes, Cheatsheet, Dice Calculator, and Library all
use `Tabs` and the same rules in `uiShared.css`: 13px text, gray inactive
labels, amber active underline, and a thin bottom border. Route links and
state-switching buttons share the style. On small screens, CSS grid gives
each item an equal-width column and a minimum 44px touch target.

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

### 40K Profile pages
- Library keeps New Profile, Import, and Export beside the Attacker/Defender
  tabs on desktop and mobile. These actions are icon-only, with localized
  accessible names and hover titles. Creating, duplicating, saving, or deleting
  a Profile does not insert a success-toast row that temporarily shifts the
  layout. Delete confirmation and failure messages remain visible.
- Comparison offers a button-styled Manage Profiles link only in its empty
  state, not in the page heading.
- Comparison and the Tactical Board line tool share `TACTICAL_LINE_COLORS`
  in `src/lib/colors.js`. The four attacker slots use Steel Blue, Diff Red,
  Diff Green, and Gold; Pearl remains available only on the board.
- Slot colors stay attached to their attacker when other slots are removed
  or results are ranked.
- Result table and bar-chart labels include the slot's additional buff
  suffixes in English. Long chart labels wrap on desktop as well as mobile
  so the suffixes are visible instead of being truncated.
- Simulator and Comparison use the shared `FormSelect` for saved Profiles.
  Menus are capped at 8 rows (based on current typography, padding, and
  touch-target height), automatically open above/below as space allows,
  and scroll vertically with contained wheel/touch scrolling. Long option
  labels wrap instead of widening the page. Selected labels and placeholders
  stay on one line with ellipsis inside the fixed-height control, so long
  placeholder text cannot push the dropdown indicator below its border.
- At 768px and below, the comparison table becomes labeled, stacked result
  cards using the same markup. Long names wrap and no horizontal table
  scrolling is needed. The run controls remain reachable at the bottom and
  completed comparisons scroll to the results, respecting reduced motion.
- Compact previews show two weapon/target entries. Their expansion button
  reveals every entry and buff without enabling profile-stat editing.
  A separate collapsible Additional Unit Buffs panel starts empty and edits
  only the comparison additions, with a button to clear those additions;
  repeated selections have independent panels and stable colors.
- Saved buffs are gray (`#b8bec8`) read-only summaries, not editable controls.
  Comparison additions are yellow (`#fbbf24`) and remain editable/removable.
  Saved and added buffs occupy separate preview rows so an overridden
  reroll still shows its original gray value beside the new yellow choice.
  Extra reroll selectors start unselected, offer only actual reroll buffs,
  and have a clear action; empty values automatically preserve saved rerolls.
  Simulator and Library buff editors retain their normal editing behavior.
- At 768px and below, `.attack-simulator-page` scopes 44px touch targets and
  16px input text to 40K pages. React-select reads the same control-height
  variable as native inputs. AoS and other pages retain their existing sizes.

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
