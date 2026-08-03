// Monte Carlo simulator for the full Warhammer 40k 11e attack sequence.
//
// Models the standard sequence per attack:
//   1. Hit roll (with optional torrent / -1 to hit / benefit of cover / rerolls / lethal hits / sustained hits)
//   2. Wound roll (S vs T table, with optional -1 wound mods / rerolls / anti-X / devastating wounds)
//   3. Save roll (best of armor save modified by AP and invuln save; reroll 1s optional)
//   4. Damage allocation (with -1 damage / half damage; per-point FNP; mortal-FNP for dev wounds)
//
// Multiple weapon profiles fire in user-defined order. Multiple target profiles
// receive damage in user-defined order: each profile's models are killed off
// (a wounded model takes successive damage until destroyed) before moving on.
// Excess damage from a single attack does NOT spill across models (40k rule).
//
// Devastating Wounds: per the 11e core rule, DW attacks (i.e. a critical wound
// rolled on a [DEVASTATING WOUNDS] weapon) are *only allocated to models after
// all other attacks made by the attacking unit have been allocated and
// resolved*. They then inflict mortal wounds equal to the attack's Damage
// characteristic, and — like Hazardous mortals — do NOT spill over to
// another model when the model they are allocated to is destroyed (excess is
// lost). We model this by buffering DW damage rolls during the per-weapon
// loop and draining them once all weapons in `weapons[]` have resolved.

import { DEFAULT_SIMULATIONS, Z_95, REROLL_VALUES, REROLL_SCOPE, randomRerollThreshold } from './constants'
import { parseDiceExpression, rollDiceExpr, rollDiceExprWithReroll } from './diceExpression'

// ---- helpers ---------------------------------------------------------------

const clampThreshold = (n) => Math.max(2, Math.min(7, n))

// Standard 11e wound chart from S vs T.
const woundThresholdFromST = (S, T) => {
  if (S >= 2 * T) return 2
  if (S > T) return 3
  if (S === T) return 4
  if (S * 2 <= T) return 6
  return 5
}

// Roll a single d6 with reroll behavior. Returns { success, isCrit, natural }.
//   threshold:    modified to-hit/to-wound (2..7). 7 = auto-fail unless natural 6
//                 (or unmodified critical).
//   critThreshold: natural value at/above which the roll counts as a critical
//                  success (default 6). Critical successes always succeed
//                  (per 11e rules). Natural 1 always fails.
const rollD6WithReroll = (threshold, rerollMode, critThreshold = 6, budget = null) => {
  const doRoll = () => Math.floor(Math.random() * 6) + 1

  const evaluate = (nat) => {
    if (nat === 1) return { success: false, isCrit: false }
    const isCrit = nat >= critThreshold
    // Critical roll auto-succeeds; otherwise needs to meet the modified threshold
    // (with natural 6 also being an auto-success).
    const success = isCrit || nat === 6 || nat >= threshold
    return { success, isCrit }
  }

  let nat = doRoll()
  let { success, isCrit } = evaluate(nat)

  const shouldReroll = (() => {
    if (rerollMode === REROLL_VALUES.REROLL_ONE) return nat === 1
    if (rerollMode === REROLL_VALUES.REROLL_FAIL) return !success
    if (rerollMode === REROLL_VALUES.REROLL_NON_CRITICAL) return !isCrit
    return false
  })()

  if (shouldReroll && (!budget || budget.remaining > 0)) {
    if (budget) budget.remaining -= 1
    nat = doRoll()
    ;({ success, isCrit } = evaluate(nat))
  }

  return { success, isCrit, natural: nat }
}

// Make a fresh reroll-budget for one rolling event. `single` scope gets exactly
// one reroll; everything else (including missing/legacy values) is unlimited.
const makeRerollBudget = (scope) =>
  scope === REROLL_SCOPE.SINGLE ? { remaining: 1 } : { remaining: Infinity }

// FNP roll: returns true if the wound is ignored.
const fnpRoll = (fnpThreshold) => {
  if (!fnpThreshold || fnpThreshold < 2 || fnpThreshold > 6) return false
  return Math.floor(Math.random() * 6) + 1 >= fnpThreshold
}

