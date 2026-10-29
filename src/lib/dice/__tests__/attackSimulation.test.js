import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { simulateAttack, simulateMultiUnitAttack } from '../attackSimulation'
import { makeUnitBuffs, mergeUnitBuffs } from '../unitBuffMerge'

// Tiny seeded PRNG (mulberry32) — gives deterministic Monte Carlo runs so
// statistical assertions are exact across machines and CI.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
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

// Sane defaults shared by tests below.
const baseWeapon = (overrides = {}) => ({
  attacks: '4',
  toHit: 3,
  strength: 4,
  ap: 0,
  damage: '1',
  modelsFiring: 1,
  hitReroll: 'no-reroll',
  woundReroll: 'no-reroll',
  sustainedHits: 'off',
  lethalHits: false,
  devastatingWounds: false,
  torrent: false,
  plusOneWound: false,
  blast: false,
  cleaveEnabled: false,
  cleaveValue: 1,
  plusOneHit: false,
  ignoresCover: false,
  critHitEnabled: false,
  critHit: 6,
  critWound: 6,
  antiEnabled: false,
  antiValue: 0,
  ...overrides
})

const baseTarget = (overrides = {}) => ({
  models: 5,
  wounds: 1,
  toughness: 4,
  save: 4,
  invulnSave: 0,
  fnp: 0,
  fnpMortal: 0,
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  benefitOfCover: false,
  minusOneAp: false,
  ...overrides
})

const N = 5000

const mockD6Faces = (...faces) => {
  const random = vi.fn(() => {
    throw new Error('Unexpected extra dice roll')
  })
  for (const face of faces) random.mockReturnValueOnce((face - 0.5) / 6)
  Math.random = random
  return random
}

