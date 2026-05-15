import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Save, Trash2, Link2 } from 'lucide-react'
import { simulateAttack, isValidDiceExpression } from '../lib/dice'
import {
  loadScenario,
  saveScenario,
  listSavedScenarios,
  saveNamedScenario,
  loadNamedScenario,
  deleteNamedScenario,
  listSavedWeaponSets,
  saveNamedWeaponSet,
  loadNamedWeaponSet,
  deleteNamedWeaponSet,
  listSavedTargetSets,
  saveNamedTargetSet,
  loadNamedTargetSet,
  deleteNamedTargetSet,
  StorageQuotaError
} from '../lib/attackSimStorage'
import {
  encodeScenarioCode,
  decodeScenarioCode,
  buildShareUrl,
  SHARE_QUERY_PARAM,
} from '../lib/attackSimShare'
import {
  Page,
  StatCard,
  StatGrid,
  DistributionChart
} from './ui'
import WeaponProfileCard from './attackSim/WeaponProfileCard'
import TargetProfileCard from './attackSim/TargetProfileCard'
import SavedSetControls from './ui/SavedSetControls'
import { LangProvider, useT } from './attackSim/lang'
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
  hitRerollScope: 'all',
  woundReroll: 'no-reroll',
  woundRerollScope: 'all',
  attackReroll: 'no-reroll',
  attackRerollScope: 'all',
  damageReroll: 'no-reroll',
  damageRerollScope: 'all',
  critHitEnabled: false,
  critHit: 5,
  critWound: 6,
  torrent: false,
  lethalHits: false,
  sustainedHits: 'off',
  devastatingWounds: false,
  plusOneWound: false,
  blast: false,
  plusOneHit: false,
  ignoresCover: false,
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
  saveRerollScope: 'all',
  fnp: 0,
  fnpMortal: 0,
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  benefitOfCover: false,
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
const omitId = (entry = {}) => {
  const next = { ...entry }
  delete next.id
  return next
}

const rehydrateWeapon = (entry = {}) => makeWeapon(omitId(entry))
const rehydrateTarget = (entry = {}) => makeTarget(omitId(entry))

// Strip runtime-only fields (React keys) when serializing for storage / export.
const stripId = (entry = {}) => omitId(entry)

// ---- import validators -----------------------------------------------------
// Return null if the shape is acceptable, otherwise a short reason string.
// We only check fields that would break the simulation if malformed; unknown
// extra fields are ignored, and missing optional booleans default to false.

const isPosInt = (v) => Number.isInteger(v) && v > 0
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0
const isThreshold = (v) => Number.isInteger(v) && v >= 2 && v <= 6

const validateWeaponShape = (w) => {
  if (!w || typeof w !== 'object') return 'not an object'
  // Accept either a dice-expression string ("4", "D6+1", ...) or a plain
  // number (legacy / interop with externally-generated JSON).
  if (!isValidDiceExpression(w.attacks))
    return `invalid attacks ${JSON.stringify(w.attacks)}`
  if (!isValidDiceExpression(w.damage))
    return `invalid damage ${JSON.stringify(w.damage)}`
  if (!isPosInt(w.strength)) return `invalid strength ${w.strength}`
  if (!isThreshold(w.toHit)) return `invalid toHit ${w.toHit}`
  if (!isNonNegInt(w.ap)) return `invalid ap ${w.ap}`
  if (w.modelsFiring != null && !isPosInt(w.modelsFiring))
    return `invalid modelsFiring ${w.modelsFiring}`
  return null
}

