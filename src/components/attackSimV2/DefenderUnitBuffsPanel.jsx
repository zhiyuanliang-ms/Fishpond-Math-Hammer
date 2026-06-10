// Defender-side unit-wide buff panel. Mirrors UnitBuffsPanel on the
// attacker side, but with defensive auras/stratagems (Armor of Contempt,
// Smokescreen, benefit of cover, Reroll Save 1s, ...).
//
// FNP / FNP-vs-Mortal are intentionally left per-target — they're intrinsic
// to a model type, not a unit-wide aura in practice.

import { BuffChipGroup } from '../ui'
import { useT } from '../attackSim/lang'
import { isTargetUnitBuffsEmpty } from '../../lib/dice'

function DefenderUnitBuffsPanel({ value, onChange }) {
  const { t } = useT()
  const update = (patch) => onChange({ ...value, ...patch })

  const buffs = [
    {
      key: 'rerollSaveOnes',
      label: t('rerollSaveOnes'),
      active: !!value.rerollSaveOnes,
      onToggle: () => update({ rerollSaveOnes: !value.rerollSaveOnes }),
    },
    {
      key: 'benefitOfCover',
      label: t('benefitOfCover'),
      active: !!value.benefitOfCover,
      onToggle: () => update({ benefitOfCover: !value.benefitOfCover }),
    },
    {
      key: 'minusOneToHit',
      label: t('minusOneHit'),
      active: !!value.minusOneToHit,
      onToggle: () => update({ minusOneToHit: !value.minusOneToHit }),
    },
    {
      key: 'minusOneToWound',
      label: t('minusOneWound'),
      active: !!value.minusOneToWound,
      onToggle: () =>
        update({
          minusOneToWound: !value.minusOneToWound,
          minusOneToWoundIfStronger: false,
        }),
    },
    {
      key: 'minusOneToWoundIfStronger',
      label: t('minusOneWoundST'),
      active: !!value.minusOneToWoundIfStronger,
      onToggle: () =>
        update({
          minusOneToWoundIfStronger: !value.minusOneToWoundIfStronger,
          minusOneToWound: false,
        }),
    },
    {
      key: 'halfDamage',
      label: t('halfDamage'),
      active: !!value.halfDamage,
      onToggle: () =>
        update({
          halfDamage: !value.halfDamage,
          minusOneDamage: false,
          damageOne: false,
        }),
    },
    {
      key: 'minusOneDamage',
      label: t('damageMinus1'),
      active: !!value.minusOneDamage,
      onToggle: () =>
        update({
          minusOneDamage: !value.minusOneDamage,
          halfDamage: false,
          damageOne: false,
        }),
    },
    {
      key: 'damageOne',
      label: t('damageOne'),
      active: !!value.damageOne,
      onToggle: () =>
        update({
          damageOne: !value.damageOne,
          halfDamage: false,
          minusOneDamage: false,
        }),
    },
  ]

  const empty = isTargetUnitBuffsEmpty(value)

  return (
    <div className={`unit-buffs-panel${empty ? ' is-empty' : ''}`}>
      <div className="buff-row">
        <BuffChipGroup buffs={buffs} />
      </div>
    </div>
  )
}

export default DefenderUnitBuffsPanel
