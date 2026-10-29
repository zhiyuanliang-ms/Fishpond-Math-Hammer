# `src/lib/dice/` — Pure Logic Library

**No React, no DOM, no CSS, no `window`.** Everything here must be importable
from a Node script and pure (deterministic given inputs, except the Monte
Carlo and dice-roller modules — `attackSimulation.js`, `aos.js`, `roll.js` and
`rollDiceExpr*` — which use `Math.random`).

Always import from the barrel:

```js
import { calculateWoundPool, simulateAttack } from '../lib/dice'
```

## Module reference

### `index.js`
Re-exports everything below plus `export *` from `./options.js`.

### `diceExpression.js`
Tiny parser/evaluator for the dice expressions used by the Attack Simulator's
`attacks` and `damage` fields.

| Export | Signature | Returns |
|---|---|---|
| `parseDiceExpression(expr)` | parse | `{ count, sides, flat }` or `null` if invalid. |
| `rollDiceExpr(parsed)` | roll | Integer result. `0` if `parsed` is null. |
| `expectedDiceExpr(parsed)` | mean | `flat + count*(sides+1)/2`. |
| `isValidDiceExpression(expr)` | bool | Thin wrapper over `parseDiceExpression`. |
| `rollDiceExprWithReroll(parsed, threshold, scope, budget?)` | roll | Rerolls low dice once. `scope` `'all'` rerolls every qualifying die; `'single'` rerolls one (the lowest). A shared `{ remaining }` budget makes one `'single'` reroll cover several calls (the simulator shares one per weapon card for Damage). |
| `rerollFaceLimit(threshold, sides)` | number | Highest face worth rerolling: `min(threshold, floor(sides / 2))`, i.e. 1-3 on a D6, 1 on a D3. |

Supported forms (case-insensitive, whitespace trimmed): `4`, `12`, `D3`, `D6`,
`2D6`, `3D3`, `D6+1`, `2D6-1`. Numeric inputs are also accepted (e.g. `4`).

**Validation rules:**
- Plain flat values (numeric or string-of-digits) must be `>= 1`. `0`, `-1`,
  `'0'` are rejected.
- `count >= 1` and `sides >= 1`. `D0` and `0D6` are rejected.
- Anything that doesn't match the regex returns `null`.

Damage is floored at 1 by `modifyDamage` in `attackSimulation.js`, so a roll
of `D6-1 = 0` still deals 1 damage when delivered.

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

### `d6Rerolls.js`
Shared D6 evaluation and reroll-policy selection for the 40K simulator and
exact wound-pool calculator. `getD6RollOutcomes` enumerates the original
die and, if eligible, exactly one replacement. Existing rerolls take priority;
the returned `usedFailedReroll` flag spends one use of the separate failed-roll budget.
A replacement result is never fed back through either reroll rule.
`normalizeFailedRerollCount` validates integer counts from 0 (disabled) to 3
and migrates missing counts from the legacy single-failure flags.

### `woundPool.js`
`calculateWoundPool(options)` computes exact statistics and the full integer
wound distribution for 1-100 attacks. Options include the usual hit/wound
thresholds, reroll modes, critical hits, Torrent, Sustained Hits, Lethal Hits,
Devastating Wounds, ANTI, and `rerollFailedHit` / `rerollFailedWound`
(0 disables the buff; 1-3 specify its shared budget).

Up to sixteen budget states track the two shared limited-reroll budgets. Probability
mass and weighted first/second moments propagate through every attack and its
generated hits, so limited rerolls are not treated as independent per-die buffs.
The result contains numeric means, standard deviations, bounded 95% ranges,
and `distributionData` in the shared chart shape. The Wound Success Calculator
uses the same exact calculation with the limited-reroll buffs on or off, so
redundant buff combinations leave all statistics and the distribution unchanged.

### `aos.js`
Shared AoS 4E logic for both AoS surfaces.

`calculateAoSDamage(weapon, target)` computes exact expected values for one
weapon profile. `simulateAoSAttack(weapons, target, numSimulations)` runs the
same sequence as Monte Carlo for one or more weapon profiles and returns:
- Expected generated damage, theoretical damage after Ward, and models killed,
  with standard deviations and 95% ranges
- Chance to wipe the unit
- Integer damage and model-kill distributions
- Per-weapon expected-damage breakdown

