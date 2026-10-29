// Monte Carlo simulator for the full Warhammer 40k 11e attack sequence.
//
// Models the sequence per weapon-profile card:
//   1. Hit roll (with optional torrent / -1 to hit / benefit of cover / rerolls / lethal hits / sustained hits)
//   2. Wound roll (S vs T table, with optional -1 wound mods / rerolls / anti-X / devastating wounds)
//   3. Roll the card's saving dice and resolve them from lowest to highest
//      against each current allocation group's armor / invulnerable save
//   4. Damage allocation (with -1 damage / half damage; per-point FNP; mortal-FNP for dev wounds)
//
// Attacking units fire in list order, with their weapon profiles in user-defined
// order. Multiple target profiles
// receive damage in user-defined order: each profile's models are killed off
// (a wounded model takes successive damage until destroyed) before moving on.
// Excess damage from a single attack does NOT spill across models (40k rule).
//
// Devastating Wounds bypass saves and resolve after the same weapon card's
// normal damage, before the next card attacks. Each critical wound inflicts
// the modified Damage characteristic as mortal wounds. Apply Damage modifiers
// once before conversion, then the best eligible FNP, and discard excess mortal
// wounds when that critical wound destroys its one allocated model.

import { DEFAULT_SIMULATIONS, Z_95, REROLL_SCOPE, randomRerollThreshold } from './constants'
import {
  parseDiceExpression,
  rerollFaceLimit,
  rollDiceExpr,
  rollDiceExprWithReroll,
} from './diceExpression'
import { makeUnitBuffs, mergeWeaponWithUnit } from './unitBuffMerge'
import { evaluateD6, shouldRerollD6 } from './d6Rerolls'
import { normalizeAttackBonusValue } from './weaponProfile'
import { rollD6s } from './roll'

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
const rollD6WithReroll = (
  threshold,
  rerollMode,
  critThreshold = 6,
  budget = null,
  failedRerollBudget = null
) => {
  const doRoll = () => Math.floor(Math.random() * 6) + 1

  const evaluate = (nat) => evaluateD6(nat, threshold, critThreshold)

  let nat = doRoll()
  let { success, isCrit } = evaluate(nat)

  const shouldReroll = shouldRerollD6(nat, rerollMode, success, isCrit)

  const policyReroll = shouldReroll && (!budget || budget.remaining > 0)
  const limitedFailedReroll =
    !policyReroll && !success && failedRerollBudget?.remaining > 0

  // Choose one source from the original roll; never reconsider its rerolled result.
  if (policyReroll || limitedFailedReroll) {
    const usedBudget = policyReroll ? budget : failedRerollBudget
    if (usedBudget) usedBudget.remaining -= 1
    nat = doRoll()
    ;({ success, isCrit } = evaluate(nat))
  }

  return { success, isCrit, natural: nat }
}

const makeRerollBudget = (scope) =>
  scope === REROLL_SCOPE.SINGLE ? { remaining: 1 } : { remaining: Infinity }

// FNP roll: returns true if the wound is ignored.
const fnpRoll = (fnpThreshold) => {
  if (!fnpThreshold || fnpThreshold < 2 || fnpThreshold > 6) return false
  return Math.floor(Math.random() * 6) + 1 >= fnpThreshold
}

// Deal `damage` points to the unit's currently-active model, applying
// per-point FNP. Mutates `unitState.profiles` in place. `mortal` controls
// whether mortal-only FNP is also eligible alongside general FNP.
// Returns the number of wounds the defender actually lost from this attack.
// Points ignored by FNP, and excess points wasted when the model dies, are
// not counted, so "damage dealt" reflects FNP.
const applyDamageToUnit = (unitState, damage, mortal) => {
  let woundsLost = 0
  while (damage > 0 && unitState.activeProfile < unitState.profiles.length) {
    const prof = unitState.profiles[unitState.activeProfile]
    if (prof.modelsRemaining <= 0) {
      unitState.activeProfile++
      continue
    }

    // Apply ONE point to the current model, with FNP. Damage from a single
    // attack only flows to one model (excess wasted), so we cap the loop
    // when this model dies.
    const fnpUsed = mortal ? Math.min(prof.fnp || 7, prof.fnpMortal || 7) : prof.fnp
    while (damage > 0) {
      const blocked = fnpRoll(fnpUsed)
      damage--
      if (!blocked) {
        woundsLost++
        prof.currentModelWounds--
        if (prof.currentModelWounds <= 0) {
          prof.modelsRemaining--
          prof.currentModelWounds = prof.wounds
          // If this profile is now exhausted, advance the pointer so the
          // next attack targets (and is statted against) the next profile.
          if (prof.modelsRemaining <= 0) unitState.activeProfile++
          // Excess damage from a single attack does NOT carry over.
          // One DW critical can damage at most one model; discard its excess.
          return woundsLost
        }
      }
    }
  }
  return woundsLost
}

