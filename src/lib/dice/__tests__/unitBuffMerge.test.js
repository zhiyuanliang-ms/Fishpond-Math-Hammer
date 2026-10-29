import { describe, it, expect } from 'vitest'
import {
  makeUnitBuffs,
  isUnitBuffsEmpty,
  mergeWeaponWithUnit,
  describeUpgrades,
  makeTargetUnitBuffs,
  isTargetUnitBuffsEmpty,
  mergeTargetWithUnit,
  describeTargetUpgrades,
} from '../unitBuffMerge'

const weapon = (overrides = {}) => ({
  attacks: '4',
  toHit: 3,
  strength: 4,
  ap: 1,
  damage: '1',
  modelsFiring: 1,
  hitReroll: 'no-reroll',
  hitRerollScope: 'all',
  woundReroll: 'no-reroll',
  woundRerollScope: 'all',
  attackReroll: 'no-reroll',
  damageReroll: 'no-reroll',
  critHitEnabled: false,
  critHit: 5,
  critWound: 6,
  torrent: false,
  lethalHits: false,
  sustainedHits: 'off',
  devastatingWounds: false,
  plusOneWound: false,
  blast: false,
  plusOneHit: false,
  ignoresCover: false,
  antiEnabled: false,
  antiValue: 4,
  ...overrides,
})

describe('limited failed reroll counts', () => {
  it.each([0, 1, 2, 3])('preserves X = %i and treats zero as disabled', (count) => {
    const buffs = makeUnitBuffs({ rerollFailedHit: count, rerollFailedWound: count })

    expect(buffs).toMatchObject({ rerollFailedHit: count, rerollFailedWound: count })
    expect(isUnitBuffsEmpty(buffs)).toBe(count === 0)
    expect(mergeWeaponWithUnit(weapon(), buffs)).not.toHaveProperty('rerollFailedHit')
    expect(mergeWeaponWithUnit(weapon(), buffs)).not.toHaveProperty('rerollFailedWound')
    expect(describeUpgrades(weapon(), buffs)).toEqual({})
  })

  it('migrates old flags without retaining them or overriding explicit new counts', () => {
    const legacy = Object.freeze({ rerollOneFailedHit: true, rerollOneFailedWound: true })
    const buffs = makeUnitBuffs(legacy)

    expect(buffs).toMatchObject({ rerollFailedHit: 1, rerollFailedWound: 1 })
    expect(buffs).not.toHaveProperty('rerollOneFailedHit')
    expect(buffs).not.toHaveProperty('rerollOneFailedWound')
    expect(makeUnitBuffs({ ...legacy, rerollFailedHit: 0, rerollFailedWound: 3 }))
      .toMatchObject({ rerollFailedHit: 0, rerollFailedWound: 3 })
    expect(legacy.rerollOneFailedHit).toBe(true)
  })

  it.each([-1, 4, 1.5, '2', true, Infinity, NaN])('rejects invalid X = %s', (count) => {
    for (const key of ['rerollFailedHit', 'rerollFailedWound']) {
      expect(() => makeUnitBuffs({ [key]: count })).toThrow('integer between 0 and 3')
    }
  })
})

describe('isUnitBuffsEmpty', () => {
  it('treats null/undefined as empty', () => {
    expect(isUnitBuffsEmpty(null)).toBe(true)
    expect(isUnitBuffsEmpty(undefined)).toBe(true)
  })

  it('default makeUnitBuffs is empty', () => {
    expect(isUnitBuffsEmpty(makeUnitBuffs())).toBe(true)
  })

  it('any enabled buff is non-empty', () => {
    expect(isUnitBuffsEmpty(makeUnitBuffs({ plusOneAttack: true }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ plusOneDamage: true }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ plusOneAp: true }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ lethalHits: true }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ hitReroll: 'reroll-one' }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ rerollOneFailedHit: true }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ rerollOneFailedWound: true }))).toBe(false)
    expect(isUnitBuffsEmpty(makeUnitBuffs({ sustainedHits: '1' }))).toBe(false)
  })
})

