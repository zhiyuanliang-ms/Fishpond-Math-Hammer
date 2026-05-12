import { FormSelect, BuffChipGroup } from '../ui'
import {
  saveOptions,
  fnpOptions,
  saveRerollOptions
} from '../../lib/dice/options'
import IntInput from './IntInput'
import ProfileCardShell from './ProfileCardShell'
import { useT } from './lang'

const invulnOptions = [
  { value: '0', label: '—' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' }
]

// Map save reroll option values to lang keys
const saveRerollLangKeys = {
  'no-reroll': 'noReroll',
  'reroll-one': 'rerollOne',
}

// Editor for a single defending unit "model profile" (a unit can contain
// several different model types — e.g. squad members + a leader).
function TargetProfileCard({
  profile,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate
}) {
  const { t } = useT()
  const update = (patch) => onChange({ ...profile, ...patch })

  const buffs = [
    {
      key: 'fnp',
      label: t('fnp'),
      active: !!profile.fnp,
      onToggle: () => update({ fnp: profile.fnp ? 0 : 5 }),
      value: (profile.fnp || 5).toString(),
      valueOptions: fnpOptions,
      onValueChange: (v) => update({ fnp: parseInt(v, 10) })
    },
    {
      key: 'fnpMortal',
      label: t('fnpMortal'),
      active: !!profile.fnpMortal,
      onToggle: () => update({ fnpMortal: profile.fnpMortal ? 0 : 5 }),
      value: (profile.fnpMortal || 5).toString(),
      valueOptions: fnpOptions,
      onValueChange: (v) => update({ fnpMortal: parseInt(v, 10) })
    },
    {
      key: 'minusOneToHit',
      label: t('minusOneHit'),
      active: profile.minusOneToHit,
      onToggle: () => update({ minusOneToHit: !profile.minusOneToHit })
    },
    {
      key: 'minusOneToWound',
      label: t('minusOneWound'),
      active: profile.minusOneToWound,
      onToggle: () =>
        update({
          minusOneToWound: !profile.minusOneToWound,
          // Mutually exclusive with the conditional −1-wound buff.
          minusOneToWoundIfStronger: false
        })
    },
    {
      key: 'minusOneToWoundIfStronger',
      label: t('minusOneWoundST'),
      active: profile.minusOneToWoundIfStronger,
      onToggle: () =>
        update({
          minusOneToWoundIfStronger: !profile.minusOneToWoundIfStronger,
          minusOneToWound: false
        })
    },
    {
      key: 'halfDamage',
      label: t('halfDamage'),
      active: profile.halfDamage,
      onToggle: () =>
        update({
          halfDamage: !profile.halfDamage,
          // Mutually exclusive with the other damage-reduction buffs.
          minusOneDamage: false,
          damageOne: false
        })
    },
    {
      key: 'minusOneDamage',
      label: t('damageMinus1'),
      active: profile.minusOneDamage,
      onToggle: () =>
        update({
          minusOneDamage: !profile.minusOneDamage,
          halfDamage: false,
          damageOne: false
        })
    },
    {
      key: 'damageOne',
      label: t('damageOne'),
      active: profile.damageOne,
      onToggle: () =>
        update({
          damageOne: !profile.damageOne,
          halfDamage: false,
          minusOneDamage: false
        })
    },
    {
      key: 'benefitOfCover',
      label: t('benefitOfCover'),
      active: profile.benefitOfCover,
      onToggle: () => update({ benefitOfCover: !profile.benefitOfCover })
    }
  ]

  const findOpt = (opts, v) => opts.find((o) => o.value === v.toString()) || opts[0]

  const localizedSaveRerollOptions = saveRerollOptions.map((o) => ({
    ...o,
    label: t(saveRerollLangKeys[o.value] ?? o.value)
  }))

  return (
    <ProfileCardShell
      name={profile.name}
      placeholder={`${t('thProfile')} ${index + 1}`}
      index={index}
      total={total}
      onNameChange={(name) => update({ name })}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDuplicate={onDuplicate}
      onRemove={onRemove}
    >
      <div className="stat-line">
        <div
          className="stat-cell"
          title="Number of models in the target unit with this profile (used for Blast and to decide when the unit is wiped)."
        >
          <label>{t('models')}</label>
          <IntInput
            min={1}
            max={50}
            fallback={1}
            value={profile.models}
            onChange={(n) => update({ models: n })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('toughness')}</label>
          <IntInput
            min={1}
            fallback={1}
            value={profile.toughness}
            onChange={(n) => update({ toughness: n })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('wounds')}</label>
          <IntInput
            min={1}
            max={50}
            fallback={1}
            value={profile.wounds}
            onChange={(n) => update({ wounds: n })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('sv')}</label>
          <FormSelect
            variant="buff"
            options={saveOptions}
            value={findOpt(saveOptions, profile.save)}
            onChange={(opt) => update({ save: parseInt(opt.value, 10) })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('inv')}</label>
          <FormSelect
            variant="buff"
            options={invulnOptions}
            value={findOpt(invulnOptions, profile.invulnSave || 0)}
            onChange={(opt) => update({ invulnSave: parseInt(opt.value, 10) })}
          />
        </div>
      </div>

      <div className="reroll-row">
        <div className="reroll-cell">
          <label>{t('saveReroll')}</label>
          <FormSelect
            options={localizedSaveRerollOptions}
            value={localizedSaveRerollOptions.find((o) => o.value === profile.saveReroll) || localizedSaveRerollOptions[0]}
            onChange={(opt) => update({ saveReroll: opt.value })}
          />
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={buffs} />
      </div>
    </ProfileCardShell>
  )
}

export default TargetProfileCard
