// Two-layer buff model for the Attack Simulator.
//
// In Warhammer 40,000 a weapon's printed datasheet provides intrinsic
// abilities (BLAST, IGNORES COVER, ANTI-X, SUSTAINED HITS X, etc.). The
// firing unit can independently receive buffs from stratagems / detachment
// rules / auras that effectively grant the same kinds of abilities to every
// weapon it fires (+1 to Hit, Re-roll Wounds, Lethal Hits, ...).
//
// Players never stack the two layers: if a weapon already has SUSTAINED 1
// and the unit grants SUSTAINED 2, only the better version applies.
// `mergeWeaponWithUnit` produces the effective per-weapon profile that the
// Monte Carlo simulator should consume.

// Reroll buffs are special: re-roll Failed and re-roll Non-Critical can each
// be the right choice depending on lethal-hits / sustained-hits setup, so
// between those two the weapon's intrinsic choice wins. Narrower rerolls are
// strictly dominated, though: re-roll Failed covers every die re-roll Ones
// (or Ones and Twos) would touch, so a broader unit reroll replaces them.
// Limited failed-hit/wound rerolls stay on the unit; their budgets are
// shared across all weapons by the simulator, not copied into each profile.

import { parseDiceExpression } from './diceExpression'
import { normalizeFailedRerollCount } from './d6Rerolls'

// Rank for SUSTAINED HITS values. Use the expected number of extra hits so
// "D6" (mean 3.5) wins over "3" but loses to "4".
const SUSTAINED_RANK = {
  off: -1,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  D3: 2,
  D6: 3.5,
}

const addOneToDiceExpression = (expression) => {
  const parsed = parseDiceExpression(expression)
  if (!parsed) return expression
  if (parsed.count === 0) {
    const next = parsed.flat + 1
    return typeof expression === 'number' ? next : next.toString()
  }

  const dice = `${parsed.count === 1 ? '' : parsed.count}D${parsed.sides}`
  const modifier = parsed.flat + 1
  if (modifier === 0) return dice
  return `${dice}${modifier > 0 ? '+' : ''}${modifier}`
}

export const makeUnitBuffs = ({
  rerollFailedHit,
  rerollFailedWound,
  rerollOneFailedHit,
  rerollOneFailedWound,
  ...overrides
} = {}) => ({
  hitReroll: 'no-reroll',
  woundReroll: 'no-reroll',
  rerollFailedHit: normalizeFailedRerollCount(rerollFailedHit, rerollOneFailedHit, 'Failed hit reroll count'),
  rerollFailedWound: normalizeFailedRerollCount(rerollFailedWound, rerollOneFailedWound, 'Failed wound reroll count'),
  plusOneAttack: false,
  plusOneDamage: false,
  plusOneAp: false,
  plusOneHit: false,
  plusOneWound: false,
  sustainedHits: 'off',
  lethalHits: false,
  devastatingWounds: false,
  ignoresCover: false,
  critHitEnabled: false,
  critHit: 5,
  ...overrides,
})

export const isUnitBuffsEmpty = (u) => {
  if (!u || typeof u !== 'object') return true
  return (
    (u.hitReroll || 'no-reroll') === 'no-reroll' &&
    (u.woundReroll || 'no-reroll') === 'no-reroll' &&
    !normalizeFailedRerollCount(u.rerollFailedHit, u.rerollOneFailedHit) &&
    !normalizeFailedRerollCount(u.rerollFailedWound, u.rerollOneFailedWound) &&
    !u.plusOneAttack &&
    !u.plusOneDamage &&
    !u.plusOneAp &&
    !u.plusOneHit &&
    !u.plusOneWound &&
    (!u.sustainedHits || u.sustainedHits === 'off') &&
    !u.lethalHits &&
    !u.devastatingWounds &&
    !u.ignoresCover &&
    !u.critHitEnabled
  )
}

// Coverage rank of each reroll mode. Failed and non-critical share a rank:
// they are alternative strategies rather than one dominating the other.
const UNIT_REROLL_RANK = {
  'no-reroll': 0,
  'reroll-one': 1,
  'reroll-one-two': 2,
  'reroll-fail': 3,
  'reroll-non-critical': 3,
}

// Reroll merge rule: keep the primary (weapon or saved) reroll if it has
// one. Only adopt the secondary reroll when the primary has none.
const pickReroll = (weaponMode, unitMode) => {
  if (weaponMode && weaponMode !== 'no-reroll') return weaponMode
  return unitMode && unitMode !== 'no-reroll' ? unitMode : (weaponMode || 'no-reroll')
}

// Weapon x unit merge: the unit reroll replaces the weapon's only when it
// has strictly broader coverage; ties keep the weapon's strategy.
const pickWeaponReroll = (weaponMode, unitMode) => {
  const weaponRank = UNIT_REROLL_RANK[weaponMode || 'no-reroll'] ?? 0
  const unitRank = UNIT_REROLL_RANK[unitMode || 'no-reroll'] ?? 0
  return unitRank > weaponRank ? unitMode : (weaponMode || 'no-reroll')
}

