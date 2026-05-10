# Warhammer 40k 10e — Attack-Dice Rules Reference

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

Two effects against a matching target:

1. **Crit Wound threshold is lowered to X+** (used for Devastating
   Wounds detection — see §3.5).
2. **The wound succeeds at X+ too**, if X+ is better than the base S vs T
   threshold. (RAW: a Critical Wound is *"always successful"*, so any
   crit also wounds. Anti only widens the success range when X+ is lower
   than the S/T threshold.)

```js
// In code:
if (weapon.antiEnabled && weapon.antiValue) {
  critWoundThr = weapon.antiValue
  baseThr = Math.min(baseThr, weapon.antiValue)   // wound succeeds if you would crit
}
```

The ±1 cap **still applies** to the (effective) wound threshold after
Anti, because Anti changes the threshold, not the modifier. (Anti-2+
weapons therefore cap at "wound on 2+, nat 1 always fails", giving 5/6
hit→wound under torrent.)

### 3.4 Lance

> *"Each time an attack is made with such a weapon, if the bearer made a
> Charge move this turn, add 1 to that attack's Wound roll."*

We model this as `plusOneWound` on the weapon (player toggles it on when
applicable). It's a +1 wound modifier subject to the ±1 cap.

### 3.5 Devastating Wounds  ⚠ deferred

> *"Each time an attack is made with such a weapon, if that attack scores
> a Critical Wound, no saving throw of any kind can be made against that
> attack (including invulnerable saving throws). Such attacks are only
> allocated to models after all other attacks made by the attacking unit
> have been allocated and resolved. After that attack is allocated and
> after any modifiers are applied, it inflicts a number of mortal wounds
> on the target equal to the Damage characteristic of that attack,
> instead of inflicting damage normally."*

Three distinct effects, all of which the implementation must respect:

1. **Bypass the save** (including invuln). — Skip step 4 entirely.
2. **Apply as mortal wounds equal to Damage.** — Damage modifiers (Half
   Damage, Damage −1, Damage = 1) on the target side **still apply**
   because the rule says "after any modifiers are applied".
3. **Defer allocation until ALL of the attacking unit's other attacks
   have resolved.** — In practice: buffer the rolled damage and apply
   after the per-weapon loop finishes. `simulateAttack` collects DW into
   `deferredDevWounds[]` then drains the queue once all weapons fire.
4. **No spill at the model boundary.** — RAW from Mortal Wounds:
   *"if that model is destroyed as a result of those mortal wounds,
   the remaining mortal wounds from that attack are lost, just as with a
   normal attack."* This is a CARVE-OUT to the normal mortal wound
   spill rule (which DOES spill). `applyDamageToUnit` already returns on
   model death for both normal and mortal damage, so this is satisfied.

> ⚠ **Why "deferred" matters.** Rule 3 (allocate) interacts with the
> "must allocate to a wounded model" rule (§5.1). If DW were resolved
> inline alongside normal attacks of the same weapon, a DW landing
> early might one-shot a fresh model, leaving the next normal attack
> to start a new model — wasting less damage. Per RAW, the deferred
> DW must always land on whatever model is currently wounded, often
> wasting MW points to overkill. The unit test
> `Devastating Wounds attacks are deferred until after all other weapons resolve`
> exercises a configuration where the two semantics differ
> (~1.81 deferred vs ~2.5 inline, easily distinguishable by Monte Carlo).

---

## 4. Saving throw

```
modified_armor = clamp( target.Sv + weapon.AP - (cover_applies ? 1 : 0),  2..7 )
effective_save = min( modified_armor, target.invuln ?? 7 )
// Roll a D6; success if D6 >= effective_save (subject to nat-1-fails).
```

> **Defender picks** between armor (modified by AP) and invuln. Code
> always picks the better (lower) — there is no scenario in which it's
> correct to pick the worse one.

### 4.1 Invulnerable saves

> *"Unlike armour saving throws (which use a model's Save characteristic),
> invulnerable saving throws are never modified by an attack's Armour
> Penetration characteristic, but otherwise follow the normal rules for
> saving throws."*

- AP is **ignored** by invuln.
- Cover **does NOT** apply to invuln.
- Re-rolls and the +1 cap apply normally.

### 4.2 Benefit of Cover

> *"Each time a ranged attack is allocated to a model that has the Benefit
> of Cover, add 1 to the saving throw made for that attack (excluding
> invulnerable saving throws). Models with a Save characteristic of 3+ or
> better cannot have the Benefit of Cover against attacks with an Armour
> Penetration characteristic of 0."*

Three conditions for cover to actually fire:

