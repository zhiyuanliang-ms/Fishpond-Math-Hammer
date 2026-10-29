const KEY_WEAPON_SETS = 'attackSim:attackerProfiles'
const KEY_TARGET_SETS = 'attackSim:defenderProfiles'

// The 40K pages' language preference (owned by components/attackSim/lang.jsx).
const KEY_LANGUAGE = 'attackSim_lang'

const STORAGE_KEYS = [KEY_WEAPON_SETS, KEY_TARGET_SETS, KEY_LANGUAGE]

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

const readCollection = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {}
  } catch {
    return {}
  }
}

const listCollection = (key) =>
  Object.keys(readCollection(key)).sort((a, b) => a.localeCompare(b))

const saveInCollection = (key, name, data) => {
  const trimmed = (name || '').trim()
  if (!trimmed) return false
  return writeKey(key, { ...readCollection(key), [trimmed]: data })
}

const loadFromCollection = (key, name) => {
  const col = readCollection(key)
  return Object.hasOwn(col, name) ? col[name] : null
}

const deleteFromCollection = (key, name) => {
  const col = readCollection(key)
  if (!Object.hasOwn(col, name)) return false
  delete col[name]
  return writeKey(key, col)
}

const renameInCollection = (key, currentName, nextName) => {
  const trimmed = (nextName || '').trim()
  if (!trimmed) return false
  const collection = readCollection(key)
  if (!Object.hasOwn(collection, currentName)) return false
  const value = collection[currentName]
  delete collection[currentName]
  collection[trimmed] = value
  return writeKey(key, collection)
}

const mergeCollection = (key, imported) =>
  writeKey(key, { ...readCollection(key), ...imported })

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
export const renameNamedWeaponSet = (currentName, nextName) =>
  renameInCollection(KEY_WEAPON_SETS, currentName, nextName)
export const getSavedWeaponSetLibrary = () =>
  readCollection(KEY_WEAPON_SETS)
export const mergeSavedWeaponSetLibrary = (profiles) =>
  mergeCollection(KEY_WEAPON_SETS, profiles)

export const listSavedTargetSets = () => listCollection(KEY_TARGET_SETS)
export const saveNamedTargetSet = (name, payload) =>
  saveInCollection(KEY_TARGET_SETS, name, {
    targets: payload?.targets || [],
    defenderUnitBuffs: payload?.defenderUnitBuffs || null,
  })
export const loadNamedTargetSet = (name) =>
  loadFromCollection(KEY_TARGET_SETS, name)
export const deleteNamedTargetSet = (name) =>
  deleteFromCollection(KEY_TARGET_SETS, name)
export const renameNamedTargetSet = (currentName, nextName) =>
  renameInCollection(KEY_TARGET_SETS, currentName, nextName)
export const getSavedTargetSetLibrary = () =>
  readCollection(KEY_TARGET_SETS)
export const mergeSavedTargetSetLibrary = (profiles) =>
  mergeCollection(KEY_TARGET_SETS, profiles)

export const clearAllAttackSimStorage = () => {
  for (const key of STORAGE_KEYS) localStorage.removeItem(key)
}
