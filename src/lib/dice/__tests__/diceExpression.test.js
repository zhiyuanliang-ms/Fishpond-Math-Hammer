import { describe, it, expect } from 'vitest'
import {
  parseDiceExpression,
  isValidDiceExpression,
  expectedDiceExpr,
  rollDiceExpr
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
