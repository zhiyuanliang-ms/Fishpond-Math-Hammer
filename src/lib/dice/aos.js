import { DEFAULT_SIMULATIONS, Z_95 } from './constants'
import {
  expectedDiceExpr,
  parseDiceExpression,
  rollDiceExpr,
} from './diceExpression'

export const AOS_CRIT_EFFECTS = Object.freeze({
  NONE: 'none',
  TWO_HITS: 'two-hits',
  AUTO_WOUND: 'auto-wound',
  MORTAL: 'mortal',
})

const critEffects = new Set(Object.values(AOS_CRIT_EFFECTS))
const isIntegerBetween = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max

export const isValidAoSDiceExpression = (expression) => {
  const parsed = parseDiceExpression(expression)
  if (!parsed) return false
  return parsed.count + parsed.flat >= 1
}

export const validateAoSWeaponProfile = (weapon) => {
  if (!weapon || typeof weapon !== 'object') return 'profile must be an object'
  if (!isValidAoSDiceExpression(weapon.attacks))
    return `Attacks "${weapon.attacks}" must always roll at least 1`
  if (!isIntegerBetween(weapon.toHit, 2, 6))
    return 'Hit must be between 2+ and 6+'
  if (!isIntegerBetween(weapon.toWound, 2, 6))
    return 'Wound must be between 2+ and 6+'
  if (!isIntegerBetween(weapon.rend, 0, 5))
    return 'Rend must be between 0 and 5'
  if (!isValidAoSDiceExpression(weapon.damage))
    return `Damage "${weapon.damage}" must always roll at least 1`
  if (!critEffects.has(weapon.critEffect))
    return `unknown critical effect "${weapon.critEffect}"`
  return null
}

export const validateAoSTargetProfile = (target) => {
  if (!target || typeof target !== 'object') return 'profile must be an object'
  if (!isIntegerBetween(target.save, 2, 7))
    return 'Save must be between 2+ and 7+'
  if (target.ward !== 0 && !isIntegerBetween(target.ward, 2, 6))
    return 'Ward must be disabled or between 2+ and 6+'
  return null
}

export const validateAoSDefenderProfile = (target) => {
  const targetError = validateAoSTargetProfile(target)
  if (targetError) return targetError
  if (!Number.isInteger(target.models) || target.models < 1)
    return 'Models must be a positive integer'
  if (!Number.isInteger(target.health) || target.health < 1)
    return 'Health must be a positive integer'
  return null
}

const assertValidProfiles = (weapon, target) => {
  const weaponError = validateAoSWeaponProfile(weapon)
  if (weaponError) throw new Error(`Invalid AoS weapon profile: ${weaponError}`)
  const targetError = validateAoSTargetProfile(target)
  if (targetError) throw new Error(`Invalid AoS target profile: ${targetError}`)
}

const d6SuccessChance = (threshold) => (7 - threshold) / 6

const saveSuccessChance = (save, rend) => {
  const requiredRoll = save + rend
  return requiredRoll > 6 ? 0 : d6SuccessChance(Math.max(2, requiredRoll))
}

const wardSuccessChance = (ward) =>
  ward === 0 ? 0 : d6SuccessChance(ward)

