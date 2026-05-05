import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Save, Trash2 } from 'lucide-react'
import { simulateAttack, isValidDiceExpression } from '../lib/dice'
import {
  loadScenario,
  saveScenario,
  listSavedScenarios,
  saveNamedScenario,
  loadNamedScenario,
  deleteNamedScenario
} from '../lib/attackSimStorage'
import {
  Page,
  StatCard,
  StatGrid,
  DistributionChart
} from './ui'
import WeaponProfileCard from './attackSim/WeaponProfileCard'
import TargetProfileCard from './attackSim/TargetProfileCard'
import '../styles/attackSimulator.css'

// ---- factory helpers -------------------------------------------------------

let _id = 0
const uid = () => ++_id

const makeWeapon = (overrides = {}) => ({
  id: uid(),
  name: '',
  modelsFiring: 1,
  attacks: '4',
  strength: 4,
  toHit: 3,
  ap: 1,
  damage: '1',
  hitReroll: 'no-reroll',
  woundReroll: 'no-reroll',
  critHit: 6,
  critWound: 6,
  torrent: false,
  lethalHits: false,
  sustainedHits: 'off',
  devastatingWounds: false,
  antiEnabled: false,
  antiValue: 4,
  ...overrides
})

const makeTarget = (overrides = {}) => ({
  id: uid(),
  name: '',
  models: 5,
  toughness: 4,
  wounds: 2,
  save: 3,
  invulnSave: 0,
  saveReroll: 'no-reroll',
  fnp: 0,
  fnpMortal: 0,
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  ...overrides
})

// ---- list helpers ----------------------------------------------------------