// Modify D before normal damage or conversion into mortal wounds.
const modifyDamage = (rawDamage, halfDamage, minusOneDamage, damageOne) => {
  if (damageOne) return 1
  let d = rawDamage
  if (halfDamage) d = Math.ceil(d / 2)
  if (minusOneDamage) d -= 1
  return Math.max(1, d)
}

const saveThresholdAgainstWeapon = (weapon, target) => {
  const ap = target.minusOneAp ? Math.max(0, (weapon.ap || 0) - 1) : (weapon.ap || 0)
  const armorSave = clampThreshold((target.save || 7) + ap)
  const invulnSave = target.invulnSave >= 2 && target.invulnSave <= 6 ? target.invulnSave : 7
  return Math.min(armorSave, invulnSave)
}

// ---- single-trial attack resolution ----------------------------------------

const resolveWeaponAgainstUnit = (
  weapon,
  unitState,
  blastBaseModels,
  unitRerollBudgets
) => {
  const attacksParsed = parseDiceExpression(weapon.attacks)
  const damageParsed = parseDiceExpression(weapon.damage)
  if (!attacksParsed || !damageParsed) return 0
  let damageDealt = 0
  let woundCount = 0
  const deferredDevWounds = []

  // Reroll budgets — one per rolling event for this weapon firing. With
  // `scope === 'single'` the budget caps total rerolls at 1 across all of
  // this weapon's attacks; otherwise it is effectively unlimited.
  const hitBudget = makeRerollBudget(weapon.hitRerollScope)
  const woundBudget = makeRerollBudget(weapon.woundRerollScope)
  // Random-value rerolls (Attacks / Damage). The face limit depends on the
  // die size: "reroll <=3" rerolls 1-3 on a D6 but only 1s on a D3.
  const attackRerollT = rerollFaceLimit(randomRerollThreshold(weapon.attackReroll), attacksParsed.sides)
  const damageRerollT = randomRerollThreshold(weapon.damageReroll)
  const attackScope = weapon.attackRerollScope === REROLL_SCOPE.SINGLE ? REROLL_SCOPE.SINGLE : REROLL_SCOPE.ALL
  const damageScope = weapon.damageRerollScope === REROLL_SCOPE.SINGLE ? REROLL_SCOPE.SINGLE : REROLL_SCOPE.ALL
  // With 'single' scope, one Damage die may be rerolled for this whole card
  // (normal and Devastating Wounds rolls alike): the first qualifying roll.
  const damageRerollBudget = { remaining: 1 }
  const rollDamage = () => rollDiceExprWithReroll(
    damageParsed, damageRerollT, damageScope, damageRerollBudget
  )

  // Blast X and Cleave X are mutually exclusive; legacy conflicts prefer Blast.
  // Either adds X attack dice per five target models.
  // Cleave's single-target requirement is always met in this simulator.
  // All of this unit's targets are selected before any of its weapons resolve,
  // so earlier kills by this unit do not change its attack-dice bonus.
  const perFiveTargetModels = Math.floor(blastBaseModels / 5)
  const blastBonus = weapon.blast
    ? normalizeAttackBonusValue(weapon.blastValue) * perFiveTargetModels
    : 0
  const cleaveBonus = !weapon.blast && weapon.cleaveEnabled
    ? normalizeAttackBonusValue(weapon.cleaveValue) * perFiveTargetModels
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
      const hr = rollD6WithReroll(
        hitThr, weapon.hitReroll, critHitThr, hitBudget, unitRerollBudgets.hit
      )
      if (!hr.success) continue
      hitIsCrit = hr.isCrit
    }

    // Sustained hits: each crit produces N extra hits (auto-passing the hit
    // step). Extras don't get lethal/crit interactions on their own.
    let extraHits = 0
    if (hitIsCrit && weapon.sustainedHits && weapon.sustainedHits !== 'off') {
      extraHits = parseSustained(weapon.sustainedHits)
    }

    // The original hit + extras each go through the wound step. Lethal
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
        const baseThr = woundThresholdFromST(weapon.strength, t.toughness)
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
        // Anti-X+: an unmodified Wound roll of X+ is a Critical Wound, and
        // critical wounds always succeed (handled by evaluateD6). Anti does
        // NOT move the threshold that wound modifiers apply to: with Anti-4+
        // and +1 to Wound against a 5+ wound roll, a natural 3 still fails.
        if (weapon.antiEnabled && weapon.antiValue) {
          critWoundThr = Math.min(critWoundThr, weapon.antiValue)
        }
        const woundThr = clampThreshold(baseThr + mod)
        const wr = rollD6WithReroll(
          woundThr, weapon.woundReroll, clampThreshold(critWoundThr),
          woundBudget, unitRerollBudgets.wound
        )
        if (!wr.success) continue
        woundIsCrit = wr.isCrit
      }

      // Keep each critical's Damage roll separate until this card's normal
      // damage resolves; modify D before converting it into mortal wounds.
      if (woundIsCrit && weapon.devastatingWounds) {
        deferredDevWounds.push(rollDamage())
        continue
      }

      woundCount++
    }
  }

  const saveThresholds = unitState.profiles.map((target) => saveThresholdAgainstWeapon(weapon, target))
  // Even an unsaveable front group needs dice if a later group can save.
  // Only omit the dice when every remaining group has an impossible save.
  const canSave = saveThresholds.some(
    (threshold, index) => unitState.profiles[index].modelsRemaining > 0 && threshold <= 6
  )
  const saveRolls = canSave ? rollD6s(woundCount).sort((a, b) => a - b) : null

  for (let index = 0; index < woundCount; index++) {
    if (unitState.activeProfile >= unitState.profiles.length) break
    const target = unitState.profiles[unitState.activeProfile]
    if (saveRolls && saveRolls[index] >= saveThresholds[unitState.activeProfile]) continue

    const rawDmg = rollDamage()
    const dmg = modifyDamage(rawDmg, target.halfDamage, target.minusOneDamage, target.damageOne)
    damageDealt += applyDamageToUnit(unitState, dmg, false)
  }

  for (const rawDamage of deferredDevWounds) {
    if (unitState.activeProfile >= unitState.profiles.length) break
    const target = unitState.profiles[unitState.activeProfile]
    const mortalWounds = modifyDamage(
      rawDamage, target.halfDamage, target.minusOneDamage, target.damageOne
    )
    damageDealt += applyDamageToUnit(unitState, mortalWounds, true)
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

export const simulateMultiUnitAttack = (
  attackerUnits,
  targetProfiles,
  numSimulations = DEFAULT_SIMULATIONS
) => {
  const effectiveUnits = attackerUnits.map(({ weapons, unitBuffs }) => {
    const buffs = makeUnitBuffs(unitBuffs || {})
    return {
      unitBuffs: buffs,
      weapons: weapons.map((weapon) => mergeWeaponWithUnit(weapon, buffs)),
    }
  })
  const totalModels = targetProfiles.reduce((s, p) => s + (p.models || 0), 0)

  const totalKillsPerTrial = []
  const killsPerProfilePerTrial = targetProfiles.map(() => [])
  const damagePerTrial = []

  for (let sim = 0; sim < numSimulations; sim++) {
    const state = buildUnitState(targetProfiles)
    let damageThisTrial = 0

    for (const { weapons, unitBuffs } of effectiveUnits) {
      if (state.activeProfile >= state.profiles.length) break
      const unitRerollBudgets = {
        hit: { remaining: unitBuffs.rerollFailedHit },
        wound: { remaining: unitBuffs.rerollFailedWound },
      }
      const blastBaseModels = state.profiles.reduce(
        (sum, profile) => sum + profile.modelsRemaining, 0
      )
      for (const weapon of weapons) {
        if (state.activeProfile >= state.profiles.length) break
        damageThisTrial += resolveWeaponAgainstUnit(
          weapon, state, blastBaseModels, unitRerollBudgets
        )
      }
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

export const simulateAttack = (
  weapons,
  targetProfiles,
  numSimulations = DEFAULT_SIMULATIONS,
  unitBuffs = {}
) => simulateMultiUnitAttack([{ weapons, unitBuffs }], targetProfiles, numSimulations)
