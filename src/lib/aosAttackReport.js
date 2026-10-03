const critEffectLabels = {
  none: 'None',
  'two-hits': 'Crit (2 Hits)',
  'auto-wound': 'Crit (Auto-wound)',
  mortal: 'Crit (Mortal)',
}

const fixed = (value) => Number(value).toFixed(2)

const describeWeapon = (weapon, index) => {
  const name = weapon.name?.trim() || `Weapon ${index + 1}`
  const rend = weapon.rend === 0 ? '—' : `-${weapon.rend}`
  const crit = critEffectLabels[weapon.critEffect] || weapon.critEffect
  const critDescription = weapon.critEffect === 'none' ? '' : `, ${crit}`
  return (
    `- **${name}:** A${weapon.attacks}, ` +
    `Hit ${weapon.toHit}+, Wound ${weapon.toWound}+, Rend ${rend}, ` +
    `D${weapon.damage}${critDescription}`
  )
}

export function buildAoSAttackReport(weapons, target, result) {
  if (!Array.isArray(weapons) || weapons.length === 0)
    throw new Error('Cannot build an AoS report without weapon profiles')
  if (!target || !result)
    throw new Error('Cannot build an AoS report without a defender and results')

  const lines = [
    '# AoS Attack Simulator',
    '',
    '## Attacker',
    ...weapons.map(describeWeapon),
    '',
    '## Defender',
    `- ${target.models} models, Health ${target.health}, Save ${target.save}+` +
      (target.ward === 0 ? '' : `, Ward ${target.ward}+`),
    '',
    `## Results (${result.numSimulations.toLocaleString()} simulations)`,
    `- Expected models killed: ${fixed(result.expectedKills)} ` +
      `(±${fixed(result.expectedKillsStdDev)}, 95% range ` +
      `${fixed(result.expectedKillsCILow)}–${fixed(result.expectedKillsCIHigh)})`,
    `- Expected damage dealt: ${fixed(result.expectedDamage)} ` +
      `(±${fixed(result.expectedDamageStdDev)}, 95% range ` +
      `${fixed(result.expectedDamageCILow)}–${fixed(result.expectedDamageCIHigh)})`,
    `- Chance to deal damage: ${fixed(result.damageProbability)}%`,
    `- Chance to wipe unit: ${fixed(result.wipeProbability)}%`,
  ]

  if (result.perWeapon.length > 1) {
    lines.push('', '## Per-Profile Damage')
    result.perWeapon.forEach((profile) => {
      lines.push(
        `- ${profile.name}: ${fixed(profile.expectedDamage)} expected damage ` +
          `(±${fixed(profile.stdDev)})`
      )
    })
  }

  return lines.join('\n')
}