describe('simulateMultiUnitAttack', () => {
  it('preserves every single-unit result for the same random sequence', () => {
    const weapons = [
      baseWeapon({ blast: true, devastatingWounds: true }),
      baseWeapon({ damage: 'D3', hitReroll: 'reroll-one' }),
    ]
    const targets = [
      baseTarget({ models: 5, wounds: 2 }),
      baseTarget({ models: 1, wounds: 4, toughness: 8 }),
    ]
    const unitBuffs = makeUnitBuffs({
      rerollOneFailedHit: true,
      rerollOneFailedWound: true,
    })
    const single = simulateAttack(weapons, targets, 200, unitBuffs)
    Math.random = mulberry32(42)

    expect(simulateMultiUnitAttack([{ weapons, unitBuffs }], targets, 200))
      .toEqual(single)
  })

  it('carries a wounded model across three attacking units', () => {
    const random = mockD6Faces(6, 6, 6)
    const unit = { weapons: [baseWeapon({ attacks: '1', torrent: true })] }
    const result = simulateMultiUnitAttack(
      [unit, unit, unit],
      [baseTarget({ models: 1, wounds: 3, save: 7 })],
      1
    )

    expect(result.expectedKills).toBe(1)
    expect(result.expectedDamage).toBe(3)
    expect(result.wipeProbability).toBe(100)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('continues with the next defensive profile instead of resetting the target', () => {
    const random = mockD6Faces(6, 5)
    const unit = { weapons: [baseWeapon({ attacks: '1', torrent: true })] }
    const result = simulateMultiUnitAttack(
      [unit, unit],
      [
        baseTarget({ models: 1, save: 7 }),
        baseTarget({ models: 1, save: 7, toughness: 8 }),
      ],
      1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('stops later units when the shared target has been wiped', () => {
    const random = mockD6Faces(6)
    const unit = { weapons: [baseWeapon({ attacks: '1', torrent: true, damage: '6' })] }
    const result = simulateMultiUnitAttack(
      [unit, unit, unit],
      [baseTarget({ models: 1, wounds: 2, save: 7 })],
      1
    )

    expect(result.expectedKills).toBe(1)
    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('keeps unit-granted weapon buffs local without mutating the profiles', () => {
    const random = mockD6Faces(6, 6)
    const weapon = Object.freeze(baseWeapon({ attacks: '1', torrent: true }))
    const unitBuffs = Object.freeze(makeUnitBuffs({ plusOneDamage: true }))
    const result = simulateMultiUnitAttack(
      [
        { weapons: [weapon], unitBuffs },
        { weapons: [weapon] },
      ],
      [baseTarget({ models: 1, wounds: 10, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(3)
    expect(weapon.damage).toBe('1')
    expect(unitBuffs.plusOneDamage).toBe(true)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it.each([
    { flag: 'rerollOneFailedHit', overrides: { toHit: 4, lethalHits: true } },
    { flag: 'rerollOneFailedWound', overrides: { torrent: true } },
  ])('gives each unit its own $flag budget, shared by its weapons, every trial', ({
    flag, overrides,
  }) => {
    const trialFaces = [2, 6, 2, 2, 6, 2, 2, 6, 2]
    const random = mockD6Faces(...trialFaces, ...trialFaces)
    const weapon = baseWeapon({ attacks: '1', ...overrides })
    const unit = {
      weapons: [weapon, weapon],
      unitBuffs: makeUnitBuffs({ [flag]: true }),
    }
    const result = simulateMultiUnitAttack(
      [unit, unit, unit],
      [baseTarget({ models: 100, save: 7 })],
      2
    )

    expect(result.expectedDamage).toBe(3)
    expect(result.numSimulations).toBe(2)
    expect(random).toHaveBeenCalledTimes(18)
  })

  it('does not transfer an unused single-roll budget to the next unit', () => {
    const random = mockD6Faces(6, 2)
    const weapon = baseWeapon({ attacks: '1', lethalHits: true })
    const result = simulateMultiUnitAttack(
      [
        { weapons: [weapon], unitBuffs: { rerollOneFailedHit: true } },
        { weapons: [weapon] },
      ],
      [baseTarget({ models: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('combines both reroll-ones auras with independent single hit and wound rerolls', () => {
    const unitFaces = [1, 2, 2, 6, 1, 2, 6, 2, 6, 2]
    const random = mockD6Faces(...unitFaces, ...unitFaces, ...unitFaces)
    const unit = {
      weapons: [baseWeapon({ attacks: '4', toHit: 4 })],
      unitBuffs: makeUnitBuffs({
        hitReroll: 'reroll-one',
        woundReroll: 'reroll-one',
        rerollOneFailedHit: true,
        rerollOneFailedWound: true,
      }),
    }
    const result = simulateMultiUnitAttack(
      [unit, unit, unit],
      [baseTarget({ models: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(3)
    expect(random).toHaveBeenCalledTimes(30)
  })

  it('resolves deferred devastating wounds before the next unit attacks', () => {
    const random = mockD6Faces(6, 6)
    const result = simulateMultiUnitAttack(
      [
        {
          weapons: [baseWeapon({
            attacks: '1', torrent: true, devastatingWounds: true, damage: '2',
          })],
        },
        { weapons: [baseWeapon({ attacks: '1', torrent: true })] },
      ],
      [
        baseTarget({ models: 1, wounds: 1, save: 7 }),
        baseTarget({ models: 1, wounds: 2, save: 7 }),
      ],
      1
    )

    expect(result.expectedKills).toBe(1)
    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it.each([
    { blast: true },
    { cleaveEnabled: true },
  ])('snapshots the surviving target count for each unit with %j', (bonus) => {
    const random = mockD6Faces(6, 6)
    const result = simulateMultiUnitAttack(
      [
        { weapons: [baseWeapon({ attacks: '1', torrent: true })] },
        { weapons: [baseWeapon({ attacks: '1', torrent: true, ...bonus })] },
      ],
      [baseTarget({ models: 5, save: 7 })],
      1
    )

    expect(result.expectedKills).toBe(2)
    expect(random).toHaveBeenCalledTimes(2)
  })
})

describe('simulateAttack — basic correctness', () => {
  it('returns 0 expected kills/damage when no attacks land', () => {
    // Torrent auto-hits, but S=1 vs T=10 wounds on 6+ only. Sv=2+ AP 0 → almost always saves.
    // We just check the shape and that nothing throws.
    const r = simulateAttack(
      [baseWeapon({ torrent: true, strength: 1 })],
      [baseTarget({ toughness: 10, save: 2 })],
      200
    )
    expect(r.numSimulations).toBe(200)
    expect(r.totalModels).toBe(5)
    expect(r.expectedKills).toBeGreaterThanOrEqual(0)
  })

  it('per-attack expected damage matches closed-form (BS3+, S4 vs T4, Sv4+)', () => {
    // 4 attacks * (4/6 hit) * (3/6 wound) * (3/6 unsaved) * 1 dmg = 4 * 0.6667 * 0.5 * 0.5 = 0.6667
    const r = simulateAttack(
      [baseWeapon({ attacks: '4' })],
      [baseTarget({ models: 100 })], // many models so we don't cap
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(0.55)
    expect(r.expectedDamage).toBeLessThan(0.78)
  })
})

describe('simulateAttack — saving throws', () => {
  const salvoWeapon = (overrides = {}) => baseWeapon({
    attacks: '3',
    torrent: true,
    ap: 3,
    damage: '3',
    ...overrides,
  })
  const mixedTargets = (front = {}, back = {}) => [
    baseTarget({ models: 1, wounds: 2, save: 3, ...front }),
    baseTarget({ models: 1, wounds: 3, save: 3, invulnSave: 4, ...back }),
  ]

  it.each([
    { label: 'armor', save: 2, invulnSave: 0, ap: 0 },
    { label: 'invulnerable', save: 6, invulnSave: 2, ap: 4 },
  ])('does not reroll a failed $label save from an obsolete buff', ({ save, invulnSave, ap }) => {
    const random = vi.fn()
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.99)
    Math.random = random

    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, ap })],
      [baseTarget({ models: 1, save, invulnSave, rerollSaveOnes: true })],
      1
    )

    expect(result.expectedDamage).toBe(1)
    expect(result.expectedKills).toBe(1)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it.each([
    { saves: [4, 2, 4] },
    { saves: [2, 4, 4] },
    { saves: [4, 4, 2] },
  ])('sorts $saves so the 2W model dies and both 4s protect the invulnerable model', ({ saves }) => {
    const random = mockD6Faces(6, 6, 6, ...saves)
    const result = simulateAttack([salvoWeapon()], mixedTargets(), 1)

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(result.expectedKills).toBe(1)
    expect(result.expectedDamage).toBe(2)
    expect(result.wipeProbability).toBe(0)
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('includes all firing models of one weapon card in the same save pool', () => {
    const random = mockD6Faces(6, 6, 6, 4, 2, 4)
    const result = simulateAttack(
      [salvoWeapon({ attacks: '1', modelsFiring: 3 })], mixedTargets(), 1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(random).toHaveBeenCalledTimes(6)
  })

  it.each(['weapon cards', 'attacking units'])('does not combine pools across separate %s', (scope) => {
    const random = mockD6Faces(6, 4, 6, 6, 2, 4)
    const weapons = [salvoWeapon({ attacks: '1' }), salvoWeapon({ attacks: '2' })]
    const result = scope === 'weapon cards'
      ? simulateAttack(weapons, mixedTargets(), 1)
      : simulateMultiUnitAttack(weapons.map((weapon) => ({ weapons: [weapon] })), mixedTargets(), 1)

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 1])
    expect(result.expectedDamage).toBe(5)
    expect(result.wipeProbability).toBe(100)
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('rolls every saving die even when only a later defensive profile can save', () => {
    const random = mockD6Faces(6, 6, 6, 4, 2, 4)
    const result = simulateAttack([salvoWeapon()], mixedTargets({ save: 7 }), 1)

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('omits irrelevant saving dice only when no remaining group can possibly save', () => {
    const random = mockD6Faces(6, 6, 6)
    const result = simulateAttack(
      [salvoWeapon()], mixedTargets({ save: 7 }, { save: 7, invulnSave: 0 }), 1
    )

    expect(result.expectedKills).toBe(2)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('uses the new group armor and AP reduction for each sorted result', () => {
    const random = mockD6Faces(6, 6, 6, 6, 2, 5)
    const result = simulateAttack(
      [salvoWeapon()], mixedTargets({}, { invulnSave: 0, minusOneAp: true }), 1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('keeps natural 1 a failure and does not auto-save a 6 against an impossible save', () => {
    const random = mockD6Faces(6, 6, 6, 6, 1, 6)
    const result = simulateAttack(
      [salvoWeapon({ ap: 0, damage: '1' })],
      mixedTargets({ wounds: 1, save: 2 }, { models: 2, wounds: 1, save: 7, invulnSave: 0 }),
      1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 2])
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('continues the same allocation group if FNP keeps its current model alive', () => {
    const random = mockD6Faces(6, 6, 6, 4, 2, 4, 4, 1, 1)
    const result = simulateAttack(
      [salvoWeapon({ damage: '2' })], mixedTargets({ fnp: 4 }), 1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    // FNP ignores the first point (4) and the W2 model loses exactly 2 wounds.
    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(9)
  })

  it.each([
    { buff: { damageOne: true, wounds: 3 }, damage: 4 },
    { buff: { minusOneDamage: true, wounds: 5 }, damage: 6 },
    { buff: { halfDamage: true, wounds: 5 }, damage: 6 },
  ])('applies each current group damage modifiers: $buff', ({ buff, damage }) => {
    const random = mockD6Faces(6, 6, 6, 3, 1, 2)
    const result = simulateAttack(
      [salvoWeapon()], mixedTargets({ halfDamage: true }, buff), 1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(result.expectedDamage).toBe(damage)
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('rolls and rerolls random damage only after a sorted result fails its current save', () => {
    const random = mockD6Faces(6, 6, 6, 4, 2, 4, 1, 3)
    const result = simulateAttack(
      [salvoWeapon({ damage: 'D6', damageReroll: 'reroll-1-2-3', damageRerollScope: 'single' })],
      mixedTargets(),
      1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(8)
  })

  it('puts Lethal Hits and Sustained Hits wounds into the same sorted pool', () => {
    const random = mockD6Faces(6, 6, 6, 4, 2, 4)
    const result = simulateAttack(
      [salvoWeapon({ attacks: '1', torrent: false, lethalHits: true, sustainedHits: '2' })],
      mixedTargets(),
      1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(random).toHaveBeenCalledTimes(6)
  })

  it('excludes Devastating Wounds from saves and resolves them after this card normal damage', () => {
    const random = mockD6Faces(6, 4, 4, 4, 2)
    const result = simulateAttack(
      [salvoWeapon({ devastatingWounds: true })], mixedTargets({}, { wounds: 5 }), 1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(result.expectedDamage).toBe(5)
    expect(random).toHaveBeenCalledTimes(5)
  })
})

describe.each([
  {
    stage: 'hit',
    flag: 'rerollOneFailedHit',
    countKey: 'rerollFailedHit',
    policy: 'hitReroll',
    scope: 'hitRerollScope',
    weaponOverrides: { toHit: 4, critHitEnabled: true, critHit: 4, lethalHits: true },
  },
  {
    stage: 'wound',
    flag: 'rerollOneFailedWound',
    countKey: 'rerollFailedWound',
    policy: 'woundReroll',
    scope: 'woundRerollScope',
    weaponOverrides: { torrent: true },
  },
])('simulateAttack — unit-wide failed $stage rerolls', ({
  flag, countKey, policy, scope, weaponOverrides,
}) => {
  const weapon = (overrides = {}) =>
    baseWeapon({ attacks: '1', ...weaponOverrides, ...overrides })
  const run = (
    weapons,
    buffs,
    iterations = 1,
    targets = [baseTarget({ models: 100, save: 7 })]
  ) => simulateAttack(weapons, targets, iterations, buffs)

  it.each([1, 2, 3])('shares exactly X = %i uses across firing models and weapons', (count) => {
    const faces = Array.from({ length: count }, () => [2, 6]).flat()
    const random = mockD6Faces(...faces, 2, 2)
    const result = run(
      [weapon({ modelsFiring: count + 1 }), weapon()],
      { [countKey]: count }
    )

    expect(result.expectedDamage).toBe(count)
    expect(random).toHaveBeenCalledTimes(2 * count + 2)
  })

  it.each([1, 2, 3])('does not reroll replacement failures even with X = %i and reroll ones', (count) => {
    const faces = Array.from({ length: count }, () => [2, 1]).flat()
    const random = mockD6Faces(...faces, 2)
    const result = run(
      [weapon({ attacks: (count + 1).toString() })],
      { [countKey]: count, [policy]: 'reroll-one' }
    )

    expect(result.expectedDamage).toBe(0)
    expect(random).toHaveBeenCalledTimes(2 * count + 1)
  })

  it.each(['unit', 'weapon'])('uses the %s reroll-ones policy before spending X = 3', (source) => {
    const random = mockD6Faces(1, 1, 2, 6, 2, 1, 2, 6, 2)
    const result = run(
      [weapon({ attacks: '5', ...(source === 'weapon' ? { [policy]: 'reroll-one' } : {}) })],
      { [countKey]: 3, ...(source === 'unit' ? { [policy]: 'reroll-one' } : {}) }
    )

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(9)
  })

  it.each(['reroll-fail', 'reroll-non-critical'])(
    'preserves all X = 3 uses for later weapons after %s',
    (mode) => {
      const random = mockD6Faces(2, 1, 3, 6, 2, 6, 2, 6, 2, 6, 2)
      const result = run(
        [weapon({ attacks: '2', [policy]: mode }), weapon({ attacks: '4' })],
        { [countKey]: 3 }
      )

      expect(result.expectedDamage).toBe(4)
      expect(random).toHaveBeenCalledTimes(11)
    }
  )

  it.each(['reroll-fail', 'reroll-non-critical'])(
    'uses X = 3 only on later original failures after a single-scoped %s is exhausted',
    (mode) => {
      const random = mockD6Faces(2, 1, 2, 6, 2, 6, 2, 6, 2)
      const result = run(
        [weapon({ attacks: '5', [policy]: mode, [scope]: 'single' })],
        { [countKey]: 3 }
      )

      expect(result.expectedDamage).toBe(3)
      expect(random).toHaveBeenCalledTimes(9)
    }
  )

  it.each([1, 2, 3])('resets X = %i independently for each unit and trial', (count) => {
    const unitFaces = [...Array.from({ length: count }, () => [2, 6]).flat(), 2]
    const random = mockD6Faces(...Array.from({ length: 4 }, () => unitFaces).flat())
    const unit = {
      weapons: [weapon({ attacks: (count + 1).toString() })],
      unitBuffs: { [countKey]: count },
    }
    const result = simulateMultiUnitAttack(
      [unit, unit], [baseTarget({ models: 100, save: 7 })], 2
    )

    expect(result.expectedDamage).toBe(2 * count)
    expect(random).toHaveBeenCalledTimes(4 * (2 * count + 1))
  })

  it('rejects an out-of-range budget before rolling dice', () => {
    const random = mockD6Faces()

    expect(() => run([weapon()], { [countKey]: 4 })).toThrow('integer between 0 and 3')
    expect(random).not.toHaveBeenCalled()
  })

  it('shares one opportunity across all weapon profiles', () => {
    const random = mockD6Faces(2, 6, 2)
    const result = run([weapon(), weapon()], { [flag]: true })

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('does not grant another opportunity to each firing model', () => {
    const random = mockD6Faces(2, 6, 2, 2)
    const result = run([weapon({ modelsFiring: 3 })], { [flag]: true })

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('does not reset the budget when the active target profile changes', () => {
    const random = mockD6Faces(2, 6, 2)
    const result = run(
      [weapon({ attacks: '2' })],
      { [flag]: true },
      1,
      [baseTarget({ models: 1, save: 7 }), baseTarget({ models: 1, save: 7 })]
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('resets the shared budget for each simulation trial', () => {
    const random = mockD6Faces(2, 6, 2, 2, 6, 2)
    const result = run([weapon(), weapon()], { [flag]: true }, 2)

    expect(result.expectedDamage).toBe(1)
    expect(result.numSimulations).toBe(2)
    expect(random).toHaveBeenCalledTimes(6)
  })

  it.each([1, 2])('keeps the unit opportunity after reroll-ones produces a failed %s', (replacement) => {
    const random = mockD6Faces(1, replacement, 2, 6)
    const result = run(
      [weapon({ attacks: '2' })],
      { [flag]: true, [policy]: 'reroll-one' }
    )

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('never rerolls a failed 2 into a 1 and then rerolls that 1 again', () => {
    const random = mockD6Faces(2, 1)
    const result = run([weapon()], { [flag]: true, [policy]: 'reroll-one' })

    expect(result.expectedDamage).toBe(0)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('stacks with reroll-ones-and-twos without rerolling any die twice', () => {
    const random = mockD6Faces(2, 1, 3, 6)
    const result = run(
      [weapon({ attacks: '2' })],
      { [flag]: true, [policy]: 'reroll-one-two' }
    )

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it.each(['reroll-fail', 'reroll-non-critical'])(
    'adds no second reroll to a die already covered by %s',
    (mode) => {
      const random = mockD6Faces(2, 1, 3, 6)
      const result = run([weapon({ attacks: '2' })], { [flag]: true, [policy]: mode })

      expect(result.expectedDamage).toBe(1)
      expect(random).toHaveBeenCalledTimes(4)
    }
  )

  it('preserves existing profile-scoped reroll budgets independently', () => {
    const random = mockD6Faces(2, 1, 2, 6, 2)
    const result = run(
      [weapon({ attacks: '3', [policy]: 'reroll-fail', [scope]: 'single' })],
      { [flag]: true }
    )

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(5)
  })

  it('does not spend the unit opportunity on an original success', () => {
    const random = mockD6Faces(6, 2, 6)
    const result = run([weapon({ attacks: '2' })], { [flag]: true })

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('does not treat the same flag on a weapon profile as a unit buff', () => {
    const random = mockD6Faces(2)
    const result = run([weapon({ [flag]: true })], {})

    expect(result.expectedDamage).toBe(0)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('does not stack duplicate saved and additional unit-buff copies', () => {
    const random = mockD6Faces(2, 6, 2)
    const saved = Object.freeze(makeUnitBuffs({ [flag]: true }))
    const extra = Object.freeze(makeUnitBuffs({ [flag]: true }))
    const result = run([weapon(), weapon()], mergeUnitBuffs(saved, extra))

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(3)
    expect(saved).toEqual(extra)
  })

  it('matches the closed-form expectation for reroll-ones plus one shared failed reroll', () => {
    const result = run(
      [weapon({ attacks: '2' }), weapon({ attacks: '2' })],
      Object.freeze(makeUnitBuffs({ [flag]: true, [policy]: 'reroll-one' })),
      N
    )
    const expected = 4 * (7 / 12) + 0.5 * (1 - (2 / 3) ** 4)

    expect(Math.abs(result.expectedDamage - expected)).toBeLessThan(0.05)
  })
})

describe('simulateAttack — shared unit reroll interactions', () => {
  const targets = [baseTarget({ models: 100, save: 7 })]

  it('keeps the hit and wound opportunities independent', () => {
    const random = mockD6Faces(2, 4, 2, 4, 2, 4, 2)
    const result = simulateAttack(
      [baseWeapon({ attacks: '3', toHit: 4 })],
      targets,
      1,
      { rerollOneFailedHit: true, rerollOneFailedWound: true }
    )

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(7)
  })

  it('stacks both unit opportunities with hit and wound reroll-ones', () => {
    const random = mockD6Faces(1, 2, 2, 4, 1, 2, 4, 2, 4)
    const result = simulateAttack(
      [baseWeapon({ attacks: '3', toHit: 4 })],
      targets,
      1,
      {
        hitReroll: 'reroll-one',
        woundReroll: 'reroll-one',
        rerollOneFailedHit: true,
        rerollOneFailedWound: true,
      }
    )

    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(9)
  })

  it('preserves the hit opportunity through a Torrent weapon', () => {
    const random = mockD6Faces(6, 2, 6)
    const result = simulateAttack(
      [
        baseWeapon({ attacks: '1', torrent: true }),
        baseWeapon({ attacks: '1', lethalHits: true }),
      ],
      targets,
      1,
      { rerollOneFailedHit: true }
    )

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('preserves the wound opportunity through Lethal Hits', () => {
    const random = mockD6Faces(6, 2, 6)
    const result = simulateAttack(
      [
        baseWeapon({ attacks: '1', lethalHits: true }),
        baseWeapon({ attacks: '1', torrent: true }),
      ],
      targets,
      1,
      { rerollOneFailedWound: true }
    )

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('shares the wound opportunity with Sustained Hits extras', () => {
    const random = mockD6Faces(6, 2, 6, 2)
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', lethalHits: true, sustainedHits: '2' })],
      targets,
      1,
      { rerollOneFailedWound: true }
    )

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('does not spend the wound opportunity on a successful ANTI critical', () => {
    const random = mockD6Faces(2, 2, 6)
    const result = simulateAttack(
      [
        baseWeapon({ attacks: '1', torrent: true, antiEnabled: true, antiValue: 2 }),
        baseWeapon({ attacks: '1', torrent: true }),
      ],
      targets,
      1,
      { rerollOneFailedWound: true }
    )

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('evaluates failures using the modified wound threshold', () => {
    const random = mockD6Faces(3, 2, 6)
    const result = simulateAttack(
      [baseWeapon({ attacks: '2', torrent: true, plusOneWound: true })],
      targets,
      1,
      { rerollOneFailedWound: true }
    )

    expect(result.expectedDamage).toBe(2)
    expect(random).toHaveBeenCalledTimes(3)
  })
})

describe('simulateAttack — Blast', () => {
  it('adds floor(target_models / 5) to every attack roll', () => {
    // 1 attack base, blast on, 10 models in target → +2, so 3 attacks per trial.
    // Auto-hit (torrent), S5 vs T4 wounds on 3+, save 7+ (no save), 1 damage.
    // Expected damage = 3 * (4/6) = 2.0
    const r = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, strength: 5, blast: true })],
      [baseTarget({ models: 10, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(1.85)
    expect(r.expectedDamage).toBeLessThan(2.15)
  })

  it('blast bonus uses target size at start of trial, not live count', () => {
    // Two identical blast weapons, 10 models target. Both should see +2 from blast
    // even though the first weapon may kill some models. Expected total damage =
    // 2 * 3 * (4/6) ≈ 4.0. If blast were live-counted, the second weapon would
    // see fewer models and average less — this guards against that regression.
    const r = simulateAttack(
      [
        baseWeapon({ attacks: '1', torrent: true, strength: 5, blast: true }),
        baseWeapon({ attacks: '1', torrent: true, strength: 5, blast: true })
      ],
      [baseTarget({ models: 10, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(3.7)
    expect(r.expectedDamage).toBeLessThan(4.3)
  })
})

describe('simulateAttack — Cleave X', () => {
  it('adds X * floor(target_models / 5) attack dice', () => {
    // 1 attack base, Cleave 2, 10 models in target → +2*2 = +4, so 5 attacks.
    // Auto-hit (torrent), S5 vs T4 wounds on 3+ (4/6), save 7+ (no save), 1 dmg.
    // Expected damage = 5 * (4/6) ≈ 3.33
    const r = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, strength: 5, cleaveEnabled: true, cleaveValue: 2 })],
      [baseTarget({ models: 10, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(3.05)
    expect(r.expectedDamage).toBeLessThan(3.6)
  })
})

describe.each([
  { name: 'Blast X', enabledKey: 'blast', valueKey: 'blastValue' },
  { name: 'Cleave X', enabledKey: 'cleaveEnabled', valueKey: 'cleaveValue' },
])('simulateAttack — $name scaling and limits', ({ enabledKey, valueKey }) => {
  it.each([false, true])(
    'keeps A+2 after the first weapon reduces 10 models to 1 (mixed abilities: %s)',
    (mixed) => {
      const firstAbility = mixed
        ? (enabledKey === 'blast' ? { cleaveEnabled: true } : { blast: true })
        : { [enabledKey]: true }
      const random = mockD6Faces(...Array(12).fill(6))
      const result = simulateAttack(
        [
          baseWeapon({ attacks: '7', torrent: true, ...firstAbility }),
          baseWeapon({ attacks: '1', torrent: true, [enabledKey]: true, [valueKey]: 1 }),
        ],
        [
          baseTarget({ models: 9, save: 7 }),
          baseTarget({ models: 1, wounds: 10, save: 7 }),
        ],
        1
      )

      expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([9, 0])
      expect(result.expectedDamage).toBe(12)
      expect(random).toHaveBeenCalledTimes(12)
    }
  )

  it.each([
    [4, 1],
    [5, 3],
    [9, 3],
    [10, 5],
    [14, 5],
    [15, 7],
  ])('makes exactly %i target models produce %i attacks with X = 2', (models, attacks) => {
    const random = vi.fn(() => 0.99)
    Math.random = random
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, [enabledKey]: true, [valueKey]: 2 })],
      [baseTarget({ models, wounds: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(attacks)
    expect(random).toHaveBeenCalledTimes(attacks)
  })

  it.each([
    [undefined, 3],
    [0, 3],
    [1, 3],
    [2, 5],
    [5, 11],
    [6, 11],
  ])('uses the default or bounded value for X = %s', (value, attacks) => {
    Math.random = () => 0.99
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, [enabledKey]: true, [valueKey]: value })],
      [baseTarget({ models: 10, wounds: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(attacks)
  })

  it.each([
    ['1', 10],
    ['D3', 14],
  ])('adds the bonus to each weapon instance with attacks %s', (attacks, damage) => {
    Math.random = () => 0.99
    const result = simulateAttack(
      [baseWeapon({ attacks, modelsFiring: 2, torrent: true, [enabledKey]: true, [valueKey]: 2 })],
      [baseTarget({ models: 10, wounds: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(damage)
  })

  it('uses the initial target count after earlier weapons kill models', () => {
    Math.random = () => 0.99
    const weapon = baseWeapon({
      attacks: '1', torrent: true, [enabledKey]: true, [valueKey]: 2,
    })
    const result = simulateAttack(
      [weapon, weapon],
      [baseTarget({ models: 10, save: 7 })],
      1
    )

    expect(result.expectedKills).toBe(10)
  })

  it('does not apply a stored value while the buff is disabled', () => {
    Math.random = () => 0.99
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, [enabledKey]: false, [valueKey]: 5 })],
      [baseTarget({ models: 10, wounds: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(1)
  })
})

describe('simulateAttack — mutually exclusive Blast and Cleave', () => {
  it('uses only Blast when a legacy profile has both buffs enabled', () => {
    Math.random = () => 0.99
    const result = simulateAttack(
      [baseWeapon({
        attacks: '1',
        torrent: true,
        blast: true,
        blastValue: 2,
        cleaveEnabled: true,
        cleaveValue: 3,
      })],
      [baseTarget({ models: 10, wounds: 100, save: 7 })],
      1
    )

    expect(result.expectedDamage).toBe(5)
  })
})

describe('simulateAttack — +1 Wound', () => {
  it('S=15 vs T=1 with +1 Wound still wounds on 2+ (clamp floor, never 1+)', () => {
    // BS auto-hit. Wound base for S>=2T is 2+; +1 wound gives -1 to threshold,
    // but clampThreshold floors at 2. Plus nat 1 always fails. So per attack:
    // wound prob = 5/6 (only nat 1 fails). 4 attacks, 1 model, 1 wound.
    // Wipe prob = 1 - (1/6)^4 ≈ 0.9992
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true, strength: 15, plusOneWound: true })],
      [baseTarget({ models: 1, toughness: 1, save: 7 })],
      N
    )
    expect(r.wipeProbability).toBeGreaterThan(99.5)
    expect(r.wipeProbability).toBeLessThanOrEqual(100)
  })
})

describe('simulateAttack — ±1 modifier cap (11e rule)', () => {
  it('+1 to Hit and -1 to Hit cancel out (modifier arithmetic correctness)', () => {
    // Pre-condition for the cap rule: modifiers from both sides must net
    // properly. BS 3+, target has -1 to hit (worsens to 4+ → 3/6).
    // Adding +1 to hit cancels the debuff back to 3+ (4/6).
    // S4 vs T4 (4+ wound = 3/6 hits), sv 7+, 20 attacks, 1 dmg:
    //   debuff only:        20 * 3/6 * 3/6 = 5.0
    //   debuff + plusOne:   20 * 4/6 * 3/6 ≈ 6.67
    const debuffOnly = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 3, strength: 4 })],
      [baseTarget({ models: 100, save: 7, toughness: 4, minusOneToHit: true })],
      N
    )
    const debuffPlusBuff = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 3, strength: 4, plusOneHit: true })],
      [baseTarget({ models: 100, save: 7, toughness: 4, minusOneToHit: true })],
      N
    )
    expect(debuffOnly.expectedDamage).toBeGreaterThan(4)
    expect(debuffOnly.expectedDamage).toBeLessThan(6)
    expect(debuffPlusBuff.expectedDamage).toBeGreaterThan(5.5)
    expect(debuffPlusBuff.expectedDamage).toBeLessThan(8)
    // Sanity: adding the buff strictly improves expected damage.
    expect(debuffPlusBuff.expectedDamage).toBeGreaterThan(debuffOnly.expectedDamage)
  })

  it('wound modifiers cap at -1 (two -1-to-wound sources do not stack)', () => {
    // Target has BOTH minusOneToWound and minusOneToWoundIfStronger. With
    // S5 vs T4, both would apply (S>T triggers the conditional one too) for
    // a raw -2 wound mod, but the cap clamps it to -1.
    // S5 vs T4 base wound = 3+; with -1 mod → 4+ (3/6). If the cap were
    // broken and -2 applied → 5+ (2/6).
    // Auto-hit, sv7+, 20 attacks, 1 dmg.
    // Capped expected damage: 20 * 3/6 = 10. Uncapped would be ~6.67.
    const r = simulateAttack(
      [baseWeapon({ attacks: '20', torrent: true, strength: 5 })],
      [baseTarget({
        models: 100,
        save: 7,
        toughness: 4,
        minusOneToWound: true,
        minusOneToWoundIfStronger: true
      })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(8.5)
    expect(r.expectedDamage).toBeLessThan(11.5)
  })

  it('wound modifiers cap at +1 (+1 wound + already 2+ stays 2+, not 1+)', () => {
    // S=15 vs T=1 base wounds on 2+ already. +1 wound would push the
    // threshold to 1+ if uncapped, meaning every roll except nat 1 succeeds —
    // BUT clampThreshold floors at 2+ so the rate stays 5/6 (nat 1 always
    // fails). With +1 wound on a 2+, the only difference is that nat 1
    // continues to fail.
    // Auto-hit, sv 7+, 20 attacks → expected damage = 20 * 5/6 ≈ 16.67.
    const r = simulateAttack(
      [baseWeapon({ attacks: '20', torrent: true, strength: 15, plusOneWound: true })],
      [baseTarget({ models: 100, save: 7, toughness: 1 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(15)
    expect(r.expectedDamage).toBeLessThan(18)
  })
})

describe('simulateAttack — natural 1 always fails', () => {
  it('natural 1 fails the hit roll even with +1 to Hit on a 2+ weapon', () => {
    // BS 2+, +1 to Hit → modified threshold would be 1+ but clampThreshold
    // floors at 2+. Nat 1 still fails. So hit rate = 5/6.
    // Auto-wound via Anti-2+ (S any vs anything: crit/success on 2+).
    // Use S4 vs T4 (4+ wound) with anti 2+ — anti lowers wound threshold to 2.
    // So hit (5/6) * wound (5/6, nat 1 fails) = 25/36 per attack.
    // 36 attacks, sv 7+, 1 dmg → expected ≈ 25.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '36',
        toHit: 2,
        plusOneHit: true,
        strength: 4,
        antiEnabled: true,
        antiValue: 2
      })],
      [baseTarget({ models: 100, save: 7, toughness: 4 })],
      N
    )
    // Tight bound: 25 ± ~2.
    expect(r.expectedDamage).toBeGreaterThan(22)
    expect(r.expectedDamage).toBeLessThan(28)
  })

  it('natural 1 fails the wound roll even with +1 to Wound at 2+', () => {
    // S15 vs T1 = base 2+ wound. +1 wound + clamp = still 2+. Nat 1 fails.
    // Auto-hit, sv7+, 60 attacks → expected damage = 60 * 5/6 = 50.
    const r = simulateAttack(
      [baseWeapon({ attacks: '60', torrent: true, strength: 15, plusOneWound: true })],
      [baseTarget({ models: 100, save: 7, toughness: 1 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(46)
    expect(r.expectedDamage).toBeLessThan(54)
  })
})

describe('simulateAttack — Benefit of Cover (11e) & Ignores Cover', () => {
  it('worsens the attack\'s BS characteristic by 1 (−1 to hit)', () => {
    // 11e: cover no longer touches the save — it worsens the attacker's BS.
    // Non-torrent BS 3+, S5 vs T4 (wound 3+), save 7+ (no save), 1 dmg, so
    // damage scales with hit probability only.
    //   no cover:   hit on 3+ = 4/6
    //   with cover: hit on 4+ = 3/6  → ratio ≈ 0.75
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withCover = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    expect(withCover.expectedDamage).toBeLessThan(noCover.expectedDamage)
    const ratio = withCover.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.65)
    expect(ratio).toBeLessThan(0.85)
  })

  it('has no effect under Torrent (auto-hit)', () => {
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    const ratio = withCover.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })

  it('Ignores Cover negates Benefit of Cover', () => {
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withCoverIgnored = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5, ignoresCover: true })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    const ratio = withCoverIgnored.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })

  it('stacks with −1 to Hit (cover is a characteristic modifier, not capped)', () => {
    // BS 3+, S5 vs T4 (wound 3+), save 7+.
    //   cover only:        hit on 4+ = 3/6
    //   cover + −1 to hit: hit on 5+ = 2/6   (stacked to −2)
    // If they did NOT stack (capped at −1), both would be 3/6 (ratio ≈ 1).
    const coverOnly = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    const coverPlusMinus = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true, minusOneToHit: true })],
      N
    )
    expect(coverPlusMinus.expectedDamage).toBeLessThan(coverOnly.expectedDamage)
    const ratio = coverPlusMinus.expectedDamage / coverOnly.expectedDamage
    // 2/6 ÷ 3/6 ≈ 0.667; far below the ~1.0 you'd see if it were capped at −1.
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.8)
  })
})

describe('simulateAttack — −1 AP (defender buff)', () => {
  it('reduces the attacker\'s AP by 1, improving the save', () => {
    // Auto-hit, S5 vs T4 (wound 3+), AP 1, save 4+, 1 dmg.
    //   no buff: save 4+ worsened by AP 1 → 5+ (fails 4/6)
    //   -1 AP:   AP → 0, save stays 4+      (fails 3/6)  → ratio ≈ 0.75
    const noBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 1 })],
      [baseTarget({ models: 100, save: 4 })],
      N
    )
    const withBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 1 })],
      [baseTarget({ models: 100, save: 4, minusOneAp: true })],
      N
    )
    expect(withBuff.expectedDamage).toBeLessThan(noBuff.expectedDamage)
    const ratio = withBuff.expectedDamage / noBuff.expectedDamage
    expect(ratio).toBeGreaterThan(0.65)
    expect(ratio).toBeLessThan(0.85)
  })

  it('has no effect against AP 0 attacks', () => {
    const noBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 0 })],
      [baseTarget({ models: 100, save: 4 })],
      N
    )
    const withBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 0 })],
      [baseTarget({ models: 100, save: 4, minusOneAp: true })],
      N
    )
    const ratio = withBuff.expectedDamage / noBuff.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })
})

describe('simulateAttack — modelsFiring (weapon count)', () => {
  it('multiplies attack rolls (each weapon rolls separately)', () => {
    // 2 weapons each rolling D3 attacks → expected attacks = 2 * 2 = 4.
    // Auto-hit, S4 vs T4 (4+), Sv 7+ (no save). Expected damage = 4 * (3/6) = 2.0
    const r = simulateAttack(
      [baseWeapon({ attacks: 'D3', torrent: true, modelsFiring: 2, strength: 4 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(1.7)
    expect(r.expectedDamage).toBeLessThan(2.3)
  })
})

describe('simulateAttack — Critical Hit on x+ uses unmodified roll', () => {
  it('+1 to Hit does NOT lower the crit threshold', () => {
    // Set up: BS 4+, crit hit on 5+, lethal hits on. Without +1 hit:
    //   crit chance per attack = 2/6 (5,6) → all auto-wound via lethal.
    // With +1 to hit, hit threshold becomes 3+, so MORE hits happen, but the
    // CRIT chance must stay 2/6 because crits use unmodified D6.
    // Both setups: S4 vs T4 (4+), Sv 7+, 1 dmg.
    // Without +1 hit: hit prob 3/6 = 0.5; crit prob 2/6.
    //   non-crit hits = 0.5 - 2/6 = 1/6, those must wound (4+) = 1/6 * 3/6 = 1/12
    //   crits auto-wound = 2/6
    //   damage per attack = 2/6 + 1/12 = 5/12 ≈ 0.4167
    // With +1 hit: hit prob 4/6; crit still 2/6.
    //   non-crit hits = 4/6 - 2/6 = 2/6, wound 3/6 → 2/6 * 3/6 = 1/6
    //   crits auto-wound = 2/6
    //   damage per attack = 2/6 + 1/6 = 3/6 = 0.5
    // So +1 hit raises damage from ~0.417 to ~0.5 but the crit-driven
    // auto-wound contribution stays 2/6. We assert the damage delta is small
    // (~0.083 per attack) — if crits were boosted by +1, the gap would be larger.
    const without = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 4, critHitEnabled: true, critHit: 5, lethalHits: true })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withPlusOne = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 4, critHitEnabled: true, critHit: 5, lethalHits: true, plusOneHit: true })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    // Expected: ~0.417 vs ~0.5 per attack, so ~8.3 vs ~10 over 20 attacks.
    expect(without.expectedDamage).toBeGreaterThan(7.5)
    expect(without.expectedDamage).toBeLessThan(9.5)
    expect(withPlusOne.expectedDamage).toBeGreaterThan(9)
    expect(withPlusOne.expectedDamage).toBeLessThan(11)
  })
})

describe('simulateAttack — random damage (D-expressions)', () => {
  it('accepts D6 damage and roughly hits the average', () => {
    // Auto-hit, S4 vs T4 (4+), Sv 7+, damage D6 (avg 3.5), 4 attacks.
    // Expected damage = 4 * (3/6) * 3.5 = 7
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true, damage: 'D6' })],
      [baseTarget({ models: 100, save: 7, wounds: 100 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(6)
    expect(r.expectedDamage).toBeLessThan(8)
  })

  it('rejects an invalid attacks expression silently (no damage dealt)', () => {
    const r = simulateAttack(
      [baseWeapon({ attacks: 'nonsense', torrent: true })],
      [baseTarget()],
      200
    )
    expect(r.expectedDamage).toBe(0)
    expect(r.expectedKills).toBe(0)
  })
})

describe('simulateAttack — single-model wipe equals expected kills', () => {
  it('for a 1-model unit, wipeProbability% / 100 equals expectedKills', () => {
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true })],
      [baseTarget({ models: 1, save: 7 })],
      N
    )
    expect(Math.abs(r.expectedKills - r.wipeProbability / 100)).toBeLessThan(1e-9)
  })
})

describe('simulateAttack — Devastating Wounds (11e RAW)', () => {
  const dwWeapon = (overrides = {}) => baseWeapon({
    attacks: '1', torrent: true, devastatingWounds: true, ...overrides,
  })

  it.each([
    { dwFirst: true, kills: [1, 0], damage: 2 },
    { dwFirst: false, kills: [1, 1], damage: 3 },
  ])('resolves each card completely in display order (DW first: $dwFirst)', ({
    dwFirst, kills, damage,
  }) => {
    const random = mockD6Faces(6, 6)
    const devastating = dwWeapon({ damage: '2' })
    const normal = baseWeapon({ attacks: '1', torrent: true })
    const result = simulateAttack(
      dwFirst ? [devastating, normal] : [normal, devastating],
      [
        baseTarget({ models: 1, wounds: 1, save: 7 }),
        baseTarget({ models: 1, wounds: 2, save: 7 }),
      ],
      1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual(kills)
    expect(result.expectedDamage).toBe(damage)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('resolves the card normal damage before its mortals, then advances to the next card', () => {
    const random = mockD6Faces(6, 3, 4, 1, 4)
    const result = simulateAttack(
      [
        dwWeapon({ attacks: '2', damage: 'D6' }),
        baseWeapon({ attacks: '1', torrent: true }),
      ],
      [baseTarget({ models: 2, wounds: 2, save: 7 })],
      1
    )

    expect(result.expectedKills).toBe(1)
    expect(result.expectedDamage).toBe(3)
    expect(random).toHaveBeenCalledTimes(5)
  })

  it('discards remaining mortals and skips later cards after the target is wiped', () => {
    const random = mockD6Faces(6, 6)
    const result = simulateAttack(
      [dwWeapon({ attacks: '2' }), baseWeapon({ attacks: '1', torrent: true })],
      [baseTarget({ models: 1, save: 2, invulnSave: 2 })],
      1
    )

    expect(result.expectedKills).toBe(1)
    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('caps each critical at one model independently, including FNP and discarded excess', () => {
    const random = mockD6Faces(6, 6, 1, 1, 1, 1)
    const result = simulateAttack(
      [dwWeapon({ attacks: '2', damage: '3' })],
      [baseTarget({ models: 3, wounds: 2, save: 2, invulnSave: 2, fnp: 4 })],
      1
    )

    expect(result.expectedKills).toBe(2)
    expect(result.expectedDamage).toBe(4)
    expect(random).toHaveBeenCalledTimes(6)
  })

  it.each([
    { buff: 'halfDamage', modifiedDamage: 2 },
    { buff: 'minusOneDamage', modifiedDamage: 3 },
    { buff: 'damageOne', modifiedDamage: 1 },
  ])('applies $buff to D for both normal damage and DW conversion', ({ buff, modifiedDamage }) => {
    const target = baseTarget({ models: 1, wounds: 4, save: 7, [buff]: true })
    const mortalRandom = mockD6Faces(6)
    const devastating = simulateAttack([dwWeapon({ damage: '4' })], [target], 1)

    expect(devastating.expectedKills).toBe(0)
    expect(devastating.expectedDamage).toBe(modifiedDamage)
    expect(mortalRandom).toHaveBeenCalledTimes(1)

    const normalRandom = mockD6Faces(6)
    const normal = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, damage: '4' })], [target], 1
    )

    expect(normal.expectedKills).toBe(0)
    expect(normal.expectedDamage).toBe(modifiedDamage)
    expect(normalRandom).toHaveBeenCalledTimes(1)

    const mixedRandom = mockD6Faces(6, 4)
    const mixed = simulateAttack(
      [dwWeapon({ attacks: '2', damage: '4' })], [{ ...target, wounds: 8 }], 1
    )

    expect(mixed.expectedKills).toBe(0)
    expect(mixed.expectedDamage).toBe(2 * modifiedDamage)
    expect(mixedRandom).toHaveBeenCalledTimes(2)
  })

  it.each([
    { buff: 'halfDamage', modifiedDamage: 3 },
    { buff: 'minusOneDamage', modifiedDamage: 4 },
    { buff: 'damageOne', modifiedDamage: 1 },
  ])('combines unit-granted Damage increases with $buff before conversion', ({ buff, modifiedDamage }) => {
    const random = mockD6Faces(6)
    const result = simulateAttack(
      [dwWeapon({ damage: '4' })],
      [baseTarget({ models: 1, wounds: 6, save: 2, invulnSave: 2, [buff]: true })],
      1,
      { plusOneDamage: true }
    )

    expect(result.expectedKills).toBe(0)
    expect(result.expectedDamage).toBe(modifiedDamage)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('converts the rerolled, modified Damage into mortal wounds', () => {
    const random = mockD6Faces(6, 1, 6)
    const result = simulateAttack(
      [dwWeapon({ damage: 'D6', damageReroll: 'reroll-1-2-3', damageRerollScope: 'single' })],
      [baseTarget({ models: 2, wounds: 4, save: 2, invulnSave: 2, halfDamage: true })],
      1
    )

    expect(result.expectedKills).toBe(0)
    expect(result.expectedDamage).toBe(3)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it.each([
    { buff: 'halfDamage', damage: '5', mortals: 3 },
    { buff: 'minusOneDamage', damage: '4', mortals: 3 },
    { buff: 'damageOne', damage: '4', mortals: 1 },
    { buff: 'minusOneDamage', damage: '1', mortals: 1 },
  ])('converts D $damage with $buff once into exactly $mortals FNP rolls', ({
    buff, damage, mortals,
  }) => {
    const random = mockD6Faces(6, ...Array(mortals).fill(1))
    const result = simulateAttack(
      [dwWeapon({ damage })],
      [baseTarget({ models: 1, wounds: 10, save: 2, invulnSave: 2, fnp: 4, [buff]: true })],
      1
    )

    expect(result.expectedKills).toBe(0)
    expect(result.expectedDamage).toBe(mortals)
    expect(random).toHaveBeenCalledTimes(1 + mortals)
  })

  it('uses each current defender profile D modifiers for separate criticals', () => {
    const random = mockD6Faces(6, 6, 6)
    const result = simulateAttack(
      [dwWeapon({ attacks: '3', damage: '4' })],
      [
        baseTarget({ models: 1, wounds: 3, save: 2, minusOneDamage: true }),
        baseTarget({ models: 1, wounds: 3, save: 2, invulnSave: 2, damageOne: true }),
      ],
      1
    )

    expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([1, 0])
    expect(result.expectedDamage).toBe(5)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it.each([
    { fnp: 2, fnpMortal: 6, face: 3, ignored: true },
    { fnp: 6, fnpMortal: 2, face: 3, ignored: true },
    { fnp: 4, fnpMortal: 0, face: 4, ignored: true },
    { fnp: 0, fnpMortal: 4, face: 4, ignored: true },
    { fnp: 0, fnpMortal: 4, face: 3, ignored: false },
    { fnp: 4, fnpMortal: 4, face: 3, ignored: false },
    { fnp: 0, fnpMortal: 0, face: null, ignored: false },
  ])('uses one best eligible FNP for mortals: $fnp / $fnpMortal, roll $face', ({
    fnp, fnpMortal, face, ignored,
  }) => {
    const random = mockD6Faces(6, ...(face === null ? [] : [face]))
    const result = simulateAttack(
      [dwWeapon()],
      [baseTarget({ models: 1, save: 2, invulnSave: 2, fnp, fnpMortal })],
      1
    )

    expect(result.expectedKills).toBe(ignored ? 0 : 1)
    expect(random).toHaveBeenCalledTimes(face === null ? 1 : 2)
  })

  it.each([
    { fnp: 0, fnpMortal: 2, face: null, kills: 1 },
    { fnp: 2, fnpMortal: 6, face: 3, kills: 0 },
    { fnp: 6, fnpMortal: 2, face: 3, kills: 1 },
  ])('uses only general FNP for normal damage: $fnp / $fnpMortal', ({
    fnp, fnpMortal, face, kills,
  }) => {
    const random = mockD6Faces(6, ...(face === null ? [] : [face]))
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true })],
      [baseTarget({ models: 1, save: 7, fnp, fnpMortal })],
      1
    )

    expect(result.expectedKills).toBe(kills)
    expect(random).toHaveBeenCalledTimes(face === null ? 1 : 2)
  })

  it.each([{ blast: true }, { cleaveEnabled: true }])(
    'keeps the unit snapshot when earlier DW leave one of ten models: %j',
    (ability) => {
      const random = mockD6Faces(...Array(12).fill(6))
      const result = simulateAttack(
        [
          dwWeapon({ attacks: '9' }),
          baseWeapon({ attacks: '1', torrent: true, ...ability }),
        ],
        [
          baseTarget({ models: 9, save: 7 }),
          baseTarget({ models: 1, wounds: 10, save: 7 }),
        ],
        1
      )

      expect(result.perProfile.map((profile) => profile.expectedKills)).toEqual([9, 0])
      expect(result.expectedDamage).toBe(12)
      expect(random).toHaveBeenCalledTimes(12)
    }
  )

  it.each([1, 2, 3])('does not reset X = %i wound rerolls after a DW card', (count) => {
    const random = mockD6Faces(...Array.from({ length: count }, () => [2, 6]).flat(), 2)
    const result = simulateAttack(
      [
        dwWeapon({ attacks: count.toString() }),
        baseWeapon({ attacks: '1', torrent: true }),
      ],
      [baseTarget({ models: 10, save: 7 })],
      1,
      { rerollFailedWound: count }
    )

    expect(result.expectedKills).toBe(count)
    expect(result.expectedDamage).toBe(count)
    expect(random).toHaveBeenCalledTimes(2 * count + 1)
  })

  it('mortal wounds from a Devastating Wound do not spill across models', () => {
    // 100 attacks, torrent (auto-hit), Anti-Infantry 2+ → every wound roll of
    // 2-6 is a Critical Wound (only nat 1 fails ≈ 5/6 wound rate). DW on,
    // damage = 10. Target = 100 single-wound models, no save.
    //
    // With no-spill enforced: each successful crit kills exactly ONE model
    // (9 mortals are wasted). Expected kills ≈ 100 * 5/6 ≈ 83.3.
    // If spill were (incorrectly) allowed, each crit's 10 mortals would
    // wipe ~10 models, easily wiping the unit (≈100 kills).
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '10'
      })],
      [baseTarget({ models: 100, wounds: 1, save: 7 })],
      2000
    )
    expect(r.expectedKills).toBeGreaterThan(75)
    expect(r.expectedKills).toBeLessThan(92)
    // And expected damage tracks kills (since W=1, each kill is exactly 1
    // damage point). If spill leaked, expected damage would be ~10x kills.
    expect(r.expectedDamage / r.expectedKills).toBeLessThan(1.05)
  })

  it('mortal wounds from a Devastating Wound do not spill across multi-wound models', () => {
    // Single DW attack with damage = 5 vs 1-model unit with W=2.
    // Auto-hit, anti 2+ ⇒ ~5/6 wound chance, all wounds are crits ⇒ DW.
    // No-spill rule: at most 2 damage per attack (the model's W). Excess
    // 3 mortals are lost — they cannot bleed onto a different model… but
    // here the unit has only 1 model anyway, so the meaningful assertion
    // is that expected damage ≤ 2 (not 5).
    const r = simulateAttack(
      [baseWeapon({
        attacks: '1',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '5'
      })],
      [baseTarget({ models: 1, wounds: 2, save: 7 })],
      5000
    )
    // Per attack: 5/6 chance to wound and kill (capped at 2 dmg). So
    // expectedDamage ≈ 5/6 * 2 ≈ 1.667. Without the cap it would be
    // 5/6 * 5 ≈ 4.167.
    expect(r.expectedDamage).toBeGreaterThan(1.4)
    expect(r.expectedDamage).toBeLessThan(1.9)
  })

  it('matches the expected damage when a DW card resolves before the next normal card', () => {
    const dwWeapon = baseWeapon({
      attacks: '1',
      torrent: true,
      antiEnabled: true,
      antiValue: 2,
      devastatingWounds: true,
      damage: '2'
    })
    const normalWeapon = baseWeapon({
      attacks: '1',
      torrent: true,
      antiEnabled: true,
      antiValue: 2,
      devastatingWounds: false,
      damage: '1'
    })
    const r = simulateAttack(
      [dwWeapon, normalWeapon],
      [baseTarget({ models: 2, wounds: 2, save: 7 })],
      5000
    )
    expect(Math.abs(r.expectedDamage - 2.5)).toBeLessThan(0.1)
    expect(Math.abs(r.expectedKills - 5 / 6)).toBeLessThan(0.04)
  })

  it('Devastating Wounds use regular FNP when no FNP vs Mortal is present', () => {
    // 100 auto-hit DW attacks with damage 1 against 100 one-wound models.
    // Anti 2+ makes every successful wound a critical wound (5/6 rate), so
    // each successful wound becomes a single mortal wound. With only FNP 5+
    // set, each point is ignored on a 5+ (2/6), so kill expectation is:
    //   100 * 5/6 to wound * 4/6 through FNP = 55.6.
    // If regular FNP were ignored for mortal wounds, expectation would be
    // ~83.3 kills instead.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '1'
      })],
      [baseTarget({ models: 100, wounds: 1, save: 7, fnp: 5, fnpMortal: 0 })],
      N
    )

    expect(r.expectedKills).toBeGreaterThan(52)
    expect(r.expectedKills).toBeLessThan(59)
  })

  it.each([[2, 6], [6, 2]])(
    'chooses FNP 2+ from general %i+ and mortal-only %i+ in the kill expectation',
    (fnp, fnpMortal) => {
      const r = simulateAttack(
        [baseWeapon({
          attacks: '100',
          torrent: true,
          antiEnabled: true,
          antiValue: 2,
          devastatingWounds: true,
          damage: '1'
        })],
        [baseTarget({ models: 100, wounds: 1, save: 7, fnp, fnpMortal })],
        N
      )

      expect(Math.abs(r.expectedKills - 100 * (5 / 6) * (1 / 6))).toBeLessThan(1)
    }
  )
})

// ---- Reroll guarantees ----------------------------------------------------
//
// These tests lock in the contract that "reroll" rules only ever reroll dice
// that actually qualify. A successful hit/wound must NEVER be rerolled by
// `reroll-fail`, a critical hit/wound must NEVER be rerolled by ANY mode,
// and a random Attacks/Damage roll must only be rerolled when it came up
// at or below the threshold.

describe('simulateAttack — reroll never fires when not needed', () => {
  it('rerolls wound rolls of 1 and 2', () => {
    // Torrent auto-hits and S4 vs T4 wounds on 4+. Rerolling natural 1s and
    // 2s changes the wound chance from 3/6 to 3/6 + 2/6 * 3/6 = 2/3.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        woundReroll: 'reroll-one-two'
      })],
      [baseTarget({ models: 200, save: 7 })],
      5000
    )

    expect(r.expectedDamage).toBeGreaterThan(65)
    expect(r.expectedDamage).toBeLessThan(68.5)
  })

  it('reroll-fail never rerolls a successful hit (closed-form match)', () => {
    // BS 2+ means hits succeed on 2-6 (5/6). Native fail rate = 1/6 (nat 1).
    // With reroll-fail, the success rate becomes 5/6 + 1/6 * 5/6 = 35/36.
    // If the implementation also rerolled successes the rate would change
    // (e.g. dropping back toward 5/6 because second rolls would average lower
    // than the surviving original successes).
    // Pipeline: 36 attacks * 35/36 hit * auto-wound (S15 vs T1) * 5/6 wound
    //   (clamp floor) * sv7+ * 1 dmg = 36 * 35/36 * 5/6 ≈ 29.17
    const r = simulateAttack(
      [baseWeapon({
        attacks: '36',
        toHit: 2,
        hitReroll: 'reroll-fail',
        strength: 15
      })],
      [baseTarget({ models: 100, toughness: 1, save: 7 })],
      5000
    )
    expect(r.expectedDamage).toBeGreaterThan(28)
    expect(r.expectedDamage).toBeLessThan(30.5)
  })

  it('reroll-non-critical does NOT reroll critical hits', () => {
    // Set crit hit to 5+ (Lethal-style). With reroll-non-critical, every non-
    // crit roll (success OR fail) is rerolled, but crits are NEVER rerolled.
    // BS 3+, crit on 5+:
    //   crit faces        = {5,6} → 2/6
    //   non-crit success  = {3,4} → 2/6 (rerolled away!)
    //   fail              = {1,2} → 2/6
    // After the reroll-pool of 4/6 attempts (everything non-crit) is rolled
    // again with the same distribution:
    //   final crit       = 2/6 + 4/6 * 2/6 = 20/36
    //   final non-crit hit = 4/6 * 2/6 = 8/36
    //   final fail       = 4/6 * 2/6 = 8/36
    // Lethal Hits ON: crits auto-wound. Non-crit hits still roll wound (S4
    // vs T4 = 4+, i.e. 3/6). Damage 1, sv 7+.
    //   per-attack E[dmg] = 20/36 * 1 + 8/36 * 3/6 = 24/36 ≈ 0.667
    //   100 attacks      ≈ 66.7
    // If crits were ALSO rerolled, crit rate would drop and Lethal damage
    // would crater — the 60+ floor proves crits were preserved.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        toHit: 3,
        hitReroll: 'reroll-non-critical',
        critHitEnabled: true,
        critHit: 5,
        lethalHits: true,
        strength: 4 // wound roll skipped on crits via Lethal Hits
      })],
      [baseTarget({ models: 200, toughness: 4, save: 7 })],
      5000
    )
    expect(r.expectedDamage).toBeGreaterThan(63)
    expect(r.expectedDamage).toBeLessThan(70)
  })

  it('damage reroll is harmless when damage is a flat value', () => {
    // Flat damage "1" has no die to reroll — the reroll setting must be a
    // no-op regardless of threshold/scope.
    const baseline = simulateAttack(
      [baseWeapon({ attacks: '100', torrent: true, strength: 15, damage: '1' })],
      [baseTarget({ models: 200, toughness: 1, save: 7 })],
      5000
    )
    const withReroll = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        strength: 15,
        damage: '1',
        damageReroll: 'reroll-1-2-3',
        damageRerollScope: 'all'
      })],
      [baseTarget({ models: 200, toughness: 1, save: 7 })],
      5000
    )
    // Both should converge to the same expectation (5/6 wounds, 1 dmg each).
    expect(Math.abs(withReroll.expectedDamage - baseline.expectedDamage)).toBeLessThan(2)
  })

  it('damage reroll ≤3 strictly improves expected damage on a D6 weapon', () => {
    // D6 mean = 3.5. Rerolling all 1-3s lifts the mean to roughly:
    //   3/6 * 3.5 (kept high faces 4-6 average = 5)... actually:
    //   E = (4+5+6)/6 + (3/6)*3.5 = 15/6 + 1.75 = 2.5 + 1.75 = 4.25
    // For "all" scope on a single D6, ≈4.25 vs 3.5 baseline.
    // Auto-hit, S15 vs T1, sv7+, 50 attacks, D6 damage.
    const baseline = simulateAttack(
      [baseWeapon({ attacks: '50', torrent: true, strength: 15, damage: 'D6' })],
      [baseTarget({ models: 500, toughness: 1, save: 7, wounds: 100 })],
      5000
    )
    const buffed = simulateAttack(
      [baseWeapon({
        attacks: '50',
        torrent: true,
        strength: 15,
        damage: 'D6',
        damageReroll: 'reroll-1-2-3',
        damageRerollScope: 'all'
      })],
      [baseTarget({ models: 500, toughness: 1, save: 7, wounds: 100 })],
      5000
    )
    // baseline ≈ 50 * 5/6 * 3.5 ≈ 145.8
    // buffed   ≈ 50 * 5/6 * 4.25 ≈ 177.1
    expect(buffed.expectedDamage).toBeGreaterThan(baseline.expectedDamage + 15)
  })

  it('attack reroll with single scope rerolls at most one die per weapon', () => {
    // Compare single vs all on a 5x D6 attack pool. Single can only swap one
    // die per shooting; all swaps every qualifying die. So `all` mean MUST
    // exceed `single` mean meaningfully.
    // Each weapon firing (modelsFiring=1, attacks=2D6) per resolveWeapon call
    // gets ONE reroll under single scope across the whole pool.
    const single = simulateAttack(
      [baseWeapon({
        attacks: '5D6',
        torrent: true,
        strength: 15,
        damage: '1',
        attackReroll: 'reroll-1-2-3',
        attackRerollScope: 'single'
      })],
      [baseTarget({ models: 1000, toughness: 1, save: 7 })],
      4000
    )
    const all = simulateAttack(
      [baseWeapon({
        attacks: '5D6',
        torrent: true,
        strength: 15,
        damage: '1',
        attackReroll: 'reroll-1-2-3',
        attackRerollScope: 'all'
      })],
      [baseTarget({ models: 1000, toughness: 1, save: 7 })],
      4000
    )
    // Single-scope buff is small (only ONE die rerolled per pool); all-scope
    // buff is large (each qualifying die rerolled). The all-scope mean must
    // strictly exceed single by a meaningful margin.
    expect(all.expectedDamage).toBeGreaterThan(single.expectedDamage + 1)
  })
})

describe('simulateAttack — review regressions (2026-10-29)', () => {
  // One W10 model with no possible save: no saving dice are rolled.
  const soak = (overrides = {}) => baseTarget({ models: 1, wounds: 10, save: 7, ...overrides })

  it('does not apply +1 to Wound on top of the ANTI value', () => {
    // S4 vs T5 wounds on 5+. ANTI-4+ and +1 to Wound: a natural 3 becomes 4,
    // still short of 5+, and is not a critical wound.
    const weapon = baseWeapon({
      attacks: '1', torrent: true, strength: 4, antiEnabled: true, antiValue: 4, plusOneWound: true,
    })
    let random = mockD6Faces(3)
    expect(simulateAttack([weapon], [soak({ toughness: 5 })], 1).expectedDamage).toBe(0)
    expect(random).toHaveBeenCalledTimes(1)

    random = mockD6Faces(4)
    expect(simulateAttack([weapon], [soak({ toughness: 5 })], 1).expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('matches the RAW wound rate for ANTI with +1 to Wound', () => {
    const weapon = baseWeapon({
      attacks: '60', torrent: true, strength: 4, antiEnabled: true, antiValue: 4, plusOneWound: true,
    })
    const result = simulateAttack([weapon], [baseTarget({ models: 1, wounds: 1000, save: 7, toughness: 5 })], 500)
    // 60 x 3/6 = 30 wounds on average.
    expect(result.expectedDamage).toBeGreaterThan(29)
    expect(result.expectedDamage).toBeLessThan(31)
  })

  it('excludes damage ignored by Feel No Pain from damage dealt', () => {
    // Wound roll 6, then FNP 4+ rolls 5 (ignored), 1 (lost), 4 (ignored).
    const random = mockD6Faces(6, 5, 1, 4)
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, strength: 8, damage: '3' })],
      [soak({ fnp: 4 })],
      1
    )
    expect(result.expectedDamage).toBe(1)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('does not reroll a D3 Damage result of 3 with Reroll <=3', () => {
    // Wound roll 6, then the D3 damage die shows 3 (mock face 5 -> 0.75).
    const random = mockD6Faces(6, 5)
    const result = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, strength: 8, damage: 'D3', damageReroll: 'reroll-1-2-3' })],
      [soak()],
      1
    )
    expect(result.expectedDamage).toBe(3)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('shares a single-scope Damage reroll across the whole weapon card', () => {
    // Two wound rolls (6, 6), then damage 1 -> rerolled to 6, then 2 kept.
    const random = mockD6Faces(6, 6, 1, 6, 2)
    const result = simulateAttack(
      [baseWeapon({
        attacks: '2', torrent: true, strength: 8, damage: 'D6',
        damageReroll: 'reroll-1-2-3', damageRerollScope: 'single',
      })],
      [baseTarget({ models: 1, wounds: 100, save: 7 })],
      1
    )
    expect(result.expectedDamage).toBe(8)
    expect(random).toHaveBeenCalledTimes(5)
  })
})

