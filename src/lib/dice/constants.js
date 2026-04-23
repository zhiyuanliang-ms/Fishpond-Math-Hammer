// Shared dice/probability constants used across the app.

// Reroll modes for dice rolls (to-hit, to-wound, save, etc.)
export const REROLL_VALUES = {
  NO_REROLL: 'no-reroll',
  REROLL_ONE: 'reroll-one',
  REROLL_FAIL: 'reroll-fail',
  REROLL_NON_CRITICAL: 'reroll-non-critical'
}

// Two-tailed z-score for a 95% normal-approximation confidence interval.
export const Z_95 = 1.96

// Default number of Monte Carlo iterations for kill simulations.
export const DEFAULT_SIMULATIONS = 10000