const mergeUnitReroll = (saved, additional) => {
  const next = pickReroll(additional, saved)
  // Failed and non-critical rerolls are alternative strategies; an explicit choice wins their tie.
  return UNIT_REROLL_RANK[saved] > UNIT_REROLL_RANK[next] ? saved : next
}

const bestSustained = (a, b) => {
  const ra = SUSTAINED_RANK[a] ?? -1
  const rb = SUSTAINED_RANK[b] ?? -1
  return rb > ra ? b : a
}

export const mergeUnitBuffs = (saved, additional) => {
  const defaults = makeUnitBuffs()
  const base = makeUnitBuffs(saved || {})
  const extra = makeUnitBuffs(additional || {})
  const merged = { ...base }

  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean') {
      merged[key] = !!(base[key] || extra[key])
    }
  }
  merged.rerollFailedHit = Math.max(base.rerollFailedHit, extra.rerollFailedHit)
  merged.rerollFailedWound = Math.max(base.rerollFailedWound, extra.rerollFailedWound)
  merged.hitReroll = mergeUnitReroll(base.hitReroll, extra.hitReroll)
  merged.woundReroll = mergeUnitReroll(base.woundReroll, extra.woundReroll)
  merged.sustainedHits = bestSustained(base.sustainedHits || 'off', extra.sustainedHits || 'off')
  if (extra.critHitEnabled) {
    merged.critHit = base.critHitEnabled
      ? Math.min(base.critHit ?? 6, extra.critHit ?? 6)
      : (extra.critHit ?? 5)
  }
  return merged
}

// Produce the effective per-weapon profile after applying unit-wide buffs.
// Never mutates the inputs.
export const mergeWeaponWithUnit = (weapon, unit) => {
  if (!weapon) return weapon
  if (isUnitBuffsEmpty(unit)) return weapon
  const merged = { ...weapon }

  // Hit reroll is meaningless under Torrent (auto-hits), so don't promote.
  if (!weapon.torrent) {
    const next = pickWeaponReroll(weapon.hitReroll, unit.hitReroll)
    if (next !== weapon.hitReroll) {
      merged.hitReroll = next
      // Unit-granted rerolls implicitly apply to every die.
      merged.hitRerollScope = 'all'
    }
  }

  {
    const next = pickWeaponReroll(weapon.woundReroll, unit.woundReroll)
    if (next !== weapon.woundReroll) {
      merged.woundReroll = next
      merged.woundRerollScope = 'all'
    }
  }

  if (unit.plusOneAttack) {
    merged.attacks = addOneToDiceExpression(weapon.attacks)
    merged.plusOneAttack = true
  }
  if (unit.plusOneDamage) {
    merged.damage = addOneToDiceExpression(weapon.damage)
    merged.plusOneDamage = true
  }
  if (unit.plusOneAp) {
    merged.ap = (Number(weapon.ap) || 0) + 1
    merged.plusOneAp = true
  }
  if (unit.plusOneHit) merged.plusOneHit = true
  if (unit.plusOneWound) merged.plusOneWound = true

  if (unit.sustainedHits && unit.sustainedHits !== 'off') {
    merged.sustainedHits = bestSustained(weapon.sustainedHits || 'off', unit.sustainedHits)
  }

  if (unit.lethalHits) merged.lethalHits = true
  if (unit.devastatingWounds) merged.devastatingWounds = true
  if (unit.ignoresCover) merged.ignoresCover = true

  if (unit.critHitEnabled) {
    merged.critHitEnabled = true
    merged.critHit = weapon.critHitEnabled
      ? Math.min(weapon.critHit ?? 6, unit.critHit ?? 6)
      : (unit.critHit ?? 5)
  }

  return merged
}

// Returns a map of weapon-card chip keys → boolean: which intrinsic buffs
// got upgraded (or freshly added) by the unit layer. Used by the UI to
// annotate the summary chips on the weapon card.
//
// Chip keys match those used by the weapon profile summary.
export const describeUpgrades = (weapon, unit) => {
  const out = {}
  if (!weapon || isUnitBuffsEmpty(unit)) return out
  const merged = mergeWeaponWithUnit(weapon, unit)

  if (!weapon.torrent && merged.hitReroll !== weapon.hitReroll) out.hitReroll = true
  if (merged.woundReroll !== weapon.woundReroll) out.woundReroll = true
  if (unit.plusOneAttack) out.plusOneAttack = true
  if (unit.plusOneDamage) out.plusOneDamage = true
  if (unit.plusOneAp) out.plusOneAp = true
  if (unit.plusOneHit && !weapon.plusOneHit) out.plusOneHit = true
  if (unit.plusOneWound && !weapon.plusOneWound) out.plusOneWound = true
  if (merged.sustainedHits !== (weapon.sustainedHits || 'off')) out.sustainedHits = true
  if (unit.lethalHits && !weapon.lethalHits) out.lethalHits = true
  if (unit.devastatingWounds && !weapon.devastatingWounds) out.devastating = true
  if (unit.ignoresCover && !weapon.ignoresCover) out.ignoresCover = true
  if (
    unit.critHitEnabled &&
    (!weapon.critHitEnabled || (unit.critHit ?? 6) < (weapon.critHit ?? 6))
  ) {
    out.critHit = true
  }

  return out
}

