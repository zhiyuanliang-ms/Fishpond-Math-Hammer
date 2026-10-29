// Tiny parser/evaluator for the dice expressions used by the Attack Simulator.
// Supported forms: "4", "12", "D3", "D6", "2D6", "3D3", "D6+1", "2D6-1".
// parseDiceExpression returns { count, sides, flat } or null if invalid.
// rollDiceExpr rolls and returns the integer result (always >= 0).
// expectedDiceExpr returns the average value (used for sanity checks).
// isValidDiceExpression is a thin boolean wrapper.

const DICE_RE = /^(\d*)D(\d+)([+-]\d+)?$|^(\d+)$/

export function parseDiceExpression(expr) {
  if (typeof expr === 'number' && Number.isFinite(expr)) {
    const flat = Math.trunc(expr)
    // Plain numeric expressions (e.g. attacks/damage of 4) must be positive;
    // 0 and negatives are not meaningful as a complete dice expression.
    if (flat < 1) return null
    return { count: 0, sides: 0, flat }
  }
  if (typeof expr !== 'string') return null
  const m = expr.trim().toUpperCase().match(DICE_RE)
  if (!m) return null
  if (m[4] != null) {
    const flat = parseInt(m[4], 10)
    if (flat < 1) return null
    return { count: 0, sides: 0, flat }
  }
  const count = m[1] ? parseInt(m[1], 10) : 1
  const sides = parseInt(m[2], 10)
  // Reject nonsense like D0 or 0D6 — every die must have at least one face,
  // and an explicit count must be at least 1.
  if (count < 1 || sides < 1) return null
  return {
    count,
    sides,
    flat: m[3] ? parseInt(m[3], 10) : 0
  }
}

export function rollDiceExpr(parsed) {
  if (!parsed) return 0
  let total = parsed.flat
  for (let i = 0; i < parsed.count; i++) {
    total += Math.floor(Math.random() * parsed.sides) + 1
  }
  return total
}

// Highest face worth rerolling on a die with `sides` faces, capped by the
// requested threshold: only results below the die's average gain from a
// reroll. "Reroll <=3" therefore rerolls 1-3 on a D6 but only 1s on a D3
// (rerolling a D3's 2 is neutral and its 3 is a loss).
export function rerollFaceLimit(threshold, sides) {
  if (!(threshold > 0) || !(sides > 0)) return 0
  return Math.min(threshold, Math.floor(sides / 2))
}

// Roll a parsed dice expression with an optional "reroll low values" rule.
//
//   threshold: highest face that triggers a reroll (1, 2, 3). 0 disables.
//              Capped per die size by `rerollFaceLimit`.
//   scope:     'all'    → every die that came up <= threshold is rerolled once
//              'single' → only ONE die (the lowest qualifying) is rerolled once
//   budget:    optional shared `{ remaining }` counter for 'single' scope.
//              When given, the single reroll is shared by every call that
//              receives the same budget (e.g. all Damage rolls of one weapon
//              card); without it, each call may reroll one die.
//
// Flat numeric expressions (e.g. "4") have no dice to reroll, so the result
// is the same as `rollDiceExpr`.
export function rollDiceExprWithReroll(parsed, threshold = 0, scope = 'all', budget = null) {
  if (!parsed) return 0
  const limit = rerollFaceLimit(threshold, parsed.sides)
  if (parsed.count <= 0 || limit <= 0) return rollDiceExpr(parsed)
  threshold = limit

  const rolls = []
  for (let i = 0; i < parsed.count; i++) {
    rolls.push(Math.floor(Math.random() * parsed.sides) + 1)
  }

  if (scope === 'single' && budget && budget.remaining <= 0) {
    // The shared single reroll has already been spent.
  } else if (scope === 'single') {
    let idx = -1
    let min = Infinity
    for (let i = 0; i < rolls.length; i++) {
      if (rolls[i] <= threshold && rolls[i] < min) {
        min = rolls[i]
        idx = i
      }
    }
    if (idx >= 0) {
      rolls[idx] = Math.floor(Math.random() * parsed.sides) + 1
      if (budget) budget.remaining -= 1
    }
  } else {
    for (let i = 0; i < rolls.length; i++) {
      if (rolls[i] <= threshold) {
        rolls[i] = Math.floor(Math.random() * parsed.sides) + 1
      }
    }
  }

  let total = parsed.flat
  for (const r of rolls) total += r
  return total
}

export function expectedDiceExpr(parsed) {
  if (!parsed) return 0
  return parsed.flat + parsed.count * (parsed.sides + 1) / 2
}

export function isValidDiceExpression(expr) {
  return parseDiceExpression(expr) != null
}
