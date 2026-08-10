// Persistence helpers for the current Attack Simulator. Existing V2 key
// names remain unchanged so saved scenarios survive the removal of the
// retired simulator UI.

const KEY_CURRENT = 'attackSimV2:scenario:v1'
const KEY_LIBRARY = 'attackSimV2:library:v1'
const KEY_WEAPON_SETS = 'attackSimV2:weaponSets:v1'
const KEY_TARGET_SETS = 'attackSimV2:targetSets:v1'

export const ATTACK_SIM_STORAGE_KEYS = [
  KEY_CURRENT,
  KEY_LIBRARY,
  KEY_WEAPON_SETS,
  KEY_TARGET_SETS,
]

const RETIRED_STORAGE_KEYS = [
  'attackSim:scenario:v1',
  'attackSim:library:v1',
  'attackSim:weaponSets:v1',
  'attackSim:targetSets:v1',
  'attackSim:uiVersion',
]

export class StorageQuotaError extends Error {
  constructor(message = 'Browser storage quota exceeded.') {
    super(message)
    this.name = 'StorageQuotaError'
  }
}

const isQuotaError = (e) =>
  e && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  )

const writeKey = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    if (isQuotaError(e)) throw new StorageQuotaError()
    return false
  }
}

// ---- current scenario (auto-save) ------------------------------------------

export const loadScenario = () => {
  try {
    const raw = localStorage.getItem(KEY_CURRENT)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const saveScenario = (data) => {
  try {
    writeKey(KEY_CURRENT, data)
  } catch {
    /* auto-save errors are silent */
  }
}

// ---- generic named-collection helpers --------------------------------------

const readCollection = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeCollection = (key, value) => writeKey(key, value)

const listCollection = (key) =>
  Object.keys(readCollection(key)).sort((a, b) => a.localeCompare(b))

const saveInCollection = (key, name, data) => {
  const trimmed = (name || '').trim()
  if (!trimmed) return false
  const col = readCollection(key)
  col[trimmed] = data
  writeCollection(key, col)
  return true
}

const loadFromCollection = (key, name) => {
  const col = readCollection(key)
  return col[name] || null
}

const deleteFromCollection = (key, name) => {
  const col = readCollection(key)
  if (!(name in col)) return false
  delete col[name]
  writeCollection(key, col)
  return true
}

// ---- named scenario library ------------------------------------------------

export const listSavedScenarios = () => listCollection(KEY_LIBRARY)
export const saveNamedScenario = (name, data) =>
  saveInCollection(KEY_LIBRARY, name, data)
export const loadNamedScenario = (name) =>
  loadFromCollection(KEY_LIBRARY, name)
export const deleteNamedScenario = (name) =>
  deleteFromCollection(KEY_LIBRARY, name)

// ---- attacker profile sets (weapons + unit buffs as one unit) --------------

export const listSavedWeaponSets = () => listCollection(KEY_WEAPON_SETS)
export const saveNamedWeaponSet = (name, payload) =>
  saveInCollection(KEY_WEAPON_SETS, name, {
    weapons: payload?.weapons || [],
    unitBuffs: payload?.unitBuffs || null,
  })
export const loadNamedWeaponSet = (name) =>
  loadFromCollection(KEY_WEAPON_SETS, name)
export const deleteNamedWeaponSet = (name) =>
  deleteFromCollection(KEY_WEAPON_SETS, name)

// ---- defender profile sets -------------------------------------------------

export const listSavedTargetSets = () => listCollection(KEY_TARGET_SETS)
export const saveNamedTargetSet = (name, payload) =>
  saveInCollection(KEY_TARGET_SETS, name, {
    // Accept either a plain array (legacy v2 callers) or an object payload
    // that bundles the defender-side unit buffs alongside the target list.
    targets: Array.isArray(payload) ? payload : payload?.targets || [],
    defenderUnitBuffs: Array.isArray(payload)
      ? null
      : payload?.defenderUnitBuffs || null,
  })
export const loadNamedTargetSet = (name) =>
  loadFromCollection(KEY_TARGET_SETS, name)
export const deleteNamedTargetSet = (name) =>
  deleteFromCollection(KEY_TARGET_SETS, name)

export const clearAllAttackSimStorage = () => {
  for (const key of [...ATTACK_SIM_STORAGE_KEYS, ...RETIRED_STORAGE_KEYS]) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}
