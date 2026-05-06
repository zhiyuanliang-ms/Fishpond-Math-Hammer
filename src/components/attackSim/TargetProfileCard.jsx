import { ArrowUp, ArrowDown, Copy, X } from 'lucide-react'
import { FormSelect } from '../ui'
import {
  saveOptions,
  fnpOptions,
  saveRerollOptions
} from '../../lib/dice/options'
import BuffChipGroup from './BuffChipGroup'
import IntInput from './IntInput'

const invulnOptions = [
  { value: '0', label: '—' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' }
]

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
  const update = (patch) => onChange({ ...profile, ...patch })

  const buffs = [
    {
      key: 'fnp',
      label: 'FNP',
      active: !!profile.fnp,
      onToggle: () => update({ fnp: profile.fnp ? 0 : 5 }),
      value: (profile.fnp || 5).toString(),
      valueOptions: fnpOptions,
      onValueChange: (v) => update({ fnp: parseInt(v, 10) })
    },
    {
      key: 'fnpMortal',
      label: 'FNP vs MORTAL',
      active: !!profile.fnpMortal,
      onToggle: () => update({ fnpMortal: profile.fnpMortal ? 0 : 5 }),
      value: (profile.fnpMortal || 5).toString(),
      valueOptions: fnpOptions,
      onValueChange: (v) => update({ fnpMortal: parseInt(v, 10) })
    },
    {
      key: 'minusOneToHit',
      label: '−1 TO HIT',
      active: profile.minusOneToHit,
      onToggle: () => update({ minusOneToHit: !profile.minusOneToHit })
    },
    {
      key: 'minusOneToWound',
      label: '−1 TO WOUND',
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
      label: '−1 WOUND (S>T)',
      active: profile.minusOneToWoundIfStronger,
      onToggle: () =>
        update({
          minusOneToWoundIfStronger: !profile.minusOneToWoundIfStronger,
          minusOneToWound: false
        })
    },
    {
      key: 'halfDamage',
      label: 'HALF DAMAGE',
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
      label: 'DAMAGE −1',
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
      label: 'DAMAGE = 1',
      active: profile.damageOne,
      onToggle: () =>
        update({
          damageOne: !profile.damageOne,
          halfDamage: false,
          minusOneDamage: false
        })
    }
  ]

  const findOpt = (opts, v) => opts.find((o) => o.value === v.toString()) || opts[0]

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <input
          type="text"
          className="profile-name"
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={`Profile ${index + 1}`}
        />
        <div className="profile-card-actions">
          <button type="button" title="Move up" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp size={14} />
          </button>
          <button type="button" title="Move down" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown size={14} />
          </button>
          <button type="button" title="Duplicate" onClick={onDuplicate}>
            <Copy size={14} />
          </button>
          <button type="button" className="danger" title="Remove" onClick={onRemove}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="stat-line">
        <div className="stat-cell">
          <label>Models</label>
          <IntInput
            min={1}
            max={50}
            fallback={1}
            value={profile.models}
            onChange={(n) => update({ models: n })}
          />
        </div>
        <div className="stat-cell">
          <label>Toughness</label>
          <IntInput
            min={1}
            fallback={1}
            value={profile.toughness}
            onChange={(n) => update({ toughness: n })}
          />
        </div>
        <div className="stat-cell">
          <label>Wounds</label>
          <IntInput
            min={1}
            max={50}
            fallback={1}
            value={profile.wounds}
            onChange={(n) => update({ wounds: n })}
          />
        </div>
        <div className="stat-cell">
          <label>Sv</label>
          <FormSelect
            variant="buff"
            options={saveOptions}
            value={findOpt(saveOptions, profile.save)}
            onChange={(opt) => update({ save: parseInt(opt.value, 10) })}
          />
        </div>
        <div className="stat-cell">
          <label>Inv</label>
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
          <label>Save Reroll</label>
          <FormSelect
            options={saveRerollOptions}
            value={saveRerollOptions.find((o) => o.value === profile.saveReroll) || saveRerollOptions[0]}
            onChange={(opt) => update({ saveReroll: opt.value })}
          />
        </div>
      </div>

      <div className="buff-row">
        <label className="buff-row-label">Buffs</label>
        <BuffChipGroup buffs={buffs} />
      </div>
    </div>
  )
}

export default TargetProfileCard
