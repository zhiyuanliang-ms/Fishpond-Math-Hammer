// Tiny parser/roller for dice expressions used in Warhammer stat lines.
// Supports plain integers and "[N]D[3|6][+/-M]" forms, e.g.:
//   "5", "D6", "2D6", "D3+1", "2D6-1"
//
// parseDiceExpression returns { count, sides, flat } or null if invalid.
//   count = number of dice (0 for plain integer)
//   sides = die sides (3 or 6, or 0 for plain integer)
//   flat  = additive constant
//
// rollDiceExpr rolls and returns the integer result.
// expectedDiceExpr returns the average value (used for sanity checks).

export function parseDiceExpression(expr) {
  if (expr === null || expr === undefined) return null
  if (typeof expr === 'number') {
    if (!Number.isFinite(expr)) return null
    return { count: 0, sides: 0, flat: Math.max(0, Math.floor(expr)) }
  }
  const s = String(expr).trim().toUpperCase().replace(/\s+/g, '')
  if (s === '') return null
  if (/^\d+$/.test(s)) return { count: 0, sides: 0, flat: parseInt(s, 10) }
  const m = s.match(/^(\d*)D(3|6)([+-]\d+)?$/)
  if (!m) return null
  const count = m[1] ? parseInt(m[1], 10) : 1
  const sides = parseInt(m[2], 10)
  const flat = m[3] ? parseInt(m[3], 10) : 0
  if (count <= 0 || count > 20) return null
  return { count, sides, flat }
}

export function rollDiceExpr(parsed) {
  if (!parsed) return 0
  let total = parsed.flat || 0
  for (let i = 0; i < parsed.count; i++) {
    total += Math.floor(Math.random() * parsed.sides) + 1
  }
  return Math.max(0, total)
}

export function rollExprStr(expr) {
  return rollDiceExpr(parseDiceExpression(expr))
}

export function expectedDiceExpr(parsed) {
  if (!parsed) return 0
  return (parsed.flat || 0) + parsed.count * ((parsed.sides + 1) / 2)
}

export function isValidDiceExpression(expr) {
  return parseDiceExpression(expr) !== null
}
