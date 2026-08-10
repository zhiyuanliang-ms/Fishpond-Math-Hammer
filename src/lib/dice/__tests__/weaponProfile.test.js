import { describe, expect, it } from 'vitest'
import { normalizeWeaponProfileRerolls } from '../weaponProfile'

const weapon = (overrides = {}) => ({
  attacks: 'D6+2',
  attackReroll: 'reroll-1-2-3',
  attackRerollScope: 'single',
  damage: 'D6+2',
  damageReroll: 'reroll-1-2-3',
  damageRerollScope: 'single',
  torrent: false,
  hitReroll: 'reroll-fail',
  hitRerollScope: 'single',
  ...overrides,
})

describe('normalizeWeaponProfileRerolls', () => {
  it('removes the attack reroll when attacks are fixed', () => {
    const original = weapon({ attacks: '4' })
    const normalized = normalizeWeaponProfileRerolls(original)

    expect(normalized).not.toBe(original)
    expect(normalized.attackReroll).toBe('no-reroll')
    expect(normalized.attackRerollScope).toBe('all')
    expect(original.attackReroll).toBe('reroll-1-2-3')
  })

  it('keeps the attack reroll for random or temporarily invalid attacks', () => {
    const random = weapon()
    const invalid = weapon({ attacks: '' })

    expect(normalizeWeaponProfileRerolls(random)).toBe(random)
    expect(normalizeWeaponProfileRerolls(invalid)).toBe(invalid)
  })

  it('removes the damage reroll when damage is fixed', () => {
    const original = weapon({ damage: '2' })
    const normalized = normalizeWeaponProfileRerolls(original)

    expect(normalized).not.toBe(original)
    expect(normalized.damageReroll).toBe('no-reroll')
    expect(normalized.damageRerollScope).toBe('all')
    expect(original.damageReroll).toBe('reroll-1-2-3')
  })

  it('keeps the damage reroll for random or temporarily invalid damage', () => {
    const random = weapon()
    const invalid = weapon({ damage: '' })

    expect(normalizeWeaponProfileRerolls(random)).toBe(random)
    expect(normalizeWeaponProfileRerolls(invalid)).toBe(invalid)
  })

  it('removes only the profile hit reroll when the weapon has Torrent', () => {
    const original = weapon({ torrent: true })
    const normalized = normalizeWeaponProfileRerolls(original)

    expect(normalized.hitReroll).toBe('no-reroll')
    expect(normalized.hitRerollScope).toBe('all')
    expect(normalized.damageReroll).toBe(original.damageReroll)
    expect(normalized.damageRerollScope).toBe(original.damageRerollScope)
  })
})