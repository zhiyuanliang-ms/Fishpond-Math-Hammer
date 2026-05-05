// Tiny localStorage helpers for the Attack Simulator. Wrapped in try/catch
// so a disabled-storage browser (private mode quotas, etc.) doesn't crash
// the app — it just falls back to non-persistent behaviour.

const KEY_CURRENT = 'attackSim:scenario:v1'
const KEY_LIBRARY = 'attackSim:library:v1'

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
  try {
    localStorage.setItem(KEY_CURRENT, JSON.stringify(data))
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

const writeLibrary = (lib) => {
  try {
    localStorage.setItem(KEY_LIBRARY, JSON.stringify(lib))
  } catch {
    /* ignore */
  }
}

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
