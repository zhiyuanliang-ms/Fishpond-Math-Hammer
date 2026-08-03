// Unit-wide buff panel for V2.
//
// Holds buffs that the firing unit grants to every weapon (stratagems,
// detachment rules, auras). At simulation time these get merged into each
// weapon profile via `mergeWeaponWithUnit` (best-wins, no stacking).

import { FormSelect, BuffChipGroup } from '../ui'
import {
  rerollOptions,
  critOptions,
  sustainedOptions,
} from '../../lib/dice/options'
import { useT } from '../attackSim/lang'
import { isUnitBuffsEmpty } from '../../lib/dice'

const rerollLangKeys = {
  'no-reroll': 'noReroll',
  'reroll-one': 'rerollOnes',
  'reroll-fail': 'rerollFails',
  'reroll-non-critical': 'rerollNonCritical',
}

function UnitBuffsPanel({ value, onChange }) {
  const { t } = useT()
  const update = (patch) => onChange({ ...value, ...patch })

  const localizedRerollOptions = rerollOptions.map((o) => ({
    ...o,
    label: t(rerollLangKeys[o.value] ?? o.value),
  }))

  const buffs = [
    {
      key: 'plusOneAttack',
      label: t('plusOneAttack'),
      active: value.plusOneAttack,
      onToggle: () => update({ plusOneAttack: !value.plusOneAttack }),
    },
    {
      key: 'plusOneHit',
      label: t('plusOneHit'),
      active: value.plusOneHit,
      onToggle: () => update({ plusOneHit: !value.plusOneHit }),
    },
    {
      key: 'plusOneWound',
      label: t('plusOneWound'),
      active: value.plusOneWound,
      onToggle: () => update({ plusOneWound: !value.plusOneWound }),
    },
    {
      key: 'lethalHits',
      label: t('lethalHits'),
      active: value.lethalHits,
      onToggle: () => update({ lethalHits: !value.lethalHits }),
    },
    {
      key: 'devastating',
      label: t('devastatingWounds'),
      active: value.devastatingWounds,
      onToggle: () => update({ devastatingWounds: !value.devastatingWounds }),
    },
    {
      key: 'sustainedHits',
      label: t('sustainedHits'),
      active: value.sustainedHits && value.sustainedHits !== 'off',
      onToggle: () =>
        update({
          sustainedHits:
            value.sustainedHits && value.sustainedHits !== 'off' ? 'off' : '1',
        }),
      value: value.sustainedHits === 'off' ? '1' : value.sustainedHits,
      valueOptions: sustainedOptions,
      onValueChange: (v) => update({ sustainedHits: v }),
    },
    {
      key: 'critHit',
      label: t('criticalHit'),
      active: value.critHitEnabled,
      onToggle: () => update({ critHitEnabled: !value.critHitEnabled }),
      value: value.critHit?.toString() || '5',
      valueOptions: critOptions,
      onValueChange: (v) => update({ critHit: parseInt(v, 10) }),
    },
    {
      key: 'ignoresCover',
      label: t('ignoresCover'),
      active: value.ignoresCover,
      onToggle: () => update({ ignoresCover: !value.ignoresCover }),
    },
  ]

  const empty = isUnitBuffsEmpty(value)

  return (
    <div className={`unit-buffs-panel${empty ? ' is-empty' : ''}`}>
      <div className="reroll-row unit-buffs-rerolls">
        <div className="reroll-cell">
          <label>{t('hitReroll')}</label>
          <div className="reroll-cell-controls">
            <FormSelect
              options={localizedRerollOptions}
              value={
                localizedRerollOptions.find(
                  (o) => o.value === (value.hitReroll || 'no-reroll')
                ) || localizedRerollOptions[0]
              }
              onChange={(opt) => update({ hitReroll: opt.value })}
            />
          </div>
        </div>
        <div className="reroll-cell">
          <label>{t('woundReroll')}</label>
          <div className="reroll-cell-controls">
            <FormSelect
              options={localizedRerollOptions}
              value={
                localizedRerollOptions.find(
                  (o) => o.value === (value.woundReroll || 'no-reroll')
                ) || localizedRerollOptions[0]
              }
              onChange={(opt) => update({ woundReroll: opt.value })}
            />
          </div>
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={buffs} />
      </div>
    </div>
  )
}

export default UnitBuffsPanel
