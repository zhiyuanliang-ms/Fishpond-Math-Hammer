import { useEffect, useState } from 'react'
import { ClipboardCopy } from 'lucide-react'
import {
  AOS_CRIT_EFFECTS,
  aosCritEffectOptions,
  aosRendOptions,
  aosWardOptions,
  isValidAoSDiceExpression,
  saveOptions,
  simulateAoSAttack,
  toHitOptions,
  toWoundOptions,
} from '../lib/dice'
import { buildAoSAttackReport } from '../lib/aosAttackReport'
import IntInput from './attackSim/IntInput'
import ProfileCardShell from './attackSim/ProfileCardShell'
import {
  DistributionChart,
  FormSelect,
  Page,
  StatCard,
  StatGrid,
} from './ui'
import '../styles/attackSimulator.css'

let nextProfileId = 0
const profileId = () => ++nextProfileId

const makeWeapon = (overrides = {}) => ({
  id: profileId(),
  name: '',
  attacks: '4',
  toHit: 3,
  toWound: 3,
  rend: 1,
  damage: '2',
  critEffect: AOS_CRIT_EFFECTS.NONE,
  ...overrides,
})

const actionLabels = {
  moveUp: 'Move up',
  moveDown: 'Move down',
  duplicate: 'Duplicate',
  remove: 'Remove',
}

const findOption = (options, value) =>
  options.find((option) => option.value === value.toString()) || options[0]

function AoSWeaponProfileCard({
  profile,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}) {
  const update = (patch) => onChange({ ...profile, ...patch })

  return (
    <ProfileCardShell
      name={profile.name}
      placeholder={`Weapon ${index + 1}`}
      index={index}
      total={total}
      actionLabels={actionLabels}
      onNameChange={(name) => update({ name })}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDuplicate={onDuplicate}
      onRemove={onRemove}
    >
      <div className="stat-line">
        <div className="stat-cell">
          <label>Attacks</label>
          <input
            type="text"
            className={
              isValidAoSDiceExpression(profile.attacks) ? '' : 'invalid'
            }
            value={profile.attacks}
            onChange={(event) => update({ attacks: event.target.value })}
            placeholder="e.g. 4 or D6+1"
          />
        </div>
        <div className="stat-cell">
          <label>Hit</label>
          <FormSelect
            variant="buff"
            options={toHitOptions}
            value={findOption(toHitOptions, profile.toHit)}
            onChange={(option) =>
              update({ toHit: parseInt(option.value, 10) })
            }
          />
        </div>
        <div className="stat-cell">
          <label>Wound</label>
          <FormSelect
            variant="buff"
            options={toWoundOptions}
            value={findOption(toWoundOptions, profile.toWound)}
            onChange={(option) =>
              update({ toWound: parseInt(option.value, 10) })
            }
          />
        </div>
        <div className="stat-cell">
          <label>Rend</label>
          <FormSelect
            variant="buff"
            options={aosRendOptions}
            value={findOption(aosRendOptions, profile.rend)}
            onChange={(option) =>
              update({ rend: parseInt(option.value, 10) })
            }
          />
        </div>
        <div className="stat-cell">
          <label>Damage</label>
          <input
            type="text"
            className={
              isValidAoSDiceExpression(profile.damage) ? '' : 'invalid'
            }
            value={profile.damage}
            onChange={(event) => update({ damage: event.target.value })}
            placeholder="e.g. 2 or D3"
          />
        </div>
      </div>

      <div className="reroll-row">
        <div className="reroll-cell">
          <label>Critical Hit Effect</label>
          <FormSelect
            options={aosCritEffectOptions}
            value={findOption(aosCritEffectOptions, profile.critEffect)}
            onChange={(option) => update({ critEffect: option.value })}
          />
        </div>
      </div>
    </ProfileCardShell>
  )
}

