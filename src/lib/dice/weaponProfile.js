import { parseDiceExpression } from './diceExpression'

export const normalizeWeaponProfileRerolls = (weapon) => {
  if (!weapon || typeof weapon !== 'object') return weapon

  const attacks = parseDiceExpression(weapon.attacks)
  const damage = parseDiceExpression(weapon.damage)
  const clearAttackReroll =
    attacks?.count === 0 &&
    (weapon.attackReroll !== 'no-reroll' || weapon.attackRerollScope !== 'all')
  const clearDamageReroll =
    damage?.count === 0 &&
    (weapon.damageReroll !== 'no-reroll' || weapon.damageRerollScope !== 'all')
  const clearHitReroll =
    weapon.torrent &&
    (weapon.hitReroll !== 'no-reroll' || weapon.hitRerollScope !== 'all')

  if (!clearAttackReroll && !clearDamageReroll && !clearHitReroll) return weapon

  const normalized = { ...weapon }
  if (clearAttackReroll) {
    normalized.attackReroll = 'no-reroll'
    normalized.attackRerollScope = 'all'
  }
  if (clearDamageReroll) {
    normalized.damageReroll = 'no-reroll'
    normalized.damageRerollScope = 'all'
  }
  if (clearHitReroll) {
    normalized.hitReroll = 'no-reroll'
    normalized.hitRerollScope = 'all'
  }
  return normalized
}