import { simulateKillProbability } from './simulation'

// Calculate kill probability using simulation. Inputs are raw form values
// (strings or numbers); they are normalized here.
export const calculateKillProbability = (
  woundedAttacks,
  damagePerAttack,
  numModels,
  modelWoundsValue,
  armorSaveValue,
  fnpValue,
  saveRerollValue = 'no-reroll'
) => {
  const numAttacks = parseInt(woundedAttacks) || 0
  const damage = parseInt(damagePerAttack) || 1
  const numTargetModels = parseInt(numModels) || 1
  const modelWounds = parseInt(modelWoundsValue) || 1
  const armorSave = armorSaveValue ? parseInt(armorSaveValue) : null
  const fnp = fnpValue ? parseInt(fnpValue) : null

  if (numAttacks <= 0) {
    return { expectedKills: 0, distributionData: [] }
  }

  return simulateKillProbability(
    numAttacks,
    damage,
    numTargetModels,
    modelWounds,
    armorSave,
    fnp,
    saveRerollValue
  )
}
