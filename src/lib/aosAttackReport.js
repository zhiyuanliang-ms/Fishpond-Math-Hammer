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

  const resultLines = []
  if (target.models !== 1) {
    resultLines.push(
      `- Expected models killed: ${fixed(result.expectedKills)} ` +
        `(±${fixed(result.expectedKillsStdDev)}, 95% range ` +
        `${fixed(result.expectedKillsCILow)}–${fixed(result.expectedKillsCIHigh)})`
    )
  }
  resultLines.push(
    `- Expected generated damage: ${fixed(result.expectedGeneratedDamage)} ` +
      `(±${fixed(result.expectedGeneratedDamageStdDev)}, 95% range ` +
      `${fixed(result.expectedGeneratedDamageCILow)}–` +
      `${fixed(result.expectedGeneratedDamageCIHigh)})`
  )
  if (target.ward !== 0) {
    resultLines.push(
      `- Expected damage after Ward: ${fixed(result.expectedDamage)} ` +
        `(±${fixed(result.expectedDamageStdDev)}, 95% range ` +
        `${fixed(result.expectedDamageCILow)}–${fixed(result.expectedDamageCIHigh)})`
    )
  }
  resultLines.push(`- Chance to wipe unit: ${fixed(result.wipeProbability)}%`)

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
    ...resultLines,
  ]

  if (result.perWeapon.length > 1) {
    lines.push('', '## Per-Profile Damage')
    result.perWeapon.forEach((profile) => {
      const damageAfterWard =
        target.ward === 0
          ? ''
          : `, ${fixed(profile.expectedDamage)} after Ward`
      lines.push(
        `- ${profile.name}: ${fixed(profile.expectedGeneratedDamage)} generated` +
          damageAfterWard +
          ' ' +
          `(±${fixed(profile.stdDev)})`
      )
    })
  }

  return lines.join('\n')
}
