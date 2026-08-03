// Slim weapon profile card for V2:
//   1. stat-line (Weapons / Attacks / BS-WS / S / AP / D)  — same as v1
//   2. Read-only summary of active buffs + rerolls (built from the effective
//      profile, i.e. the weapon merged with the unit-wide buff layer, so
//      unit-granted buffs show up here too)
//   3. "Edit buffs…" button that opens WeaponBuffsDialog
//
// The summary is built from the effective profile (weapon merged with the
// unit-wide buffs). The `upgrades` map highlights any chip that the unit
// layer freshly granted or strengthened.

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { FormSelect } from '../ui'
import { toHitOptions } from '../../lib/dice/options'
import { isValidDiceExpression, mergeWeaponWithUnit } from '../../lib/dice'
import IntInput from '../attackSim/IntInput'
import ProfileCardShell from '../attackSim/ProfileCardShell'
import { useT } from '../attackSim/lang'
import WeaponBuffsDialog from './WeaponBuffsDialog'

const toHitWithTorrentOptions = [
  ...toHitOptions,
  { value: 'torrent', label: 'Torrent' },
]

const rerollShort = {
  'reroll-one': '1s',
  'reroll-fail': 'Fails',
  'reroll-non-critical': 'Non-Crit',
  'reroll-1-2-3': '≤3',
}

// Build the list of summary chips shown on the collapsed card.
function buildSummary(profile, upgrades, t) {
  const chips = []
  const push = (key, label, opts = {}) =>
    chips.push({ key, label, upgraded: !!upgrades?.[key], ...opts })

  if (profile.torrent) push('torrent', t('torrent'))
  if (profile.lethalHits) push('lethalHits', t('lethalHits'))
  if (profile.plusOneAttack) push('plusOneAttack', t('plusOneAttack'))
  if (profile.plusOneHit) push('plusOneHit', t('plusOneHit'))
  if (profile.critHitEnabled)
    push('critHit', `${t('criticalHit')} ${profile.critHit}+`)
  if (profile.sustainedHits && profile.sustainedHits !== 'off')
    push('sustainedHits', `${t('sustainedHits')} ${profile.sustainedHits}`)
  if (profile.ignoresCover) push('ignoresCover', t('ignoresCover'))
  if (profile.devastatingWounds) push('devastating', t('devastatingWounds'))
  if (profile.blast) push('blast', t('blast'))
  if (profile.cleaveEnabled) push('cleave', `${t('cleave')} ${profile.cleaveValue}`)
  if (profile.plusOneWound) push('plusOneWound', t('plusOneWound'))
  if (profile.antiEnabled)
    push('anti', `${t('anti')} ${profile.antiValue}+`)

  // Reroll summary entries
  const pushReroll = (key, modeKey, mode, scope, label) => {
    if (!mode || mode === 'no-reroll') return
    const short = rerollShort[mode] || mode
    const scopeTag = scope === 'single' ? ` · ${t('rerollScopeSingle')}` : ''
    push(modeKey, `${label}: ${short}${scopeTag}`, { isReroll: true, key })
  }
  if (!profile.torrent)
    pushReroll('hitReroll-chip', 'hitReroll', profile.hitReroll, profile.hitRerollScope, t('hitReroll'))
  pushReroll('woundReroll-chip', 'woundReroll', profile.woundReroll, profile.woundRerollScope, t('woundReroll'))
  pushReroll('attackReroll-chip', 'attackReroll', profile.attackReroll, profile.attackRerollScope, t('attackReroll'))
  pushReroll('damageReroll-chip', 'damageReroll', profile.damageReroll, profile.damageRerollScope, t('damageReroll'))

  return chips
}

function WeaponProfileCardV2({
  profile,
  index,
  total,
  upgrades,
  unitBuffs,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const update = (patch) => onChange({ ...profile, ...patch })

  const attacksValid = isValidDiceExpression(profile.attacks)
  const damageValid = isValidDiceExpression(profile.damage)

  const findOpt = (opts, v) =>
    opts.find((o) => o.value === v.toString()) || opts[0]

  const localizedToHitOptions = toHitWithTorrentOptions.map((o) =>
    o.value === 'torrent' ? { ...o, label: t('torrent') } : o
  )

  // Build the summary from the effective profile so buffs granted purely by
  // the unit-wide layer (which aren't on the raw weapon) still appear.
  const summary = buildSummary(mergeWeaponWithUnit(profile, unitBuffs), upgrades, t)

  return (
    <>
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
                  update({
                    torrent: true,
                    hitReroll: 'no-reroll',
                    hitRerollScope: 'all',
                  })
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

        <div className="weapon-summary-row">
          <div className="weapon-summary-chips">
            {summary.length === 0 ? (
              <span className="weapon-summary-empty">{t('noWeaponBuffs')}</span>
            ) : (
              summary.map((chip) => (
                <span
                  key={chip.key}
                  className={
                    'summary-chip' +
                    (chip.upgraded ? ' summary-chip--upgraded' : '') +
                    (chip.isReroll ? ' summary-chip--reroll' : '')
                  }
                  title={chip.upgraded ? t('unitUpgradedTag') : undefined}
                >
                  {chip.label}
                  {chip.upgraded && <span className="summary-chip-mark"> ↑</span>}
                </span>
              ))
            )}
          </div>
          <button
            type="button"
            className="weapon-edit-buffs-btn"
            onClick={() => setEditing(true)}
          >
            <Settings size={14} />
            <span>{t('editBuffs')}</span>
          </button>
        </div>
      </ProfileCardShell>

      {editing && (
        <WeaponBuffsDialog
          profile={profile}
          onChange={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

export default WeaponProfileCardV2