// Deal `damage` points to the unit's currently-active model, applying
// per-point FNP. Mutates `unitState.profiles` in place. `mortal` controls
// whether normal FNP or mortal-wound FNP is used.
// Returns the number of damage points actually consumed from this attack
// (i.e. delivered before the model died and the rest was wasted, or before
// the unit was wiped). FNP-blocked points still count as consumed.
const applyDamageToUnit = (unitState, damage, mortal) => {
  let consumed = 0
  while (damage > 0 && unitState.activeProfile < unitState.profiles.length) {
    const prof = unitState.profiles[unitState.activeProfile]
    if (prof.modelsRemaining <= 0) {
      unitState.activeProfile++
      continue
    }

    // Apply ONE point to the current model, with FNP. Damage from a single
    // attack only flows to one model (excess wasted), so we cap the loop
    // when this model dies.
    const fnpUsed = mortal ? (prof.fnpMortal || prof.fnp) : prof.fnp
    while (damage > 0) {
      const blocked = fnpRoll(fnpUsed)
      damage--
      consumed++
      if (!blocked) {
        prof.currentModelWounds--
        if (prof.currentModelWounds <= 0) {
          prof.modelsRemaining--
          prof.currentModelWounds = prof.wounds
          // If this profile is now exhausted, advance the pointer so the
          // next attack targets (and is statted against) the next profile.
          if (prof.modelsRemaining <= 0) unitState.activeProfile++
          // Excess damage from a single attack does NOT carry over.
          // For mortal wounds (dev wounds) the rules also cap excess at the
          // model boundary in 11e ("until that model is destroyed... excess
          // is lost"). Stop pushing damage from this attack.
          return consumed
        }
      }
    }
  }
  return consumed
}

// Apply damage modifiers to a single attack's damage value.
const modifyDamage = (rawDamage, halfDamage, minusOneDamage, damageOne) => {
  if (damageOne) return 1
  let d = rawDamage
  if (halfDamage) d = Math.ceil(d / 2)
  if (minusOneDamage) d -= 1
  return Math.max(1, d)
}

// ---- single-trial attack resolution ----------------------------------------

