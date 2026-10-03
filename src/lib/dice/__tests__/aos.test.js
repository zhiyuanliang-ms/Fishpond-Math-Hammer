import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  AOS_CRIT_EFFECTS,
  calculateAoSDamage,
  isValidAoSDiceExpression,
  simulateAoSAttack,
} from '../aos'

function mulberry32(seed) {
  let value = seed >>> 0
  return function random() {
    value = (value + 0x6D2B79F5) >>> 0
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

let originalRandom
beforeEach(() => {
  originalRandom = Math.random
  Math.random = mulberry32(42)
})
afterEach(() => {
  Math.random = originalRandom
})

const weapon = (overrides = {}) => ({
  name: 'Test Weapon',
  attacks: '4',
  toHit: 3,
  toWound: 4,
  rend: 1,
  damage: '2',
  critEffect: AOS_CRIT_EFFECTS.NONE,
  ...overrides,
})

const target = (overrides = {}) => ({
  models: 100,
  health: 100,
  save: 4,
  ward: 0,
  ...overrides,
})

describe('calculateAoSDamage', () => {
  it('calculates the standard hit, wound, save, and damage sequence', () => {
    const result = calculateAoSDamage(weapon(), target())

    expect(result.expectedHits).toBeCloseTo(8 / 3)
    expect(result.expectedWounds).toBeCloseTo(4 / 3)
    expect(result.expectedFailedSaves).toBeCloseTo(8 / 9)
    expect(result.expectedDamage).toBeCloseTo(16 / 9)
  })

  it('turns every critical hit into two wound rolls for Crit (2 Hits)', () => {
    const result = calculateAoSDamage(
      weapon({
        attacks: '6',
        toHit: 2,
        toWound: 2,
        rend: 0,
        damage: '1',
        critEffect: AOS_CRIT_EFFECTS.TWO_HITS,
      }),
      target({ save: 7 })
    )

    expect(result.expectedCriticalHits).toBeCloseTo(1)
    expect(result.expectedHits).toBeCloseTo(6)
    expect(result.expectedDamage).toBeCloseTo(5)
  })

  it('skips the wound roll for Crit (Auto-wound)', () => {
    const result = calculateAoSDamage(
      weapon({
        attacks: '6',
        toHit: 4,
        toWound: 6,
        rend: 0,
        damage: '1',
        critEffect: AOS_CRIT_EFFECTS.AUTO_WOUND,
      }),
      target({ save: 7 })
    )

    expect(result.expectedWounds).toBeCloseTo(4 / 3)
    expect(result.expectedDamage).toBeCloseTo(4 / 3)
  })

  it('skips wound and save rolls for Crit (Mortal), but still applies Ward', () => {
    const result = calculateAoSDamage(
      weapon({
        attacks: '6',
        toHit: 4,
        toWound: 6,
        rend: 0,
        damage: '2',
        critEffect: AOS_CRIT_EFFECTS.MORTAL,
      }),
      target({ save: 2, ward: 4 })
    )

    expect(result.expectedMortalDamageBeforeWard).toBeCloseTo(2)
    expect(result.expectedMortalDamage).toBeCloseTo(1)
    expect(result.expectedDamage).toBeCloseTo(19 / 18)
  })

  it('uses the mean of random Attacks and Damage characteristics', () => {
    const result = calculateAoSDamage(
      weapon({
        attacks: '2D3',
        toHit: 2,
        toWound: 2,
        rend: 5,
        damage: 'D3+1',
      }),
      target({ save: 2 })
    )

    expect(result.expectedAttacks).toBeCloseTo(4)
    expect(result.expectedDamage).toBeCloseTo(25 / 3)
  })
})

describe('simulateAoSAttack', () => {
  it.each(Object.values(AOS_CRIT_EFFECTS))(
    'tracks the exact expectation for the %s critical effect',
    (critEffect) => {
      const testWeapon = weapon({
        attacks: '6',
        toHit: 4,
        toWound: 4,
        damage: '2',
        critEffect,
      })
      const testTarget = target({ ward: 5 })
      const exact = calculateAoSDamage(testWeapon, testTarget)
      const simulated = simulateAoSAttack(
        [testWeapon],
        testTarget,
        10000
      )

      expect(simulated.expectedDamage).toBeCloseTo(exact.expectedDamage, 1)
      expect(simulated.distributionData.at(-1).cumulative).toBeCloseTo(100)
      expect(simulated.killDistributionData.at(-1).cumulative).toBeCloseTo(100)
    }
  )

  it('returns a per-weapon breakdown for multiple profiles', () => {
    const result = simulateAoSAttack(
      [
        weapon({ name: 'Spears', damage: '1' }),
        weapon({ name: 'Hammers', attacks: '2', damage: '3' }),
      ],
      target(),
      1000
    )

    expect(result.perWeapon).toHaveLength(2)
    expect(result.perWeapon.map((entry) => entry.name)).toEqual([
      'Spears',
      'Hammers',
    ])
    expect(result.expectedDamage).toBeGreaterThan(0)
  })

  it('spills damage across models and caps damage when the unit is destroyed', () => {
    const result = simulateAoSAttack(
      [
        weapon({
          attacks: '100',
          toHit: 2,
          toWound: 2,
          rend: 5,
          damage: '2',
        }),
      ],
      target({ models: 3, health: 2, save: 2 }),
      100
    )

    expect(result.totalHealth).toBe(6)
    expect(result.expectedDamage).toBe(6)
    expect(result.expectedDamageCIHigh).toBe(6)
    expect(result.expectedKills).toBe(3)
    expect(result.wipeProbability).toBe(100)
    expect(result.maxDamage).toBe(6)
    expect(result.perWeapon[0].expectedDamage).toBe(6)
  })
})

describe('AoS profile validation', () => {
  it('rejects dice expressions that can roll zero or less', () => {
    expect(isValidAoSDiceExpression('D3')).toBe(true)
    expect(isValidAoSDiceExpression('D3+1')).toBe(true)
    expect(isValidAoSDiceExpression('D3-1')).toBe(false)
  })

  it('surfaces invalid weapon profiles', () => {
    expect(() =>
      simulateAoSAttack(
        [weapon({ attacks: 'D3-1' })],
        target(),
        10
      )
    ).toThrow(/must always roll at least 1/)
  })

  it('requires Models and Health for simulations', () => {
    expect(() =>
      simulateAoSAttack(
        [weapon()],
        target({ models: 0 }),
        10
      )
    ).toThrow(/Models must be a positive integer/)

    expect(() =>
      simulateAoSAttack(
        [weapon()],
        target({ health: 0 }),
        10
      )
    ).toThrow(/Health must be a positive integer/)
  })

  it('rejects Rend values above -5', () => {
    expect(() =>
      simulateAoSAttack(
        [weapon({ rend: 6 })],
        target(),
        10
      )
    ).toThrow(/Rend must be between 0 and 5/)
  })
})
