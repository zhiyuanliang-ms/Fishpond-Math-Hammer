// Build the wound-count probability distribution for the wound-success calculator.
// Encapsulates the binomial logic for both the standard and lethal-hits cases
// so the component doesn't need to know about distribution math.
//
// Inputs (all numbers):
//   expectedHits, expectedCrits, woundChance, stdDev
//   lethalHit: boolean
// Returns: { distributionData, maxWounds }

import { binomialProbability, buildDistribution } from './binomial'

export const buildWoundDistribution = ({
  expectedHits,
  expectedCrits,
  woundChance,
  stdDev,
  lethalHit,
  expectedWounds
}) => {
  // Use 3 standard deviations to capture ~99.7% of the distribution
  const maxWounds = Math.ceil(expectedWounds + stdDev * 3)
  const minWounds = Math.max(0, Math.floor(expectedWounds - stdDev * 3))

  let probabilityFn
  if (lethalHit) {
    // Distribution is based on critical hits (always wound) + non-critical wounds
    const nonCriticalHits = Math.ceil(expectedHits - expectedCrits)
    const guaranteedFromCrits = Math.ceil(expectedCrits)
    probabilityFn = (wounds) => {
      const nonCriticalWounds = Math.max(0, wounds - guaranteedFromCrits)
      return binomialProbability(nonCriticalHits, nonCriticalWounds, woundChance)
    }
  } else {
    const trials = Math.ceil(expectedHits)
    probabilityFn = (wounds) => binomialProbability(trials, wounds, woundChance)
  }

  const distributionData = buildDistribution({
    min: 0,
    max: maxWounds,
    visibleMin: minWounds,
    xKey: 'wounds',
    probabilityFn
  })

  return { distributionData, maxWounds }
}
