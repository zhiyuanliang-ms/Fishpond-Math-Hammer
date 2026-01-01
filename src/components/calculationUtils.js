import { simulateKillProbability } from './simulationUtils'

export const REROLL_VALUES = {
  NO_REROLL: 'no-reroll',
  REROLL_ONE: 'reroll-one',
  REROLL_FAIL: 'reroll-fail',
  REROLL_NON_CRITICAL: 'reroll-non-critical'
}

// Unified function to calculate success and critical probabilities
// statValue: the to-hit/to-wound/to-save value (e.g., 3, 4, 5, 6)
// rerollValue: the reroll modifier (from REROLL_VALUES)
// criticalValue: the critical threshold (e.g., 6 for hits/wounds, or special values)
// Returns: { successChance, criticalChance }
export const calculateSuccessProbability = (statValue, rerollValue = 'no-reroll', criticalValue = '6') => {
  const statNum = parseInt(statValue)
  const critNum = parseInt(criticalValue)
  
  // Base success chance (e.g., 4+ means 3 successes out of 6 = 3/6 = 0.5)
  const baseSuccessChance = (7 - statNum) / 6
  const baseCriticalChance = (7 - critNum) / 6

  let successChance = baseSuccessChance
  let criticalChance = baseCriticalChance

  // Apply reroll modifiers
  if (rerollValue === REROLL_VALUES.REROLL_ONE) {
    // Reroll ones: get a second chance if you roll 1
    successChance = baseSuccessChance + (1 / 6) * baseSuccessChance
    criticalChance = baseCriticalChance + (1 / 6) * baseCriticalChance
  } else if (rerollValue === REROLL_VALUES.REROLL_FAIL) {
    // Reroll fails: get a second chance if you fail the test
    successChance = 2 * baseSuccessChance - baseSuccessChance * baseSuccessChance
    // For critical: you crit on first roll OR fail and crit on reroll
    criticalChance = baseCriticalChance + (1 - baseSuccessChance) * baseCriticalChance
  } else if (rerollValue === REROLL_VALUES.REROLL_NON_CRITICAL) {
    // Reroll non-critical: reroll anything that's not a critical success
    const belowCritChance = (critNum - 1) / 6
    const atOrAboveCritChance = 1 - belowCritChance
    successChance = atOrAboveCritChance + belowCritChance * baseSuccessChance
    // For critical: you crit on first roll OR fail to crit and crit on reroll
    criticalChance = atOrAboveCritChance + belowCritChance * baseCriticalChance
  }

  successChance = Math.min(successChance, 1)
  criticalChance = Math.min(criticalChance, 1)

  return { successChance, criticalChance }
}

// Legacy functions for backwards compatibility (delegate to unified function)
export const calculateHitProbability = (toHitValue, hitRerollValue, critValue = '6') => {
  const { successChance, criticalChance } = calculateSuccessProbability(toHitValue, hitRerollValue, critValue)
  return {
    hitChance: successChance,
    criticalChance: criticalChance
  }
}

export const calculateWoundProbability = (
  toWoundValue,
  woundRerollValue,
  antiEnabled,
  antiValue
) => {
  // Determine critical wound threshold
  const criticalWoundThreshold = antiEnabled ? antiValue : '6'
  
  // Determine successful wound threshold
  let successfulWoundThreshold = toWoundValue
  if (antiEnabled) {
    const antiNum = parseInt(antiValue)
    const toWoundNum = parseInt(toWoundValue)
    successfulWoundThreshold = Math.min(antiNum, toWoundNum)
  }
  
  const { successChance, criticalChance } = calculateSuccessProbability(successfulWoundThreshold, woundRerollValue, criticalWoundThreshold)
  
  return {
    woundChance: successChance,
    criticalWoundChance: criticalChance
  }
}

// Binomial coefficient calculation
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

// Calculate kill probability using simulation
export const calculateKillProbability = (
  woundedAttacks,
  damagePerAttack,
  numModels,
  modelWoundsValue,
  armorSaveValue,
  fnpValue,
  saveRerollValue = 'no-reroll'
) => {
  const numAttacks = parseInt(woundedAttacks) || 0
  const damage = parseInt(damagePerAttack) || 1
  const numTargetModels = parseInt(numModels) || 1
  const modelWounds = parseInt(modelWoundsValue) || 1
  const armorSave = armorSaveValue ? parseInt(armorSaveValue) : null
  const fnp = fnpValue ? parseInt(fnpValue) : null

  if (numAttacks <= 0) {
    return { expectedKills: 0, distributionData: [] }
  }

  // Use simulation-based approach
  return simulateKillProbability(
    numAttacks,
    damage,
    numTargetModels,
    modelWounds,
    armorSave,
    fnp,
    saveRerollValue
  )
}
