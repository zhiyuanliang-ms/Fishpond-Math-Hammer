import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllAttackSimStorage,
  listSavedTargetSets,
  listSavedWeaponSets,
  loadNamedTargetSet,
  loadNamedWeaponSet,
  mergeSavedTargetSetLibrary,
  mergeSavedWeaponSetLibrary,
  renameNamedTargetSet,
  renameNamedWeaponSet,
  saveNamedTargetSet,
  saveNamedWeaponSet,
  StorageQuotaError,
} from '../attackSimStorage'

const weaponPayload = (strength) => ({
  weapons: [{ name: `Weapon ${strength}`, strength }],
  unitBuffs: null,
})

const targetPayload = (toughness) => ({
  targets: [{ name: `Target ${toughness}`, toughness }],
  defenderUnitBuffs: null,
})

const sides = [
  {
    name: 'attacker',
    save: saveNamedWeaponSet,
    list: listSavedWeaponSets,
    load: loadNamedWeaponSet,
    merge: mergeSavedWeaponSetLibrary,
    rename: renameNamedWeaponSet,
    payload: weaponPayload,
    importedValue: (profile) => profile.weapons[0].strength,
  },
  {
    name: 'defender',
    save: saveNamedTargetSet,
    list: listSavedTargetSets,
    load: loadNamedTargetSet,
    merge: mergeSavedTargetSetLibrary,
    rename: renameNamedTargetSet,
    payload: targetPayload,
    importedValue: (profile) => profile.targets[0].toughness,
  },
]

describe.each(sides)('$name Profile library imports', (side) => {
  let values

  beforeEach(() => {
    values = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      },
    })
  })

  afterEach(() => {
    delete globalThis.localStorage
  })

  it('adds one imported Profile without deleting ten existing Profiles', () => {
    for (let index = 1; index <= 10; index += 1) {
      expect(side.save(`Profile ${index}`, side.payload(index))).toBe(true)
    }

    expect(side.merge({ Imported: side.payload(11) })).toBe(true)

    expect(side.list()).toHaveLength(11)
    expect(side.load('Profile 1')).toEqual(side.payload(1))
    expect(side.load('Profile 10')).toEqual(side.payload(10))
    expect(side.load('Imported')).toEqual(side.payload(11))
  })

  it('overwrites only the imported same-name Profile', () => {
    for (let index = 1; index <= 10; index += 1) {
      side.save(`Profile ${index}`, side.payload(index))
    }

    expect(side.merge({ 'Profile 5': side.payload(50) })).toBe(true)

    expect(side.list()).toHaveLength(10)
    expect(side.importedValue(side.load('Profile 5'))).toBe(50)
    expect(side.load('Profile 4')).toEqual(side.payload(4))
    expect(side.load('Profile 6')).toEqual(side.payload(6))
  })

  it('updates an existing Profile by saving the same name without creating a duplicate', () => {
    side.save('Current', side.payload(4))
    side.save('Other', side.payload(5))

    expect(side.save('Current', side.payload(8))).toBe(true)
    expect(side.list()).toEqual(['Current', 'Other'])
    expect(side.load('Current')).toEqual(side.payload(8))
    expect(side.load('Other')).toEqual(side.payload(5))
  })

  it('renames one Profile without changing the rest of the library', () => {
    side.save('Original', side.payload(4))
    side.save('Unchanged', side.payload(5))

    expect(side.rename('Original', 'Renamed')).toBe(true)

    expect(side.list()).toEqual(['Renamed', 'Unchanged'])
    expect(side.load('Original')).toBeNull()
    expect(side.load('Renamed')).toEqual(side.payload(4))
    expect(side.load('Unchanged')).toEqual(side.payload(5))
  })

  it('reports unavailable storage without creating a saved Profile', () => {
    localStorage.setItem = () => {
      throw new DOMException('Storage disabled', 'SecurityError')
    }

    expect(side.save('Blocked', side.payload(4))).toBe(false)
    expect(side.list()).toEqual([])
  })

  it('reports a quota error without replacing an existing Profile', () => {
    side.save('Existing', side.payload(4))
    localStorage.setItem = () => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    }

    expect(() => side.save('Existing', side.payload(5))).toThrow(StorageQuotaError)
    expect(side.load('Existing')).toEqual(side.payload(4))
  })
})

describe('clearAllAttackSimStorage', () => {
  it('removes both Profile libraries and the language preference', () => {
    const removed = []
    vi.stubGlobal('localStorage', { removeItem: (key) => removed.push(key) })
    clearAllAttackSimStorage()
    expect(removed).toEqual([
      'attackSim:attackerProfiles',
      'attackSim:defenderProfiles',
      'attackSim_lang',
    ])
    vi.unstubAllGlobals()
  })
})