// ---------------------------------------------------------------------------
// Defender-side mirror.
//
// Defending units can also receive buffs from stratagems / auras / Warlord
// traits (Armor of Contempt, Smokescreen, Lone Operative). These apply to
// every model profile in the unit, so the UI exposes them as a single
// "Unit Buffs" panel that merges into each target profile at simulation
// time. The merge rules use the same "best wins, no stacking" principle as
// the attacker side.
//
// FNP / FNP-vs-Mortal stay per-profile only — they are intrinsic to a model
// type (Necron, Custodes, attached Apothecary…) much more often than they
// are an aura-style ability.
// ---------------------------------------------------------------------------

export const makeTargetUnitBuffs = (overrides = {}) => ({
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  benefitOfCover: false,
  minusOneAp: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  ...overrides,
})

export const isTargetUnitBuffsEmpty = (u) => {
  if (!u || typeof u !== 'object') return true
  return !(
    u.minusOneToHit ||
    u.minusOneToWound ||
    u.minusOneToWoundIfStronger ||
    u.benefitOfCover ||
    u.minusOneAp ||
    u.halfDamage ||
    u.minusOneDamage ||
    u.damageOne
  )
}

// Damage-reduction ranking. For any incoming damage value d > 1:
//   damageOne     -> 1
//   halfDamage    -> ceil(d/2)
//   minusOneDamage-> max(1, d-1)
// `damageOne` never gives more damage than the others, so we treat it as
// strictly strongest for the defender. Order: damageOne > halfDamage >
// minusOneDamage. Only one mode can be active on the merged target — the
// effects don't stack in the rules.
const DAMAGE_REDUCTION_RANK = {
  damageOne: 3,
  halfDamage: 2,
  minusOneDamage: 1,
  none: 0,
}

const damageReductionMode = (src) => {
  if (!src) return 'none'
  if (src.damageOne) return 'damageOne'
  if (src.halfDamage) return 'halfDamage'
  if (src.minusOneDamage) return 'minusOneDamage'
  return 'none'
}

// Produce the effective per-target profile after applying defender unit
// buffs. Never mutates the inputs.
export const mergeTargetWithUnit = (target, unit) => {
  if (!target) return target
  if (isTargetUnitBuffsEmpty(unit)) return target
  const merged = { ...target }

  if (unit.minusOneToHit) merged.minusOneToHit = true
  if (unit.benefitOfCover) merged.benefitOfCover = true
  if (unit.minusOneAp) merged.minusOneAp = true

  // Plain -1 to wound dominates the conditional "if attacker stronger" form.
  if (unit.minusOneToWound || merged.minusOneToWound) {
    merged.minusOneToWound = true
    merged.minusOneToWoundIfStronger = false
  } else if (unit.minusOneToWoundIfStronger) {
    merged.minusOneToWoundIfStronger = true
  }

  // Damage reduction: pick strongest single mode across both layers.
  const tRank = DAMAGE_REDUCTION_RANK[damageReductionMode(target)]
  const uRank = DAMAGE_REDUCTION_RANK[damageReductionMode(unit)]
  const winner = uRank > tRank
    ? damageReductionMode(unit)
    : damageReductionMode(target)
  merged.damageOne = winner === 'damageOne'
  merged.halfDamage = winner === 'halfDamage'
  merged.minusOneDamage = winner === 'minusOneDamage'

  return merged
}

export const mergeTargetUnitBuffs = (saved, additional) =>
  mergeTargetWithUnit(
    makeTargetUnitBuffs(saved || {}),
    makeTargetUnitBuffs(additional || {})
  )

// Map of chip keys → true for buffs that the unit layer added or upgraded
// on the merged target. Chip keys match those in TargetBuffsEditor.
export const describeTargetUpgrades = (target, unit) => {
  const out = {}
  if (!target || isTargetUnitBuffsEmpty(unit)) return out
  const merged = mergeTargetWithUnit(target, unit)

  if (merged.minusOneToHit && !target.minusOneToHit) out.minusOneToHit = true
  if (merged.benefitOfCover && !target.benefitOfCover) out.benefitOfCover = true
  if (merged.minusOneAp && !target.minusOneAp) out.minusOneAp = true
  if (merged.minusOneToWound && !target.minusOneToWound) out.minusOneToWound = true
  if (merged.minusOneToWoundIfStronger && !target.minusOneToWoundIfStronger)
    out.minusOneToWoundIfStronger = true

  const tMode = damageReductionMode(target)
  const mMode = damageReductionMode(merged)
  if (mMode !== tMode && DAMAGE_REDUCTION_RANK[mMode] > DAMAGE_REDUCTION_RANK[tMode]) {
    if (mMode === 'damageOne') out.damageOne = true
    else if (mMode === 'halfDamage') out.halfDamage = true
    else if (mMode === 'minusOneDamage') out.minusOneDamage = true
  }

  return out
}