export const calculateAoSDamage = (weapon, target) => {
  assertValidProfiles(weapon, target)

  const attacksParsed = parseDiceExpression(weapon.attacks)
  const damageParsed = parseDiceExpression(weapon.damage)
  const expectedAttacks = expectedDiceExpr(attacksParsed)
  const expectedDamagePerUnsavedAttack = expectedDiceExpr(damageParsed)

  const criticalHitChance = 1 / 6
  const nonCriticalHitChance = (6 - weapon.toHit) / 6
  const woundChance = d6SuccessChance(weapon.toWound)

  let hitsPerAttack = nonCriticalHitChance + criticalHitChance
  let woundRollsPerAttack = hitsPerAttack
  let autoWoundsPerAttack = 0
  let mortalHitsPerAttack = 0

  if (weapon.critEffect === AOS_CRIT_EFFECTS.TWO_HITS) {
    hitsPerAttack = nonCriticalHitChance + 2 * criticalHitChance
    woundRollsPerAttack = hitsPerAttack
  } else if (weapon.critEffect === AOS_CRIT_EFFECTS.AUTO_WOUND) {
    woundRollsPerAttack = nonCriticalHitChance
    autoWoundsPerAttack = criticalHitChance
  } else if (weapon.critEffect === AOS_CRIT_EFFECTS.MORTAL) {
    woundRollsPerAttack = nonCriticalHitChance
    mortalHitsPerAttack = criticalHitChance
  }

  const expectedCriticalHits = expectedAttacks * criticalHitChance
  const expectedHits = expectedAttacks * hitsPerAttack
  const expectedWounds =
    expectedAttacks *
    (woundRollsPerAttack * woundChance + autoWoundsPerAttack)
  const failedSaveChance = 1 - saveSuccessChance(target.save, weapon.rend)
  const expectedFailedSaves = expectedWounds * failedSaveChance
  const expectedNormalDamageBeforeWard =
    expectedFailedSaves * expectedDamagePerUnsavedAttack
  const expectedMortalDamageBeforeWard =
    expectedAttacks * mortalHitsPerAttack * expectedDamagePerUnsavedAttack
  const failedWardChance = 1 - wardSuccessChance(target.ward)
  const expectedNormalDamage =
    expectedNormalDamageBeforeWard * failedWardChance
  const expectedMortalDamage =
    expectedMortalDamageBeforeWard * failedWardChance

  return {
    expectedAttacks,
    expectedCriticalHits,
    expectedHits,
    expectedWounds,
    expectedFailedSaves,
    expectedNormalDamageBeforeWard,
    expectedMortalDamageBeforeWard,
    expectedNormalDamage,
    expectedMortalDamage,
    expectedDamage: expectedNormalDamage + expectedMortalDamage,
    hitChance: nonCriticalHitChance + criticalHitChance,
    woundChance,
    saveChance: saveSuccessChance(target.save, weapon.rend),
    wardChance: wardSuccessChance(target.ward),
  }
}

const rollD6 = () => Math.floor(Math.random() * 6) + 1

const applyWard = (damage, ward) => {
  if (ward === 0) return damage
  let damageDealt = 0
  for (let point = 0; point < damage; point++) {
    if (rollD6() < ward) damageDealt++
  }
  return damageDealt
}

const rollDamage = (damageParsed, ward) =>
  applyWard(rollDiceExpr(damageParsed), ward)

const resolveWound = (weapon, target, damageParsed, autoWound = false) => {
  if (!autoWound) {
    const woundRoll = rollD6()
    if (woundRoll === 1 || woundRoll < weapon.toWound) return 0
  }

  const saveRoll = rollD6()
  if (saveRoll !== 1 && saveRoll - weapon.rend >= target.save) return 0
  return rollDamage(damageParsed, target.ward)
}

const resolveWeapon = (weapon, target, parsed) => {
  let damageDealt = 0
  const attacks = rollDiceExpr(parsed.attacks)

  for (let attack = 0; attack < attacks; attack++) {
    const hitRoll = rollD6()
    if (hitRoll === 1) continue

    if (hitRoll === 6) {
      if (weapon.critEffect === AOS_CRIT_EFFECTS.MORTAL) {
        damageDealt += rollDamage(parsed.damage, target.ward)
        continue
      }
      if (weapon.critEffect === AOS_CRIT_EFFECTS.AUTO_WOUND) {
        damageDealt += resolveWound(
          weapon,
          target,
          parsed.damage,
          true
        )
        continue
      }
      if (weapon.critEffect === AOS_CRIT_EFFECTS.TWO_HITS) {
        damageDealt += resolveWound(weapon, target, parsed.damage)
        damageDealt += resolveWound(weapon, target, parsed.damage)
        continue
      }
    }

    if (hitRoll < weapon.toHit) continue
    damageDealt += resolveWound(weapon, target, parsed.damage)
  }

  return damageDealt
}

const mean = (values) =>
  values.reduce((total, value) => total + value, 0) / values.length

const variance = (values, average) =>
  values.reduce(
    (total, value) => total + (value - average) * (value - average),
    0
  ) / values.length