1. Target has Benefit of Cover (`target.benefitOfCover === true`).
2. Weapon does **not** have Ignores Cover (`!weapon.ignoresCover`).
3. **Not** the (Sv ≤ 3 AND AP === 0) corner case.

The +1 stacks with no other save modifiers in this app, so the
"never improved by more than +1" cap is structurally satisfied.

### 4.3 Save re-rolls

`saveReroll` policy is on the target. Re-roll happens before the AP
modifier (per universal rule), and the unmodified post-reroll D6 still
auto-fails on a 1.

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

### 5.3 Mortal wound spill — TWO different rules

> *"Each time mortal wounds are inflicted on a unit, … Excess damage from
> mortal wounds is **not lost** if the damage can be allocated to another
> model."* — **DEFAULT mortal wound rule (DOES spill).**
>
> *"If mortal wounds are being inflicted as a result of the [HAZARDOUS]
> ability or by an attack with the [DEVASTATING WOUNDS] ability that
> scored a Critical Wound, each time those mortal wounds are allocated
> to a model, if that model is destroyed as a result of those mortal
> wounds, the remaining mortal wounds from that attack are lost, just as
> with a normal attack."* — **DW / HAZARDOUS carve-out (does NOT spill).**

We only model the carve-out path (the DW one) — this app has no source
of generic mortal wounds. `applyDamageToUnit` therefore correctly stops
at the model boundary for both `mortal=true` and `mortal=false`.
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
  When applying mortal damage we use `fnpMortal || fnp`. (Some 10e
  units like Death Guard have FNP that only applies to mortals; others
  have a unified FNP — both cases work.)
- The 10e core rule says *"If a model has more than one Feel No Pain
  ability, you can only use one of them each time"* — we don't combine
  the two slots, so this is satisfied trivially.

---

## 6. Special abilities cheat sheet

### 6.1 Blast

> *"Each time you determine how many attacks are made with a Blast
> weapon, add 1 to the result for every five models that were in the
> target unit when you selected it as the target (rounding down)."*

```
blast_bonus = floor(target_size_at_selection / 5)
attacks_per_weapon = roll(weapon.attacks) + blast_bonus
```

The bonus is locked in at **target selection time**, which RAW happens
before any of the attacking unit's weapons resolve. We snapshot
`blastBaseModels` at the start of each Monte Carlo trial and reuse it
for every weapon — so an earlier weapon killing models does NOT shrink
the second weapon's Blast bonus.

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
| **Save modifiers other than Cover** (e.g. Armor of Contempt -1 AP) | Could be modeled by adjusting AP at the call site; app doesn't expose a UI. |
| **FNP modifiers / Multiple FNP** | One FNP value, plus optional separate mortal-FNP. RAW says you can only use one per wound anyway. |

---

## 9. Pre-flight checklist before changing attack code

When modifying `attackSimulation.js`, verify each of these still holds:

- [ ] Nat 1 always fails on hit, wound, save (and is NOT auto-converted by re-rolls).
- [ ] Nat 6 always succeeds on hit, wound (saves: only via the 6+ being unmodified).
- [ ] Crit threshold uses unmodified D6, never the modified one.
- [ ] ±1 modifier cap on hit and wound (compute `mod`, then clamp to `[-1, 1]`).
- [ ] Save: defender uses better of armor-with-AP vs invuln; cover never on invuln; cover never on Sv ≤ 3 vs AP 0.
- [ ] Damage floors at 1; `damageOne` overrides Half/Minus.
- [ ] Damage from one attack does not spill across models (return at model death).
- [ ] DW: deferred until after all weapons fire; mortals do not spill across models; damage modifiers still apply.
- [ ] Blast: floor(snapshot_size / 5), one snapshot per shooting unit (i.e. per trial in our model).
- [ ] Lethal Hits applies only to the original crit, not Sustained extras.
- [ ] Sustained Hits adds N auto-hits per crit; extras don't trigger Lethal or further Sustained.
- [ ] Anti-X+: crit wound threshold = X; wound succeeds at X+ if better than S/T.
- [ ] FNP: one D6 per damage point, not per attack; mortal-FNP slot used for DW.
- [ ] Re-rolls: at most once per die; happen before modifiers; honor the four policies.
- [ ] Each weapon-instance (`modelsFiring`) rolls its `attacks` expression independently.

Then run:
```powershell
npm test ; npm run lint ; npm run build
```
All three must pass. If you change anything in §3.5 (Devastating Wounds)
or §5.3 (mortal wound spill), make sure the three DW unit tests in
[attackSimulation.test.js](../src/lib/dice/__tests__/attackSimulation.test.js)
still pass — they're the regression net for the most-mis-implemented
rule in the entire engine.