const moveItem = (arr, from, to) => {
  if (to < 0 || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// Re-hydrate a stored profile by stripping the stale id so the factory
// helper assigns a fresh uid (React keys must be stable & unique).
const rehydrateWeapon = ({ id: _oldId, ...rest } = {}) => makeWeapon(rest)
const rehydrateTarget = ({ id: _oldId, ...rest } = {}) => makeTarget(rest)

// Strip runtime-only fields (React keys) when serializing for storage / export.
const stripId = ({ id: _id, ...rest }) => rest

// Detect a mobile device. File picker / blob download work poorly on most
// mobile browsers, so we hide Import/Export there.
const detectMobile = () => {
  if (typeof navigator === 'undefined') return false
  if (navigator.userAgentData?.mobile) return true
  return /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini/i.test(
    navigator.userAgent || ''
  )
}

function AttackSimulator() {
  // Lazy initial state: try restoring from localStorage first.
  const [weapons, setWeapons] = useState(() => {
    const saved = loadScenario()
    if (saved?.weapons?.length) return saved.weapons.map(rehydrateWeapon)
    return [makeWeapon({ name: 'Weapon 1' })]
  })
  const [targets, setTargets] = useState(() => {
    const saved = loadScenario()
    if (saved?.targets?.length) return saved.targets.map(rehydrateTarget)
    return [makeTarget({ name: 'Profile 1' })]
  })
  const [highPrecision, setHighPrecision] = useState(() => {
    const saved = loadScenario()
    return !!saved?.highPrecision
  })
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [savedNames, setSavedNames] = useState(() => listSavedScenarios())
  const [selectedSlot, setSelectedSlot] = useState('')
  const [isMobile] = useState(detectMobile)
  const fileInputRef = useRef(null)

  // Auto-save (debounced) whenever the scenario changes.
  useEffect(() => {
    const handle = setTimeout(() => {
      saveScenario({
        weapons: weapons.map(stripId),
        targets: targets.map(stripId),
        highPrecision
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [weapons, targets, highPrecision])

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return
    const handle = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(handle)
  }, [toast])

  // Suggest the next sequential default name (e.g. "Weapon 3") that isn't
  // already used by an existing entry.
  const nextDefaultName = (list, prefix) => {
    const used = new Set(list.map((it) => it.name))
    for (let i = 1; i <= list.length + 1; i++) {
      const candidate = `${prefix} ${i}`
      if (!used.has(candidate)) return candidate
    }
    return `${prefix} ${list.length + 1}`
  }

  // ---- weapon list mutators ----
  const updateWeapon = (i, next) =>
    setWeapons((ws) => ws.map((w, idx) => (idx === i ? next : w)))
  const addWeapon = () =>
    setWeapons((ws) => [...ws, makeWeapon({ name: nextDefaultName(ws, 'Weapon') })])
  const removeWeapon = (i) =>
    setWeapons((ws) => (ws.length === 1 ? ws : ws.filter((_, idx) => idx !== i)))
  const moveWeapon = (i, dir) => setWeapons((ws) => moveItem(ws, i, i + dir))
  const dupWeapon = (i) =>
    setWeapons((ws) => {
      const copy = { ...ws[i], id: uid(), name: ws[i].name ? `${ws[i].name} (copy)` : '' }
      const next = ws.slice()
      next.splice(i + 1, 0, copy)
      return next
    })

  // ---- target list mutators ----
  const updateTarget = (i, next) =>
    setTargets((ts) => ts.map((t, idx) => (idx === i ? next : t)))
  const addTarget = () =>
    setTargets((ts) => [...ts, makeTarget({ name: nextDefaultName(ts, 'Profile') })])
  const removeTarget = (i) =>
    setTargets((ts) => (ts.length === 1 ? ts : ts.filter((_, idx) => idx !== i)))
  const moveTarget = (i, dir) => setTargets((ts) => moveItem(ts, i, i + dir))
  const dupTarget = (i) =>
    setTargets((ts) => {
      const copy = { ...ts[i], id: uid(), name: ts[i].name ? `${ts[i].name} (copy)` : '' }
      const next = ts.slice()
      next.splice(i + 1, 0, copy)
      return next
    })

  // ---- import / export ----
  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      weapons: weapons.map(stripId),
      targets: targets.map(stripId),
      highPrecision
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.download = `attack-sim-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setToast({ kind: 'success', message: 'Scenario exported.' })
  }

  const handleImportClick = () => fileInputRef.current?.click()

  // ---- named scenarios ----
  const refreshSavedNames = () => setSavedNames(listSavedScenarios())

  const handleSaveAs = () => {
    const suggested = selectedSlot || ''
    const name = window.prompt('Save scenario as:', suggested)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setToast({ kind: 'error', message: 'Name cannot be empty.' })
      return
    }
    if (savedNames.includes(trimmed) && trimmed !== selectedSlot) {
      if (!window.confirm(`"${trimmed}" already exists. Overwrite?`)) return
    }
    const ok = saveNamedScenario(trimmed, {
      weapons: weapons.map(stripId),
      targets: targets.map(stripId),
      highPrecision
    })
    if (ok) {
      refreshSavedNames()
      setSelectedSlot(trimmed)
      setToast({ kind: 'success', message: `Saved "${trimmed}".` })
    }
  }

  const handleLoadSlot = (name) => {
    setSelectedSlot(name)
    if (!name) return
    const data = loadNamedScenario(name)
    if (!data || !Array.isArray(data.weapons) || !Array.isArray(data.targets)) {
      setToast({ kind: 'error', message: `Could not load "${name}".` })
      return
    }
    setWeapons(data.weapons.map(rehydrateWeapon))
    setTargets(data.targets.map(rehydrateTarget))
    if (typeof data.highPrecision === 'boolean') setHighPrecision(data.highPrecision)
    setResult(null)
    setError(null)
    setToast({ kind: 'success', message: `Loaded "${name}".` })
  }

  const handleDeleteSlot = () => {
    if (!selectedSlot) return
    if (!window.confirm(`Delete saved scenario "${selectedSlot}"?`)) return
    deleteNamedScenario(selectedSlot)
    setSelectedSlot('')
    refreshSavedNames()
    setToast({ kind: 'success', message: `Deleted "${selectedSlot}".` })
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data.weapons) || !Array.isArray(data.targets)) {
        throw new Error('File does not contain weapons/targets.')
      }
      setWeapons(data.weapons.map(rehydrateWeapon))
      setTargets(data.targets.map(rehydrateTarget))
      if (typeof data.highPrecision === 'boolean') setHighPrecision(data.highPrecision)
      setResult(null)
      setError(null)
      setToast({ kind: 'success', message: 'Scenario imported.' })
    } catch (err) {
      setToast({
        kind: 'error',
        message: `Import failed: ${err.message || 'invalid file'}.`
      })
    }
  }

  // ---- run ----
  const handleRun = (e) => {
    e?.preventDefault?.()
    setError(null)

    // basic validation
    for (const w of weapons) {
      if (!isValidDiceExpression(w.attacks)) {
        setError(`Weapon "${w.name || 'unnamed'}" has invalid Attacks "${w.attacks}".`)
        return
      }
      if (!isValidDiceExpression(w.damage)) {
        setError(`Weapon "${w.name || 'unnamed'}" has invalid Damage "${w.damage}".`)
        return
      }
    }
    if (targets.length === 0) {
      setError('Add at least one target profile.')
      return
    }

    setRunning(true)
    const iterations = highPrecision ? 10000 : 1000
    // Defer the heavy work so the UI shows the running state.
    setTimeout(() => {
      try {
        const res = simulateAttack(weapons, targets, iterations)
        setResult({ ...res, calculationId: Date.now() })
      } catch (err) {
        setError(err.message || 'Simulation failed.')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  return (
    <Page title="Attack Simulator">
      <div className="attack-sim-toolbar">
        {!isMobile && (
          <>
            <button type="button" className="toolbar-button" onClick={handleImportClick}>
              <Upload size={14} />
              <span>Import</span>
            </button>
            <button type="button" className="toolbar-button" onClick={handleExport}>
              <Download size={14} />
              <span>Export</span>
            </button>
            <span className="toolbar-divider" aria-hidden="true" />
          </>
        )}
        <select
          className="toolbar-select"
          value={selectedSlot}
          onChange={(e) => handleLoadSlot(e.target.value)}
          aria-label="Load saved scenario"
        >
          <option value="">— Saved scenarios —</option>
          {savedNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button type="button" className="toolbar-button" onClick={handleSaveAs}>
          <Save size={14} />
          <span>Save As…</span>
        </button>
        <button
          type="button"
          className="toolbar-button toolbar-button--danger"
          onClick={handleDeleteSlot}
          disabled={!selectedSlot}
          title={selectedSlot ? `Delete "${selectedSlot}"` : 'Select a saved scenario to delete'}
        >
          <Trash2 size={14} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        {toast && (
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>
            {toast.message}
          </span>
        )}
      </div>

      <form onSubmit={handleRun} className="attack-sim-form">
        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>Attacker — Weapon Profiles</h2>
            <button type="button" className="add-button" onClick={addWeapon}>
              + Add Weapon
            </button>
          </header>
          <div className="profile-list">
            {weapons.map((w, i) => (
              <WeaponProfileCard
                key={w.id}
                profile={w}
                index={i}
                total={weapons.length}
                onChange={(next) => updateWeapon(i, next)}
                onRemove={() => removeWeapon(i)}
                onMoveUp={() => moveWeapon(i, -1)}
                onMoveDown={() => moveWeapon(i, +1)}
                onDuplicate={() => dupWeapon(i)}
              />
            ))}
          </div>
        </section>

        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>Defender — Target Profiles</h2>
            <button type="button" className="add-button" onClick={addTarget}>
              + Add Profile
            </button>
          </header>
          <div className="profile-list">
            {targets.map((t, i) => (
              <TargetProfileCard
                key={t.id}
                profile={t}
                index={i}
                total={targets.length}
                onChange={(next) => updateTarget(i, next)}
                onRemove={() => removeTarget(i)}
                onMoveUp={() => moveTarget(i, -1)}
                onMoveDown={() => moveTarget(i, +1)}
                onDuplicate={() => dupTarget(i)}
              />
            ))}
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
              onChange={(e) => setHighPrecision(e.target.checked)}
            />
            <span className="precision-toggle-track">
              <span className="precision-toggle-thumb" />
            </span>
            <span className="precision-toggle-label">
              High precision
              <span className="precision-toggle-hint">
                {highPrecision ? '10,000 iterations' : '1,000 iterations'}
              </span>
            </span>
          </label>
        </div>
      </form>

      {result && (
        <section className="attack-sim-results">
          <h2 className="results-heading">Results</h2>
          <StatGrid>
            <StatCard
              label="Expected Models Killed"
              value={result.expectedKills.toFixed(2)}
              stdDev={result.expectedKillsStdDev.toFixed(2)}
              ciLow={result.expectedKillsCILow.toFixed(2)}
              ciHigh={result.expectedKillsCIHigh.toFixed(2)}
            />
            {targets.length === 1 && targets[0].models === 1 && (
              <StatCard
                label="Expected Damage Dealt"
                value={result.expectedDamage.toFixed(2)}
                stdDev={result.expectedDamageStdDev.toFixed(2)}
                ciLow={result.expectedDamageCILow.toFixed(2)}
                ciHigh={result.expectedDamageCIHigh.toFixed(2)}
              />
            )}
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

          {result.perProfile.length > 1 && (
            <div className="per-profile-table chart-container">
              <h2>Per-Profile Breakdown</h2>
              <table>
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Models</th>
                    <th>Expected Kills</th>
                    <th>σ</th>
                    <th>Wipe %</th>
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
            title="Total Models Killed — Distribution"
            data={result.distributionData}
            xKey="kills"
            chartKey={result.calculationId}
            footer={
              <p className="simulation-note">
                * Estimated using Monte Carlo simulation ({result.numSimulations.toLocaleString()} iterations)
              </p>
            }
          />
        </section>
      )}
    </Page>
  )
}

export default AttackSimulator