const validateTargetShape = (t) => {
  if (!t || typeof t !== 'object') return 'not an object'
  if (!isPosInt(t.models)) return `invalid models ${t.models}`
  if (!isPosInt(t.toughness)) return `invalid toughness ${t.toughness}`
  if (!isPosInt(t.wounds)) return `invalid wounds ${t.wounds}`
  if (!isThreshold(t.save)) return `invalid save ${t.save}`
  if (t.invulnSave != null && t.invulnSave !== 0 && !isThreshold(t.invulnSave))
    return `invalid invulnSave ${t.invulnSave}`
  if (t.fnp != null && t.fnp !== 0 && !isThreshold(t.fnp))
    return `invalid fnp ${t.fnp}`
  if (t.fnpMortal != null && t.fnpMortal !== 0 && !isThreshold(t.fnpMortal))
    return `invalid fnpMortal ${t.fnpMortal}`
  return null
}

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
  const [savedWeaponSets, setSavedWeaponSets] = useState(() => listSavedWeaponSets())
  const [selectedWeaponSet, setSelectedWeaponSet] = useState('')
  const [savedTargetSets, setSavedTargetSets] = useState(() => listSavedTargetSets())
  const [selectedTargetSet, setSelectedTargetSet] = useState('')
  const [isMobile] = useState(detectMobile)
  const fileInputRef = useRef(null)

  // Auto-load a scenario from the URL share link (?s=<code>) on mount.
  // If a previously auto-saved scenario exists, confirm before overwriting it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get(SHARE_QUERY_PARAM)
    if (!code) return

    const stripParam = () => {
      params.delete(SHARE_QUERY_PARAM)
      const qs = params.toString()
      const next =
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash
      window.history.replaceState(null, '', next)
    }

    const data = decodeScenarioCode(code)
    if (!data) {
      setToast({ kind: 'error', message: 'Shared link is invalid or corrupted.' })
      stripParam()
      return
    }

    setWeapons(data.weapons.map(rehydrateWeapon))
    setTargets(data.targets.map(rehydrateTarget))
    if (typeof data.highPrecision === 'boolean') setHighPrecision(data.highPrecision)
    setResult(null)
    setError(null)
    stripParam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const handleShare = async () => {
    const code = encodeScenarioCode({
      weapons: weapons.map(stripId),
      targets: targets.map(stripId),
      highPrecision,
    })
    if (!code) {
      setToast({ kind: 'error', message: 'Could not build share link.' })
      return
    }
    const url = buildShareUrl(code)
    try {
      await navigator.clipboard.writeText(url)
      setToast({ kind: 'success', message: 'Share link copied to clipboard.' })
    } catch {
      window.prompt('Copy this share link:', url)
    }
  }

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
    let ok
    try {
      ok = saveNamedScenario(trimmed, {
        weapons: weapons.map(stripId),
        targets: targets.map(stripId),
        highPrecision
      })
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setToast({
          kind: 'error',
          message: 'Browser storage is full. Delete some saved scenarios / sets and try again.'
        })
        return
      }
      throw err
    }
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

  // ---- attacker profile sets (saved weapon lists) ----
  const refreshWeaponSets = () => setSavedWeaponSets(listSavedWeaponSets())

  const handleSaveWeaponSet = () => {
    const suggested = selectedWeaponSet || ''
    const name = window.prompt('Save attacker profile as:', suggested)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setToast({ kind: 'error', message: 'Name cannot be empty.' })
      return
    }
    if (savedWeaponSets.includes(trimmed) && trimmed !== selectedWeaponSet) {
      if (!window.confirm(`Attacker profile "${trimmed}" already exists. Overwrite?`)) return
    }
    let ok
    try {
      ok = saveNamedWeaponSet(trimmed, weapons.map(stripId))
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setToast({
          kind: 'error',
          message: 'Browser storage is full. Delete some saved scenarios / sets and try again.'
        })
        return
      }
      throw err
    }
    if (ok) {
      refreshWeaponSets()
      setSelectedWeaponSet(trimmed)
      setToast({ kind: 'success', message: `Saved attacker profile "${trimmed}".` })
    }
  }

  const handleLoadWeaponSet = (name) => {
    setSelectedWeaponSet(name)
    if (!name) return
    const data = loadNamedWeaponSet(name)
    if (!data || !Array.isArray(data.weapons) || data.weapons.length === 0) {
      setToast({ kind: 'error', message: `Could not load attacker profile "${name}".` })
      return
    }
    for (let i = 0; i < data.weapons.length; i++) {
      const err = validateWeaponShape(data.weapons[i])
      if (err) {
        setToast({ kind: 'error', message: `Invalid attacker profile: weapons[${i}] ${err}.` })
        return
      }
    }
    setWeapons(data.weapons.map(rehydrateWeapon))
    setResult(null)
    setError(null)
    setToast({ kind: 'success', message: `Loaded attacker profile "${name}".` })
  }

  const handleDeleteWeaponSet = () => {
    if (!selectedWeaponSet) return
    if (!window.confirm(`Delete saved attacker profile "${selectedWeaponSet}"?`)) return
    deleteNamedWeaponSet(selectedWeaponSet)
    setSelectedWeaponSet('')
    refreshWeaponSets()
    setToast({ kind: 'success', message: `Deleted attacker profile "${selectedWeaponSet}".` })
  }

  // ---- defender profile sets (saved target lists) ----
  const refreshTargetSets = () => setSavedTargetSets(listSavedTargetSets())

  const handleSaveTargetSet = () => {
    const suggested = selectedTargetSet || ''
    const name = window.prompt('Save defender profile as:', suggested)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setToast({ kind: 'error', message: 'Name cannot be empty.' })
      return
    }
    if (savedTargetSets.includes(trimmed) && trimmed !== selectedTargetSet) {
      if (!window.confirm(`Defender profile "${trimmed}" already exists. Overwrite?`)) return
    }
    let ok
    try {
      ok = saveNamedTargetSet(trimmed, targets.map(stripId))
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setToast({
          kind: 'error',
          message: 'Browser storage is full. Delete some saved scenarios / sets and try again.'
        })
        return
      }
      throw err
    }
    if (ok) {
      refreshTargetSets()
      setSelectedTargetSet(trimmed)
      setToast({ kind: 'success', message: `Saved defender profile "${trimmed}".` })
    }
  }

  const handleLoadTargetSet = (name) => {
    setSelectedTargetSet(name)
    if (!name) return
    const data = loadNamedTargetSet(name)
    if (!data || !Array.isArray(data.targets) || data.targets.length === 0) {
      setToast({ kind: 'error', message: `Could not load defender profile "${name}".` })
      return
    }
    for (let i = 0; i < data.targets.length; i++) {
      const err = validateTargetShape(data.targets[i])
      if (err) {
        setToast({ kind: 'error', message: `Invalid defender profile: targets[${i}] ${err}.` })
        return
      }
    }
    setTargets(data.targets.map(rehydrateTarget))
    setResult(null)
    setError(null)
    setToast({ kind: 'success', message: `Loaded defender profile "${name}".` })
  }

  const handleDeleteTargetSet = () => {
    if (!selectedTargetSet) return
    if (!window.confirm(`Delete saved defender profile "${selectedTargetSet}"?`)) return
    deleteNamedTargetSet(selectedTargetSet)
    setSelectedTargetSet('')
    refreshTargetSets()
    setToast({ kind: 'success', message: `Deleted defender profile "${selectedTargetSet}".` })
  }

  // ---- nuke local storage ----

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    try {
      const text = await file.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('not valid JSON')
      }
      if (!data || typeof data !== 'object') {
        throw new Error('top-level value is not an object')
      }
      if (!Array.isArray(data.weapons) || data.weapons.length === 0) {
        throw new Error('"weapons" must be a non-empty array')
      }
      if (!Array.isArray(data.targets) || data.targets.length === 0) {
        throw new Error('"targets" must be a non-empty array')
      }
      data.weapons.forEach((w, i) => {
        const err = validateWeaponShape(w)
        if (err) throw new Error(`weapons[${i}]: ${err}`)
      })
      data.targets.forEach((t, i) => {
        const err = validateTargetShape(t)
        if (err) throw new Error(`targets[${i}]: ${err}`)
      })

      // All validation passed — now mutate state.
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

  const { t, lang, setLang } = useT()

  return (
    <Page title={t('pageTitle')}>
      <div className="attack-sim-toolbar">
        <div className="toolbar-group" role="group" aria-label="Saved scenarios">
          <span className="toolbar-group-label">{t('scenario')}</span>
          <select
            className="toolbar-select"
            value={selectedSlot}
            onChange={(e) => handleLoadSlot(e.target.value)}
            aria-label="Load saved scenario"
          >
            <option value="">{t('savedScenarios')}</option>
            {savedNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button type="button" className="toolbar-button" onClick={handleSaveAs}>
            <Save size={14} />
            <span>{t('saveAs')}</span>
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={handleShare}
            title="Copy a share link for the current scenario"
          >
            <Link2 size={14} />
            <span>{t('share')}</span>
          </button>
          <button
            type="button"
            className="toolbar-button toolbar-button--danger"
            onClick={handleDeleteSlot}
            disabled={!selectedSlot}
            title={selectedSlot ? `Delete "${selectedSlot}"` : 'Select a saved scenario to delete'}
            aria-label="Delete selected scenario"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {!isMobile && (
          <div className="toolbar-group" role="group" aria-label="Data">
            <span className="toolbar-group-label">{t('data')}</span>
            <button type="button" className="toolbar-button" onClick={handleImportClick}>
              <Upload size={14} />
              <span>{t('import')}</span>
            </button>
            <button type="button" className="toolbar-button" onClick={handleExport}>
              <Download size={14} />
              <span>{t('export')}</span>
            </button>
          </div>
        )}

        <div className="toolbar-group lang-toggle-group" role="group" aria-label="Language">
          <button
            type="button"
            className={`lang-toggle-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={`lang-toggle-btn ${lang === 'zh' ? 'active' : ''}`}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>
      {toast && (
        <div className="attack-sim-toast-row">
          <span className={`toolbar-toast toolbar-toast--${toast.kind}`}>
            {toast.message}
          </span>
        </div>
      )}

      <form onSubmit={handleRun} className="attack-sim-form">
        <section className="attack-sim-section">
          <header className="attack-sim-section-header">
            <h2>{t('attackerSection')}</h2>
            <button type="button" className="add-button" onClick={addWeapon}>
              {t('addWeapon')}
            </button>
          </header>
          <SavedSetControls
            value={selectedWeaponSet}
            options={savedWeaponSets}
            placeholder={t('savedAttackerSets')}
            onChange={handleLoadWeaponSet}
            onSave={handleSaveWeaponSet}
            saveLabel="Save Profile…"
            onDelete={handleDeleteWeaponSet}
            deleteDisabled={!selectedWeaponSet}
            deleteTitle={selectedWeaponSet ? `Delete "${selectedWeaponSet}"` : 'Select a saved attacker profile to delete'}
            groupAriaLabel="Saved attacker profiles"
            selectAriaLabel="Load saved attacker profile"
            deleteAriaLabel="Delete selected attacker profile"
          />
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
            <h2>{t('defenderSection')}</h2>
            <button type="button" className="add-button" onClick={addTarget}>
              {t('addProfile')}
            </button>
          </header>
          <SavedSetControls
            value={selectedTargetSet}
            options={savedTargetSets}
            placeholder={t('savedDefenderSets')}
            onChange={handleLoadTargetSet}
            onSave={handleSaveTargetSet}
            saveLabel="Save Profile…"
            onDelete={handleDeleteTargetSet}
            deleteDisabled={!selectedTargetSet}
            deleteTitle={selectedTargetSet ? `Delete "${selectedTargetSet}"` : 'Select a saved defender profile to delete'}
            groupAriaLabel="Saved defender profiles"
            selectAriaLabel="Load saved defender profile"
            deleteAriaLabel="Delete selected defender profile"
          />
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
          <h2 className="results-heading">{t('results')}</h2>
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
              ciLow={result.wipeProbabilityCILow.toFixed(2)}
              ciHigh={result.wipeProbabilityCIHigh.toFixed(2)}
              ciSuffix="%"
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
                    <th>σ</th>
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
    </Page>
  )
}

function AttackSimulatorWithLang() {
  return (
    <LangProvider>
      <AttackSimulator />
    </LangProvider>
  )
}

export default AttackSimulatorWithLang