const resolveWeaponAgainstUnit = (weapon, unitState, blastBaseModels, deferredDevWounds) => {
  const attacksParsed = parseDiceExpression(weapon.attacks)
  const damageParsed = parseDiceExpression(weapon.damage)
  if (!attacksParsed || !damageParsed) return 0
  let damageDealt = 0

  // Reroll budgets — one per rolling event for this weapon firing. With
  // `scope === 'single'` the budget caps total rerolls at 1 across all of
  // this weapon's attacks; otherwise it is effectively unlimited.
  const hitBudget = makeRerollBudget(weapon.hitRerollScope)
  const woundBudget = makeRerollBudget(weapon.woundRerollScope)
  // Random-value rerolls (Attacks / Damage)
  const attackRerollT = randomRerollThreshold(weapon.attackReroll)
  const damageRerollT = randomRerollThreshold(weapon.damageReroll)
  const attackScope = weapon.attackRerollScope === REROLL_SCOPE.SINGLE ? REROLL_SCOPE.SINGLE : REROLL_SCOPE.ALL
  const damageScope = weapon.damageRerollScope === REROLL_SCOPE.SINGLE ? REROLL_SCOPE.SINGLE : REROLL_SCOPE.ALL

  // Blast: +1 attack die "for every five models that were in the target unit
  // when you selected it as the target". Cleave X (11e): +X attack dice per
  // five such models, and only when the weapon fires at a single target —
  // always the case in this single-unit simulator. The shooting unit selects
  // all targets BEFORE any weapon resolves, so use the unit's size from the
  // start of this trial, not the live count after earlier kills.
  const perFiveTargetModels = Math.floor(blastBaseModels / 5)
  const blastBonus = weapon.blast ? perFiveTargetModels : 0
  const cleaveBonus = weapon.cleaveEnabled
    ? Math.max(1, weapon.cleaveValue || 1) * perFiveTargetModels
    : 0
  const attackDiceBonus = blastBonus + cleaveBonus

  // Each weapon instance rolls its attack dice independently (so D3+1 with
  // weaponCount 2 gives two separate rolls), and Blast/Cleave add their bonus
  // to every roll.
  //
  // Random-Attacks reroll: with `single` scope, only ONE attack-die in this
  // entire pool may be rerolled — pick the lowest qualifying roll across all
  // weapon instances and reroll it. With `all` scope, every die that came up
  // <= threshold is rerolled once.
  const weaponCount = Math.max(1, weapon.modelsFiring || 1)
  let totalAttacks = 0
  if (attackRerollT > 0 && attacksParsed.count > 0 && attackScope === REROLL_SCOPE.SINGLE) {
    // Roll all instances first, find the single lowest qualifying die, reroll it.
    const allRolls = []
    for (let i = 0; i < weaponCount; i++) {
      const rolls = []
      for (let j = 0; j < attacksParsed.count; j++) {
        rolls.push(Math.floor(Math.random() * attacksParsed.sides) + 1)
      }
      allRolls.push(rolls)
    }
    let bestI = -1
    let bestJ = -1
    let bestVal = Infinity
    for (let i = 0; i < allRolls.length; i++) {
      for (let j = 0; j < allRolls[i].length; j++) {
        const v = allRolls[i][j]
        if (v <= attackRerollT && v < bestVal) {
          bestVal = v
          bestI = i
          bestJ = j
        }
      }
    }
    if (bestI >= 0) {
      allRolls[bestI][bestJ] = Math.floor(Math.random() * attacksParsed.sides) + 1
    }
    for (let i = 0; i < allRolls.length; i++) {
      const sum = allRolls[i].reduce((s, x) => s + x, attacksParsed.flat)
      totalAttacks += Math.max(0, sum + attackDiceBonus)
    }
  } else {
    for (let i = 0; i < weaponCount; i++) {
      const rolled = attackRerollT > 0
        ? rollDiceExprWithReroll(attacksParsed, attackRerollT, attackScope)
        : rollDiceExpr(attacksParsed)
      totalAttacks += Math.max(0, rolled + attackDiceBonus)
    }
  }

  for (let a = 0; a < totalAttacks; a++) {
    if (unitState.activeProfile >= unitState.profiles.length) return damageDealt
    const target = unitState.profiles[unitState.activeProfile]

    // 1. Hit roll
    let hitIsCrit = false
    if (weapon.torrent) {
      hitIsCrit = false
    } else {
      let hitMod = (target.minusOneToHit ? 1 : 0)
      // +1 to Hit: subtract from threshold (lower is better).
      if (weapon.plusOneHit) hitMod -= 1
      // Roll modifiers cap at ±1.
      if (hitMod > 1) hitMod = 1
      if (hitMod < -1) hitMod = -1
      // Benefit of Cover (11e): worsen the attack's BS characteristic by 1.
      // This is a characteristic modifier, not a hit-roll modifier, so it is
      // not subject to the ±1 roll cap and stacks on top of -1 to Hit.
      // Negated by Ignores Cover.
      const coverPenalty = target.benefitOfCover && !weapon.ignoresCover ? 1 : 0
      const hitThr = clampThreshold(weapon.toHit + coverPenalty + hitMod)
      const critHitThr = weapon.critHitEnabled && weapon.critHit ? weapon.critHit : 6
      const hr = rollD6WithReroll(hitThr, weapon.hitReroll, critHitThr, hitBudget)
      if (!hr.success) continue
      hitIsCrit = hr.isCrit
    }

    // Sustained hits: each crit produces N extra hits (auto-passing the hit
    // step). Extras don't get lethal/crit interactions on their own.
    let extraHits = 0
    if (hitIsCrit && weapon.sustainedHits && weapon.sustainedHits !== 'off') {
      extraHits = parseSustained(weapon.sustainedHits)
    }

    // The original hit + extras each go through wound/save/damage. Lethal
    // hits short-circuits ONLY the original critical hit's wound roll.
    const queue = [{ lethalAuto: hitIsCrit && weapon.lethalHits }]
    for (let i = 0; i < extraHits; i++) queue.push({ lethalAuto: false })

    for (const atk of queue) {
      if (unitState.activeProfile >= unitState.profiles.length) return damageDealt
      const t = unitState.profiles[unitState.activeProfile]

      // 2. Wound roll
      let woundIsCrit = false
      if (atk.lethalAuto) {
        // auto-wound, no crit, no anti, no dev-wounds
      } else {
        let baseThr = woundThresholdFromST(weapon.strength, t.toughness)
        let mod = 0
        if (t.minusOneToWound) mod += 1
        if (t.minusOneToWoundIfStronger && weapon.strength > t.toughness) mod += 1
        // +1 to Wound (e.g. Lance on the charge, certain stratagems): -1 to
        // the wound threshold (capped with the rest below).
        if (weapon.plusOneWound) mod -= 1
        // Roll modifiers cap at ±1.
        if (mod > 1) mod = 1
        if (mod < -1) mod = -1
        let critWoundThr = weapon.critWound || 6
        // Anti-X+: critical wound on natural X+. Successful wounds also count
        // at X+ if that's better than the base threshold (per 11e rules).
        if (weapon.antiEnabled && weapon.antiValue) {
          critWoundThr = weapon.antiValue
          baseThr = Math.min(baseThr, weapon.antiValue)
        }
        const woundThr = clampThreshold(baseThr + mod)
        const wr = rollD6WithReroll(woundThr, weapon.woundReroll, clampThreshold(critWoundThr), woundBudget)
        if (!wr.success) continue
        woundIsCrit = wr.isCrit
      }

      // 2b. Devastating Wounds: critical wound deals damage as mortal wounds,
      // skipping the save. Per 11e RAW these attacks are deferred until all
      // other attacks made by the attacking unit have been resolved — we just
      // roll the damage now and queue it; allocation happens after the weapon
      // loop in `simulateAttack`.
      if (woundIsCrit && weapon.devastatingWounds) {
        deferredDevWounds.push(rollDiceExprWithReroll(damageParsed, damageRerollT, damageScope))
        continue
      }

      // 3. Save roll. Pick the better (lower) of modified armor save or invuln.
      // Benefit of Cover is no longer a save modifier in 11e — it worsens the
      // attacker's BS in the hit step (see above).
      const ap = weapon.ap || 0
      const baseSave = t.save || 7
      const armorMod = clampThreshold(baseSave + ap)
      const invuln = (t.invulnSave && t.invulnSave >= 2 && t.invulnSave <= 6) ? t.invulnSave : 7
      const effSave = Math.min(armorMod, invuln)
      if (effSave <= 6) {
        // Save reroll is a simple buff: when `rerollSaveOnes` is set the
        // defender rerolls every natural 1 on the save die (aura/banner-style
        // ability). No budget — these effects fire on every die.
        const saveRerollMode = t.rerollSaveOnes ? REROLL_VALUES.REROLL_ONE : REROLL_VALUES.NO_REROLL
        const sr = rollD6WithReroll(effSave, saveRerollMode, 7) // crit doesn't apply to saves
        if (sr.success) continue
      }

      // 4. Damage
      const rawDmg = damageRerollT > 0
        ? rollDiceExprWithReroll(damageParsed, damageRerollT, damageScope)
        : rollDiceExpr(damageParsed)
      const dmg = modifyDamage(rawDmg, t.halfDamage, t.minusOneDamage, t.damageOne)
      damageDealt += applyDamageToUnit(unitState, dmg, false)
    }
  }
  return damageDealt
}

