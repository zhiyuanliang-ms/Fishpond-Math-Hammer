import { isTargetUnitBuffsEmpty, isUnitBuffsEmpty } from './dice'

const rerollLabel = (mode, t) => {
  switch (mode) {
    case 'reroll-one': return t('rerollOnes')
    case 'reroll-one-two': return t('rerollOnesAndTwos')
    case 'reroll-fail': return t('rerollFails')
    case 'reroll-non-critical': return t('rerollNonCritical')
    case 'reroll-1-2-3': return t('rerollLow123')
    default: return null
  }
}

const describeWeapon = (weapon, t) => {
  const tag = (value) =>
    typeof value === 'string' ? value.toUpperCase() : value
  const head =
    `${weapon.modelsFiring}× A${tag(weapon.attacks)} ` +
    `BS/WS${weapon.toHit}+ S${weapon.strength} AP-${weapon.ap} ` +
    `D${tag(weapon.damage)}`
  const abilities = []
  if (weapon.torrent) abilities.push(t('torrent'))
  if (weapon.lethalHits) abilities.push(t('lethalHits'))
  if (weapon.sustainedHits && weapon.sustainedHits !== 'off') {
    abilities.push(
      `${t('sustainedHits')} ${weapon.sustainedHits.toUpperCase()}`
    )
  }
  if (weapon.devastatingWounds) abilities.push(t('devastatingWounds'))
  if (weapon.blast) abilities.push(t('blast'))
  if (weapon.cleaveEnabled) {
    abilities.push(`${t('cleave')} ${weapon.cleaveValue || 1}`)
  }
  if (weapon.plusOneHit) abilities.push(t('plusOneHit'))
  if (weapon.plusOneWound) abilities.push(t('plusOneWound'))
  if (weapon.ignoresCover) abilities.push(t('ignoresCover'))
  if (weapon.critHitEnabled) {
    abilities.push(`${t('criticalHit')} ${weapon.critHit}+`)
  }
  if (weapon.antiEnabled) {
    abilities.push(`${t('anti')} ${weapon.antiValue}+`)
  }

  const rerolls = []
  const pushReroll = (mode, scope, label) => {
    const reroll = rerollLabel(mode, t)
    if (!reroll) return
    const scopeTag =
      scope === 'single' ? ` (${t('rerollScopeSingle')})` : ''
    rerolls.push(`${label}: ${reroll}${scopeTag}`)
  }
  pushReroll(
    weapon.hitReroll,
    weapon.hitRerollScope,
    t('hitReroll')
  )
  pushReroll(
    weapon.woundReroll,
    weapon.woundRerollScope,
    t('woundReroll')
  )
  pushReroll(
    weapon.attackReroll,
    weapon.attackRerollScope,
    t('attackReroll')
  )
  pushReroll(
    weapon.damageReroll,
    weapon.damageRerollScope,
    t('damageReroll')
  )

  const extras = [...abilities, ...rerolls]
  return head + (extras.length ? ` [${extras.join(', ')}]` : '')
}

const describeUnitBuffs = (unitBuffs, t) => {
  const parts = []
  if (unitBuffs.plusOneAttack) parts.push(t('plusOneAttack'))
  if (unitBuffs.plusOneDamage) parts.push(t('plusOneDamage'))
  if (unitBuffs.plusOneHit) parts.push(t('plusOneHit'))
  if (unitBuffs.plusOneWound) parts.push(t('plusOneWound'))
  if (
    unitBuffs.hitReroll &&
    unitBuffs.hitReroll !== 'no-reroll'
  ) {
    parts.push(
      `${t('hitReroll')}: ${rerollLabel(unitBuffs.hitReroll, t)}`
    )
  }
  if (
    unitBuffs.woundReroll &&
    unitBuffs.woundReroll !== 'no-reroll'
  ) {
    parts.push(
      `${t('woundReroll')}: ${rerollLabel(unitBuffs.woundReroll, t)}`
    )
  }
  if (unitBuffs.lethalHits) parts.push(t('lethalHits'))
  if (unitBuffs.devastatingWounds) parts.push(t('devastatingWounds'))
  if (unitBuffs.sustainedHits && unitBuffs.sustainedHits !== 'off') {
    parts.push(`${t('sustainedHits')} ${unitBuffs.sustainedHits}`)
  }
  if (unitBuffs.ignoresCover) parts.push(t('ignoresCover'))
  if (unitBuffs.critHitEnabled) {
    parts.push(`${t('criticalHit')} ${unitBuffs.critHit}+`)
  }
  return parts
}

const describeDefenderUnitBuffs = (unitBuffs, t) => {
  const parts = []
  if (unitBuffs.rerollSaveOnes) parts.push(t('rerollSaveOnes'))
  if (unitBuffs.benefitOfCover) parts.push(t('benefitOfCover'))
  if (unitBuffs.minusOneAp) parts.push(t('minusOneAp'))
  if (unitBuffs.minusOneToHit) parts.push(t('minusOneHit'))
  if (unitBuffs.minusOneToWound) parts.push(t('minusOneWound'))
  if (unitBuffs.minusOneToWoundIfStronger) {
    parts.push(t('minusOneWoundST'))
  }
  if (unitBuffs.halfDamage) parts.push(t('halfDamage'))
  if (unitBuffs.minusOneDamage) parts.push(t('damageMinus1'))
  if (unitBuffs.damageOne) parts.push(t('damageOne'))
  return parts
}

