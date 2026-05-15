import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  parseDiceExpression,
  isValidDiceExpression,
  expectedDiceExpr,
  rollDiceExpr,
  rollDiceExprWithReroll
} from '../diceExpression'

describe('parseDiceExpression', () => {
  it('parses positive flat numbers (numeric)', () => {
    expect(parseDiceExpression(4)).toEqual({ count: 0, sides: 0, flat: 4 })
    expect(parseDiceExpression(1)).toEqual({ count: 0, sides: 0, flat: 1 })
  })

  it('parses positive flat numbers (string)', () => {
    expect(parseDiceExpression('4')).toEqual({ count: 0, sides: 0, flat: 4 })
    expect(parseDiceExpression(' 12 ')).toEqual({ count: 0, sides: 0, flat: 12 })
  })

  it('parses dice forms', () => {
    expect(parseDiceExpression('D6')).toEqual({ count: 1, sides: 6, flat: 0 })
    expect(parseDiceExpression('d6')).toEqual({ count: 1, sides: 6, flat: 0 })
    expect(parseDiceExpression('2D6')).toEqual({ count: 2, sides: 6, flat: 0 })
    expect(parseDiceExpression('D6+1')).toEqual({ count: 1, sides: 6, flat: 1 })
    expect(parseDiceExpression('D6-1')).toEqual({ count: 1, sides: 6, flat: -1 })
    expect(parseDiceExpression('3D3+2')).toEqual({ count: 3, sides: 3, flat: 2 })
  })

  it('rejects non-positive numerics', () => {
    expect(parseDiceExpression(0)).toBeNull()
    expect(parseDiceExpression(-1)).toBeNull()
    expect(parseDiceExpression('0')).toBeNull()
  })

  it('rejects D0, 0D6, and other nonsense', () => {
    expect(parseDiceExpression('D0')).toBeNull()
    expect(parseDiceExpression('0D6')).toBeNull()
    expect(parseDiceExpression('')).toBeNull()
    expect(parseDiceExpression('D')).toBeNull()
    expect(parseDiceExpression('garbage')).toBeNull()
    expect(parseDiceExpression(null)).toBeNull()
    expect(parseDiceExpression(undefined)).toBeNull()
    expect(parseDiceExpression({})).toBeNull()
    expect(parseDiceExpression(NaN)).toBeNull()
  })
})

describe('isValidDiceExpression', () => {
  it('agrees with parseDiceExpression', () => {
    for (const v of [4, '4', 'D6', 'D6+1', '2D6-1']) expect(isValidDiceExpression(v)).toBe(true)
    for (const v of [0, -1, '0', 'D0', '0D6', '', 'foo', null, undefined]) {
      expect(isValidDiceExpression(v)).toBe(false)
    }
  })
})

describe('expectedDiceExpr', () => {
  it('returns flat for numeric', () => {
    expect(expectedDiceExpr(parseDiceExpression(4))).toBe(4)
  })
  it('uses (sides+1)/2 per die plus flat', () => {
    // D6 average is 3.5
    expect(expectedDiceExpr(parseDiceExpression('D6'))).toBe(3.5)
    // 2D6 average is 7
    expect(expectedDiceExpr(parseDiceExpression('2D6'))).toBe(7)
    // D3+3 average is 2 + 3 = 5
    expect(expectedDiceExpr(parseDiceExpression('D3+3'))).toBe(5)
  })
  it('returns 0 for null', () => {
    expect(expectedDiceExpr(null)).toBe(0)
  })
})

describe('rollDiceExpr', () => {
  it('returns the flat value when no dice', () => {
    expect(rollDiceExpr(parseDiceExpression(7))).toBe(7)
  })
  it('returns 0 for null', () => {
    expect(rollDiceExpr(null)).toBe(0)
  })
  it('produces values in [count+flat, count*sides+flat]', () => {
    // 2D6+1 → bounded to [3, 13]
    const parsed = parseDiceExpression('2D6+1')
    for (let i = 0; i < 200; i++) {
      const v = rollDiceExpr(parsed)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(13)
    }
  })
})

// Tiny helper: replace Math.random with a fixed sequence so we can exactly
// observe how many random draws a function makes and which faces it rolls.
//   value = Math.floor(seq[i] * sides) + 1
// e.g. for d6: 0.0→1, 1/6→2, 2/6→3, 3/6→4, 4/6→5, 5/6→6
const useRandomSequence = (seq) => {
  let i = 0
  return {
    next: () => {
      if (i >= seq.length) {
        throw new Error(`Math.random called more times (${i + 1}) than seeded (${seq.length})`)
      }
      return seq[i++]
    },
    consumed: () => i,
  }
}

