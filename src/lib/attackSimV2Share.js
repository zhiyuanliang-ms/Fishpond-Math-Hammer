// Share-code helpers for the Attack Simulator. The existing `s2` query
// parameter remains stable so previously shared links continue to load.

const SHARE_SCHEMA = 1
export const SHARE_QUERY_PARAM = 's2'

const stripId = (entry = {}) => {
  const next = { ...entry }
  delete next.id
  return next
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeScenarioCode({ weapons, targets, highPrecision, unitBuffs, defenderUnitBuffs }) {
  if (!Array.isArray(weapons) || !Array.isArray(targets)) return null
  const payload = {
    s: SHARE_SCHEMA,
    w: weapons.map(stripId),
    t: targets.map(stripId),
    hp: !!highPrecision,
  }
  if (unitBuffs && typeof unitBuffs === 'object') payload.u = unitBuffs
  if (defenderUnitBuffs && typeof defenderUnitBuffs === 'object')
    payload.d = defenderUnitBuffs
  return encodeBase64Url(JSON.stringify(payload))
}

export function decodeScenarioCode(code) {
  if (typeof code !== 'string' || !code) return null
  try {
    const data = JSON.parse(decodeBase64Url(code))
    if (!data || typeof data !== 'object') return null
    if (data.s !== SHARE_SCHEMA) return null
    if (!Array.isArray(data.w) || !Array.isArray(data.t)) return null
    return {
      weapons: data.w,
      targets: data.t,
      highPrecision: !!data.hp,
      unitBuffs: data.u && typeof data.u === 'object' ? data.u : null,
      defenderUnitBuffs: data.d && typeof data.d === 'object' ? data.d : null,
    }
  } catch {
    return null
  }
}

export function buildShareUrl(code) {
  if (typeof window === 'undefined') return ''
  const { origin, pathname } = window.location
  return `${origin}${pathname}?${SHARE_QUERY_PARAM}=${code}`
}
