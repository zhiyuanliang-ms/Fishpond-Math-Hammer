// Full per-target buff editor. Lives in its own component so the slim card
// can stay focused on stats and its active-buff summary.

import { BuffChipGroup } from '../ui'
import { useT } from '../attackSim/lang'

function TargetBuffsEditor({ profile, onChange }) {
  const { t } = useT()
  const update = (patch) => onChange({ ...profile, ...patch })

  const buffs = [
    // FNP stays per-target — it's intrinsic to the model type, not a
    // unit-wide aura in practice.
    {
      key: 'fnp',
      label: t('fnp'),
      active: !!profile.fnp,
      onToggle: () => update({ fnp: profile.fnp ? 0 : 5 }),
      value: (profile.fnp || 5).toString(),
      valueOptions: [
        { value: '4', label: '4+' },
        { value: '5', label: '5+' },
        { value: '6', label: '6+' },
      ],
      onValueChange: (v) => update({ fnp: parseInt(v, 10) }),
    },
    {
      key: 'fnpMortal',
      label: t('fnpMortal'),
      active: !!profile.fnpMortal,
      onToggle: () => update({ fnpMortal: profile.fnpMortal ? 0 : 5 }),
      value: (profile.fnpMortal || 5).toString(),
      valueOptions: [
        { value: '4', label: '4+' },
        { value: '5', label: '5+' },
        { value: '6', label: '6+' },
      ],
      onValueChange: (v) => update({ fnpMortal: parseInt(v, 10) }),
    },
    {
      key: 'rerollSaveOnes',
      label: t('rerollSaveOnes'),
      active: !!profile.rerollSaveOnes,
      onToggle: () => update({ rerollSaveOnes: !profile.rerollSaveOnes }),
    },
    {
      key: 'minusOneToHit',
      label: t('minusOneHit'),
      active: profile.minusOneToHit,
      onToggle: () => update({ minusOneToHit: !profile.minusOneToHit }),
    },
    {
      key: 'minusOneToWound',
      label: t('minusOneWound'),
      active: profile.minusOneToWound,
      onToggle: () =>
        update({
          minusOneToWound: !profile.minusOneToWound,
          minusOneToWoundIfStronger: false,
        }),
    },
    {
      key: 'minusOneToWoundIfStronger',
      label: t('minusOneWoundST'),
      active: profile.minusOneToWoundIfStronger,
      onToggle: () =>
        update({
          minusOneToWoundIfStronger: !profile.minusOneToWoundIfStronger,
          minusOneToWound: false,
        }),
    },
    {
      key: 'halfDamage',
      label: t('halfDamage'),
      active: profile.halfDamage,
      onToggle: () =>
        update({
          halfDamage: !profile.halfDamage,
          minusOneDamage: false,
          damageOne: false,
        }),
    },
    {
      key: 'minusOneDamage',
      label: t('damageMinus1'),
      active: profile.minusOneDamage,
      onToggle: () =>
        update({
          minusOneDamage: !profile.minusOneDamage,
          halfDamage: false,
          damageOne: false,
        }),
    },
    {
      key: 'damageOne',
      label: t('damageOne'),
      active: profile.damageOne,
      onToggle: () =>
        update({
          damageOne: !profile.damageOne,
          halfDamage: false,
          minusOneDamage: false,
        }),
    },
    {
      key: 'benefitOfCover',
      label: t('benefitOfCover'),
      active: profile.benefitOfCover,
      onToggle: () => update({ benefitOfCover: !profile.benefitOfCover }),
    },
    {
      key: 'minusOneAp',
      label: t('minusOneAp'),
      active: profile.minusOneAp,
      onToggle: () => update({ minusOneAp: !profile.minusOneAp }),
    },
  ]

  return (
    <div className="weapon-buffs-editor">
      <div className="buff-row">
        <BuffChipGroup buffs={buffs} />
      </div>
    </div>
  )
}

export default TargetBuffsEditor
