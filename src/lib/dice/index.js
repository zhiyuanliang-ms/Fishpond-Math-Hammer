// Public API for the dice library — import from here in components.

export { REROLL_VALUES, Z_95, DEFAULT_SIMULATIONS } from './constants'

// Closed-form single-roll probabilities; also the independent reference that
// woundPool tests check the exact calculator against.
export {
  calculateSuccessProbability,
  calculateHitProbability,
  calculateWoundProbability,
  calculateSaveChance,
  calculateFnpChance
} from './probability'

export { binomialProbability, buildDistribution } from './binomial'
export { calculateWoundPool } from './woundPool'
export { normalizeFailedRerollCount } from './d6Rerolls'
export { calculateChargeProbabilities } from './chargeProbability'

export { simulateAttack, simulateMultiUnitAttack } from './attackSimulation'
export {
  AOS_CRIT_EFFECTS,
  calculateAoSDamage,
  isValidAoSDiceExpression,
  simulateAoSAttack,
  validateAoSDefenderProfile,
  validateAoSTargetProfile,
  validateAoSWeaponProfile
} from './aos'
export { normalizeAttackBonusValue, normalizeWeaponProfileRerolls } from './weaponProfile'
export {
  makeUnitBuffs,
  mergeUnitBuffs,
  isUnitBuffsEmpty,
  mergeWeaponWithUnit,
  describeUpgrades,
  makeTargetUnitBuffs,
  mergeTargetUnitBuffs,
  isTargetUnitBuffsEmpty,
  mergeTargetWithUnit,
  describeTargetUpgrades,
} from './unitBuffMerge'
export {
  parseDiceExpression,
  rollDiceExpr,
  expectedDiceExpr,
  isValidDiceExpression
} from './diceExpression'

export {
  DICE_FACES,
  DIE_GLYPHS,
  rollD6,
  rollD6s,
  rerollFaces,
  countFaces
} from './roll'

export * from './options'
