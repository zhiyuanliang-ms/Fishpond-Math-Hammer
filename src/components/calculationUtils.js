export const REROLL_VALUES = {
  NO_REROLL: 'no-reroll',
  REROLL_ONE: 'reroll-one',
  REROLL_FAIL: 'reroll-fail',
  REROLL_NON_CRITICAL: 'reroll-non-critical'
}

// Calculate hit probability based on to-hit value and reroll
export const calculateHitProbability = (toHitValue, hitRerollValue) => {
  const toHitNum = parseInt(toHitValue)
  const baseHitChance = (7 - toHitNum) / 6
  let criticalChance = 1 / 6

  let hitChance = baseHitChance

  // Apply reroll modifiers for hit chance
  if (hitRerollValue === REROLL_VALUES.REROLL_ONE) {
    hitChance = baseHitChance + (1 / 6) * baseHitChance
    criticalChance = (1 / 6) + (1 / 6) * (1 / 6)
  } else if (hitRerollValue === REROLL_VALUES.REROLL_FAIL) {
    hitChance = 2 * baseHitChance - baseHitChance * baseHitChance
    criticalChance = (1 / 6) + (1 - baseHitChance) * (1 / 6)
  } else if (hitRerollValue === REROLL_VALUES.REROLL_NON_CRITICAL) {
    hitChance = (1 / 6) + (5 / 6) * baseHitChance
    criticalChance = (1 / 6) + (5 / 6) * (1 / 6)
  }

  hitChance = Math.min(hitChance, 1)
  criticalChance = Math.min(criticalChance, 1)

  return { hitChance, criticalChance }
}

// Calculate wound probability based on to-wound value and reroll
export const calculateWoundProbability = (
  toWoundValue,
  woundRerollValue,
  antiEnabled,
  antiValue
) => {
  const toWoundNum = parseInt(toWoundValue)
  
  // Determine critical wound threshold
  // Critical wound is: ANTI value (if enabled) or 6 (no ANTI, or devastating wounds)
  let criticalWoundThreshold
  if (antiEnabled) {
    criticalWoundThreshold = parseInt(antiValue)
  } else {
    // No ANTI: critical is rolling a 6
    criticalWoundThreshold = 6
  }
  
  // Determine successful wound threshold
  // Successful wound is: better of ANTI and To Wound (if ANTI enabled) or To Wound (no ANTI)
  let successfulWoundThreshold
  if (antiEnabled) {
    const antiNum = parseInt(antiValue)
    successfulWoundThreshold = Math.min(antiNum, toWoundNum)
  } else {
    successfulWoundThreshold = toWoundNum
  }
  
  // Calculate base chances before applying reroll modifiers
  const baseCriticalChance = (7 - criticalWoundThreshold) / 6
  const baseSuccessfulChance = (7 - successfulWoundThreshold) / 6
  
  // Apply reroll modifiers
  let woundChance = baseSuccessfulChance
  let criticalWoundChance = baseCriticalChance
  
  if (woundRerollValue === REROLL_VALUES.REROLL_ONE) {
    // Reroll ones: can reroll a 1 to get another chance
    woundChance = baseSuccessfulChance + (1 / 6) * baseSuccessfulChance
    criticalWoundChance = baseCriticalChance + (1 / 6) * baseCriticalChance
  } else if (woundRerollValue === REROLL_VALUES.REROLL_FAIL) {
    // Reroll fails: if you fail wound threshold, you get another roll
    woundChance = 2 * baseSuccessfulChance - baseSuccessfulChance * baseSuccessfulChance
    // For devastating wounds: reroll only if we fail to wound (roll below successful threshold)
    // Chance of failing wound = 1 - baseSuccessfulChance
    // Chance of getting a crit (6) on reroll = 1/6
    const failWoundChance = 1 - baseSuccessfulChance
    criticalWoundChance = (1/6) + failWoundChance * (1/6)
  } else if (woundRerollValue === REROLL_VALUES.REROLL_NON_CRITICAL) {
    // Reroll non-critical: reroll anything below threshold
    // For successful wound: reroll anything below successful threshold
    const belowSuccessfulChance = (successfulWoundThreshold - 1) / 6
    const atOrAboveSuccessfulChance = 1 - belowSuccessfulChance
    woundChance = atOrAboveSuccessfulChance + belowSuccessfulChance * baseSuccessfulChance
    
    // For devastating wounds: reroll anything that's not a crit (roll 1-5)
    // Chance of not getting a crit (not rolling 6) = 5/6
    // Chance of getting a crit (6) on reroll = 1/6
    criticalWoundChance = (1/6) + (5/6) * (1/6)
  }
  
  // Cap at 100%
  woundChance = Math.min(woundChance, 1)
  criticalWoundChance = Math.min(criticalWoundChance, 1)

  return { woundChance, criticalWoundChance }
}