export const simulateAoSAttack = (
  weapons,
  target,
  numSimulations = DEFAULT_SIMULATIONS
) => {
  if (!Array.isArray(weapons) || weapons.length === 0)
    throw new Error('Add at least one AoS weapon profile')
  if (!Number.isInteger(numSimulations) || numSimulations < 1)
    throw new Error('Simulation count must be a positive integer')

  const targetError = validateAoSDefenderProfile(target)
  if (targetError)
    throw new Error(`Invalid AoS target profile: ${targetError}`)

  const parsedWeapons = weapons.map((weapon, index) => {
    const error = validateAoSWeaponProfile(weapon)
    if (error)
      throw new Error(
        `Invalid AoS weapon "${weapon?.name || `Weapon ${index + 1}`}": ${error}`
      )
    return {
      attacks: parseDiceExpression(weapon.attacks),
      damage: parseDiceExpression(weapon.damage),
    }
  })

  const damagePerTrial = []
  const killsPerTrial = []
  const damagePerWeapon = weapons.map(() => [])
  const totalHealth = target.models * target.health

  for (let simulation = 0; simulation < numSimulations; simulation++) {
    let totalDamage = 0
    let remainingHealth = totalHealth
    weapons.forEach((weapon, index) => {
      if (remainingHealth <= 0) {
        damagePerWeapon[index].push(0)
        return
      }

      const rolledDamage = resolveWeapon(weapon, target, parsedWeapons[index])
      const allocatedDamage = Math.min(rolledDamage, remainingHealth)
      damagePerWeapon[index].push(allocatedDamage)
      totalDamage += allocatedDamage
      remainingHealth -= allocatedDamage
    })
    damagePerTrial.push(totalDamage)
    killsPerTrial.push(
      Math.min(target.models, Math.floor(totalDamage / target.health))
    )
  }

  const expectedDamage = mean(damagePerTrial)
  const damageStdDev = Math.sqrt(variance(damagePerTrial, expectedDamage))
  const expectedKills = mean(killsPerTrial)
  const killsStdDev = Math.sqrt(variance(killsPerTrial, expectedKills))
  const damageCount = new Map()
  const killsCount = new Map()
  let maxDamage = 0
  let anyDamageCount = 0
  let wipeCount = 0

  damagePerTrial.forEach((damage, index) => {
    const kills = killsPerTrial[index]
    damageCount.set(damage, (damageCount.get(damage) || 0) + 1)
    killsCount.set(kills, (killsCount.get(kills) || 0) + 1)
    maxDamage = Math.max(maxDamage, damage)
    if (damage > 0) anyDamageCount++
    if (kills === target.models) wipeCount++
  })

  let cumulative = 0
  const distributionData = Array.from(
    { length: maxDamage + 1 },
    (_, damage) => {
      const probability =
        ((damageCount.get(damage) || 0) / numSimulations) * 100
      cumulative += probability
      return {
        damage,
        probability,
        cumulative: Math.min(100, cumulative),
      }
    }
  )

  cumulative = 0
  const killDistributionData = Array.from(
    { length: target.models + 1 },
    (_, kills) => {
      const probability =
        ((killsCount.get(kills) || 0) / numSimulations) * 100
      cumulative += probability
      return {
        kills,
        probability,
        cumulative: Math.min(100, cumulative),
      }
    }
  )

  const damageProbability = anyDamageCount / numSimulations
  const damageProbabilityStdDev = Math.sqrt(
    Math.max(
      0,
      (damageProbability * (1 - damageProbability)) / numSimulations
    )
  )
  const wipeProbability = wipeCount / numSimulations
  const wipeProbabilityStdDev = Math.sqrt(
    Math.max(
      0,
      (wipeProbability * (1 - wipeProbability)) / numSimulations
    )
  )

  const perWeapon = damagePerWeapon.map((values, index) => {
    const profileExpectedDamage = mean(values)
    return {
      name: weapons[index].name || `Weapon ${index + 1}`,
      expectedDamage: profileExpectedDamage,
      stdDev: Math.sqrt(variance(values, profileExpectedDamage)),
    }
  })

  return {
    totalModels: target.models,
    totalHealth,
    expectedKills,
    expectedKillsStdDev: killsStdDev,
    expectedKillsCILow: Math.max(0, expectedKills - Z_95 * killsStdDev),
    expectedKillsCIHigh: Math.min(
      target.models,
      expectedKills + Z_95 * killsStdDev
    ),
    expectedDamage,
    expectedDamageStdDev: damageStdDev,
    expectedDamageCILow: Math.max(
      0,
      expectedDamage - Z_95 * damageStdDev
    ),
    expectedDamageCIHigh: Math.min(
      totalHealth,
      expectedDamage + Z_95 * damageStdDev
    ),
    damageProbability: damageProbability * 100,
    damageProbabilityStdDev: damageProbabilityStdDev * 100,
    damageProbabilityCILow:
      Math.max(0, damageProbability - Z_95 * damageProbabilityStdDev) * 100,
    damageProbabilityCIHigh:
      Math.min(1, damageProbability + Z_95 * damageProbabilityStdDev) * 100,
    wipeProbability: wipeProbability * 100,
    wipeProbabilityStdDev: wipeProbabilityStdDev * 100,
    wipeProbabilityCILow:
      Math.max(0, wipeProbability - Z_95 * wipeProbabilityStdDev) * 100,
    wipeProbabilityCIHigh:
      Math.min(1, wipeProbability + Z_95 * wipeProbabilityStdDev) * 100,
    distributionData,
    killDistributionData,
    perWeapon,
    maxDamage,
    numSimulations,
  }
}
