// Full buff/reroll editor for a single weapon profile in V2.
// Lives inside the dialog opened from WeaponProfileCardV2.
// Mirrors the v1 inline editor but extracted into its own component so the
// summary card stays compact.

import { FormSelect, BuffChipGroup } from '../ui'
import {
  rerollOptions,
  randomRerollOptions,
  rerollScopeOptions,
  antiOptions,
  critOptions,
  sustainedOptions,
  cleaveOptions,
} from '../../lib/dice/options'
import { isValidDiceExpression, parseDiceExpression } from '../../lib/dice'
import { useT } from '../attackSim/lang'

const rerollLangKeys = {
  'no-reroll': 'noReroll',
  'reroll-one': 'rerollOnes',
  'reroll-fail': 'rerollFails',
  'reroll-non-critical': 'rerollNonCritical',
}

const randomRerollLangKeys = {
  'no-reroll': 'noReroll',
  'reroll-1-2-3': 'rerollLow123',
}

const scopeLangKeys = {
  all: 'rerollScopeAll',
  single: 'rerollScopeSingle',
}

const HIT_ONLY_BUFF_KEYS = new Set([
  'lethalHits',
  'plusOneHit',
  'critHit',
  'sustainedHits',
])

function WeaponBuffsEditor({ profile, onChange }) {
  const { t } = useT()
  const update = (patch) => onChange({ ...profile, ...patch })

  const attacksValid = isValidDiceExpression(profile.attacks)
  const damageValid = isValidDiceExpression(profile.damage)
  const attacksParsed = attacksValid ? parseDiceExpression(profile.attacks) : null
  const damageParsed = damageValid ? parseDiceExpression(profile.damage) : null
  const showAttackReroll = !!(attacksParsed && attacksParsed.count > 0)
  const showDamageReroll = !!(damageParsed && damageParsed.count > 0)

  const buffs = [
    {
      key: 'lethalHits',
      label: t('lethalHits'),
      active: profile.lethalHits,
      onToggle: () => update({ lethalHits: !profile.lethalHits }),
    },
    {
      key: 'plusOneHit',
      label: t('plusOneHit'),
      active: profile.plusOneHit,
      onToggle: () => update({ plusOneHit: !profile.plusOneHit }),
    },
    {
      key: 'ignoresCover',
      label: t('ignoresCover'),
      active: profile.ignoresCover,
      onToggle: () => update({ ignoresCover: !profile.ignoresCover }),
    },
    {
      key: 'critHit',
      label: t('criticalHit'),
      active: profile.critHitEnabled,
      onToggle: () => update({ critHitEnabled: !profile.critHitEnabled }),
      value: profile.critHit?.toString() || '5',
      valueOptions: critOptions,
      onValueChange: (v) => update({ critHit: parseInt(v, 10) }),
    },
    {
      key: 'sustainedHits',
      label: t('sustainedHits'),
      active: profile.sustainedHits && profile.sustainedHits !== 'off',
      onToggle: () =>
        update({
          sustainedHits:
            profile.sustainedHits && profile.sustainedHits !== 'off' ? 'off' : '1',
        }),
      value: profile.sustainedHits === 'off' ? '1' : profile.sustainedHits,
      valueOptions: sustainedOptions,
      onValueChange: (v) => update({ sustainedHits: v }),
    },
    {
      key: 'devastating',
      label: t('devastatingWounds'),
      active: profile.devastatingWounds,
      onToggle: () => update({ devastatingWounds: !profile.devastatingWounds }),
    },
    {
      key: 'blast',
      label: t('blast'),
      active: profile.blast,
      onToggle: () => update({ blast: !profile.blast }),
    },
    {
      key: 'cleave',
      label: t('cleave'),
      active: profile.cleaveEnabled,
      onToggle: () => update({ cleaveEnabled: !profile.cleaveEnabled }),
      value: profile.cleaveValue?.toString() || '1',
      valueOptions: cleaveOptions,
      onValueChange: (v) => update({ cleaveValue: parseInt(v, 10) }),
    },
    {
      key: 'plusOneWound',
      label: t('plusOneWound'),
      active: profile.plusOneWound,
      onToggle: () => update({ plusOneWound: !profile.plusOneWound }),
    },
    {
      key: 'anti',
      label: t('anti'),
      active: profile.antiEnabled,
      onToggle: () => update({ antiEnabled: !profile.antiEnabled }),
      value: profile.antiValue?.toString() || '4',
      valueOptions: antiOptions,
      onValueChange: (v) => update({ antiValue: parseInt(v, 10) }),
    },
  ]

  const visibleBuffs = profile.torrent
    ? buffs.filter((b) => !HIT_ONLY_BUFF_KEYS.has(b.key))
    : buffs

  const localizedRerollOptions = rerollOptions.map((o) => ({
    ...o,
    label: t(rerollLangKeys[o.value] ?? o.value),
  }))

  const localizedRandomRerollOptions = randomRerollOptions.map((o) => ({
    ...o,
    label: t(randomRerollLangKeys[o.value] ?? o.value),
  }))

  const localizedScopeOptions = rerollScopeOptions.map((o) => ({
    ...o,
    label: t(scopeLangKeys[o.value] ?? o.value),
  }))

  const portalProps = typeof document !== 'undefined'
    ? { menuPortalTarget: document.body, menuPosition: 'fixed' }
    : {}

  const renderRerollCell = (label, value, scope, options, onValueChange, onScopeChange) => {
    const active = value && value !== 'no-reroll'
    return (
      <div className="reroll-cell">
        <label>{label}</label>
        <div className="reroll-cell-controls">
          <FormSelect
            options={options}
            value={options.find((o) => o.value === value) || options[0]}
            onChange={(opt) => onValueChange(opt.value)}
            {...portalProps}
          />
          {active && (
            <div
              className="reroll-scope-toggle"
              role="radiogroup"
              aria-label={label}
              title={t('rerollScopeTooltip')}
            >
              {localizedScopeOptions.map((opt) => {
                const selected = (scope || 'all') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`reroll-scope-option${selected ? ' selected' : ''}`}
                    onClick={() => onScopeChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="weapon-buffs-editor">
      <div className="reroll-row">
        {!profile.torrent &&
          renderRerollCell(
            t('hitReroll'),
            profile.hitReroll,
            profile.hitRerollScope,
            localizedRerollOptions,
            (v) => update({ hitReroll: v }),
            (v) => update({ hitRerollScope: v })
          )}
        {renderRerollCell(
          t('woundReroll'),
          profile.woundReroll,
          profile.woundRerollScope,
          localizedRerollOptions,
          (v) => update({ woundReroll: v }),
          (v) => update({ woundRerollScope: v })
        )}
        {showAttackReroll &&
          renderRerollCell(
            t('attackReroll'),
            profile.attackReroll,
            profile.attackRerollScope,
            localizedRandomRerollOptions,
            (v) => update({ attackReroll: v }),
            (v) => update({ attackRerollScope: v })
          )}
        {showDamageReroll &&
          renderRerollCell(
            t('damageReroll'),
            profile.damageReroll,
            profile.damageRerollScope,
            localizedRandomRerollOptions,
            (v) => update({ damageReroll: v }),
            (v) => update({ damageRerollScope: v })
          )}
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={visibleBuffs} />
      </div>
    </div>
  )
}

export default WeaponBuffsEditor