// Calculate binomial distribution
export const binomialProbability = (n, k, p) => {
  if (k > n) return 0
  if (p === 0) return k === 0 ? 1 : 0
  if (p === 1) return k === n ? 1 : 0

  let coefficient = 1
  for (let i = 0; i < k; i++) {
    coefficient *= (n - i) / (i + 1)
  }

  return coefficient * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

// Calculate probability distribution of models killed
export const calculateKillProbability = (
  woundedAttacks,
  damagePerAttack,
  modelWounds,
  armorSaveValue,
  fnpValue
) => {
  const numAttacks = parseInt(woundedAttacks) || 0
  const damage = parseInt(damagePerAttack) || 1
  const wounds = parseInt(modelWounds) || 1
  const armorSave = armorSaveValue ? parseInt(armorSaveValue) : null
  const fnp = fnpValue ? parseInt(fnpValue) : null

  if (numAttacks <= 0) {
    return { expectedKills: 0, distributionData: [] }
  }

  // Calculate probability that a single attack deals damage to a model
  // Each attack that hits deals damage, but can be saved
  let damagePerAttackChance = 1

  // Apply armor save
  if (armorSave) {
    const saveChance = (7 - armorSave) / 6
    const failSaveChance = 1 - saveChance
    damagePerAttackChance = failSaveChance

    // Apply Feel No Pain to unsaved damage
    if (fnp) {
      const fnpChance = (7 - fnp) / 6
      const failFnpChance = 1 - fnpChance
      damagePerAttackChance = damagePerAttackChance * failFnpChance
    }
  } else if (fnp) {
    // No save, but has Feel No Pain
    const fnpChance = (7 - fnp) / 6
    const failFnpChance = 1 - fnpChance
    damagePerAttackChance = failFnpChance
  }

  // Total damage from all attacks (expected value)
  const totalDamage = numAttacks * damage * damagePerAttackChance
  const expectedKills = totalDamage / wounds

  // Generate distribution using Monte Carlo or combinatorial approach
  // For simplicity, we'll use a distribution based on how many attacks deal damage
  const maxPossibleDamage = numAttacks * damage
  const maxPossibleKills = Math.floor(maxPossibleDamage / wounds)

  const distributionData = []

  // Probability that exactly k attacks deal damage (binomial)
  for (let killCount = 0; killCount <= maxPossibleKills + 1; killCount++) {
    let totalProbability = 0

    // For each kill count, we need to consider all possible damage combinations
    // that result in that many kills
    // Minimum damage to kill X models: X * wounds
    // Maximum damage to kill X models: (X + 1) * wounds - 1

    const minDamageForKills = killCount * wounds
    const maxDamageForKills = (killCount + 1) * wounds - 1

    // We need to calculate probability of getting minDamageForKills to maxDamageForKills total damage
    // This is complex, so we'll approximate by checking damage ranges

    for (let totalDamage = minDamageForKills; totalDamage <= Math.min(maxDamageForKills, maxPossibleDamage); totalDamage++) {
      // Probability of dealing exactly 'totalDamage' from numAttacks
      // Each attack deals 0 or damage with specific probabilities
      // This requires counting combinations
      const prob = calculateDamageDistribution(numAttacks, damage, totalDamage, damagePerAttackChance)
      totalProbability += prob
    }

    if (totalProbability > 0 || killCount <= maxPossibleKills) {
      distributionData.push({
        kills: killCount,
        probability: totalProbability * 100,
        cumulative: 0 // Will be calculated after
      })
    }
  }

  // Calculate cumulative probability
  let cumulativeProbability = 0
  for (let i = 0; i < distributionData.length; i++) {
    cumulativeProbability += distributionData[i].probability
    distributionData[i].cumulative = Math.min(cumulativeProbability, 100)
  }

  return {
    expectedKills: expectedKills.toFixed(2),
    distributionData
  }
}

// Helper function to calculate probability of dealing exactly X damage from N attacks
const calculateDamageDistribution = (numAttacks, damageValue, targetDamage, damageChance) => {
  // Each attack either deals damageValue or 0
  // We need exactly k attacks to deal damage such that k * damageValue >= targetDamage
  // and (k-1) * damageValue < targetDamage

  const minAttacksDealingDamage = Math.ceil(targetDamage / damageValue)
  const maxAttacksDealingDamage = Math.floor(targetDamage / damageValue)

  let probability = 0

  // We want attacks that deal damage to be in range [minAttacks, maxAttacks]
  for (let k = maxAttacksDealingDamage; k <= minAttacksDealingDamage && k <= numAttacks; k++) {
    const prob = binomialProbability(numAttacks, k, damageChance)
    // If k attacks deal damage and we have exactly targetDamage, it contributes
    if (k * damageValue === targetDamage || (k > 0 && (k - 1) * damageValue < targetDamage && k * damageValue >= targetDamage)) {
      probability += prob
    }
  }

  return probability
}
