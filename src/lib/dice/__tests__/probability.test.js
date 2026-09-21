import { describe, expect, it } from 'vitest'
import { REROLL_VALUES } from '../constants'
import { calculateWoundProbability } from '../probability'

describe('calculateWoundProbability', () => {
  it('rerolls wound rolls of 1 and 2', () => {
    const result = calculateWoundProbability(
      '4',
      REROLL_VALUES.REROLL_ONE_TWO,
      false,
      '4'
    )

    expect(result.woundChance).toBeCloseTo(2 / 3)
    expect(result.criticalWoundChance).toBeCloseTo(2 / 9)
  })

  it('does not reroll a critical wound roll of 2', () => {
    const result = calculateWoundProbability(
      '4',
      REROLL_VALUES.REROLL_ONE_TWO,
      true,
      '2'
    )

    expect(result.woundChance).toBeCloseTo(35 / 36)
    expect(result.criticalWoundChance).toBeCloseTo(35 / 36)
  })
})