describe('mergeWeaponWithUnit', () => {
  it('keeps shared single failed rerolls out of weapon profiles and upgrade chips', () => {
    const unit = makeUnitBuffs({ rerollOneFailedHit: true, rerollOneFailedWound: true })
    const profile = weapon()
    const merged = mergeWeaponWithUnit(profile, unit)

    expect(merged).toEqual(profile)
    expect(merged).not.toHaveProperty('rerollOneFailedHit')
    expect(merged).not.toHaveProperty('rerollOneFailedWound')
    expect(describeUpgrades(profile, unit)).toEqual({})
  })

  it('returns weapon unchanged when unit buffs are empty', () => {
    const w = weapon({ lethalHits: true })
    expect(mergeWeaponWithUnit(w, makeUnitBuffs())).toBe(w)
  })

  it('adds one attack to fixed and random Attacks characteristics', () => {
    const unit = makeUnitBuffs({ plusOneAttack: true })

    expect(mergeWeaponWithUnit(weapon({ attacks: '4' }), unit).attacks).toBe('5')
    expect(mergeWeaponWithUnit(weapon({ attacks: 'D6+1' }), unit).attacks).toBe('D6+2')
    expect(mergeWeaponWithUnit(weapon({ attacks: '2D6-1' }), unit).attacks).toBe('2D6')
  })

  it('adds one damage to fixed and random Damage characteristics', () => {
    const unit = makeUnitBuffs({ plusOneDamage: true })

    expect(mergeWeaponWithUnit(weapon({ damage: '2' }), unit).damage).toBe('3')
    expect(mergeWeaponWithUnit(weapon({ damage: 'D3+1' }), unit).damage).toBe('D3+2')
    expect(mergeWeaponWithUnit(weapon({ damage: '2D6-1' }), unit).damage).toBe('2D6')
  })

  it('adds one to the AP characteristic', () => {
    const unit = makeUnitBuffs({ plusOneAp: true })

    expect(mergeWeaponWithUnit(weapon({ ap: 0 }), unit).ap).toBe(1)
    expect(mergeWeaponWithUnit(weapon({ ap: 2 }), unit).ap).toBe(3)
  })

  it('OR-merges boolean buffs', () => {
    const w = weapon()
    const u = makeUnitBuffs({
      lethalHits: true,
      devastatingWounds: true,
      ignoresCover: true,
      plusOneHit: true,
      plusOneWound: true,
    })
    const m = mergeWeaponWithUnit(w, u)
    expect(m.lethalHits).toBe(true)
    expect(m.devastatingWounds).toBe(true)
    expect(m.ignoresCover).toBe(true)
    expect(m.plusOneHit).toBe(true)
    expect(m.plusOneWound).toBe(true)
  })

  it('does not duplicate booleans already set on the weapon', () => {
    const w = weapon({ lethalHits: true })
    const u = makeUnitBuffs({ lethalHits: true })
    const m = mergeWeaponWithUnit(w, u)
    expect(m.lethalHits).toBe(true)
  })

  it('upgrades a dominated weapon reroll to a broader unit reroll', () => {
    // Re-roll Failed covers every die Re-roll Ones would touch.
    const upgraded = mergeWeaponWithUnit(
      weapon({ hitReroll: 'reroll-one', hitRerollScope: 'single' }),
      makeUnitBuffs({ hitReroll: 'reroll-fail' })
    )
    expect(upgraded.hitReroll).toBe('reroll-fail')
    expect(upgraded.hitRerollScope).toBe('all')
    expect(describeUpgrades(
      weapon({ hitReroll: 'reroll-one' }),
      makeUnitBuffs({ hitReroll: 'reroll-fail' })
    ).hitReroll).toBe(true)

    expect(
      mergeWeaponWithUnit(
        weapon({ woundReroll: 'reroll-one-two' }),
        makeUnitBuffs({ woundReroll: 'reroll-non-critical' })
      ).woundReroll
    ).toBe('reroll-non-critical')

    expect(
      mergeWeaponWithUnit(
        weapon({ hitReroll: 'reroll-fail' }),
        makeUnitBuffs({ hitReroll: 'reroll-one' })
      ).hitReroll
    ).toBe('reroll-fail')
  })

  it('keeps the weapon choice between failed and non-critical rerolls (strategy-aware)', () => {
    expect(
      mergeWeaponWithUnit(
        weapon({ hitReroll: 'reroll-non-critical' }),
        makeUnitBuffs({ hitReroll: 'reroll-fail' })
      ).hitReroll
    ).toBe('reroll-non-critical')

    expect(
      mergeWeaponWithUnit(
        weapon({ woundReroll: 'reroll-fail' }),
        makeUnitBuffs({ woundReroll: 'reroll-non-critical' })
      ).woundReroll
    ).toBe('reroll-fail')
  })

  it('adopts the unit hit reroll when the weapon has none', () => {
    expect(
      mergeWeaponWithUnit(
        weapon({ hitReroll: 'no-reroll' }),
        makeUnitBuffs({ hitReroll: 'reroll-fail' })
      ).hitReroll
    ).toBe('reroll-fail')
  })

  it('skips hit reroll promotion when weapon has Torrent', () => {
    const m = mergeWeaponWithUnit(
      weapon({ torrent: true, hitReroll: 'no-reroll' }),
      makeUnitBuffs({ hitReroll: 'reroll-fail' })
    )
    expect(m.hitReroll).toBe('no-reroll')
  })

  it('picks the stronger sustained hits value', () => {
    expect(
      mergeWeaponWithUnit(
        weapon({ sustainedHits: '1' }),
        makeUnitBuffs({ sustainedHits: '2' })
      ).sustainedHits
    ).toBe('2')

    expect(
      mergeWeaponWithUnit(
        weapon({ sustainedHits: '3' }),
        makeUnitBuffs({ sustainedHits: 'D3' })
      ).sustainedHits
    ).toBe('3')

    expect(
      mergeWeaponWithUnit(
        weapon({ sustainedHits: '2' }),
        makeUnitBuffs({ sustainedHits: 'D6' })
      ).sustainedHits
    ).toBe('D6')
  })

  it('promotes crit threshold by taking the lower (better) number', () => {
    const m = mergeWeaponWithUnit(
      weapon({ critHitEnabled: true, critHit: 6 }),
      makeUnitBuffs({ critHitEnabled: true, critHit: 5 })
    )
    expect(m.critHitEnabled).toBe(true)
    expect(m.critHit).toBe(5)
  })

  it('enables crit threshold from unit when weapon has none', () => {
    const m = mergeWeaponWithUnit(
      weapon({ critHitEnabled: false, critHit: 6 }),
      makeUnitBuffs({ critHitEnabled: true, critHit: 5 })
    )
    expect(m.critHitEnabled).toBe(true)
    expect(m.critHit).toBe(5)
  })

  it('resets reroll scope to all when unit promotes the reroll', () => {
    const m = mergeWeaponWithUnit(
      weapon({ woundReroll: 'no-reroll', woundRerollScope: 'single' }),
      makeUnitBuffs({ woundReroll: 'reroll-fail' })
    )
    expect(m.woundReroll).toBe('reroll-fail')
    expect(m.woundRerollScope).toBe('all')
  })

  it('preserves the weapon reroll scope when no promotion happens', () => {
    const w = weapon({ woundReroll: 'reroll-fail', woundRerollScope: 'single' })
    const m = mergeWeaponWithUnit(w, makeUnitBuffs({ woundReroll: 'reroll-one' }))
    expect(m.woundReroll).toBe('reroll-fail')
    expect(m.woundRerollScope).toBe('single')
  })
})