Weapon fields are `attacks`, `toHit`, `toWound`, `rend`, `damage`, and
`critEffect`; `attacks` is the profile's total attack count. Quick-calculator
targets use `save` and `ward`; simulator targets additionally require `models`
and `health`. Attacks and Damage use the shared dice-expression parser, but
AoS profiles reject expressions whose minimum possible result is less than 1.
Post-Ward damage spills across models and is capped at the target unit's total
Health.

Supported critical effects are exported as `AOS_CRIT_EFFECTS`: `NONE`,
`TWO_HITS`, `AUTO_WOUND`, and `MORTAL`. Crit (Mortal) skips wound and save
rolls but still receives per-point Ward rolls.

### `binomial.js`

| Export | Signature | Returns |
|---|---|---|
| `binomialProbability(n, k, p)` | exact | P(X=k) for X~Bin(n,p) |
| `buildDistribution({ min, max, probabilityFn, xKey, visibleMin })` | helper | Array of `{ [xKey]: number, probability: "12.34", cumulative: "56.78" }` (percentages as 2-decimal strings, ready for recharts). |

### `chargeProbability.js`
`calculateChargeProbabilities()` builds the 2D6 and 3D6 "roll N or more"
tables shown on the Cheat Sheet.

### `options.js`
Static `{value, label}` arrays for react-select dropdowns:
`toHitOptions`, `toWoundOptions`, `antiOptions`, `rerollOptions`, `fnpOptions`,
`critOptions`, `randomRerollOptions`, `aosWardOptions`, and
`aosCritEffectOptions`. AoS Rend uses the shared integer input rather than a
dropdown.

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

### `attackSimulation.js`
Full-attack-sequence Monte Carlo engine for the 40K Attack Simulator.

`simulateAttack(weapons, targetProfiles, numSimulations = DEFAULT_SIMULATIONS, unitBuffs = {})`
returns:
- `expectedKills`, `expectedKillsStdDev`, `expectedKillsCILow/High`
  (the `CILow/High` fields for kills and damage are mean ± 1.96σ of the
  outcome distribution — shown as a "95% range". Only the wipe fields are a
  confidence interval of an estimate, built from its standard error.)
- `expectedDamage`, `expectedDamageStdDev`, `expectedDamageCILow/High`
- `wipeProbability`, `wipeProbabilityStdDev`, `wipeProbabilityCILow/High`
- `distributionData` — array of `{ kills, probability, cumulative }` (numbers, percent).
- `perProfile` — per-target-profile breakdown
- `numSimulations`, `totalModels`

Weapons accept `attacks` and `damage` as **dice expressions** parsed by
`diceExpression.js` (e.g. `4`, `D6`, `D3+3`, `2D6-1`). `modelsFiring` is the
weapons-count multiplier — each weapon rolls its attack dice independently.

Pass raw weapon profiles and the attacking unit's buffs separately. The engine
merges per-weapon grants once before running trials. The unit-only counts
`rerollFailedHit` and `rerollFailedWound` each grant up to X failed-roll
rerolls (X = 1-3, or 0 to disable), shared across every weapon and firing model in a trial, not per
weapon profile. Budgets reset each trial and remain independent of one another.
`makeUnitBuffs` migrates legacy `rerollOneFailedHit` / `rerollOneFailedWound`
booleans to counts of 1, unless an explicit new count overrides them.
Saved/additional unit-buff layers use the larger count, not their sum.
Existing eligible rerolls take priority without spending the shared budget.
A rerolled die is never eligible for another reroll, regardless of its new face.
Full failed/non-critical rerolls already cover every failure and gain no extra
rerolls from X while their policy budget remains available.
The shared budget is spent on the first otherwise-unrerollable failures
in weapon display order; it is not reserved for a later, higher-damage weapon.

Key rules implemented (see 08-glossary.md for vocabulary):
- 10e wound-roll table from S vs T (`woundThresholdFromST`).
- AP modifies armor save; the better of modified armor and invuln is used.
- **11e saving pools**: gather all normal wounds for one Weapon Profile card,
  roll its saving dice, and sort the natural results ascending. Check each
  result against the then-current target profile's armor/invuln, applying its
  AP reduction, damage modifiers, and FNP before moving to the next result.
  All `modelsFiring` instances of a card share this pool, but separate cards
  remain separate pools even when their attacks are identical. This is an
  intentional per-card scope, not automatic 11e identical-attack grouping.
  Devastating Wounds bypass saving dice and resolve after the same card's
  normal damage, before advancing to the next card.
  Saving dice are omitted only when no remaining target profile can save.
- Critical roll **always succeeds** (per 10e); modifiers can change the
  pass threshold but never the crit threshold. Crit detection always uses
  the **unmodified** D6 (so e.g. +1 to Hit raises hit chance but not crit chance).
