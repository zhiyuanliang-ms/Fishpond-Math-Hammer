// Slim defender profile card for V2:
//   1. stat-line (Models / Toughness / Wounds / Sv / Inv) — same as v1
//   2. Read-only summary of active defensive buffs
//   3. "Edit buffs…" button that opens TargetBuffsDialog
//
// Mirrors WeaponProfileCardV2. The `upgrades` map highlights chips that the
// defender unit-buff layer either added or strengthened.

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { FormSelect } from '../ui'
import { saveOptions } from '../../lib/dice/options'
import IntInput from '../attackSim/IntInput'
import ProfileCardShell from '../attackSim/ProfileCardShell'
import { useT } from '../attackSim/lang'
import TargetBuffsDialog from './TargetBuffsDialog'

const invulnOptions = [
  { value: '0', label: '—' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' },
]

// Build the list of summary chips for the collapsed defender card.
function buildSummary(profile, upgrades, t) {
  const chips = []
  const push = (key, label) =>
    chips.push({ key, label, upgraded: !!upgrades?.[key] })

  if (profile.fnp) push('fnp', `${t('fnp')} ${profile.fnp}+`)
  if (profile.fnpMortal) push('fnpMortal', `${t('fnpMortal')} ${profile.fnpMortal}+`)
  if (profile.rerollSaveOnes) push('rerollSaveOnes', t('rerollSaveOnes'))
  if (profile.benefitOfCover) push('benefitOfCover', t('benefitOfCover'))
  if (profile.minusOneToHit) push('minusOneToHit', t('minusOneHit'))
  if (profile.minusOneToWound) push('minusOneToWound', t('minusOneWound'))
  if (profile.minusOneToWoundIfStronger)
    push('minusOneToWoundIfStronger', t('minusOneWoundST'))
  if (profile.halfDamage) push('halfDamage', t('halfDamage'))
  if (profile.minusOneDamage) push('minusOneDamage', t('damageMinus1'))
  if (profile.damageOne) push('damageOne', t('damageOne'))

  // Also surface buffs added purely by the unit layer (not on the profile
  // itself) so the user can see what's effectively in play.
  if (upgrades) {
    const has = new Set(chips.map((c) => c.key))
    if (upgrades.rerollSaveOnes && !has.has('rerollSaveOnes'))
      push('rerollSaveOnes', t('rerollSaveOnes'))
    if (upgrades.benefitOfCover && !has.has('benefitOfCover'))
      push('benefitOfCover', t('benefitOfCover'))
    if (upgrades.minusOneToHit && !has.has('minusOneToHit'))
      push('minusOneToHit', t('minusOneHit'))
    if (upgrades.minusOneToWound && !has.has('minusOneToWound'))
      push('minusOneToWound', t('minusOneWound'))
    if (upgrades.minusOneToWoundIfStronger && !has.has('minusOneToWoundIfStronger'))
      push('minusOneToWoundIfStronger', t('minusOneWoundST'))
    if (upgrades.halfDamage && !has.has('halfDamage'))
      push('halfDamage', t('halfDamage'))
    if (upgrades.minusOneDamage && !has.has('minusOneDamage'))
      push('minusOneDamage', t('damageMinus1'))
    if (upgrades.damageOne && !has.has('damageOne'))
      push('damageOne', t('damageOne'))
  }

  return chips
}

function TargetProfileCardV2({
  profile,
  index,
  total,
  upgrades,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const update = (patch) => onChange({ ...profile, ...patch })

  const findOpt = (opts, v) =>
    opts.find((o) => o.value === v.toString()) || opts[0]

  const summary = buildSummary(profile, upgrades, t)

  return (
    <>
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

        <div className="weapon-summary-row">
          <div className="weapon-summary-chips">
            {summary.length === 0 ? (
              <span className="weapon-summary-empty">{t('noWeaponBuffs')}</span>
            ) : (
              summary.map((chip) => (
                <span
                  key={chip.key}
                  className={
                    'summary-chip' + (chip.upgraded ? ' summary-chip--upgraded' : '')
                  }
                  title={chip.upgraded ? t('unitGrantedTag') : undefined}
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
        <TargetBuffsDialog
          profile={profile}
          onChange={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

export default TargetProfileCardV2