const parseSustained = (val) => {
  if (typeof val === 'string' && val.toUpperCase() === 'D3') {
    return Math.floor(Math.random() * 3) + 1
  }
  if (typeof val === 'string' && val.toUpperCase() === 'D6') {
    return Math.floor(Math.random() * 6) + 1
  }
  const n = parseInt(val, 10)
  return Number.isFinite(n) ? n : 0
}

// Build a fresh per-trial mutable unit state from the user-provided profiles.
const buildUnitState = (targetProfiles) => ({
  activeProfile: 0,
  profiles: targetProfiles.map((p) => ({
    ...p,
    modelsRemaining: p.models,
    currentModelWounds: p.wounds
  }))
})

// ---- public entry ----------------------------------------------------------

export const simulateAttack = (weapons, targetProfiles, numSimulations = DEFAULT_SIMULATIONS) => {
  const totalModels = targetProfiles.reduce((s, p) => s + (p.models || 0), 0)

  const totalKillsPerTrial = []
  const killsPerProfilePerTrial = targetProfiles.map(() => [])
  const damagePerTrial = []

  for (let sim = 0; sim < numSimulations; sim++) {
    const state = buildUnitState(targetProfiles)
    // Snapshot of the target unit's size at "target selection" — used by
    // Blast for every weapon this trial regardless of resolution order.
    const blastBaseModels = totalModels

    let damageThisTrial = 0
    // Devastating Wounds attacks are buffered here and resolved AFTER all
    // weapons (the "attacking unit") have fired, per 11e RAW.
    const deferredDevWounds = []
    for (const w of weapons) {
      if (state.activeProfile >= state.profiles.length) break
      damageThisTrial += resolveWeaponAgainstUnit(w, state, blastBaseModels, deferredDevWounds)
    }

    // Drain deferred DW attacks. Each one inflicts mortal wounds equal to its
    // (already-rolled) Damage characteristic, modified by the active target
    // profile's defensive damage modifiers, and does NOT spill across models.
    for (const rawDmg of deferredDevWounds) {
      if (state.activeProfile >= state.profiles.length) break
      const t = state.profiles[state.activeProfile]
      const dmg = modifyDamage(rawDmg, t.halfDamage, t.minusOneDamage, t.damageOne)
      damageThisTrial += applyDamageToUnit(state, dmg, true)
    }

    let killsTotal = 0
    state.profiles.forEach((p, i) => {
      const killed = (targetProfiles[i].models || 0) - p.modelsRemaining
      killsPerProfilePerTrial[i].push(killed)
      killsTotal += killed
    })
    totalKillsPerTrial.push(killsTotal)
    damagePerTrial.push(damageThisTrial)
  }

  // ---- summary stats -----
  const N = totalKillsPerTrial.length || 1
  const mean = (arr) => arr.reduce((s, x) => s + x, 0) / N
  const variance = (arr, m) => {
    let v = 0
    for (const x of arr) v += (x - m) * (x - m)
    return v / N
  }

  const meanKills = mean(totalKillsPerTrial)
  const stdKills = Math.sqrt(variance(totalKillsPerTrial, meanKills))
  const meanDamage = mean(damagePerTrial)
  const stdDamage = Math.sqrt(variance(damagePerTrial, meanDamage))

  // Distribution of total kills
  const distMap = new Map()
  for (const k of totalKillsPerTrial) distMap.set(k, (distMap.get(k) || 0) + 1)
  const distributionData = []
  let cum = 0
  for (let k = 0; k <= totalModels; k++) {
    const count = distMap.get(k) || 0
    const probability = (count / N) * 100
    cum += probability
    distributionData.push({ kills: k, probability, cumulative: Math.min(cum, 100) })
  }

  // Per-profile expected kills
  const perProfile = killsPerProfilePerTrial.map((arr, i) => {
    const m = mean(arr)
    const sd = Math.sqrt(variance(arr, m))
    const wipedCount = arr.filter((k) => k === targetProfiles[i].models).length
    return {
      name: targetProfiles[i].name || `Profile ${i + 1}`,
      models: targetProfiles[i].models,
      expectedKills: m,
      stdDev: sd,
      wipeProbability: (wipedCount / N) * 100
    }
  })

  // Wipe (kill all models) probability
  const wipeAllCount = totalKillsPerTrial.filter((k) => k === totalModels).length
  const pWipeAll = wipeAllCount / N
  const seWipeAll = Math.sqrt(Math.max(0, (pWipeAll * (1 - pWipeAll)) / N))

  return {
    totalModels,
    expectedKills: meanKills,
    expectedKillsStdDev: stdKills,
    expectedKillsCILow: Math.max(0, meanKills - Z_95 * stdKills),
    expectedKillsCIHigh: Math.min(totalModels, meanKills + Z_95 * stdKills),
    expectedDamage: meanDamage,
    expectedDamageStdDev: stdDamage,
    expectedDamageCILow: Math.max(0, meanDamage - Z_95 * stdDamage),
    expectedDamageCIHigh: meanDamage + Z_95 * stdDamage,
    wipeProbability: pWipeAll * 100,
    wipeProbabilityCILow: Math.max(0, pWipeAll - Z_95 * seWipeAll) * 100,
    wipeProbabilityCIHigh: Math.min(1, pWipeAll + Z_95 * seWipeAll) * 100,
    wipeProbabilityStdDev: seWipeAll * 100,
    distributionData,
    perProfile,
    numSimulations: N
  }
}
