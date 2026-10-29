# `src/components/ui/` — Shared UI Components

Presentational only. **Do not** import from `src/lib/dice/`. **Do not** own
business state. Take props in, render JSX out.

Import from the barrel:

```js
import {
  Page, Tabs, CalculatorLayout, StatGrid, StatCard,
  DistributionChart, FormSelect,
} from './ui'
```

## Components

### `Page`
Wraps content in `.page`. Optional `title` and `actions` render as sibling
elements in the shared `.page-header`. An optional `className` scopes
page-specific styles without affecting other pages.
```jsx
<Page title="Cheat Sheet" actions={<Toolbar />}>…</Page>
```

### `Tabs`
```jsx
<Tabs
  value={current}
  onChange={setCurrent}
  ariaLabel="Calculator views"
  tabs={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
/>
```
For route navigation, give entries a `to` URL and optional `end` flag.
Those entries render `NavLink`s and derive their active state from the
current URL; state-based entries remain buttons using `value` / `onChange`.
Both use `.tabs`, `.tab-button`, and `.active` from `uiShared.css`, with the
Simulator's compact gray/amber style. On mobile, tabs share the available
width and wrap labels with a minimum 44px touch target. No per-page tab
variants or separate navigation styles are needed.

### `CalculatorLayout`
Two-column form/result layout used by every calculator.
```jsx
<CalculatorLayout
  className="wound-success-container"
  form={<>…form JSX…</>}
  result={<>…result JSX…</>}
/>
```
Renders:
```html
<div className={className}>
  <div className="form-side">{form}</div>
  <div className="result-side">{result}</div>
</div>
```

### `StatGrid` + `StatCard`
```jsx
<StatGrid>
  <StatCard label="Hit Chance" value="66.67" valueSuffix="%" />
  <StatCard
    label="Expected Wounds"
    value="4.32"
    stdDev="1.41"
    ciLow="3.10" ciHigh="5.54"
  />
</StatGrid>
```
`StatCard` conditionally renders the ± row and interval row only when those
props are present. `valueSuffix` / `ciSuffix` are appended to the numbers
(used by "Chance to Wipe Unit" with `'%'`). The interval row is labelled
`rangeLabel`, default `'95% range'` (where ~95% of outcomes fall); pass
`rangeLabel="95% CI"` only for a confidence interval of an estimate, such as
a simulated wipe chance, together with `stdDevLabel="SE"` because that ± is a
standard error rather than a spread of outcomes. σ is a plain character; the
app no longer uses KaTeX. The shared `.result-stats`, `.stat-card`,
`.stat-label`, `.stat-value`, and `.stat-range` classes also live in
`src/styles/uiShared.css`.

### `DistributionChart`
Wraps recharts `ComposedChart`:
```jsx
<DistributionChart
  data={distributionData}
  xKey="wounds"             // or "kills"
  title="Wound Distribution"
  height={250}
  xInterval={0}
  chartKey="wounds"         // forces remount when underlying domain changes
  footer={<p className="simulation-note">Based on 10,000 simulations</p>}
/>
```
- Bar (probability, left axis) is `#fbbf24`.
- Line (cumulative, right axis) is `#60a5fa`.
- Uses `ResponsiveContainer` so it auto-fits the parent width — do **not**
  set a fixed pixel width on its container.
- The outer `.chart-container` class is part of `src/styles/uiShared.css`.

### `FormSelect`
Thin react-select wrapper with the dark theme baked in.
```jsx
<FormSelect
  options={toHitOptions}
  value={toHitOptions.find(o => o.value === bs)}
  onChange={(opt) => setBs(opt.value)}
  variant="default" // or "buff" (slight color shift for buff selectors)
/>
```
`isSearchable` defaults to `false` (we never want the keyboard popup on a 5-item list).
Menus show at most **8 option rows**, using the current option line height,
padding, and responsive minimum row height. Wrapped labels can occupy more
than one row's space. `menuPlacement="auto"` and the available viewport
may constrain the menu further; a caller can supply a tighter
`maxMenuHeight`. Long lists scroll internally using wheel, scrollbar, or touch gestures. Simulator
and Comparison Profile selectors use this same component as Hit Reroll,
with a clear action to remove the current selection.

### `selectStyles.js`
Two style objects (`selectStyles`, `buffSelectStyles`) for react-select. If
you change theme colors, do it here.

## Not everything reusable belongs in `ui/`
If a component is reused only inside one page, keep it in that page-private
folder instead of promoting it prematurely. The Attack Simulator's
`ProfileCardShell.jsx` and `SavedSetControls.jsx` live in
`src/components/attackSim/` and `src/components/attackSimulator/` for exactly that
reason.

## When to add a new ui component
Add one when **two or more** page-level components would otherwise duplicate
the same JSX + CSS. If the component becomes shared, move its shared styling
into `src/styles/uiShared.css`; if reuse stays local to one page, keep it in
that page's subfolder.
