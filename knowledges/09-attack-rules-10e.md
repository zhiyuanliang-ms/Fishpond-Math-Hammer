# Warhammer 40k Attack-Dice Rules Reference (10e quotes, 11e simulator)

> **11e simulator overrides (verified 21 October 2026).** Saving throws now use
> the 11e sequence in sections 05.03-05.04 (page 19), and Blast/Cleave use the
> target-selection count in sections 24.05-24.06 (page 79), verified against
> the [official 11e core rules](https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf).
> Devastating Wounds and FNP use sections 06.02 (page 24), 24.10 (page 80),
> and 24.12 (page 81), as described in sections 3.5 and 5.3-5.4 below.
> Saving pools are intentionally per Weapon Profile card, including all
> `modelsFiring` instances; identical attacks on separate cards are not
> automatically merged. Other 10e quotations below remain historical reference,
> not a claim that the entire simulator has been audited against 11e.

> **Audience.** Another AI agent (or new contributor) who needs to implement
> or audit the attack-resolution logic in this codebase **without** opening
> the rulebook. All rule quotes are pulled verbatim from the 10e
> [Core Rules on Wahapedia](https://wahapedia.ru/wh40k10ed/the-rules/core-rules/)
> (the unofficial-but-RAW-faithful mirror of the GW PDF) and were last
> re-verified May 2026 against the October 2025 Core Rules Update + March
> 2026 Balance Dataslate.
>
> **Scope.** Only the rules that affect dice rolls during the
> "Make Attacks" sequence. We deliberately ignore movement, terrain
> (except cover-as-save-modifier), psychic phase, stratagems, etc.
>
> **Implementation pointer.** Everything below is implemented in
> [src/lib/dice/attackSimulation.js](../src/lib/dice/attackSimulation.js).
> Closed-form versions of individual steps live in
> [src/lib/dice/probability.js](../src/lib/dice/probability.js) (used by
> the simpler calculators). Tests live in
> [src/lib/dice/__tests__/attackSimulation.test.js](../src/lib/dice/__tests__/attackSimulation.test.js).

---

## 1. The attack sequence (5 steps per attack)

For **every individual attack** (one attack = one Attacks-characteristic
"shot" or melee swing), the sequence is:

| # | Step | D6 | Pass condition |
|---|---|---|---|
| 1 | **Hit roll** | 1 | `D6 + mods ≥ BS` (ranged) or `≥ WS` (melee) |
| 2 | **Wound roll** | 1 | `D6 + mods ≥ N`, where N comes from the S vs T table |
| 3 | **Allocate attack** | — | Defender picks one model; if any model has already lost wounds or had attacks allocated this phase, attack must go there |
| 4 | **Saving throw** | 1 | `D6 + AP ≥ Sv` (armor) — pick the better of armor or invuln; defender's choice |
| 5 | **Inflict damage** | — | Target model loses `Damage` wounds (modified). Per-point FNP rolls happen here. Excess does **not** spill to another model. |

Each step is its own D6. If any step fails, the attack ends.

**Current simulator override:** hit/wound rolls complete for the entire weapon
card before normal damage is allocated. Its saving dice are then rolled and
resolved from lowest to highest, as described in section 4 below, rather
than completing all five steps for one attack before starting the next.

### 1.1 Universal D6 rules (apply to every roll)

These four invariants apply to **every** Hit, Wound, and Save roll. Get
these right and most edge cases fall into place automatically.

| Rule | Quote (RAW) | Code |
|---|---|---|
| **Nat 1 always fails** | *"An unmodified Hit roll of 1 always fails."* (same wording for Wound; saves: *"An unmodified saving throw of 1 always fails."*) | `rollD6WithReroll`: `if (nat === 1) return { success: false }` |
| **Nat 6 always succeeds the hit/wound** | *"An unmodified Hit roll of 6 is called a Critical Hit and is always successful."* (same for Wound) | `rollD6WithReroll`: `success = isCrit \|\| nat === 6 \|\| nat >= threshold` |
| **±1 modifier cap** | *"A Hit roll can never be modified by more than -1 or +1."* (same for Wound) | `if (mod > 1) mod = 1; if (mod < -1) mod = -1` |
| **Save can never improve by more than +1** | *"A saving throw can never be improved by more than +1."* | Implicit: BoC is our only save modifier, so the cap is structurally satisfied. |
| **Re-rolls before modifiers** | *"Re-rolls are applied before modifiers (if any) are applied."* and *"A dice can never be re-rolled more than once."* | `rollD6WithReroll`: re-roll once, then evaluate against `threshold` (already modified). Crit detection still uses the post-reroll **unmodified** D6 face. |

> **Critical hits/wounds are determined on the UNMODIFIED roll.** A crit
> on 5+ with +1 to Hit does NOT mean nat 4 = crit — it means an unmodified
> 5 or 6 is a crit. Code uses `nat` (the post-reroll D6 face) for crit
> detection, never the modified threshold. This is the source of half the
> bugs in math-hammer apps; do not "optimize" it.

### 1.2 Threshold clamps

After all modifiers, we clamp the threshold to `[2, 7]`:

- **Floor 2+** — A 2+ is the best stat possible; even a buff that would
  make it 1+ stops at 2+, and nat 1 still fails (so true rate ≈ 5/6).
- **Ceiling 7+** — A 7+ is "auto-fail unless rolled an unmodified 6"
  (the always-succeeds rule still applies because nat 6 is a crit).

Code: `clampThreshold(n) = Math.max(2, Math.min(7, n))`.

---

## 2. Hit roll

```
hit_threshold = clamp( weapon.BS + (target_minus1 ? +1 : 0) + (plusOneHit ? -1 : 0),  2..7 )
crit_hit_threshold = weapon.critHit ?? 6      // unmodified roll
```

- **+1 to Hit** lowers the threshold by 1 (lower is better in 40k notation).
- **−1 to Hit** raises the threshold by 1.
- Both stack into one mod, then the ±1 cap applies.
- A **Critical Hit on 5+** weapon ability sets `crit_hit_threshold = 5`;
  the modifier cap does NOT apply to the crit threshold (it's an unmodified
  roll). +1 to Hit increases hit chance but **not** crit chance.

### 2.1 Torrent

> *"Each time an attack is made with such a weapon, that attack
> automatically hits the target."*

Skip the hit roll entirely. **Torrent attacks cannot crit on the hit
step** — there's no D6 to inspect — so they get no Sustained Hits and no
Lethal Hits trigger. (Implementation: `if (weapon.torrent) { hitIsCrit = false; ... skip roll }`.)

### 2.2 Sustained Hits X

> *"Each time an attack is made with such a weapon, if a Critical Hit is
> rolled, that attack scores a number of additional hits on the target as
> denoted by 'x'."*

Each crit hit produces N **additional** auto-hits (N = 1 or 2 in our
options). The original hit also still counts. Extras go straight to the
wound step. Crucially, extras themselves **do not crit on the hit step**
— they had no D6 — so they don't chain Sustained Hits, and they don't
trigger Lethal Hits.

### 2.3 Lethal Hits

> *"Each time an attack is made with such a weapon, a Critical Hit
> automatically wounds the target."*

Each **original** crit hit auto-wounds (skips the wound roll), bypassing
Anti-X / Devastating Wounds / wound mods. Lethal does NOT apply to the
extras Sustained Hits added (they're extras, not crits). Order of
operations matters: Sustained adds extras first; Lethal applies to the
original crit only.

```js
// Pseudocode of resolveWeaponAgainstUnit's hit step:
const extras = (hitIsCrit && sustainedHits) ? N : 0
const queue = [{ lethalAuto: hitIsCrit && lethalHits }]
for (let i = 0; i < extras; i++) queue.push({ lethalAuto: false })
```

---

## 3. Wound roll

### 3.1 The S-vs-T table (memorize this)

| Strength vs Toughness | Wound on |
|---|---|
| `S ≥ 2T` | 2+ |
| `S > T` (but `< 2T`) | 3+ |
| `S = T` | 4+ |
| `S < T` (but `> T/2`) | 5+ |
| `S × 2 ≤ T` | 6+ |

Code: `woundThresholdFromST(S, T)` in `attackSimulation.js`.

### 3.2 Wound modifiers

Same ±1 cap as hit rolls.

- **+1 to Wound** (e.g. Lance on the charge, certain stratagems):
  threshold − 1.
- **−1 to Wound** (defensive ability): threshold + 1.
- **−1 to Wound if Stronger** (rare defensive variant): threshold + 1
  only if `S > T`. Stacks with plain −1 into the cap.

### 3.3 Anti-KEYWORD X+

> *"Each time an attack is made with such a weapon against a target with
> the keyword after the word 'Anti-', an unmodified Wound roll of 'x+'
> scores a Critical Wound."*

One effect against a matching target: **an unmodified Wound roll of X+ is a
Critical Wound** (used for Devastating Wounds — see §3.5). Because a
Critical Wound is *"always successful"*, every natural X+ wounds.

Anti does **not** change the threshold that wound modifiers apply to. The
roll still needs the S vs T value after modifiers, unless it is a natural
X+:

```js
// In code:
if (weapon.antiEnabled && weapon.antiValue) {
  critWoundThr = Math.min(critWoundThr, weapon.antiValue)
}
const woundThr = clampThreshold(baseThr + mod) // baseThr from S vs T only
// evaluateD6: success = natural >= critWoundThr || natural >= woundThr
```

Example: S4 vs T5 (5+), Anti-4+, +1 to Wound (Lance). A natural 3 becomes 4,
still short of 5+, and is not a critical wound, so it fails. The wound rate
is 3/6, not 4/6. (Before 29 Oct 2026 the code lowered `baseThr` to the Anti
value and applied +1 on top, giving 4/6.) Anti-2+ still wounds on every
natural 2+ (5/6 under Torrent), because those rolls are all critical.

### 3.4 Lance

> *"Each time an attack is made with such a weapon, if the bearer made a
> Charge move this turn, add 1 to that attack's Wound roll."*

We model this as `plusOneWound` on the weapon (player toggles it on when
applicable). It's a +1 wound modifier subject to the ±1 cap.

### 3.5 Devastating Wounds — current 11e simulator

Under 11e section 24.10, a critical wound ends that attack's sequence and
inflicts mortal wounds equal to the weapon's D characteristic. Apply these
rules within the simulator's chosen per-card attack pools:

1. **Bypass all saving throws**, including invulnerable saves. A normal
   auto-wound from Lethal Hits is not a critical wound and does not trigger DW.
2. **Resolve the card's normal damage first, then its mortal wounds.**
   `resolveWeaponAgainstUnit` keeps one local `deferredDevWounds` entry per
   critical and drains those entries before returning to the next weapon card.
   Never defer them until the entire attacking unit has finished.
3. **Modify D before converting it to mortal wounds.** The simulator's
   HALF DAMAGE, DAMAGE -1 and DAMAGE = 1 flags are D characteristic modifiers,
   not normal-damage-only effects. They affect the D used for DW conversion,
   as do weapon Damage increases and random Damage rerolls. D4 with DAMAGE -1
   becomes three mortal wounds; DAMAGE = 1 produces one. Apply these modifiers
   once to the Damage value, never repeatedly to individual mortal wounds.
4. **Use the best eligible FNP once per wound.** General FNP applies to both
   normal and mortal wounds; mortal-only FNP is an additional eligible choice
   for mortals, not an unconditional replacement for general FNP.
5. **Keep packets separate and stop at one model per critical.** Excess
   mortal wounds from that critical are lost when its allocated model dies,
   even when another defender profile is available.

For example, a D2 DW card followed by a D1 normal card targets a W1 model
followed by a W2 model. If both wound, the DW kills the W1 model and loses its
excess point, then normal damage removes one wound from the W2 model: one
model dies. Deferring the DW until after the normal card would incorrectly
kill both models. Fixed-dice regressions cover both card orders, mixed normal
and DW results on one card, mitigation, FNP, and model-boundary loss.

---

## 4. Saving throw — current 11e simulator sequence

```
modified_armor = clamp( target.Sv + effective_weapon_AP,  2..7 )
effective_save = min( modified_armor, target.invuln ?? 7 )
// Sort the card's natural saving dice ascending, then check each result
// against the current target profile. Advance profiles only after damage/FNP.
```

The defender's profile order represents the allocation order. Roll one saving
die per normal wound from the current Weapon Profile card, then sort **natural
results**, not precomputed pass/fail outcomes, from lowest to highest. Each
result uses the armor/invuln of the current allocation group, including that
group's AP reduction. After a failure, resolve its damage modifiers and FNP;
only when the group is exhausted do subsequent results use the next group's
saves. A successful result does not advance the allocation group.

For three AP 3, Damage 3 wounds against one W2/Sv3+ model followed by one
W3/Sv3+/InSv4+ model, saving dice `4, 2, 4` become `2, 4, 4`. The 2 kills the
first model against its effective 6+ save. Both remaining 4s pass the second
model's invulnerable save, leaving it alive.

All weapon instances on one card share the pool. Separate cards and attacking
units never share a pool, even if their attacks are identical; automatic
cross-card identical-attack grouping is deliberately outside the chosen scope.
Devastating Wounds bypass saving dice and resolve after the same card's normal
damage, before the next card begins.

**Save selection:** the simulator chooses the better (lower) of armor modified
by AP and invuln. Natural 1 always fails; natural 6 does not pass a 7+ save.
Benefit of Cover modifies the hit stage in the 11e simulator, not the save.
Even when the first group cannot save, it needs saving dice if a later group
can save. The engine omits those dice only when no remaining profile can save,
because all results then inflict damage regardless of ordering.

Saving throws use one D6 per attack; the simulator does not provide
saving-throw re-roll buffs.

### 4.1 Invulnerable saves

> *"Unlike armour saving throws (which use a model's Save characteristic),
> invulnerable saving throws are never modified by an attack's Armour
> Penetration characteristic, but otherwise follow the normal rules for
> saving throws."*

- AP is **ignored** by invuln.
- Cover **does NOT** apply to invuln.
- The +1 improvement cap applies normally.

### 4.2 Benefit of Cover

**Current simulator (11e):** Benefit of Cover worsens the attacking weapon's
BS by 1 at the **hit** step. It does not modify saving throws. Because it is
a characteristic modifier, it stacks on top of the ±1-capped hit-roll
modifier. It applies only when the target has `benefitOfCover` and the
weapon does not have Ignores Cover, and it has no effect on Torrent.

Historical 10e wording, no longer implemented:

> *"Each time a ranged attack is allocated to a model that has the Benefit
> of Cover, add 1 to the saving throw made for that attack (excluding
> invulnerable saving throws). Models with a Save characteristic of 3+ or
> better cannot have the Benefit of Cover against attacks with an Armour
> Penetration characteristic of 0."*

---

## 5. Inflict damage

```
damage = max(1, modifyDamage( raw_dmg_roll, halfDamage, minusOneDamage, damageOne ))
```

`modifyDamage`:
- `damageOne` overrides everything → returns 1.
- Else: `if (halfDamage) d = ceil(d / 2); if (minusOneDamage) d -= 1; return max(1, d)`.

Damage **floors at 1** — a `D6-1` roll of 1 still deals 1 damage.

### 5.1 Allocation — wounded models first

> *"If a model in the target unit has already lost one or more wounds, or
> has already had attacks allocated to it this phase, that attack must be
> allocated to that model."*

We model this implicitly: a target profile carries `currentModelWounds`,
and `applyDamageToUnit` keeps applying damage to that single model until
it dies, then advances. This is correct for one-profile targets and for
multi-profile targets so long as users put the "front line" profile
first (which is the only sensible order).

### 5.2 Excess damage (overkill) is lost

> *"If a model is destroyed by an attack, any excess damage inflicted by
> that attack is lost."*

`applyDamageToUnit` returns the moment a model dies. The next attack
starts fresh on the next model.

### 5.3 Mortal wound spill — current 11e simulator

Generic mortal wounds in section 06.02 are inflicted one point at a time;
remaining points can move to another model. Devastating Wounds have a
specific limit in section 24.10: each critical can damage only one model,
so that critical's remaining points are lost when the model dies.

The simulator only models the DW mortal-wound path. `applyDamageToUnit`
therefore stops at the model boundary for both `mortal=true` and normal damage.
Do not combine multiple criticals into one packet, or treat all mortal-wound
sources as if they had the DW exception.
**If you ever add Smite-style mortal wounds, do NOT reuse this code path
without splitting the spill behavior.**

### 5.4 Feel No Pain (FNP)

> *"Each time a model with this ability suffers damage and so would lose
> a wound (including wounds lost due to mortal wounds), roll one D6: if
> the result is greater than or equal to the number denoted by 'x', that
> wound is ignored and is not lost."*

- One D6 **per damage point**, not per attack.
- Triggers on every wound lost, including mortals.
- We model two FNP slots: `fnp` (general) and `fnpMortal` (mortal-only).
  For normal damage, only `fnp` is eligible. For mortal wounds, choose the
  lower enabled threshold from both slots; 0 means disabled. General FNP 2+
  with mortal-only FNP 6+ must still use 2+ against mortal wounds.
- Roll once per wound using that chosen threshold, never once for each slot
  and never a second FNP attempt when the first attempt fails.

---

## 6. Special abilities cheat sheet

### 6.1 Blast X / Cleave X

> *"Each time you determine how many attacks are made with a Blast
> weapon, add 1 to the result for every five models that were in the
> target unit when you selected it as the target (rounding down)."*

```
blast_bonus = X * floor(target_size_at_selection / 5)
attacks_per_weapon = roll(weapon.attacks) + blast_bonus
```

The app exposes **Blast X** and **Cleave X** with integer X from **1 to 5**,
defaulting to **1**. The quoted 10e Blast baseline is Blast 1; Blast 2 adds
2 attacks per full five target models. Cleave X uses the same bonus
calculation, with its single-target condition always satisfied here.
Blast and Cleave are mutually exclusive: selecting either switches off the
other. Disabling a buff, directly or by selecting the other, resets its X
to 1, so re-enabling starts at 1. Inactive values also reset to 1 when
loading profiles. Legacy profiles with both enabled use Blast only and
reset Cleave X to 1; their bonuses never stack.
Older profiles without X retain the default of 1; out-of-range active
values are clamped to 1–5.

The bonus is locked in at **target selection time**, which RAW happens
before any of the attacking unit's weapons resolve. We snapshot
`blastBaseModels` before each attacking unit's weapon loop in every trial,
summing all surviving defender profiles. Every weapon in that unit reuses it,
so an earlier weapon killing models does NOT shrink the next weapon's
Blast/Cleave bonus. A unit starting against 10 models still grants +2 attacks
to its later Blast 1/Cleave 1 weapon after earlier weapons leave only one model.
The next attacking unit snapshots the new surviving count.

### 6.2 modelsFiring (the "weapon count" multiplier)

This is the app's UI shortcut for "this many copies of this weapon all
fire". Each instance rolls its `attacks` expression independently
(matters for `D3+1` etc.), then adds Blast. There's no RAW name for
this — it's just iteration over models, but it's important the dice
expression is rolled per-model (RAW: *"For all other characteristics,
roll to determine the value on an individual, per-model or per-weapon
basis each time that characteristic is required."*).

### 6.3 Re-rolls

The four supported policies (in `REROLL_VALUES`):

- `NONE` — no re-roll.
- `REROLL_ONE` — re-roll a natural 1.
- `REROLL_FAIL` — re-roll any failed roll (most common).
- `REROLL_NON_CRITICAL` — re-roll if the result wasn't a crit (specific to Twin-linked + Lethal/Sustained interactions).

Re-rolls happen **before** modifiers. Code rolls the raw D6, evaluates,
optionally re-rolls once, evaluates again. A re-rolled die cannot be
re-rolled.

The simulator also supports two independent unit-only buffs:
`rerollFailedHit` and `rerollFailedWound`. Each grants up to X failed-roll
rerolls (X = 1-3, 0 disables the buff) for the entire attacking unit, shared across all weapon profiles and
firing models. Their budgets reset every Monte Carlo trial. They are not
weapon-profile abilities; duplicate unit-buff layers use the larger X rather
than adding uses. Legacy one-failure buffs migrate to X = 1.

For each original die, first use its existing reroll policy if eligible and
available, without spending X. Otherwise, a failed roll can spend one use of
the matching unit budget. Full failed/non-critical policies already cover
all failures and do not grant another reroll from the limited buff.
Only then roll the replacement die once. Never feed that result through
either rule again: a failed 2 rerolled into a 1 does not trigger reroll-ones,
and a 1 rerolled into another failure cannot spend a unit use.
The shared uses go to the first eligible failures in weapon order.
Torrent and Lethal Hits skip their respective rolls without spending a use.

**Weapon × unit rerolls.** When both the weapon and the unit grant a
hit or wound reroll, the unit's replaces the weapon's only if it covers
strictly more dice (Ones < Ones and Twos < Failed = Non-Critical). Failed vs
Non-Critical is a strategy choice, so the weapon's choice stands.

**Random Attacks / Damage rerolls** (`reroll-1-2-3`, labelled "Reroll ≤3
(D3: 1s)"). Each die below its average is rerolled once: 1-3 on a D6, only
1s on a D3 (rerolling a D3's 2 is neutral and its 3 is a loss). Scope "One"
means one die per weapon card: the lowest Attacks die across every
`modelsFiring` instance, or the first qualifying Damage roll on the card
(normal or Devastating Wounds). Open question: 10e re-rolls a summed roll
such as 2D6 as a whole, but the simulator rerolls each die. Confirm the 11e
wording before changing it.

---

## 7. Concrete worked example (sanity check)

A Space Marine Intercessor squad (5 models, 1 Bolter each) shoots an
Ork Boy mob (10 models, T5, Sv6+, W1).

Per-attack math:
- Bolter Rapid Fire 1: assume in half range → 2 attacks per model. So **10 attacks**.
- BS 3+ → hit on 3+ → 4/6.
- S4 vs T5 → `S < T`, wound on 5+ → 2/6.
- AP 0, Sv 6+ → save on 6+ → 1/6 saved → 5/6 unsaved.
- Damage 1 → 1 wound per unsaved.

Expected unsaved wounds = `10 × 4/6 × 2/6 × 5/6 = 1.852`.

Now layer on **Lethal Hits** (Bolter Discipline-style):
- Crit hit on 6 → 1/6 of the 4/6 hits auto-wound.
- Non-crit hits = 4/6 − 1/6 = 3/6, wound at 2/6 → 6/36 = 1/6.
- Crits auto-wound = 1/6.
- Total wound rate per attack = 1/6 + 1/6 = 2/6.
- Expected unsaved = `10 × 2/6 × 5/6 = 2.778`.

Now layer on **Sustained Hits 1** instead:
- Each crit hit (1/6) makes 1 extra auto-hit. Expected hits per attack = 4/6 + 1/6 = 5/6.
- Wound 2/6, save 5/6 unsaved → `10 × 5/6 × 2/6 × 5/6 = 2.315`.

These three numbers (1.85, 2.78, 2.32) are good ballpark sanity checks
for any new tests. Our Monte Carlo with N=5000 should land within ±0.1
of each.

---

## 8. Things this app intentionally does NOT model

If a future feature request asks for any of these, treat as out of scope
unless explicitly requested:

| Rule | Reason for omission |
|---|---|
| **Indirect Fire** (-1 to hit, BoC, 1-3 always fails) | Niche; user-toggleable cover + -1 to hit covers most cases manually. |
| **Stealth** (-1 to hit) | Same — fold into target's `minusOneToHit`. |
| **Big Guns Never Tire** (-1 to hit when in/at melee with MONSTER/VEHICLE) | Same. |
| **Pile In / Consolidate, range, LOS, terrain** | App is a math-hammer, not a battle simulator. |
| **Generic mortal wounds (Smite, Hazardous, Tank Shock, Grenade)** | Only DW MW are produced. Note the spill carve-out if adding. |
| **Precision** (re-allocate to CHARACTER) | Character-allocation modeling out of scope. |
| **Heroic Intervention, Charge bonus, Fights First ordering** | Phase-level, not per-attack. |
| **Multiple invuln saves on one model** | Pick best is correct trivially; defender picks a single save. |
| **Save-roll modifiers** (e.g. +1 to saving throws) | Not modeled. Worsening AP (Armour of Contempt) **is** supported via `minusOneAp`. |
| **FNP modifiers / Multiple FNP** | One FNP value, plus optional separate mortal-FNP. RAW says you can only use one per wound anyway. |

---

## 9. Pre-flight checklist before changing attack code

When modifying `attackSimulation.js`, verify each of these still holds:

- [ ] Nat 1 always fails on hit, wound, save (and is NOT auto-converted by re-rolls).
- [ ] Nat 6 always succeeds on hit, wound (saves: only via the 6+ being unmodified).
- [ ] Crit threshold uses unmodified D6, never the modified one.
- [ ] ±1 modifier cap on hit and wound (compute `mod`, then clamp to `[-1, 1]`).
- [ ] Save: defender uses better of armor-with-AP vs invuln; cover never on invuln; cover never on Sv ≤ 3 vs AP 0.
- [ ] Modified D floors at 1; `damageOne` overrides Half/Minus for normal damage and DW conversion.
- [ ] Damage from one attack does not spill across models (return at model death).
- [ ] DW: card normal damage first, then its mortals, then the next card; modify D once before conversion; each critical damages at most one model.
- [ ] Blast X / Cleave X: mutually exclusive, X * floor(snapshot_size / 5), X defaults to 1 and is limited to 1–5; one snapshot per shooting unit (i.e. per trial in our model).
- [ ] Lethal Hits applies only to the original crit, not Sustained extras.
- [ ] Sustained Hits adds N auto-hits per crit; extras don't trigger Lethal or further Sustained.
- [ ] Anti-X+: crit wound threshold = X (natural X+ always wounds); modifiers apply to the S/T threshold only, never on top of X.
- [ ] FNP: one D6 per wound, not per attack; DW uses the best eligible general/mortal-only threshold, without stacking. `expectedDamage` excludes FNP-ignored points.
- [ ] Random Attacks/Damage rerolls: per-die face limit `rerollFaceLimit` (D6 ≤3, D3 1); scope "One" = one die per weapon card.
- [ ] Re-rolls: at most once per die; happen before modifiers; honor the four policies.
- [ ] Each weapon-instance (`modelsFiring`) rolls its `attacks` expression independently.

Then run:
```powershell
npm test ; npm run lint ; npm run build
```
All three must pass. If you change anything in §3.5 (Devastating Wounds)
or §5.3 (mortal wound spill), make sure the DW regression tests in
[attackSimulation.test.js](../src/lib/dice/__tests__/attackSimulation.test.js)
still pass — they're the regression net for the most-mis-implemented
rule in the entire engine.
