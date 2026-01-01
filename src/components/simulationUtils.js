// Monte Carlo simulation for kill probability
const simulateKills = (
  numAttacks,
  damagePerAttack,
  numModels,
  modelWounds,
  saveChance,
  fnpChance,
  numSimulations = 10000
) => {
  const killCounts = []

  for (let sim = 0; sim < numSimulations; sim++) {
    // Initialize models with their wounds
    const modelsRemaining = Array(numModels).fill(modelWounds)
    let currentModelIndex = 0
    let damageDealtToCurrentModel = 0

    // Process each attack
    for (let attack = 0; attack < numAttacks; attack++) {
      // 1. Roll Armor Save (once per attack)
      let savePassed = false
      if (saveChance > 0) {
        savePassed = Math.random() < saveChance
      }

      if (savePassed) {
        continue // Attack blocked by armor
      }

      // 2. Apply Damage (FNP check per damage point)
      // Each attack deals damagePerAttack individual damage points
      for (let dmgPoint = 0; dmgPoint < damagePerAttack; dmgPoint++) {
        // Roll FNP for this damage point
        let damageBlocked = false
        if (fnpChance > 0) {
          damageBlocked = Math.random() < fnpChance
        }

        if (!damageBlocked) {
          // Damage gets through
          damageDealtToCurrentModel++

          // Check if current model is killed
          if (damageDealtToCurrentModel >= modelsRemaining[currentModelIndex]) {
            // Current model is killed
            modelsRemaining[currentModelIndex] = 0
            currentModelIndex++
            damageDealtToCurrentModel = 0

            // If we've killed all models, stop processing
            if (currentModelIndex >= modelsRemaining.length) {
              break
            }

            // Excess damage from this attack does NOT spill to the next model
            // (Warhammer damage is capped per model). Stop processing remaining
            // damage points for this attack.
            break
          }
        }
      }

      // If all models killed, no need to process more attacks
      if (currentModelIndex >= modelsRemaining.length) {
        break
      }
    }

    // Count how many models were killed (have 0 wounds left)
    const killCount = modelsRemaining.filter(w => w === 0).length
    killCounts.push(killCount)
  }

  return { killCounts }
}

// Main function to simulate kill probability and generate distribution
export const simulateKillProbability = (
  numAttacks,
  damage,
  numTargetModels,
  modelWounds,
  armorSave,
  fnp,
  saveRerollValue
) => {
  // Hard cap: if the number of attacks and damage chunks simply cannot kill all models,
  // force the upper tail of the distribution to zero to avoid tiny simulated noise.
  const attacksNeededPerModel = Math.ceil(modelWounds / damage)
  const maxAchievableKills = Math.min(numTargetModels, Math.floor(numAttacks / attacksNeededPerModel))

  // Calculate Save Chance
  let saveChance = 0
  if (armorSave) {
    saveChance = (7 - armorSave) / 6
    if (saveRerollValue === 'reroll-one') {
      saveChance = saveChance + (1 / 6) * saveChance
    }
    saveChance = Math.min(Math.max(saveChance, 0), 1)
  }

  // Calculate FNP Chance
  let fnpChance = 0
  if (fnp) {
    fnpChance = (7 - fnp) / 6
    fnpChance = Math.min(Math.max(fnpChance, 0), 1)
  }

  // Run Monte Carlo simulation
  const { killCounts } = simulateKills(
    numAttacks,
    damage,
    numTargetModels,
    modelWounds,
    saveChance,
    fnpChance,
    10000
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
    // If k exceeds what is mathematically achievable (given attack count & damage chunks),
    // clamp its probability to zero to remove any Monte Carlo noise.
    const probability = k > maxAchievableKills ? 0 : (count / killCounts.length) * 100
    totalKills += (probability === 0 ? 0 : k * count)
    distributionData.push({
      kills: k,
      probability: probability,
      cumulative: 0
    })
  }

  // Closed-form expected unsaved (armor-penetrating) attacks and dispersion
  const unsavedProb = 1 - saveChance
  const meanUnsaved = numAttacks * unsavedProb
  const varianceUnsaved = numAttacks * unsavedProb * (1 - unsavedProb)
  const stdDevUnsaved = Math.sqrt(Math.max(0, varianceUnsaved))
  // Std dev describes spread of simulated outcomes; CI uses std error (std dev / sqrt(n)) to bound the estimator.
  const z = 1.96 // 1.96 is the two-tailed z-score for a 95% normal-approximation confidence interval
  const unsavedLow = Math.max(0, meanUnsaved - z * stdDevUnsaved)
  const unsavedHigh = Math.min(numAttacks, meanUnsaved + z * stdDevUnsaved)

  // Kill-all probability and 95% CI (normal approximation)
  const killAllCount = killCounts.filter(k => k === numTargetModels).length
  const pKillAll = killAllCount / killCounts.length
  // For proportions, std dev of outcomes is sqrt(p*(1-p)); std error for the estimator divides by sqrt(n)
  const seKillAll = Math.sqrt(Math.max(0, pKillAll * (1 - pKillAll) / killCounts.length))
  const killAllLow = Math.max(0, pKillAll - z * seKillAll)
  const killAllHigh = Math.min(1, pKillAll + z * seKillAll)

  // CI for expected kills (mean over simulations)
  let sumSqKills = 0
  for (const k of killCounts) {
    sumSqKills += k * k
  }
  const meanKills = totalKills / killCounts.length
  const varianceKills = Math.max(0, sumSqKills / killCounts.length - meanKills * meanKills)
  const stdKills = Math.sqrt(varianceKills)
  // Std error for the mean is std dev / sqrt(n); CI = mean +/- z * std error
  const killMeanLow = Math.max(0, meanKills - z * stdKills)
  const killMeanHigh = Math.min(numTargetModels, meanKills + z * stdKills)

  // Calculate cumulative probability
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