const describeTarget = (target, t) => {
  const invulnerableSave =
    target.invulnSave > 0 ? `/${target.invulnSave}++` : ''
  const head =
    `${target.models}× T${target.toughness} W${target.wounds} ` +
    `Sv${target.save}+${invulnerableSave}`
  const buffs = []
  if (target.fnp > 0) buffs.push(`${t('fnp')} ${target.fnp}+`)
  if (target.fnpMortal > 0) {
    buffs.push(`${t('fnpMortal')} ${target.fnpMortal}+`)
  }
  if (target.rerollSaveOnes) buffs.push(t('rerollSaveOnes'))
  if (target.minusOneToHit) buffs.push(t('minusOneHit'))
  if (target.minusOneToWound) buffs.push(t('minusOneWound'))
  if (target.minusOneToWoundIfStronger) {
    buffs.push(t('minusOneWoundST'))
  }
  if (target.halfDamage) buffs.push(t('halfDamage'))
  if (target.minusOneDamage) buffs.push(t('damageMinus1'))
  if (target.damageOne) buffs.push(t('damageOne'))
  if (target.benefitOfCover) buffs.push(t('benefitOfCover'))
  if (target.minusOneAp) buffs.push(t('minusOneAp'))
  return head + (buffs.length ? ` [${buffs.join(', ')}]` : '')
}

export const buildAttackSimV2Report = (
  weapons,
  targets,
  unitBuffs,
  defenderUnitBuffs,
  result,
  t
) => {
  const lines = [`# ${t('pageTitle')}`, '', `## ${t('reportAttacker')}`]
  weapons.forEach((weapon, index) => {
    const name = weapon.name?.trim() || `Weapon ${index + 1}`
    lines.push(`- ${name}: ${describeWeapon(weapon, t)}`)
  })

  if (!isUnitBuffsEmpty(unitBuffs)) {
    lines.push('', `### ${t('unitBuffsSection')}`)
    describeUnitBuffs(unitBuffs, t).forEach((part) => {
      lines.push(`- ${part}`)
    })
  }

  lines.push('', `## ${t('reportDefender')}`)
  targets.forEach((target, index) => {
    const name = target.name?.trim() || `Profile ${index + 1}`
    lines.push(`- ${name}: ${describeTarget(target, t)}`)
  })

  if (!isTargetUnitBuffsEmpty(defenderUnitBuffs)) {
    lines.push('', `### ${t('unitBuffsSection')}`)
    describeDefenderUnitBuffs(defenderUnitBuffs, t).forEach((part) => {
      lines.push(`- ${part}`)
    })
  }

  if (result) {
    const singleModel = targets.length === 1 && targets[0].models === 1
    lines.push(
      '',
      `## ${t('reportResults')} ` +
        `(${t(
          'reportIterations',
          result.numSimulations.toLocaleString()
        )})`
    )
    if (singleModel) {
      lines.push(
        `- ${t('reportExpectedDamage')}: ` +
          `${result.expectedDamage.toFixed(2)} ` +
          `(±${result.expectedDamageStdDev.toFixed(2)}, 95% CI ` +
          `${result.expectedDamageCILow.toFixed(2)}–` +
          `${result.expectedDamageCIHigh.toFixed(2)})`
      )
    } else {
      lines.push(
        `- ${t('reportExpectedKills')}: ` +
          `${result.expectedKills.toFixed(2)} ` +
          `(±${result.expectedKillsStdDev.toFixed(2)}, 95% CI ` +
          `${result.expectedKillsCILow.toFixed(2)}–` +
          `${result.expectedKillsCIHigh.toFixed(2)})`
      )
    }
    lines.push(
      `- ${t('reportWipeChance')}: ` +
        `${result.wipeProbability.toFixed(2)}% ` +
        `(±${result.wipeProbabilityStdDev.toFixed(2)}%, 95% CI ` +
        `${result.wipeProbabilityCILow.toFixed(2)}–` +
        `${result.wipeProbabilityCIHigh.toFixed(2)}%)`
    )

    if (result.perProfile.length > 1) {
      lines.push('', `## ${t('perProfileBreakdown')}`)
      result.perProfile.forEach((profile) => {
        lines.push(
          `- ${profile.name} (${profile.models}): ` +
            `${profile.expectedKills.toFixed(2)} ` +
            `${t('reportExpectedKills').toLowerCase()} ` +
            `(±${profile.stdDev.toFixed(2)}), ` +
            `${profile.wipeProbability.toFixed(1)}% ` +
            `${t('reportWipeChance').toLowerCase()}`
        )
      })
    }
  }

  return lines.join('\n')
}
