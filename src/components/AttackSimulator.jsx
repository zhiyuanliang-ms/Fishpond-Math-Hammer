import { useEffect, useState } from 'react'
import { ClipboardCopy } from 'lucide-react'
import {
  simulateMultiUnitAttack,
  isValidDiceExpression,
  makeTargetUnitBuffs,
  mergeTargetWithUnit,
} from '../lib/dice'
import {
  listSavedWeaponSets,
  saveNamedWeaponSet,
  loadNamedWeaponSet,
  listSavedTargetSets,
  saveNamedTargetSet,
  loadNamedTargetSet,
} from '../lib/attackSimStorage'
import {
  validateTargetShape,
  validateWeaponShape,
} from '../lib/attackSimProfileLibrary'
import {
  createDefaultAttackerProfile,
  createProfileId,
  hydrateAttackerProfile,
  hydrateDefenderProfile,
  makeTarget,
  serializeAttackerProfile,
  serializeDefenderProfile,
} from '../lib/attackSimProfiles'
import { buildMultiUnitAttackSimReport } from '../lib/attackSimReport'
import { StatCard, StatGrid, DistributionChart } from './ui'
import SavedSetControls from './ui/SavedSetControls'
import ProfileNameDialog from './attackSimulator/ProfileNameDialog'
import AttackerUnitCard from './attackSimulator/AttackerUnitCard'
import { useT } from './attackSim/lang'
import { DefenderProfileWorkspace } from './attackSimulator/ProfileWorkspaces'

const createAttackerUnit = () => ({
  id: createProfileId(),
  name: '',
  ...createDefaultAttackerProfile(),
})

