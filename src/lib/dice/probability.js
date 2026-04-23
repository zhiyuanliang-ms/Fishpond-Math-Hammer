// Pure probability math for D6 success / critical rolls.
// No React, no UI — safe to use anywhere.

import { REROLL_VALUES } from './constants'

// Unified function to calculate success and critical probabilities for a D6 roll.
// statValue: the to-hit/to-wound/to-save value (e.g., 3, 4, 5, 6)
// rerollValue: the reroll modifier (from REROLL_VALUES)
// criticalValue: the critical threshold (e.g., 6 for hits/wounds, or special values)
// Returns: { successChance, criticalChance }
export const calculateSuccessProbability = (
  statValue,
  rerollValue = REROLL_VALUES.NO_REROLL,
  criticalValue = '6'
) => {
  const statNum = parseInt(statValue)
  const critNum = parseInt(criticalValue)

  // Base success chance (e.g., 4+ means 3 successes out of 6 = 3/6 = 0.5)
  const baseSuccessChance = (7 - statNum) / 6
  const baseCriticalChance = (7 - critNum) / 6

  let successChance = baseSuccessChance
  let criticalChance = baseCriticalChance

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

// Convenience wrapper for hit rolls.
export const calculateHitProbability = (toHitValue, hitRerollValue, critValue = '6') => {
  const { successChance, criticalChance } = calculateSuccessProbability(
    toHitValue,
    hitRerollValue,
    critValue
  )
  return { hitChance: successChance, criticalChance }
}

// Convenience wrapper for wound rolls. Handles ANTI-X buff which can lower
// both the successful-wound threshold and the critical-wound threshold.
export const calculateWoundProbability = (
  toWoundValue,
  woundRerollValue,
  antiEnabled,
  antiValue
) => {
  const criticalWoundThreshold = antiEnabled ? antiValue : '6'

  let successfulWoundThreshold = toWoundValue
  if (antiEnabled) {
    const antiNum = parseInt(antiValue)
    const toWoundNum = parseInt(toWoundValue)
    successfulWoundThreshold = Math.min(antiNum, toWoundNum)
  }

  const { successChance, criticalChance } = calculateSuccessProbability(
    successfulWoundThreshold,
    woundRerollValue,
    criticalWoundThreshold
  )

  return {
    woundChance: successChance,
    criticalWoundChance: criticalChance
  }
}

// Save-roll chance (with optional reroll-ones).
// armorSaveValue: stat like '4' meaning 4+; null/undefined => 0.
export const calculateSaveChance = (armorSaveValue, saveRerollValue = REROLL_VALUES.NO_REROLL) => {
  if (!armorSaveValue) return 0
  const stat = parseInt(armorSaveValue)
  let chance = (7 - stat) / 6
  if (saveRerollValue === REROLL_VALUES.REROLL_ONE) {
    chance = chance + (1 / 6) * chance
  }
  return Math.min(Math.max(chance, 0), 1)
}

// Feel-No-Pain chance.
export const calculateFnpChance = (fnpValue) => {
  if (!fnpValue) return 0
  const stat = parseInt(fnpValue)
  return Math.min(Math.max((7 - stat) / 6, 0), 1)
}
