import { describe, it, expect } from 'vitest'
import {
  antiOptions,
  critOptions,
  fnpOptions,
  sustainedOptions,
  sustainedMean,
  sustainedVariance,
  sustainedMax
} from '../../../lib/dice/options'
import {
  sanitizeDraftValue,
  findMatchingValue,
  formatDisplayValue,
  getAllowedValuesLabel
} from '../buffChipInputUtils'

describe('sanitizeDraftValue', () => {
  it('normalizes whitespace, casing, and length to two characters', () => {
    expect(sanitizeDraftValue(' d3 ')).toBe('D3')
    expect(sanitizeDraftValue('d66')).toBe('D6')
    expect(sanitizeDraftValue(' 4+ ')).toBe('4+')
    expect(sanitizeDraftValue(null)).toBe('')
  })
})

describe('findMatchingValue', () => {
  it('accepts Anti values from 2+ through 5+ only', () => {
    expect(findMatchingValue('2+', antiOptions)?.value).toBe('2')
    expect(findMatchingValue('5+', antiOptions)?.value).toBe('5')
    expect(findMatchingValue('6+', antiOptions)).toBeNull()
  })

  it('accepts Critical Hit values from 2+ through 5+ only', () => {
    expect(findMatchingValue('2+', critOptions)?.value).toBe('2')
    expect(findMatchingValue('5+', critOptions)?.value).toBe('5')
    expect(findMatchingValue('6+', critOptions)).toBeNull()
  })

  it('accepts FNP values from 2+ through 6+', () => {
    expect(findMatchingValue('2+', fnpOptions)?.value).toBe('2')
    expect(findMatchingValue('6+', fnpOptions)?.value).toBe('6')
    expect(findMatchingValue('7+', fnpOptions)).toBeNull()
  })

  it('accepts single-digit Sustained Hits plus D3 and D6', () => {
    expect(findMatchingValue('9', sustainedOptions)?.value).toBe('9')
    expect(findMatchingValue('d3', sustainedOptions)?.value).toBe('D3')
    expect(findMatchingValue('D6', sustainedOptions)?.value).toBe('D6')
    expect(findMatchingValue('D4', sustainedOptions)).toBeNull()
  })
})

describe('formatDisplayValue', () => {
  it('formats stored values using the user-facing option label', () => {
    expect(formatDisplayValue('4', antiOptions)).toBe('4+')
    expect(formatDisplayValue('D6', sustainedOptions)).toBe('D6')
  })
})

describe('getAllowedValuesLabel', () => {
  it('uses the compact sustained-hits hint text', () => {
    expect(getAllowedValuesLabel({ key: 'sustainedHits', valueOptions: sustainedOptions })).toBe('1-9, D3, D6')
  })

  it('joins labels for threshold-based buffs', () => {
    expect(getAllowedValuesLabel({ key: 'anti', valueOptions: antiOptions })).toBe('2+, 3+, 4+, 5+')
  })
})

describe('sustained D6 support', () => {
  it('exposes the expected summary stats for D6 sustained hits', () => {
    expect(sustainedMean('D6')).toBe(3.5)
    expect(sustainedVariance('D6')).toBe(35 / 12)
    expect(sustainedMax('D6')).toBe(6)
  })
})