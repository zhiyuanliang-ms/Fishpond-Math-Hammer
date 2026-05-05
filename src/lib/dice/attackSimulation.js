// Monte Carlo simulator for the full Warhammer 40k 10e attack sequence.
//
// Models the standard sequence per attack:
//   1. Hit roll (with optional torrent / -1 to hit / rerolls / lethal hits / sustained hits)
//   2. Wound roll (S vs T table, with optional -1 wound mods / rerolls / anti-X / devastating wounds)
//   3. Save roll (best of armor save modified by AP and invuln save; reroll 1s optional)
//   4. Damage allocation (with -1 damage / half damage; per-point FNP; mortal-FNP for dev wounds)
//
// Multiple weapon profiles fire in user-defined order. Multiple target profiles
// receive damage in user-defined order: each profile's models are killed off
// (a wounded model takes successive damage until destroyed) before moving on.
// Excess damage from a single attack does NOT spill across models (40k rule).

import { DEFAULT_SIMULATIONS, Z_95, REROLL_VALUES } from './constants'
import { parseDiceExpression, rollDiceExpr } from './diceExpression'

// ---- helpers ---------------------------------------------------------------

const clampThreshold = (n) => Math.max(2, Math.min(7, n))

// Standard 10e wound chart from S vs T.
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
//                  (per 10e rules). Natural 1 always fails.
const rollD6WithReroll = (threshold, rerollMode, critThreshold = 6) => {
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

  if (shouldReroll) {
    nat = doRoll()
    ;({ success, isCrit } = evaluate(nat))
  }

  return { success, isCrit, natural: nat }
}

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
          // model boundary in 10e ("until that model is destroyed... excess
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

const resolveWeaponAgainstUnit = (weapon, unitState) => {
  const attacksParsed = parseDiceExpression(weapon.attacks)
  const damageParsed = parseDiceExpression(weapon.damage)
  if (!attacksParsed || !damageParsed) return 0
  let damageDealt = 0

  // Total attacks for this weapon profile this trial. We support a "models
  // firing" multiplier so a unit's worth of identical weapons fires together.
  const modelsFiring = Math.max(1, weapon.modelsFiring || 1)
  let totalAttacks = 0
  for (let i = 0; i < modelsFiring; i++) {
    totalAttacks += rollDiceExpr(attacksParsed)
  }

  for (let a = 0; a < totalAttacks; a++) {
    if (unitState.activeProfile >= unitState.profiles.length) return damageDealt
    const target = unitState.profiles[unitState.activeProfile]

    // 1. Hit roll
    let hitIsCrit = false
    if (weapon.torrent) {
      hitIsCrit = false
    } else {
      const hitMod = (target.minusOneToHit ? 1 : 0)
      const hitThr = clampThreshold(weapon.toHit + hitMod)
      const critHitThr = weapon.critHit || 6
      const hr = rollD6WithReroll(hitThr, weapon.hitReroll, critHitThr)
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
        // 10e rule: roll modifiers cap at ±1.
        if (mod > 1) mod = 1
        let critWoundThr = weapon.critWound || 6
        // Anti-X+: critical wound on natural X+. Successful wounds also count
        // at X+ if that's better than the base threshold (per 10e rules).
        if (weapon.antiEnabled && weapon.antiValue) {
          critWoundThr = weapon.antiValue
          baseThr = Math.min(baseThr, weapon.antiValue)
        }
        const woundThr = clampThreshold(baseThr + mod)
        const wr = rollD6WithReroll(woundThr, weapon.woundReroll, clampThreshold(critWoundThr))
        if (!wr.success) continue
        woundIsCrit = wr.isCrit
      }

      // 2b. Devastating Wounds: critical wound deals damage as mortal wounds,
      // skipping the save. FNP-vs-mortal applies if defined; otherwise normal FNP.
      if (woundIsCrit && weapon.devastatingWounds) {
        const dmg = modifyDamage(rollDiceExpr(damageParsed), t.halfDamage, t.minusOneDamage, t.damageOne)
        damageDealt += applyDamageToUnit(unitState, dmg, true)
        continue
      }

      // 3. Save roll. Pick the better (lower) of modified armor save or invuln.
      const armorMod = clampThreshold((t.save || 7) + (weapon.ap || 0))
      const invuln = (t.invulnSave && t.invulnSave >= 2 && t.invulnSave <= 6) ? t.invulnSave : 7
      const effSave = Math.min(armorMod, invuln)
      if (effSave <= 6) {
        const sr = rollD6WithReroll(effSave, t.saveReroll, 7) // crit doesn't apply to saves
        if (sr.success) continue
      }

      // 4. Damage
      const dmg = modifyDamage(rollDiceExpr(damageParsed), t.halfDamage, t.minusOneDamage, t.damageOne)
      damageDealt += applyDamageToUnit(unitState, dmg, false)
    }
  }
  return damageDealt
}

const parseSustained = (val) => {
  if (val === 'D3') return Math.floor(Math.random() * 3) + 1
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

    let damageThisTrial = 0
    for (const w of weapons) {
      if (state.activeProfile >= state.profiles.length) break
      damageThisTrial += resolveWeaponAgainstUnit(w, state)
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
