// Shared dice/probability constants used across the app.

// Reroll modes for dice rolls (to-hit, to-wound, save, etc.)
export const REROLL_VALUES = {
  NO_REROLL: 'no-reroll',
  REROLL_ONE: 'reroll-one',
  REROLL_FAIL: 'reroll-fail',
  REROLL_NON_CRITICAL: 'reroll-non-critical'
}

// Reroll modes for "random value" rolls — i.e. the dice expressions used for
// random Attacks counts and random Damage values. Only the "reroll 1-3"
// threshold is offered: it is the only one that yields a positive
// expected-value gain on a fair d6. (A flat numeric value like "4" is
// unaffected since there is no die to reroll.)
export const RANDOM_REROLL_VALUES = {
  NO_REROLL: 'no-reroll',
  REROLL_ONE_TWO_THREE: 'reroll-1-2-3'
}

// Map a RANDOM_REROLL_VALUES value to the highest face that triggers a reroll.
export const randomRerollThreshold = (value) =>
  value === RANDOM_REROLL_VALUES.REROLL_ONE_TWO_THREE ? 3 : 0

// Scope of a reroll — does the player reroll only ONE qualifying die in the
// rolling event (e.g. a single stratagem use), or every qualifying die once?
// 'all' matches the historic / default behaviour of the simulator.
export const REROLL_SCOPE = {
  ALL: 'all',
  SINGLE: 'single'
}

// Two-tailed z-score for a 95% normal-approximation confidence interval.
export const Z_95 = 1.96

// Default number of Monte Carlo iterations for kill simulations.
export const DEFAULT_SIMULATIONS = 10000
