# `src/lib/dice/` — Pure Logic Library

**No React, no DOM, no CSS, no `window`.** Everything here must be importable
from a Node script and pure (deterministic given inputs, except `simulation.js`
which uses `Math.random`).

Always import from the barrel:

```js
import { calculateHitProbability, simulateKillProbability } from '../lib/dice'
```

## Module reference

### `index.js`
Re-exports everything below plus `export *` from `./options.js`.

### `probability.js`
Closed-form D6 math.

| Export | Signature | Returns |
|---|---|---|
| `REROLL_VALUES` | constant | `{ NONE, REROLL_ONE, REROLL_FAIL, REROLL_NON_CRITICAL }` |
| `calculateSuccessProbability(statValue, rerollValue, criticalValue)` | core | `{ successChance, criticalChance }` (0–1) |
| `calculateHitProbability(...)` | wrapper | `{ hitChance, critHitChance }` |
| `calculateWoundProbability(toughness, strength, rerollValue, criticalValue, antiBuff)` | wrapper | `{ woundChance, critWoundChance }`. Handles ANTI-X (treats stat as max(strength, antiBuff)). |
| `calculateSaveChance(armorSave, ap, invuln, saveReroll)` | wrapper | number (0–1). Picks better of armor+AP vs invuln. |
| `calculateFnpChance(fnp)` | wrapper | number (0–1). Returns 0 when FNP disabled. |

`statValue` is the BS/WS/Sv number (e.g. `3` for 3+). `criticalValue` is the
crit threshold (default 6, can be 5 for "crits on 5+").

### `binomial.js`

| Export | Signature | Returns |
|---|---|---|
| `binomialProbability(n, k, p)` | exact | P(X=k) for X~Bin(n,p) |
| `buildDistribution({ min, max, probabilityFn, xKey, visibleMin })` | helper | Array of `{ [xKey]: number, probability: "12.34", cumulative: "56.78" }` (percentages as 2-decimal strings, ready for recharts). |

### `woundDistribution.js`
`buildWoundDistribution({ expectedHits, expectedCrits, woundChance, stdDev, lethalHit, expectedWounds })`
returns the chart data array used by `WoundSuccessCalculator`. Uses a ±3σ
window. When `lethalHit` is true, crits auto-wound and are added on top of
the binomial computed over non-crit hits.

### `simulation.js`
`simulateKillProbability(numAttacks, damage, numTargetModels, modelWounds, armorSave, fnp, saveRerollValue, numSimulations = 10000)`

Monte Carlo. Returns an object with **string** numeric fields (already
`.toFixed(2)`):
- `expectedKills`, `meanCILow`, `meanCIHigh`
- `killAllProbability`, `killAllCILow`, `killAllCIHigh`
- `expectedUnsavedAttacks` (closed form, not simulated)
- `unsavedCILow`, `unsavedCIHigh` (binomial normal-approx CI)
- `distributionData` — array of `{ kills, probability, cumulative }`

`Z_95 = 1.96` is exported from here and re-exported by the barrel.

### `killProbability.js`
`calculateKillProbability(formValues)` — thin wrapper that parses string form
inputs (`numAttacks`, `damage`, etc.) and delegates to
`simulateKillProbability`. This is the function `KillProbabilityCalculator`
calls.

### `options.js`
Static `{value, label}` arrays for react-select dropdowns:
`toHitOptions`, `toWoundOptions`, `antiOptions`, `rerollOptions`, `fnpOptions`,
`critOptions`, `saveRerollOptions`.

### `roll.js`
Used by the Dice Roller page. Pure (apart from `Math.random`).

| Export | Purpose |
|---|---|
| `DICE_FACES` | `[1,2,3,4,5,6]` — handy for iterating face buckets. |
| `DIE_GLYPHS` | Map face -> Unicode die glyph (⚀⚅). |
| `rollD6()` | Single D6 roll. |
| `rollD6s(count)` | Array of `count` D6 results. |
| `rerollFaces(rolls, faces)` | Returns a new array; rerolls only dice whose face is in the set. |
| `countFaces(rolls)` | `{1:n,2:n,...,6:n}` count map. |

### `diceExpression.js`
Parser/evaluator for the dice expressions used by the Attack Simulator
(e.g. "4", "D6", "2D6+1", "D3-1").

| Export | Signature | Returns |
|---|---|---|
| `parseDiceExpression(str)` | parser | `{ count, sides, flat }` or `null` |
| `rollDiceExpr(parsed)` | roller | number |
| `rollExprStr(str)` | convenience | number (parses + rolls in one go) |
| `expectedDiceExpr(parsed)` | math | expected value of the parsed expression |
| `isValidDiceExpression(str)` | validator | boolean |

### `attackSimulation.js`
Full-attack-sequence Monte Carlo engine for the Attack Simulator.

`simulateAttack(weapons, targetProfiles, numSimulations = DEFAULT_SIMULATIONS)`
returns:
- `expectedKills`, `expectedKillsStdDev`, `expectedKillsCILow/High`
- `expectedDamage`, `expectedDamageStdDev`, `expectedDamageCILow/High`
- `wipeProbability`, `wipeProbabilityStdDev`, `wipeProbabilityCILow/High`
- `distributionData` — array of `{ kills, probability, cumulative }` (numbers, percent).
- `perProfile` — per-target-profile breakdown
- `numSimulations`, `totalModels`

Key rules implemented (see 08-glossary.md for vocabulary):
- 10e wound-roll table from S vs T (`woundThresholdFromST`).
- AP modifies armor save; the better of modified armor and invuln is used.
- Critical roll **always succeeds** (per 10e); modifiers can change the
  pass threshold but never the crit threshold.
- Roll modifiers (±1) are clamped per the 10e cap (defense in depth: the
  UI also enforces mutual exclusion among the wound-penalty toggles).
- Lethal Hits: original critical hit auto-wounds (skips wound roll).
- Sustained Hits 1 / 2 / D3: each crit hit produces N extra hits.
- Devastating Wounds: each crit wound deals damage as mortal wounds
  (skips save; FNP-vs-mortal applies if defined, else regular FNP).
- ANTI-X+: critical wound on natural X+; wound threshold is also lowered
  to X if better.
- Damage modifiers: HALF DAMAGE (`Math.ceil(d/2)`), DAMAGE −1 (min 1),
  DAMAGE = 1 (overrides). The UI keeps these mutually exclusive.
- Per-attack overkill is capped at the model boundary (excess damage from
  one attack does not spill to the next model). The simulator stops when
  the unit is wiped — leftover attacks are discarded (intentional, simpler
  semantics than "track ghost target damage").
- Multiple target profiles consume models in display order; once a profile
  is exhausted, the next attack targets the next profile.

### `constants.js`
Shared constants used across simulation modules: `DEFAULT_SIMULATIONS`
(10 000), `Z_95` (1.96), `REROLL_VALUES`.

## Conventions when extending

- **Probabilities returned from `probability.js`** are 0–1 numbers.
- **Probabilities in chart data** are pre-formatted strings in percent
  (recharts displays them as-is). If you write a new chart, convert at the
  boundary.
- Add a new `xKey` to `buildDistribution` rather than hard-coding `kills` /
  `wounds` in the helper.
- When in doubt, write a new pure function instead of inlining math in a
  component.