- Roll modifiers (±1) are clamped per the 10e cap. `clampThreshold` floors
  results at 2+ and ceilings them at 7+ — even an S=15 vs T=1 + Lance attack
  still wounds on 2+ (and a natural 1 still always fails).
- **+1 to Hit** (`plusOneHit`): -1 to the hit threshold, capped per the modifier rule.
- **Lethal Hits**: original critical hit auto-wounds (skips wound roll).
- **Sustained Hits 1 / 2**: each crit hit produces N extra hits.
- **Devastating Wounds**: each critical wound inflicts the modified D as a
  separate mortal-wound packet, after that card's normal damage. Packets
  bypass saves, not D modifiers: weapon Damage increases, Damage-dice rerolls,
  HALF DAMAGE, DAMAGE -1 and DAMAGE = 1 determine the packet size.
  Apply D modifiers once before conversion, never to each mortal-wound point.
  Each packet can damage at most one model; excess mortal wounds are lost.
  Use the better eligible `fnp` / `fnpMortal` threshold, rolling only once per
  wound. A worse mortal-only FNP cannot replace a better general FNP.
- **ANTI-X+**: an unmodified wound roll of X+ is a critical wound, and
  critical wounds always succeed. ANTI does **not** move the S/T threshold
  that wound modifiers apply to: with ANTI-4+ and +1 to Wound against a 5+
  roll, a natural 3 (modified to 4) still fails.
- **Lance**: -1 to the wound threshold (treated as the bearer charging this turn).
- **Blast X / Cleave X**: +`X * floor(target_models / 5)` attacks per weapon
  instance. Both use an integer X from **1 to 5**, defaulting to **1**.
  Blast uses `blast` + `blastValue`; Cleave uses `cleaveEnabled` +
  `cleaveValue` (single-target only, always satisfied in this simulator).
  They are mutually exclusive: enabling either disables the other.
  Disabling either buff, manually or by selecting the other, resets its X
  to 1; re-enabling starts at 1. Inactive values also reset to 1 on profile
  load. Legacy profiles with both enabled use Blast only.
  Missing values in older profiles default to 1; active values outside the
  range are clamped to 1–5. The target count is snapshotted at the **start of each
  attacking unit's weapon loop within every trial** (target-selection time).
  All its weapons reuse that count, so earlier weapons in that unit cannot
  shrink the bonus; the next attacking unit snapshots the surviving models.
- **Critical Hit on x+** (`critHitEnabled` + `critHit`): override the crit
  threshold for hit rolls (default 6). Always evaluated against unmodified D6.
- **Ignores Cover** (`ignoresCover`): cancels Benefit of Cover for this weapon.
- **Benefit of Cover** (target side, 11e): worsens the attack's BS by 1.
  It is a characteristic modifier, so it stacks with the capped hit-roll
  modifier; it does not modify saving throws.
- Damage modifiers: HALF DAMAGE (`Math.ceil(d/2)`), DAMAGE −1 (min 1),
  DAMAGE = 1 (overrides). These flags modify D for both normal damage and
  conversion into DW mortal wounds. The UI keeps them mutually exclusive.
- **Random Attacks / Damage rerolls** (`attackReroll` / `damageReroll`,
  value `reroll-1-2-3`): reroll each die below its average once — 1-3 on a
  D6, 1s on a D3 (`rerollFaceLimit`). Scope `'single'` allows one die per
  weapon card: for Attacks, the lowest die across all `modelsFiring`
  instances; for Damage, the first qualifying Damage roll on the card
  (normal or Devastating Wounds). Multi-dice expressions such as 2D6 are
  currently rerolled die by die; 10e rerolls a summed roll as a whole —
  confirm the 11e wording before changing it.
- **Weapon × unit rerolls** (`mergeWeaponWithUnit`): a unit reroll replaces
  the weapon's only when it covers strictly more dice (ones < ones and twos <
  failed = non-critical). Between failed and non-critical, the weapon's
  choice stands because they are alternative strategies.
- **`expectedDamage`** counts wounds the defender actually lost: points
  ignored by FNP and excess damage wasted on a dying model are excluded.
- Per-attack overkill is capped at the model boundary (excess damage from
  one attack does not spill to the next model). The simulator stops when
  the unit is wiped — leftover attacks are discarded (intentional, simpler
  semantics than "track ghost target damage").
- Multiple target profiles consume models in display order; once a profile
  is exhausted, the next sorted saving result uses the next profile's saves.

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
