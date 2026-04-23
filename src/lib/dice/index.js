// Public API for the dice library — import from here in components.

export { REROLL_VALUES, Z_95, DEFAULT_SIMULATIONS } from './constants'

export {
  calculateSuccessProbability,
  calculateHitProbability,
  calculateWoundProbability,
  calculateSaveChance,
  calculateFnpChance
} from './probability'

export { binomialProbability, buildDistribution } from './binomial'
export { buildWoundDistribution } from './woundDistribution'

export { simulateKillProbability } from './simulation'
export { calculateKillProbability } from './killProbability'

export {
  DICE_FACES,
  DIE_GLYPHS,
  rollD6,
  rollD6s,
  rerollFaces,
  countFaces
} from './roll'

export * from './options'
