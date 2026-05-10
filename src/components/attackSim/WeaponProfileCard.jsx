import { ArrowUp, ArrowDown, Copy, X } from 'lucide-react'
import { FormSelect } from '../ui'
import {
  toHitOptions,
  rerollOptions,
  antiOptions,
  critOptions
} from '../../lib/dice/options'
import { isValidDiceExpression } from '../../lib/dice'
import BuffChipGroup from './BuffChipGroup'
import IntInput from './IntInput'
const sustainedOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' }
]

const toHitWithTorrentOptions = [
  ...toHitOptions,
  { value: 'torrent', label: 'Torrent' }
]

// Editor for a single weapon profile. Shows the basic stat line on top,
// rerolls in the middle and a chip-style buff selector at the bottom.
function WeaponProfileCard({
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

  const attacksValid = isValidDiceExpression(profile.attacks)
  const damageValid = isValidDiceExpression(profile.damage)


  const buffs = [
    {
      key: 'lethalHits',
      label: 'LETHAL HITS',
      active: profile.lethalHits,
      onToggle: () => update({ lethalHits: !profile.lethalHits })
    },
    {
      key: 'plusOneHit',
      label: '+1 HIT',
      active: profile.plusOneHit,
      onToggle: () => update({ plusOneHit: !profile.plusOneHit })
    },
    {
      key: 'ignoresCover',
      label: 'IGNORES COVER',
      active: profile.ignoresCover,
      onToggle: () => update({ ignoresCover: !profile.ignoresCover })
    },
    {
      key: 'critHit',
      label: 'CRITICAL HIT',
      active: profile.critHitEnabled,
      onToggle: () => update({ critHitEnabled: !profile.critHitEnabled }),
      value: profile.critHit?.toString() || '5',
      valueOptions: critOptions,
      onValueChange: (v) => update({ critHit: parseInt(v, 10) })
    },
    {
      key: 'sustainedHits',
      label: 'SUSTAINED HITS',
      active: profile.sustainedHits && profile.sustainedHits !== 'off',
      onToggle: () =>
        update({ sustainedHits: profile.sustainedHits && profile.sustainedHits !== 'off' ? 'off' : '1' }),
      value: profile.sustainedHits === 'off' ? '1' : profile.sustainedHits,
      valueOptions: sustainedOptions,
      onValueChange: (v) => update({ sustainedHits: v })
    },
    {
      key: 'devastating',
      label: 'DEVASTATING WOUNDS',
      active: profile.devastatingWounds,
      onToggle: () => update({ devastatingWounds: !profile.devastatingWounds })
    },
    {
      key: 'blast',
      label: 'BLAST',
      active: profile.blast,
      onToggle: () => update({ blast: !profile.blast })
    },
    {
      key: 'plusOneWound',
      label: '+1 WOUND',
      active: profile.plusOneWound,
      onToggle: () => update({ plusOneWound: !profile.plusOneWound })
    },
    {
      key: 'anti',
      label: 'ANTI',
      active: profile.antiEnabled,
      onToggle: () => update({ antiEnabled: !profile.antiEnabled }),
      value: profile.antiValue?.toString() || '4',
      valueOptions: antiOptions,
      onValueChange: (v) => update({ antiValue: parseInt(v, 10) })
    }
  ]

  // Buff keys that only affect the hit roll (auto-bypassed by Torrent).
  // Hidden when the weapon is set to Torrent so users aren't presented with
  // toggles that have no effect on the simulation.
  const HIT_ONLY_BUFF_KEYS = new Set([
    'lethalHits',
    'plusOneHit',
    'critHit',
    'sustainedHits'
  ])
  const visibleBuffs = profile.torrent
    ? buffs.filter((b) => !HIT_ONLY_BUFF_KEYS.has(b.key))
    : buffs

  const findOpt = (opts, v) => opts.find((o) => o.value === v.toString()) || opts[0]

  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <input
          type="text"
          className="profile-name"
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={`Weapon ${index + 1}`}
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
        <div
          className="stat-cell"
          title="Number of weapons firing this profile (e.g. 5 bolters in a squad). Each weapon rolls its Attacks separately."
        >
          <label>Weapons</label>
          <IntInput
            min={1}
            fallback={1}
            value={profile.modelsFiring}
            onChange={(n) => update({ modelsFiring: n })}
          />
        </div>
        <div className="stat-cell">
          <label>Attacks</label>
          <input
            type="text"
            className={attacksValid ? '' : 'invalid'}
            value={profile.attacks}
            onChange={(e) => update({ attacks: e.target.value })}
            placeholder="e.g. 4 or D6+1"
          />
        </div>
        <div className="stat-cell">
          <label>BS/WS</label>
          <FormSelect
            variant="buff"
            options={toHitWithTorrentOptions}
            value={
              profile.torrent
                ? toHitWithTorrentOptions[toHitWithTorrentOptions.length - 1]
                : findOpt(toHitOptions, profile.toHit)
            }
            onChange={(opt) => {
              if (opt.value === 'torrent') {
                update({ torrent: true })
              } else {
                update({ torrent: false, toHit: parseInt(opt.value, 10) })
              }
            }}
          />
        </div>
        <div className="stat-cell">
          <label>Strength</label>
          <IntInput
            min={1}
            fallback={1}
            value={profile.strength}
            onChange={(n) => update({ strength: n })}
          />
        </div>
        <div className="stat-cell">
          <label>AP</label>
          <IntInput
            min={0}
            max={6}
            fallback={0}
            value={profile.ap}
            onChange={(n) => update({ ap: n })}
          />
        </div>
        <div className="stat-cell">
          <label>Damage</label>
          <input
            type="text"
            className={damageValid ? '' : 'invalid'}
            value={profile.damage}
            onChange={(e) => update({ damage: e.target.value })}
            placeholder="e.g. 1 or D3+3"
          />
        </div>
      </div>

      <div className="reroll-row">
        <div className="reroll-cell">
          <label>Hit Reroll</label>
          <FormSelect
            options={rerollOptions}
            value={rerollOptions.find((o) => o.value === profile.hitReroll) || rerollOptions[0]}
            onChange={(opt) => update({ hitReroll: opt.value })}
            isDisabled={profile.torrent}
          />
        </div>
        <div className="reroll-cell">
          <label>Wound Reroll</label>
          <FormSelect
            options={rerollOptions}
            value={rerollOptions.find((o) => o.value === profile.woundReroll) || rerollOptions[0]}
            onChange={(opt) => update({ woundReroll: opt.value })}
          />
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={visibleBuffs} />
      </div>
    </div>
  )
}

export default WeaponProfileCard
