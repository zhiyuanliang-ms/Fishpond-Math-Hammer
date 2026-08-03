# Warhammer 40k Glossary (for the code)

This is the minimum vocabulary to understand variable names in `lib/dice/`
and the calculator forms. The real rulebook is more nuanced; this is just
enough for code maintenance.

## The attack sequence (what we model)
For each attack:
1. **Hit roll** — roll a D6, succeed on `BS+` (or `WS+` in melee).
2. **Wound roll** — D6, succeed on a target depending on Strength vs Toughness.
3. **Save roll** — defender rolls D6, succeeds on `Sv+` modified by AP, or
   their **invulnerable save** (whichever is better).
4. **FNP roll** ("Feel No Pain") — defender rolls D6 per damage point;
   each success ignores 1 damage.
5. Remaining damage is dealt to the model; overkill spills... actually it
   doesn't (excess damage on a model is wasted). The kill simulation models
   this correctly.

> For a full RAW-quoted reference of every step, modifier, and edge
> case (Devastating Wounds deferral, Anti-X+, modifier caps, etc.) see
> [`09-attack-rules-10e.md`](./09-attack-rules-10e.md).

## Stats
| Term | Code name | Meaning |
|---|---|---|
| BS | `bs`, `toHit` | Ballistic Skill — D6 target to hit (ranged). E.g. `3` = 3+. |
| WS | (same as BS) | Weapon Skill — melee equivalent. |
| S  | `strength`  | Weapon Strength. |
| T  | `toughness` | Target Toughness. |
| AP | `ap` | Armor Penetration (positive number; subtracted from save). |
| Sv | `armorSave` | Armor Save target (e.g. `3` = 3+). |
| Inv | `invuln` | Invulnerable save, ignores AP. |
| W  | `modelWounds` | Wounds per model (HP). |
| Damage | `damage` | Damage per unsaved attack. |
| FNP | `fnp` | Feel No Pain target (e.g. `5` = 5+; `0` = none). |

## Modifiers
| Term | Code | Meaning |
|---|---|---|
| **Crit (hit / wound)** | `critHit`, `critWound`, `criticalValue` | Roll value that triggers crit effects. Default `6`, sometimes `5` ("crits on 5+"). Crits are **always evaluated on the unmodified D6.** |
| **Critical Hit on x+** | `critHitEnabled` + `critHit` | Per-weapon override of the hit-roll crit threshold. |
| **+1 to Hit** | `plusOneHit` | -1 to the hit threshold (capped at ±1 per 10e). |
| **Sustained Hits X** | `sustainedHits` | Each crit hit generates X extra hits. |
| **Lethal Hits** | `lethalHits`, `lethalHit` | Each crit hit auto-wounds (skips the wound roll). |
| **Devastating Wounds** | `devastatingWounds` | Each crit wound becomes mortal wounds (bypasses saves). |
| **Anti-X N+** | `antiBuff`, `antiEnabled` + `antiValue` | Wound roll uses N+ (or better) against the keyword (e.g. Anti-Vehicle 4+). |
| **Lance** | `lance` | +1 to the wound roll (treated as the bearer charging). Floored at 2+ by `clampThreshold`. |
| **Blast** | `blast` | +`floor(target_models / 5)` to every attack roll. Snapshotted at trial start, not live. |
| **Cleave X** | `cleaveEnabled` + `cleaveValue` | +`X × floor(target_models / 5)` attack dice (single target only — always true in this sim). Snapshotted at trial start, like Blast. |
| **Ignores Cover** | `ignoresCover` | Cancels the target's Benefit of Cover. |
| **Benefit of Cover** | `benefitOfCover` (target) | 11e: worsens the attacker's BS by 1 (−1 to hit), not the save. A characteristic modifier, so it **stacks** on top of −1 to Hit and is not subject to the ±1 roll cap. Negated by Ignores Cover; no effect under Torrent. |
| **Reroll 1s / Reroll Failed / Reroll Non-Crit** | `REROLL_VALUES` | Reroll policies for hit/wound/save rolls. |
| **Weapons (count)** | `modelsFiring` | Number of weapons firing this profile. Each rolls its attack dice independently. |

## Wound roll table (closed form in `calculateWoundProbability`)
| Strength vs Toughness | Wound on |
|---|---|
| S ≥ 2×T | 2+ |
| S > T   | 3+ |
| S = T   | 4+ |
| S < T   | 5+ |
| S ×2 ≤ T| 6+ |

ANTI-X overrides this when the buff is better.

## Statistical terms in the UI
- **σ (sigma)** — standard deviation of a binomial expectation. Shown via
  KaTeX in `StatCard`.
- **95% CI** — 95% confidence interval. Computed via normal approximation
  (`Z_95 = 1.96`) for both closed-form binomial expectations and Monte Carlo
  proportions.
- **Expected X** — the mean of the distribution (n·p for binomial).

## Sources of "randomness" in the code
- `WoundSuccessCalculator` is **fully closed-form** — no RNG.
- `KillProbabilityCalculator` is **Monte Carlo**, default 10 000 trials in
  `simulateKillProbability`. Increasing trials tightens the CI.
- `AttackSimulator` is **Monte Carlo** via `simulateAttack`. Defaults to
  1 000 trials for snappy iteration; the "High precision" toggle bumps it
  to 10 000.

## Attack Simulator weapon stats
Attacks and Damage accept **dice expressions** parsed by `diceExpression.js`:
plain integers (`4`, `12`), single dice (`D3`, `D6`), multiples (`2D6`, `3D3`),
and optional flat modifiers (`D6+1`, `2D6-1`, `D3+3`). Plain values must be
`>= 1`; `0`, `-1`, `D0`, and `0D6` are rejected. Damage is floored at 1 after
all modifiers.
