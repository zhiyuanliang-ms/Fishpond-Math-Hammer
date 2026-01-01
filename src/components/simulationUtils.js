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

  return killCounts
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
  const killCounts = simulateKills(
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
    const probability = (count / killCounts.length) * 100
    totalKills += k * count
    distributionData.push({
      kills: k,
      probability: probability,
      cumulative: 0
    })
  }

  // Calculate cumulative probability
  let cumulativeProbability = 0
  for (let i = 0; i < distributionData.length; i++) {
    cumulativeProbability += distributionData[i].probability
    distributionData[i].cumulative = Math.min(cumulativeProbability, 100)
  }

  const expectedKills = totalKills / killCounts.length

  return {
    expectedKills: expectedKills.toFixed(2),
    distributionData
  }
}
