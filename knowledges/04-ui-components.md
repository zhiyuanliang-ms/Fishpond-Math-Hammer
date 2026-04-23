# `src/components/ui/` — Shared UI Components

Presentational only. **Do not** import from `src/lib/dice/`. **Do not** own
business state. Take props in, render JSX out.

Import from the barrel:

```js
import {
  Page, Tabs, CalculatorLayout, StatGrid, StatCard,
  DistributionChart, FormSelect, LabeledCheckbox,
} from './ui'
```

## Components

### `Page`
Wraps content in `.page` div, optional `<h1>{title}</h1>`.
```jsx
<Page title="Cheat Sheet">…</Page>
```

### `Tabs`
```jsx
<Tabs
  value={current}
  onChange={setCurrent}
  tabs={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
  variant="calculator-tabs"  // -> wrapper class becomes "tabs calculator-tabs"
/>
```
Buttons get classes `tab-button` and `active`. Styling lives in
`src/styles/tabs.css` which is imported globally from `app.css`.

### `CalculatorLayout`
Two-column form/result layout used by every calculator.
```jsx
<CalculatorLayout
  className="wound-success-container" // or "kill-probability-container"
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
`StatCard` conditionally renders the σ row and CI row only when those props
are present. `valueSuffix` / `ciSuffix` are appended to the numbers (used by
"Chance to Kill All" with `'%'`).

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

### `LabeledCheckbox`
```jsx
<LabeledCheckbox
  id="lethal-hit"
  label="Lethal Hit"
  checked={lethalHit}
  onChange={(e) => setLethalHit(e.target.checked)}
  disabled={false}
/>
```

### `selectStyles.js`
Two style objects (`selectStyles`, `buffSelectStyles`) for react-select. If
you change theme colors, do it here.

## When to add a new ui component
Add one when **two or more** page-level components would otherwise duplicate
the same JSX + CSS. Until then, keep it inline in the page.