describe('rollDiceExprWithReroll', () => {
  let originalRandom
  beforeEach(() => {
    originalRandom = Math.random
  })
  afterEach(() => {
    Math.random = originalRandom
  })

  it('falls back to plain rollDiceExpr when threshold is 0', () => {
    const seq = useRandomSequence([0.5, 0.5]) // both dice → 4
    Math.random = seq.next
    const v = rollDiceExprWithReroll(parseDiceExpression('2D6'), 0, 'all')
    expect(v).toBe(8)
    expect(seq.consumed()).toBe(2) // no rerolls
  })

  it('flat numerics are unaffected by reroll settings', () => {
    Math.random = () => {
      throw new Error('should not roll for a flat 4')
    }
    expect(rollDiceExprWithReroll(parseDiceExpression(4), 3, 'all')).toBe(4)
    expect(rollDiceExprWithReroll(parseDiceExpression(4), 3, 'single')).toBe(4)
  })

  it('does NOT reroll any die when no die qualifies (all >3)', () => {
    // 2D6: feed 4 and 6 (neither <= 3). Reroll threshold = 3.
    // Strict sequence will throw if a 3rd random is requested.
    const seq = useRandomSequence([3 / 6, 5 / 6]) // → 4, 6
    Math.random = seq.next
    expect(rollDiceExprWithReroll(parseDiceExpression('2D6'), 3, 'all')).toBe(10)
    expect(seq.consumed()).toBe(2)
  })

  it('does NOT reroll any die when all dice are exactly above threshold', () => {
    // 3D6 = [4,5,6], threshold=3. Should be 15, no extra rolls.
    const seq = useRandomSequence([3 / 6, 4 / 6, 5 / 6])
    Math.random = seq.next
    expect(rollDiceExprWithReroll(parseDiceExpression('3D6'), 3, 'all')).toBe(15)
    expect(seq.consumed()).toBe(3)
  })

  it('all mode rerolls every qualifying die exactly once', () => {
    // 3D6: feed [1, 5, 2]. Threshold=3 → dice 1 and 2 reroll.
    // Reroll feeds [6, 4]. Final: [6, 5, 4] = 15.
    // We do NOT want a die that was rerolled to be rerolled AGAIN even if it
    // came up <= 3 the second time — the strict sequence guards that.
    const seq = useRandomSequence([0 / 6, 4 / 6, 1 / 6, 5 / 6, 3 / 6])
    Math.random = seq.next
    const v = rollDiceExprWithReroll(parseDiceExpression('3D6'), 3, 'all')
    expect(v).toBe(15)
    expect(seq.consumed()).toBe(5) // 3 initial + 2 rerolls
  })

  it('single mode rerolls only ONE die even when many qualify', () => {
    // 4D6: feed [1, 2, 3, 6]. Threshold=3 → 3 candidates (1, 2, 3).
    // Single mode picks the LOWEST (= 1) and rerolls only that one.
    // Reroll feeds [5]. Final: [5, 2, 3, 6] = 16.
    const seq = useRandomSequence([0 / 6, 1 / 6, 2 / 6, 5 / 6, 4 / 6])
    Math.random = seq.next
    const v = rollDiceExprWithReroll(parseDiceExpression('4D6'), 3, 'single')
    expect(v).toBe(16)
    expect(seq.consumed()).toBe(5) // 4 initial + 1 reroll
  })

  it('single mode does nothing when no die qualifies', () => {
    // 2D6 = [5, 6], threshold=3. No reroll.
    const seq = useRandomSequence([4 / 6, 5 / 6])
    Math.random = seq.next
    const v = rollDiceExprWithReroll(parseDiceExpression('2D6'), 3, 'single')
    expect(v).toBe(11)
    expect(seq.consumed()).toBe(2)
  })

  it('preserves the flat modifier through rerolls', () => {
    // D6+2: roll 1 → reroll → 6. Final: 6 + 2 = 8.
    const seq = useRandomSequence([0 / 6, 5 / 6])
    Math.random = seq.next
    expect(rollDiceExprWithReroll(parseDiceExpression('D6+2'), 3, 'all')).toBe(8)
  })

  it('a rerolled die that comes up low again is NOT rerolled a second time', () => {
    // D6: roll 1 → reroll → 1. Final: 1 (not rerolled again).
    const seq = useRandomSequence([0 / 6, 0 / 6])
    Math.random = seq.next
    expect(rollDiceExprWithReroll(parseDiceExpression('D6'), 3, 'all')).toBe(1)
    expect(seq.consumed()).toBe(2)
  })
})
