# Extending the App — Recipes

Concrete walk-throughs for the most likely additions. Follow these and you
will stay consistent with existing patterns.

## Recipe 1: Add a new calculator tab inside `DiceCalculator`

1. **Create the math** in `src/lib/dice/`. Either extend an existing module
   or add a new one. Export it from `src/lib/dice/index.js`.
2. **Create the component** at `src/components/MyNewCalculator.jsx`. Pattern:
   ```jsx
   import { useState } from 'react'
   import { CalculatorLayout, FormSelect, StatGrid, StatCard, DistributionChart } from './ui'
   import { myNewCalculation } from '../lib/dice'
   import './ui'  // not needed, just illustrative

   export default function MyNewCalculator() {
     const [field, setField] = useState('3')
     const [result, setResult] = useState(null)

     const handleCalculate = () => setResult(myNewCalculation(field))

     const form = (
       <div className="calculator-form">
         {/* form rows using FormSelect / inputs / LabeledCheckbox */}
         <button className="calculate-button" onClick={handleCalculate}>Calculate</button>
       </div>
     )
     const resultPanel = result && (
       <>
         <StatGrid>
           <StatCard label="Foo" value={result.foo} valueSuffix="%" />
         </StatGrid>
         <DistributionChart data={result.dist} xKey="x" title="My Distribution" />
       </>
     )
     return <CalculatorLayout className="wound-success-container" form={form} result={resultPanel} />
   }
   ```
3. **Register the tab** in `DiceCalculator.jsx`:
   - Add to the `tabs` array: `{ value: 'my-new', label: 'My New Calculator' }`.
   - Render the component when `activeTab === 'my-new'`.

## Recipe 2: Add a new top-level page (route)

1. **Create** `src/components/MyPage.jsx`, wrap in `<Page title="My Page">`.
2. **Add a stylesheet** `src/styles/mypage.css` and import it from the
   component (only if you have page-specific styles).
3. **Add the route** in `App.jsx`:
   ```jsx
   <Route path="/my-page" element={<MyPage />} />
   ```
4. **Add a sidebar link** in `Sidebar.jsx` — extend the `getPageKey` switch
   in `App.jsx` and the `handlePageChange` switch as well.

## Recipe 3: Add a new shared UI component

Only do this if **2+ pages** will use it. Pattern:

1. Create `src/components/ui/MyThing.jsx` — `default export`, props in,
   JSX out, no business logic.
2. Re-export from `src/components/ui/index.js`.
3. Add the styles to the most appropriate existing CSS file, or create a new
   one and import it from the component.

## Recipe 4: Add a new option to a dropdown

Edit `src/lib/dice/options.js`. The arrays are simple `{ value, label }`.
Reruns will pick it up; no other change needed.

## Recipe 5: Add a new modifier (e.g. "Twin-linked")

1. Add the math behavior to `probability.js` (likely as a new `REROLL_VALUES`
   constant or a new boolean flag on `calculateHitProbability`).
2. Update `options.js` if it's a dropdown choice.
3. Wire it into `WoundSuccessCalculator.jsx` form state and pass through to
   the math call.
4. If the modifier affects the wound distribution shape (like lethal hits
   does), update `woundDistribution.js` accordingly.
5. Update [`08-glossary.md`](./08-glossary.md) with the new term.

## Recipe 6: Add unit tests (currently none exist)

Recommended: **vitest** (Vite-native, zero-config).
```powershell
npm install -D vitest
```
Add `"test": "vitest"` to `package.json` scripts. Put tests next to modules
as `probability.test.js`. Start with `lib/dice/` because it's pure JS — high
ROI, zero React mocking needed.

## Anti-patterns (do not do)

- ❌ Putting math inside a component instead of `lib/dice/`.
- ❌ Importing `lib/dice/` from `ui/`.
- ❌ Adding a global state library "just in case".
- ❌ Adding TypeScript piecemeal (do all-or-nothing if at all).
- ❌ Inline `style={{...}}` for anything other than dynamic colors.
- ❌ Adding a CSS framework — current CSS is small and intentional.