function AoSAttackSimulator() {
  const [weapons, setWeapons] = useState(() => [
    makeWeapon({ name: 'Weapon 1' }),
  ])
  const [target, setTarget] = useState({
    models: 5,
    health: 2,
    save: 3,
    ward: 0,
  })
  const [highPrecision, setHighPrecision] = useState(false)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timeout)
  }, [toast])

  const invalidateResult = () => {
    setResult(null)
    setError(null)
  }

  const updateWeapon = (index, profile) => {
    setWeapons((current) =>
      current.map((weapon, weaponIndex) =>
        weaponIndex === index ? profile : weapon
      )
    )
    invalidateResult()
  }

  const addWeapon = () => {
    setWeapons((current) => [
      ...current,
      makeWeapon({ name: `Weapon ${current.length + 1}` }),
    ])
    invalidateResult()
  }

  const removeWeapon = (index) => {
    setWeapons((current) =>
      current.length === 1
        ? current
        : current.filter((_, weaponIndex) => weaponIndex !== index)
    )
    invalidateResult()
  }

  const moveWeapon = (index, offset) => {
    setWeapons((current) => {
      const destination = index + offset
      if (destination < 0 || destination >= current.length) return current
      const next = current.slice()
      const [profile] = next.splice(index, 1)
      next.splice(destination, 0, profile)
      return next
    })
    invalidateResult()
  }

  const duplicateWeapon = (index) => {
    setWeapons((current) => {
      const copy = {
        ...current[index],
        id: profileId(),
        name: current[index].name
          ? `${current[index].name} (copy)`
          : `Weapon ${current.length + 1}`,
      }
      const next = current.slice()
      next.splice(index + 1, 0, copy)
      return next
    })
    invalidateResult()
  }

  const updateTarget = (patch) => {
    setTarget((current) => ({ ...current, ...patch }))
    invalidateResult()
  }

  const handleRun = (event) => {
    event.preventDefault()
    setError(null)

    for (const weapon of weapons) {
      if (!isValidAoSDiceExpression(weapon.attacks)) {
        setError(
          `Weapon "${weapon.name || 'unnamed'}" has invalid Attacks ` +
            `"${weapon.attacks}". The minimum possible roll must be 1.`
        )
        return
      }
      if (!isValidAoSDiceExpression(weapon.damage)) {
        setError(
          `Weapon "${weapon.name || 'unnamed'}" has invalid Damage ` +
            `"${weapon.damage}". The minimum possible roll must be 1.`
        )
        return
      }
    }

    setRunning(true)
    setResult(null)
    const iterations = highPrecision ? 10000 : 1000

    setTimeout(() => {
      try {
        const simulation = simulateAoSAttack(weapons, target, iterations)
        setResult({
          ...simulation,
          calculationId: Date.now(),
        })
      } catch (simulationError) {
        setError(simulationError.message || 'Simulation failed.')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const handleCopyReport = async () => {
    if (!result) return

    let report
    try {
      report = buildAoSAttackReport(weapons, target, result)
    } catch (reportError) {
      setToast({
        kind: 'error',
        message: reportError.message || 'Could not build the report.',
      })
      return
    }

    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard API is unavailable')
      await navigator.clipboard.writeText(report)
      setToast({ kind: 'success', message: 'Report copied to clipboard.' })
    } catch {
      try {
        window.prompt(
          'Clipboard access is unavailable. Copy the report below:',
          report
        )
        setToast({
          kind: 'error',
          message: 'Clipboard access was unavailable; report opened for manual copy.',
        })
      } catch {
        setToast({
          kind: 'error',
          message: 'Could not copy the report to the clipboard.',
        })
      }
    }
  }

  return (
    <Page
      title={
        <span className="attack-sim-title">
          AoS Attack Simulator
          <span
            className="attack-sim-edition-badge"
            title="Based on Age of Sigmar 4th Edition rules"
            aria-label="Based on Age of Sigmar 4th Edition rules"
          >
            4E
          </span>
        </span>
      }
    >
      {toast && (
        <div className="attack-sim-toast-row" role="status">
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>
            {toast.message}
          </span>
        </div>
      )}

      <form onSubmit={handleRun} className="attack-sim-form">
        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>Attacker Profiles</h2>
          </header>
          <div className="profile-list">
            {weapons.map((weapon, index) => (
              <AoSWeaponProfileCard
                key={weapon.id}
                profile={weapon}
                index={index}
                total={weapons.length}
                onChange={(profile) => updateWeapon(index, profile)}
                onRemove={() => removeWeapon(index)}
                onMoveUp={() => moveWeapon(index, -1)}
                onMoveDown={() => moveWeapon(index, 1)}
                onDuplicate={() => duplicateWeapon(index)}
              />
            ))}
            <button
              type="button"
              className="add-profile-tile"
              onClick={addWeapon}
            >
              + Add Profile
            </button>
          </div>
        </section>

        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>Defender Profile</h2>
          </header>
          <div className="profile-card">
            <div className="stat-line">
              <div className="stat-cell">
                <label>Models</label>
                <IntInput
                  min={1}
                  max={100}
                  fallback={1}
                  value={target.models}
                  onChange={(models) => updateTarget({ models })}
                />
              </div>
              <div className="stat-cell">
                <label>Health</label>
                <IntInput
                  min={1}
                  max={100}
                  fallback={1}
                  value={target.health}
                  onChange={(health) => updateTarget({ health })}
                />
              </div>
              <div className="stat-cell">
                <label>Save</label>
                <FormSelect
                  variant="buff"
                  options={saveOptions}
                  value={findOption(saveOptions, target.save)}
                  onChange={(option) =>
                    updateTarget({ save: parseInt(option.value, 10) })
                  }
                />
              </div>
              <div className="stat-cell">
                <label>Ward</label>
                <FormSelect
                  variant="buff"
                  options={aosWardOptions}
                  value={findOption(aosWardOptions, target.ward)}
                  onChange={(option) =>
                    updateTarget({ ward: parseInt(option.value, 10) })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {error && <div className="attack-sim-error">{error}</div>}

        <div className="run-row">
          <button type="submit" className="calculate-button" disabled={running}>
            {running ? 'Simulating…' : 'Run Simulation'}
          </button>
          <label className="precision-toggle">
            <input
              type="checkbox"
              checked={highPrecision}
              onChange={(event) => setHighPrecision(event.target.checked)}
            />
            <span className="precision-toggle-track">
              <span className="precision-toggle-thumb" />
            </span>
            <span className="precision-toggle-label">
              High precision
              <span className="precision-toggle-hint">
                {highPrecision ? '10,000' : '1,000'} iterations
              </span>
            </span>
          </label>
        </div>
      </form>

      {result && (
        <section className="attack-sim-results">
          <header className="attack-sim-section-header">
            <h2>Results</h2>
            <button
              type="button"
              className="add-button add-button--with-icon"
              onClick={handleCopyReport}
              title="Copy report"
            >
              <ClipboardCopy size={14} />
              <span>Copy Report</span>
            </button>
          </header>
          <StatGrid>
            <StatCard
              label="Expected Models Killed"
              value={result.expectedKills.toFixed(2)}
              stdDev={result.expectedKillsStdDev.toFixed(2)}
              ciLow={result.expectedKillsCILow.toFixed(2)}
              ciHigh={result.expectedKillsCIHigh.toFixed(2)}
            />
            <StatCard
              label="Expected Damage Dealt"
              value={result.expectedDamage.toFixed(2)}
              stdDev={result.expectedDamageStdDev.toFixed(2)}
              ciLow={result.expectedDamageCILow.toFixed(2)}
              ciHigh={result.expectedDamageCIHigh.toFixed(2)}
            />
            <StatCard
              label="Chance to Deal Damage"
              value={result.damageProbability.toFixed(2)}
              valueSuffix="%"
              stdDev={result.damageProbabilityStdDev.toFixed(2)}
              ciLow={result.damageProbabilityCILow.toFixed(2)}
              ciHigh={result.damageProbabilityCIHigh.toFixed(2)}
              ciSuffix="%"
            />
            <StatCard
              label="Chance to Wipe Unit"
              value={result.wipeProbability.toFixed(2)}
              valueSuffix="%"
              stdDev={result.wipeProbabilityStdDev.toFixed(2)}
              ciLow={result.wipeProbabilityCILow.toFixed(2)}
              ciHigh={result.wipeProbabilityCIHigh.toFixed(2)}
              ciSuffix="%"
            />
          </StatGrid>

          {result.perWeapon.length > 1 && (
            <div className="chart-container per-profile-table">
              <h2>Per-Profile Breakdown</h2>
              <table>
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Expected Damage</th>
                    <th>Std Dev</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perWeapon.map((profile, index) => (
                    <tr key={`${profile.name}-${index}`}>
                      <td>{profile.name}</td>
                      <td>{profile.expectedDamage.toFixed(2)}</td>
                      <td>{profile.stdDev.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DistributionChart
            title="Models Killed — Distribution"
            data={result.killDistributionData}
            xKey="kills"
            chartKey={`${result.calculationId}-kills`}
          />

          <DistributionChart
            title="Damage Dealt — Distribution"
            data={result.distributionData}
            xKey="damage"
            xInterval={
              result.maxDamage > 50
                ? Math.floor(result.maxDamage / 10)
                : 0
            }
            chartKey={`${result.calculationId}-damage`}
            footer={
              <p className="simulation-note">
                * Estimated using Monte Carlo simulation (
                {result.numSimulations.toLocaleString()} iterations)
              </p>
            }
          />
        </section>
      )}
    </Page>
  )
}

export default AoSAttackSimulator
