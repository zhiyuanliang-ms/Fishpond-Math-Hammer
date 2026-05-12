import { FormSelect, BuffChipGroup } from '../ui'
import {
  toHitOptions,
  rerollOptions,
  antiOptions,
  critOptions,
  sustainedOptions
} from '../../lib/dice/options'
import { isValidDiceExpression } from '../../lib/dice'
import IntInput from './IntInput'
import ProfileCardShell from './ProfileCardShell'
import { useT } from './lang'

const toHitWithTorrentOptions = [
  ...toHitOptions,
  { value: 'torrent', label: 'Torrent' }
]

// Map reroll option values to lang keys
const rerollLangKeys = {
  'no-reroll': 'noReroll',
  'reroll-one': 'rerollOnes',
  'reroll-fail': 'rerollFails',
  'reroll-non-critical': 'rerollNonCritical',
}

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
  const { t } = useT()
  const update = (patch) => onChange({ ...profile, ...patch })

  const attacksValid = isValidDiceExpression(profile.attacks)
  const damageValid = isValidDiceExpression(profile.damage)


  const buffs = [
    {
      key: 'lethalHits',
      label: t('lethalHits'),
      active: profile.lethalHits,
      onToggle: () => update({ lethalHits: !profile.lethalHits })
    },
    {
      key: 'plusOneHit',
      label: t('plusOneHit'),
      active: profile.plusOneHit,
      onToggle: () => update({ plusOneHit: !profile.plusOneHit })
    },
    {
      key: 'ignoresCover',
      label: t('ignoresCover'),
      active: profile.ignoresCover,
      onToggle: () => update({ ignoresCover: !profile.ignoresCover })
    },
    {
      key: 'critHit',
      label: t('criticalHit'),
      active: profile.critHitEnabled,
      onToggle: () => update({ critHitEnabled: !profile.critHitEnabled }),
      value: profile.critHit?.toString() || '5',
      valueOptions: critOptions,
      onValueChange: (v) => update({ critHit: parseInt(v, 10) })
    },
    {
      key: 'sustainedHits',
      label: t('sustainedHits'),
      active: profile.sustainedHits && profile.sustainedHits !== 'off',
      onToggle: () =>
        update({ sustainedHits: profile.sustainedHits && profile.sustainedHits !== 'off' ? 'off' : '1' }),
      value: profile.sustainedHits === 'off' ? '1' : profile.sustainedHits,
      valueOptions: sustainedOptions,
      onValueChange: (v) => update({ sustainedHits: v })
    },
    {
      key: 'devastating',
      label: t('devastatingWounds'),
      active: profile.devastatingWounds,
      onToggle: () => update({ devastatingWounds: !profile.devastatingWounds })
    },
    {
      key: 'blast',
      label: t('blast'),
      active: profile.blast,
      onToggle: () => update({ blast: !profile.blast })
    },
    {
      key: 'plusOneWound',
      label: t('plusOneWound'),
      active: profile.plusOneWound,
      onToggle: () => update({ plusOneWound: !profile.plusOneWound })
    },
    {
      key: 'anti',
      label: t('anti'),
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

  const localizedToHitOptions = toHitWithTorrentOptions.map((o) =>
    o.value === 'torrent' ? { ...o, label: t('torrent') } : o
  )

  const localizedRerollOptions = rerollOptions.map((o) => ({
    ...o,
    label: t(rerollLangKeys[o.value] ?? o.value)
  }))

  return (
    <ProfileCardShell
      name={profile.name}
      placeholder={`${t('weapons')} ${index + 1}`}
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
          title="Number of weapons firing this profile (e.g. 5 bolters in a squad). Each weapon rolls its Attacks separately."
        >
          <label>{t('weapons')}</label>
          <IntInput
            min={1}
            fallback={1}
            value={profile.modelsFiring}
            onChange={(n) => update({ modelsFiring: n })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('attacks')}</label>
          <input
            type="text"
            className={attacksValid ? '' : 'invalid'}
            value={profile.attacks}
            onChange={(e) => update({ attacks: e.target.value })}
            placeholder="e.g. 4 or D6+1"
          />
        </div>
        <div className="stat-cell">
          <label>{t('bsws')}</label>
          <FormSelect
            variant="buff"
            options={localizedToHitOptions}
            value={
              profile.torrent
                ? localizedToHitOptions[localizedToHitOptions.length - 1]
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
          <label>{t('strength')}</label>
          <IntInput
            min={1}
            fallback={1}
            value={profile.strength}
            onChange={(n) => update({ strength: n })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('ap')}</label>
          <IntInput
            min={0}
            max={6}
            fallback={0}
            value={profile.ap}
            onChange={(n) => update({ ap: n })}
          />
        </div>
        <div className="stat-cell">
          <label>{t('damage')}</label>
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
          <label>{t('hitReroll')}</label>
          <FormSelect
            options={localizedRerollOptions}
            value={localizedRerollOptions.find((o) => o.value === profile.hitReroll) || localizedRerollOptions[0]}
            onChange={(opt) => update({ hitReroll: opt.value })}
            isDisabled={profile.torrent}
          />
        </div>
        <div className="reroll-cell">
          <label>{t('woundReroll')}</label>
          <FormSelect
            options={localizedRerollOptions}
            value={localizedRerollOptions.find((o) => o.value === profile.woundReroll) || localizedRerollOptions[0]}
            onChange={(opt) => update({ woundReroll: opt.value })}
          />
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={visibleBuffs} />
      </div>
    </ProfileCardShell>
  )
}

export default WeaponProfileCard