describe('describeUpgrades', () => {
  it('reports nothing when unit buffs are empty', () => {
    expect(describeUpgrades(weapon(), makeUnitBuffs())).toEqual({})
  })

  it('flags freshly-added boolean buffs', () => {
    const up = describeUpgrades(
      weapon(),
      makeUnitBuffs({ lethalHits: true, plusOneHit: true })
    )
    expect(up.lethalHits).toBe(true)
    expect(up.plusOneHit).toBe(true)
  })

  it('flags AP upgraded by the unit buff', () => {
    const up = describeUpgrades(weapon({ ap: 1 }), makeUnitBuffs({ plusOneAp: true }))

    expect(up.plusOneAp).toBe(true)
  })

  it('does not flag a boolean buff the weapon already has', () => {
    const up = describeUpgrades(
      weapon({ lethalHits: true }),
      makeUnitBuffs({ lethalHits: true })
    )
    expect(up.lethalHits).toBeUndefined()
  })

  it('flags upgraded sustained hits', () => {
    const up = describeUpgrades(
      weapon({ sustainedHits: '1' }),
      makeUnitBuffs({ sustainedHits: '2' })
    )
    expect(up.sustainedHits).toBe(true)
  })

  it('flags crit threshold lowered by unit', () => {
    const up = describeUpgrades(
      weapon({ critHitEnabled: true, critHit: 6 }),
      makeUnitBuffs({ critHitEnabled: true, critHit: 5 })
    )
    expect(up.critHit).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Defender side
// ---------------------------------------------------------------------------

const target = (overrides = {}) => ({
  models: 5,
  toughness: 4,
  wounds: 2,
  save: 3,
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
  ...overrides,
})

describe('isTargetUnitBuffsEmpty', () => {
  it('is empty by default', () => {
    expect(isTargetUnitBuffsEmpty(makeTargetUnitBuffs())).toBe(true)
  })

  it('detects any active boolean', () => {
    expect(isTargetUnitBuffsEmpty(makeTargetUnitBuffs({ benefitOfCover: true }))).toBe(false)
    expect(isTargetUnitBuffsEmpty(makeTargetUnitBuffs({ minusOneToHit: true }))).toBe(false)
    expect(isTargetUnitBuffsEmpty(makeTargetUnitBuffs({ damageOne: true }))).toBe(false)
  })

  it('ignores obsolete defensive fields in old profiles', () => {
    const legacyBuffs = { rerollSaveOnes: true }
    expect(isTargetUnitBuffsEmpty(legacyBuffs)).toBe(true)
    expect(mergeTargetWithUnit(target(), legacyBuffs)).toEqual(target())
    expect(describeTargetUpgrades(target(), legacyBuffs)).toEqual({})
  })
})

describe('mergeTargetWithUnit', () => {
  it('returns target unchanged when unit buffs are empty', () => {
    const t = target({ benefitOfCover: true })
    expect(mergeTargetWithUnit(t, makeTargetUnitBuffs())).toEqual(t)
  })

  it('ORs simple booleans', () => {
    const merged = mergeTargetWithUnit(
      target(),
      makeTargetUnitBuffs({
        minusOneToHit: true,
        benefitOfCover: true,
        minusOneAp: true,
      })
    )
    expect(merged.minusOneToHit).toBe(true)
    expect(merged.benefitOfCover).toBe(true)
    expect(merged.minusOneAp).toBe(true)
  })

  it('plain -1 to wound dominates the conditional variant', () => {
    const merged = mergeTargetWithUnit(
      target({ minusOneToWoundIfStronger: true }),
      makeTargetUnitBuffs({ minusOneToWound: true })
    )
    expect(merged.minusOneToWound).toBe(true)
    expect(merged.minusOneToWoundIfStronger).toBe(false)
  })

  it('keeps conditional -1 wound when nothing else is plain', () => {
    const merged = mergeTargetWithUnit(
      target(),
      makeTargetUnitBuffs({ minusOneToWoundIfStronger: true })
    )
    expect(merged.minusOneToWoundIfStronger).toBe(true)
    expect(merged.minusOneToWound).toBe(false)
  })

  it('damage reduction: target halfDamage beats unit minusOneDamage', () => {
    const merged = mergeTargetWithUnit(
      target({ halfDamage: true }),
      makeTargetUnitBuffs({ minusOneDamage: true })
    )
    expect(merged.halfDamage).toBe(true)
    expect(merged.minusOneDamage).toBe(false)
    expect(merged.damageOne).toBe(false)
  })

  it('damage reduction: unit damageOne beats target halfDamage', () => {
    const merged = mergeTargetWithUnit(
      target({ halfDamage: true }),
      makeTargetUnitBuffs({ damageOne: true })
    )
    expect(merged.damageOne).toBe(true)
    expect(merged.halfDamage).toBe(false)
    expect(merged.minusOneDamage).toBe(false)
  })

  it('damage reduction: only one mode active in merged result', () => {
    const merged = mergeTargetWithUnit(
      target({ minusOneDamage: true }),
      makeTargetUnitBuffs({ halfDamage: true })
    )
    expect(merged.halfDamage).toBe(true)
    expect(merged.minusOneDamage).toBe(false)
  })

  it('never mutates inputs', () => {
    const t = target()
    const u = makeTargetUnitBuffs({ benefitOfCover: true })
    const snapT = { ...t }
    const snapU = { ...u }
    mergeTargetWithUnit(t, u)
    expect(t).toEqual(snapT)
    expect(u).toEqual(snapU)
  })

  it('returns target unchanged if target is null/undefined', () => {
    expect(mergeTargetWithUnit(null, makeTargetUnitBuffs({ benefitOfCover: true }))).toBe(null)
  })
})

describe('describeTargetUpgrades', () => {
  it('returns empty object when unit buffs are empty', () => {
    expect(describeTargetUpgrades(target(), makeTargetUnitBuffs())).toEqual({})
  })

  it('flags newly added booleans', () => {
    const up = describeTargetUpgrades(
      target(),
      makeTargetUnitBuffs({ minusOneToHit: true, benefitOfCover: true })
    )
    expect(up.minusOneToHit).toBe(true)
    expect(up.benefitOfCover).toBe(true)
  })

  it('does not flag buffs already present on the target', () => {
    const up = describeTargetUpgrades(
      target({ benefitOfCover: true }),
      makeTargetUnitBuffs({ benefitOfCover: true })
    )
    expect(up.benefitOfCover).toBeUndefined()
  })

  it('flags a stronger damage reduction granted by unit', () => {
    const up = describeTargetUpgrades(
      target({ minusOneDamage: true }),
      makeTargetUnitBuffs({ damageOne: true })
    )
    expect(up.damageOne).toBe(true)
  })

  it('does not flag a weaker damage reduction', () => {
    const up = describeTargetUpgrades(
      target({ halfDamage: true }),
      makeTargetUnitBuffs({ minusOneDamage: true })
    )
    expect(up.minusOneDamage).toBeUndefined()
    expect(up.halfDamage).toBeUndefined()
  })

  it('flags promotion from conditional -1 wound to plain', () => {
    const up = describeTargetUpgrades(
      target({ minusOneToWoundIfStronger: true }),
      makeTargetUnitBuffs({ minusOneToWound: true })
    )
    expect(up.minusOneToWound).toBe(true)
  })
})
