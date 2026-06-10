// Tiny localStorage helpers for the Attack Simulator. Wrapped in try/catch
// so a disabled-storage browser (private mode quotas, etc.) doesn't crash
// the app — it just falls back to non-persistent behaviour.
//
// Quota: see knowledges/02-architecture.md for the sizing analysis. The
// data we store is small (single scenario ≈ 1–10 KB JSON), so the 5 MB
// per-origin localStorage budget realistically holds hundreds-to-thousands
// of saved scenarios. The only failure mode worth surfacing is
// `QuotaExceededError`, which we re-throw as a `StorageQuotaError` so the
// explicit "Save As…" handlers can show a toast.

const KEY_CURRENT = 'attackSim:scenario:v1'
const KEY_LIBRARY = 'attackSim:library:v1'
const KEY_WEAPON_SETS = 'attackSim:weaponSets:v1'
const KEY_TARGET_SETS = 'attackSim:targetSets:v1'

// All keys owned by the Attack Simulator. Exported so the UI can offer a
// single "clear local storage" action without hard-coding the list twice.
export const ATTACK_SIM_STORAGE_KEYS = [
  KEY_CURRENT,
  KEY_LIBRARY,
  KEY_WEAPON_SETS,
  KEY_TARGET_SETS
]

export class StorageQuotaError extends Error {
  constructor(message = 'Browser storage quota exceeded.') {
    super(message)
    this.name = 'StorageQuotaError'
  }
}

// QuotaExceededError detection across browsers. Modern browsers throw a
// DOMException with name 'QuotaExceededError'; older Firefox uses code 1014.
const isQuotaError = (e) =>
  e && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  )

// Centralized write. Returns true on success. Re-throws StorageQuotaError
// on quota failures so callers can surface a user-facing message; silently
// returns false on every other failure (storage disabled, etc.).
const writeKey = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    if (isQuotaError(e)) throw new StorageQuotaError()
    return false
  }
}

// ---- "current scenario" auto-save ------------------------------------------

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
  // Auto-save: ignore everything, including quota errors. Quota errors on
  // the auto-save are unlikely to happen before the user hits one on a
  // "Save As…" / "Save attacker set…" action, where we *do* surface them.
  try {
    writeKey(KEY_CURRENT, data)
  } catch {
    /* ignore */
  }
}

export const clearScenario = () => {
  try {
    localStorage.removeItem(KEY_CURRENT)
  } catch {
    /* ignore */
  }
}

// ---- named scenario library ------------------------------------------------
// Stored as a single JSON object: { [name]: scenarioData }

const readLibrary = () => {
  try {
    const raw = localStorage.getItem(KEY_LIBRARY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

// Re-throws StorageQuotaError on quota failure (caller surfaces a toast).
const writeLibrary = (lib) => writeKey(KEY_LIBRARY, lib)

export const listSavedScenarios = () => {
  const lib = readLibrary()
  return Object.keys(lib).sort((a, b) => a.localeCompare(b))
}

export const saveNamedScenario = (name, data) => {
  const trimmed = (name || '').trim()
  if (!trimmed) return false
  const lib = readLibrary()
  lib[trimmed] = data
  writeLibrary(lib)
  return true
}

export const loadNamedScenario = (name) => {
  const lib = readLibrary()
  return lib[name] || null
}

export const deleteNamedScenario = (name) => {
  const lib = readLibrary()
  if (!(name in lib)) return false
  delete lib[name]
  writeLibrary(lib)
  return true
}

// ---- generic named-collection helpers --------------------------------------
// Used for the weapon-set and target-set libraries. Each library is stored
// as a single JSON object keyed by the user-supplied name.

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

// Re-throws StorageQuotaError on quota failure (caller surfaces a toast).
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

// ---- weapon-set library (named attacker profile sets) ----------------------
// Saved attacker profiles bundle both the weapon list and the unit-wide
// buffs (passed in as a single { weapons, unitBuffs } object so older
// callers that only pass weapons still work).

export const listSavedWeaponSets = () => listCollection(KEY_WEAPON_SETS)
export const saveNamedWeaponSet = (name, payload) => {
  // Tolerate the legacy "raw array" call shape just in case any caller
  // still passes a plain weapons array.
  const data = Array.isArray(payload)
    ? { weapons: payload }
    : { weapons: payload?.weapons, unitBuffs: payload?.unitBuffs }
  return saveInCollection(KEY_WEAPON_SETS, name, data)
}
export const loadNamedWeaponSet = (name) =>
  loadFromCollection(KEY_WEAPON_SETS, name)
export const deleteNamedWeaponSet = (name) =>
  deleteFromCollection(KEY_WEAPON_SETS, name)

// ---- target-set library (named defender profile sets) ----------------------

export const listSavedTargetSets = () => listCollection(KEY_TARGET_SETS)
export const saveNamedTargetSet = (name, targets) =>
  saveInCollection(KEY_TARGET_SETS, name, { targets })
export const loadNamedTargetSet = (name) =>
  loadFromCollection(KEY_TARGET_SETS, name)
export const deleteNamedTargetSet = (name) =>
  deleteFromCollection(KEY_TARGET_SETS, name)

// ---- nuke everything -------------------------------------------------------

export const clearAllAttackSimStorage = () => {
  for (const key of ATTACK_SIM_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}
