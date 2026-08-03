// Opt-in for the deprecated 10e Macro Battleplan board. Toggled from the
// About page and read by MacroBattleplan when it mounts.

const STORAGE_KEY = 'macroBattleplan:legacy10e'

export const isLegacy10eEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export const setLegacy10eEnabled = (enabled) => {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
