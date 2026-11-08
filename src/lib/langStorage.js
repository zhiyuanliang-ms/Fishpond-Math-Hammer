// The UI language choice ('en' | 'zh') persisted by the Attack Simulator's
// language switch. Shared so telemetry can tag events with it.

export const LANG_STORAGE_KEY = 'attackSim_lang'

export function readStoredLang() {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) === 'zh' ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}
