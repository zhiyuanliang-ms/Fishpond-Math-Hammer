import { describe, expect, it } from 'vitest'
import { AOS_CRIT_EFFECTS } from '../dice'
import { buildAoSAttackReport } from '../aosAttackReport'

describe('buildAoSAttackReport', () => {
  it('includes attacker, defender, results, and per-profile damage', () => {
    const report = buildAoSAttackReport(
      [
        {
          name: 'Celestite Spear',
          attacks: '2',
          toHit: 3,
          toWound: 4,
          rend: 1,
          damage: '1',
          critEffect: AOS_CRIT_EFFECTS.TWO_HITS,
        },
        {
          name: 'Champion Blade',
          attacks: '3',
          toHit: 3,
          toWound: 3,
          rend: 2,
          damage: '2',
          critEffect: AOS_CRIT_EFFECTS.MORTAL,
        },
      ],
      { models: 5, health: 3, save: 4, ward: 6 },
      {
        numSimulations: 10000,
        expectedKills: 2.25,
        expectedKillsStdDev: 1.1,
        expectedKillsCILow: 0.09,
        expectedKillsCIHigh: 4.41,
        expectedDamage: 7.5,
        expectedDamageStdDev: 3.2,
        expectedDamageCILow: 1.23,
        expectedDamageCIHigh: 13.77,
        damageProbability: 95.5,
        wipeProbability: 12.25,
        perWeapon: [
          {
            name: 'Celestite Spear',
            expectedDamage: 5.25,
            stdDev: 2.2,
          },
          {
            name: 'Champion Blade',
            expectedDamage: 2.25,
            stdDev: 1.4,
          },
        ],
      }
    )

    expect(report).toContain('# AoS Attack Simulator')
    expect(report).toContain('A2, Hit 3+, Wound 4+, Rend -1')
    expect(report).toContain('Crit (2 Hits)')
    expect(report).toContain('5 models, Health 3, Save 4+, Ward 6+')
    expect(report).toContain('Expected models killed: 2.25')
    expect(report).toContain('Chance to wipe unit: 12.25%')
    expect(report).toContain('## Per-Profile Damage')
  })

  it('rejects incomplete report data', () => {
    expect(() => buildAoSAttackReport([], {}, {})).toThrow(
      /without weapon profiles/
    )
    expect(() => buildAoSAttackReport([{}], null, {})).toThrow(
      /without a defender and results/
    )
  })

  it('omits disabled Ward and critical effects', () => {
    const report = buildAoSAttackReport(
      [
        {
          name: 'Basic Weapon',
          attacks: '4',
          toHit: 3,
          toWound: 3,
          rend: 0,
          damage: '1',
          critEffect: AOS_CRIT_EFFECTS.NONE,
        },
      ],
      { models: 5, health: 2, save: 3, ward: 0 },
      {
        numSimulations: 1000,
        expectedKills: 1,
        expectedKillsStdDev: 0.5,
        expectedKillsCILow: 0,
        expectedKillsCIHigh: 2,
        expectedDamage: 2,
        expectedDamageStdDev: 1,
        expectedDamageCILow: 0,
        expectedDamageCIHigh: 4,
        damageProbability: 75,
        wipeProbability: 1,
        perWeapon: [],
      }
    )

    expect(report).toContain('Rend —, D1')
    expect(report).toContain('Health 2, Save 3+')
    expect(report).not.toContain('Ward None')
    expect(report).not.toContain(', None')
  })
})
