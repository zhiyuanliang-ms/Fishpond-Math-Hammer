// Monte Carlo simulation for kill probability.

import { DEFAULT_SIMULATIONS, Z_95 } from './constants'
import { calculateSaveChance, calculateFnpChance } from './probability'

// Inner simulation: rolls each attack against models and returns kill counts per sim.
const simulateKills = (
  numAttacks,
  damagePerAttack,
  numModels,
  modelWounds,
  saveChance,
  fnpChance,
  numSimulations = DEFAULT_SIMULATIONS
) => {
  const killCounts = []

  for (let sim = 0; sim < numSimulations; sim++) {
    const modelsRemaining = Array(numModels).fill(modelWounds)
    let currentModelIndex = 0
    let damageDealtToCurrentModel = 0

    for (let attack = 0; attack < numAttacks; attack++) {
      // 1. Roll Armor Save (once per attack)
      let savePassed = false
      if (saveChance > 0) {
        savePassed = Math.random() < saveChance
      }
      if (savePassed) continue

      // 2. Apply Damage (FNP check per damage point)
      for (let dmgPoint = 0; dmgPoint < damagePerAttack; dmgPoint++) {
        let damageBlocked = false
        if (fnpChance > 0) {
          damageBlocked = Math.random() < fnpChance
        }
        if (!damageBlocked) {
          damageDealtToCurrentModel++

          if (damageDealtToCurrentModel >= modelsRemaining[currentModelIndex]) {
            modelsRemaining[currentModelIndex] = 0
            currentModelIndex++
            damageDealtToCurrentModel = 0

            if (currentModelIndex >= modelsRemaining.length) break

            // Excess damage from this attack does NOT spill to the next model
            // (Warhammer damage is capped per model).
            break
          }
        }
      }

      if (currentModelIndex >= modelsRemaining.length) break
    }

    killCounts.push(modelsRemaining.filter(w => w === 0).length)
  }

  return { killCounts }
}

// Public entry: simulate kill probability and produce distribution & summary stats.
export const simulateKillProbability = (
  numAttacks,
  damage,
  numTargetModels,
  modelWounds,
  armorSave,
  fnp,
  saveRerollValue,
  numSimulations = DEFAULT_SIMULATIONS
) => {
  const attacksNeededPerModel = Math.ceil(modelWounds / damage)
  const maxAchievableKills = Math.min(
    numTargetModels,
    Math.floor(numAttacks / attacksNeededPerModel)
  )

  const saveChance = calculateSaveChance(armorSave, saveRerollValue)
  const fnpChance = calculateFnpChance(fnp)

  const { killCounts } = simulateKills(
    numAttacks,
    damage,
    numTargetModels,
    modelWounds,
    saveChance,
    fnpChance,
    numSimulations
  )

  // Build distribution from simulation results
  const killCountMap = {}
  for (const kills of killCounts) {
    killCountMap[kills] = (killCountMap[kills] || 0) + 1
  }

  const distributionData = []
  let totalKills = 0
  for (let k = 0; k <= numTargetModels; k++) {
    const count = killCountMap[k] || 0
    // Clamp impossible outcomes to remove Monte Carlo noise.
    const probability = k > maxAchievableKills ? 0 : (count / killCounts.length) * 100
    totalKills += probability === 0 ? 0 : k * count
    distributionData.push({ kills: k, probability, cumulative: 0 })
  }

  // Closed-form expected unsaved attacks and dispersion
  const unsavedProb = 1 - saveChance
  const meanUnsaved = numAttacks * unsavedProb
  const varianceUnsaved = numAttacks * unsavedProb * (1 - unsavedProb)
  const stdDevUnsaved = Math.sqrt(Math.max(0, varianceUnsaved))
  const unsavedLow = Math.max(0, meanUnsaved - Z_95 * stdDevUnsaved)
  const unsavedHigh = Math.min(numAttacks, meanUnsaved + Z_95 * stdDevUnsaved)

  // Kill-all probability and 95% CI (normal approximation on a proportion)
  const killAllCount = killCounts.filter(k => k === numTargetModels).length
  const pKillAll = killAllCount / killCounts.length
  const seKillAll = Math.sqrt(Math.max(0, (pKillAll * (1 - pKillAll)) / killCounts.length))
  const killAllLow = Math.max(0, pKillAll - Z_95 * seKillAll)
  const killAllHigh = Math.min(1, pKillAll + Z_95 * seKillAll)

  // CI for expected kills (mean over simulations)
  let sumSqKills = 0
  for (const k of killCounts) sumSqKills += k * k
  const meanKills = totalKills / killCounts.length
  const varianceKills = Math.max(0, sumSqKills / killCounts.length - meanKills * meanKills)
  const stdKills = Math.sqrt(varianceKills)
  const killMeanLow = Math.max(0, meanKills - Z_95 * stdKills)
  const killMeanHigh = Math.min(numTargetModels, meanKills + Z_95 * stdKills)

  // Cumulative probability
  let cumulativeProbability = 0
  for (let i = 0; i < distributionData.length; i++) {
    cumulativeProbability += distributionData[i].probability
    distributionData[i].cumulative = Math.min(cumulativeProbability, 100)
  }

  const expectedKills = totalKills / killCounts.length

  return {
    expectedKills: expectedKills.toFixed(2),
    distributionData,
    expectedUnsavedAttacks: meanUnsaved.toFixed(2),
    unsavedAttackStdDev: stdDevUnsaved.toFixed(2),
    unsavedCILow: unsavedLow.toFixed(2),
    unsavedCIHigh: unsavedHigh.toFixed(2),
    killAllProbability: (pKillAll * 100).toFixed(2),
    killAllCILow: (killAllLow * 100).toFixed(2),
    killAllCIHigh: (killAllHigh * 100).toFixed(2),
    killAllStdDev: (seKillAll * 100).toFixed(2),
    expectedKillsCILow: killMeanLow.toFixed(2),
    expectedKillsCIHigh: killMeanHigh.toFixed(2),
    expectedKillsStdDev: stdKills.toFixed(2)
  }
}