function AttackSimulator() {
  const { t } = useT()
  const [attackerUnits, setAttackerUnits] = useState(() => [createAttackerUnit()])
  const [targets, setTargets] = useState(() => [
    makeTarget({ name: 'Profile 1' }),
  ])
  const [defenderUnitBuffs, setDefenderUnitBuffs] = useState(() =>
    makeTargetUnitBuffs()
  )
  const [highPrecision, setHighPrecision] = useState(false)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [savedWeaponSets, setSavedWeaponSets] = useState(() => listSavedWeaponSets())
  const [savedTargetSets, setSavedTargetSets] = useState(() => listSavedTargetSets())
  const [selectedTargetSet, setSelectedTargetSet] = useState('')
  const [namingProfile, setNamingProfile] = useState(null)
  const namingAttacker = namingProfile?.side === 'attacker'
  const namingUnit = attackerUnits.find((unit) => unit.id === namingProfile?.unitId)
  const namingSelectedName = namingAttacker ? namingUnit?.name || '' : selectedTargetSet

  useEffect(() => {
    if (!toast) return
    const handle = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(handle)
  }, [toast])

  const invalidateResult = () => {
    setResult(null)
    setError(null)
  }

  const refreshWeaponSets = () => setSavedWeaponSets(listSavedWeaponSets())

  const updateAttackerUnit = (unitId, patch) => {
    setAttackerUnits((current) =>
      current.map((unit) => unit.id === unitId ? { ...unit, ...patch } : unit)
    )
    invalidateResult()
  }

  const handleSaveWeaponSet = (unitId, name) => {
    const unit = attackerUnits.find((entry) => entry.id === unitId)
    if (!unit) throw new Error(t('profileSaveFailed'))
    if (!saveNamedWeaponSet(name, serializeAttackerProfile(unit))) {
      throw new Error(t('storageUnavailable'))
    }
    refreshWeaponSets()
    setAttackerUnits((current) =>
      current.map((entry) => entry.id === unitId ? { ...entry, name } : entry)
    )
    setToast({ kind: 'success', message: t('profileSaved', t('attackerProfile'), name) })
  }

  const handleLoadWeaponSet = (unitId, name) => {
    if (!name) {
      updateAttackerUnit(unitId, { name: '' })
      return
    }
    const data = loadNamedWeaponSet(name)
    if (!data || !Array.isArray(data.weapons) || data.weapons.length === 0) {
      setToast({ kind: 'error', message: t('profileLoadFailed', t('attackerProfile'), name) })
      return
    }
    for (let i = 0; i < data.weapons.length; i++) {
      const err = validateWeaponShape(data.weapons[i])
      if (err) {
        setToast({ kind: 'error', message: t('invalidProfile', t('attackerProfile'), `weapons[${i}] ${err}`) })
        return
      }
    }
    const hydrated = hydrateAttackerProfile(data)
    updateAttackerUnit(unitId, { ...hydrated, name })
    setToast({ kind: 'success', message: t('profileLoaded', t('attackerProfile'), name) })
  }

  const refreshTargetSets = () => setSavedTargetSets(listSavedTargetSets())

  const handleSaveTargetSet = (name) => {
    if (!saveNamedTargetSet(name, serializeDefenderProfile({ targets, defenderUnitBuffs }))) {
      throw new Error(t('storageUnavailable'))
    }
    refreshTargetSets()
    setSelectedTargetSet(name)
    setToast({ kind: 'success', message: t('profileSaved', t('defenderProfile'), name) })
  }

  const handleLoadTargetSet = (name) => {
    setSelectedTargetSet(name)
    if (!name) return
    const data = loadNamedTargetSet(name)
    if (!data || !Array.isArray(data.targets) || data.targets.length === 0) {
      setToast({ kind: 'error', message: t('profileLoadFailed', t('defenderProfile'), name) })
      return
    }
    for (let i = 0; i < data.targets.length; i++) {
      const err = validateTargetShape(data.targets[i])
      if (err) {
        setToast({ kind: 'error', message: t('invalidProfile', t('defenderProfile'), `targets[${i}] ${err}`) })
        return
      }
    }
    const hydrated = hydrateDefenderProfile(data)
    setTargets(hydrated.targets)
    setDefenderUnitBuffs(hydrated.defenderUnitBuffs)
    setResult(null)
    setError(null)
    setToast({ kind: 'success', message: t('profileLoaded', t('defenderProfile'), name) })
  }

  const handleRun = (e) => {
    e?.preventDefault?.()
    setError(null)
    for (const [index, unit] of attackerUnits.entries()) {
      const unitLabel = unit.name
        ? `${t('attackerUnit', index + 1)} (${unit.name})`
        : t('attackerUnit', index + 1)
      for (const weapon of unit.weapons) {
        for (const [field, label] of [['attacks', 'attacks'], ['damage', 'damage']]) {
          if (!isValidDiceExpression(weapon[field])) {
            setError(t(
              'invalidUnitWeaponExpression',
              unitLabel,
              weapon.name || t('weapons'),
              t(label),
              weapon[field]
            ))
            return
          }
        }
      }
    }
    if (targets.length === 0) {
      setError(t('needTargetProfile'))
      return
    }
    setRunning(true)
    const iterations = highPrecision ? 10000 : 1000
    const effectiveTargets = targets.map((tg) => mergeTargetWithUnit(tg, defenderUnitBuffs))
    setTimeout(() => {
      try {
        const res = simulateMultiUnitAttack(attackerUnits, effectiveTargets, iterations)
        setResult({ ...res, calculationId: Date.now() })
      } catch (err) {
        setError(err.message || 'Simulation failed.')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const handleCopyReport = async () => {
    if (!result) return
    const text = buildMultiUnitAttackSimReport(
      attackerUnits,
      targets,
      defenderUnitBuffs,
      result,
      t
    )
    try {
      await navigator.clipboard.writeText(text)
      setToast({ kind: 'success', message: t('reportCopied') })
    } catch {
      try { window.prompt(t('reportCopied'), text) }
      catch { setToast({ kind: 'error', message: t('reportCopyFailed') }) }
    }
  }

  return (
    <>
      {toast && (
        <div className="attack-sim-toast-row">
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>{toast.message}</span>
        </div>
      )}

      {namingProfile && (
        <ProfileNameDialog
          title={t('saveProfileAs', t(namingAttacker ? 'attackerProfile' : 'defenderProfile'))}
          initialName={namingSelectedName}
          existingNames={namingAttacker ? savedWeaponSets : savedTargetSets}
          replaceName={namingSelectedName}
          submitLabel={t('saveProfileAction')}
          onSubmit={namingAttacker
            ? (name) => handleSaveWeaponSet(namingProfile.unitId, name)
            : handleSaveTargetSet}
          onClose={() => setNamingProfile(null)}
        />
      )}

      <form onSubmit={handleRun} className="attack-sim-form">
        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>{t('attackerSection')}</h2>
          </header>
          {attackerUnits.map((unit, index) => (
            <AttackerUnitCard
              key={unit.id}
              unit={unit}
              index={index}
              total={attackerUnits.length}
              savedProfiles={savedWeaponSets}
              onLoad={(name) => handleLoadWeaponSet(unit.id, name)}
              onSave={() => setNamingProfile({ side: 'attacker', unitId: unit.id })}
              onChange={(patch) => updateAttackerUnit(unit.id, patch)}
              onRemove={() => {
                setAttackerUnits((current) =>
                  current.length > 1
                    ? current.filter((entry) => entry.id !== unit.id)
                    : current
                )
                invalidateResult()
              }}
            />
          ))}
          <button
            type="button"
            className="add-profile-tile"
            onClick={() => {
              setAttackerUnits((current) => [...current, createAttackerUnit()])
              invalidateResult()
            }}
          >
            {t('addAttackerUnit')}
          </button>
        </section>

        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>{t('defenderSection')}</h2>
          </header>
          <div className="attack-sim-unit-group defender-unit-card">
            <SavedSetControls
              value={selectedTargetSet}
              options={savedTargetSets}
              placeholder={t('savedDefenderSets')}
              emptyLabel={t('noSavedProfiles')}
              onChange={handleLoadTargetSet}
              onSave={() => setNamingProfile({ side: 'defender' })}
              saveLabel={t('saveProfile')}
              groupAriaLabel={t('savedDefenderGroup')}
              selectAriaLabel={t('loadDefenderProfile')}
            />

            <DefenderProfileWorkspace
              embedded
              targets={targets}
              defenderUnitBuffs={defenderUnitBuffs}
              onTargetsChange={setTargets}
              onDefenderUnitBuffsChange={setDefenderUnitBuffs}
              onEdit={invalidateResult}
            />
          </div>
        </section>

        {error && <div className="attack-sim-error">{error}</div>}

        <div className="run-row">
          <button type="submit" className="calculate-button" disabled={running}>
            {running ? t('simulating') : t('runSim')}
          </button>
          <label className="precision-toggle">
            <input
              type="checkbox"
              checked={highPrecision}
              onChange={(e) => setHighPrecision(e.target.checked)}
            />
            <span className="precision-toggle-track">
              <span className="precision-toggle-thumb" />
            </span>
            <span className="precision-toggle-label">
              {t('highPrecision')}
              <span className="precision-toggle-hint">
                {t('iterations', highPrecision ? '10,000' : '1,000')}
              </span>
            </span>
          </label>
        </div>
      </form>

      {result && (
        <section className="attack-sim-results">
          <header className="attack-sim-section-header">
            <h2>{t('results')}</h2>
            <button
              type="button"
              className="add-button add-button--with-icon"
              onClick={handleCopyReport}
              title={t('copyReport')}
            >
              <ClipboardCopy size={14} />
              <span>{t('copyReport')}</span>
            </button>
          </header>
          <StatGrid>
            {!(targets.length === 1 && targets[0].models === 1) && (
              <StatCard
                label={t('expectedModelsKilled')}
                value={result.expectedKills.toFixed(2)}
                stdDev={result.expectedKillsStdDev.toFixed(2)}
                ciLow={result.expectedKillsCILow.toFixed(2)}
                ciHigh={result.expectedKillsCIHigh.toFixed(2)}
              />
            )}
            {targets.length === 1 && targets[0].models === 1 && (
              <StatCard
                label={t('expectedDamageDealt')}
                value={result.expectedDamage.toFixed(2)}
                stdDev={result.expectedDamageStdDev.toFixed(2)}
                ciLow={result.expectedDamageCILow.toFixed(2)}
                ciHigh={result.expectedDamageCIHigh.toFixed(2)}
              />
            )}
            <StatCard
              label={t('chanceToWipe')}
              value={result.wipeProbability.toFixed(2)}
              valueSuffix="%"
              stdDev={result.wipeProbabilityStdDev.toFixed(2)}
              stdDevLabel="SE"
              ciLow={result.wipeProbabilityCILow.toFixed(2)}
              ciHigh={result.wipeProbabilityCIHigh.toFixed(2)}
              ciSuffix="%"
              rangeLabel="95% CI"
            />
          </StatGrid>

          {result.perProfile.length > 1 && (
            <div className="per-profile-table chart-container">
              <h2>{t('perProfileBreakdown')}</h2>
              <table>
                <thead>
                  <tr>
                    <th>{t('thProfile')}</th>
                    <th>{t('thModels')}</th>
                    <th>{t('thExpectedKills')}</th>
                    <th>{t('thStdDev')}</th>
                    <th>{t('thWipePercent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perProfile.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.models}</td>
                      <td>{p.expectedKills.toFixed(2)}</td>
                      <td>±{p.stdDev.toFixed(2)}</td>
                      <td>{p.wipeProbability.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DistributionChart
            title={t('totalModelsKilledDist')}
            data={result.distributionData}
            xKey="kills"
            chartKey={result.calculationId}
            footer={
              <p className="simulation-note">
                {t('simulationNote', result.numSimulations.toLocaleString())}
              </p>
            }
          />
        </section>
      )}
    </>
  )
}

export default AttackSimulator
