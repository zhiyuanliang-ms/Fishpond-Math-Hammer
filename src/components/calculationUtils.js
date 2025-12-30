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
    // Reroll fails: if you fail, you get another roll
    woundChance = 2 * baseSuccessfulChance - baseSuccessfulChance * baseSuccessfulChance
    criticalWoundChance = 2 * baseCriticalChance - baseCriticalChance * baseCriticalChance
  } else if (woundRerollValue === REROLL_VALUES.REROLL_NON_CRITICAL) {
    // Reroll non-critical: reroll anything below threshold
    // For successful wound: reroll anything below successful threshold
    const belowSuccessfulChance = (successfulWoundThreshold - 1) / 6
    const atOrAboveSuccessfulChance = 1 - belowSuccessfulChance
    woundChance = atOrAboveSuccessfulChance + belowSuccessfulChance * baseSuccessfulChance
    
    // For critical: reroll anything below critical threshold
    const belowCriticalChance = (criticalWoundThreshold - 1) / 6
    const atOrAboveCriticalChance = 1 - belowCriticalChance
    criticalWoundChance = atOrAboveCriticalChance + belowCriticalChance * baseCriticalChance
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
