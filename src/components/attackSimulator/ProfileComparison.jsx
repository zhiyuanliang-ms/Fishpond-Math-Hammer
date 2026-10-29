import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RotateCcw, X } from 'lucide-react'
import {
  getSavedTargetSetLibrary,
  getSavedWeaponSetLibrary,
} from '../../lib/attackSimStorage'
import { compareAttackerProfiles } from '../../lib/attackSimComparison'
import { TACTICAL_LINE_COLORS } from '../../lib/colors'
import {
  isTargetUnitBuffsEmpty,
  isUnitBuffsEmpty,
  makeTargetUnitBuffs,
  makeUnitBuffs,
  mergeTargetUnitBuffs,
  mergeUnitBuffs,
} from '../../lib/dice'
import { useT } from '../attackSim/lang'
import { FormSelect } from '../ui'
import DefenderUnitBuffsPanel from './DefenderUnitBuffsPanel'
import UnitBuffsPanel from './UnitBuffsPanel'
import { buildComparisonProfileName } from './profileSummaries'
import {
  AttackerProfilePreview,
  DefenderProfilePreview,
} from './ProfilePreview'

const attackerColors = TACTICAL_LINE_COLORS.slice(0, 4).map(({ value }) => value)

function AdditionalUnitBuffs({ children, disabled, empty, onReset }) {
  const { t } = useT()
  return (
    <details className="comparison-unit-buffs">
      <summary>{t('additionalUnitBuffs')}</summary>
      <fieldset disabled={disabled} aria-label={t('additionalUnitBuffs')}>
        {children}
        <div className="comparison-extra-actions">
          <button
            type="button"
            className="toolbar-button"
            onClick={onReset}
            disabled={disabled || empty}
          >
            <RotateCcw size={14} />
            {t('clearAdditionalBuffs')}
          </button>
        </div>
      </fieldset>
    </details>
  )
}

export default function ProfileComparison() {
  const { t } = useT()
  const [attackerLibrary] = useState(() => getSavedWeaponSetLibrary())
  const [defenderLibrary] = useState(() => getSavedTargetSetLibrary())
  const attackerOptions = Object.keys(attackerLibrary)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }))
  const defenderOptions = Object.keys(defenderLibrary)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }))
  const [defenderName, setDefenderName] = useState('')
  const [defenderExtraBuffs, setDefenderExtraBuffs] = useState(() => makeTargetUnitBuffs())
  const [attackerSlots, setAttackerSlots] = useState(() =>
    attackerColors.slice(0, 2).map((color) => ({
      name: '',
      color,
      extraUnitBuffs: makeUnitBuffs(),
    }))
  )
  const [highPrecision, setHighPrecision] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const configuredAttackers = attackerSlots.map((slot, index) => {
    const unitBuffs = mergeUnitBuffs(
      attackerLibrary[slot.name]?.unitBuffs,
      slot.extraUnitBuffs
    )
    return {
      ...slot,
      slotNumber: index + 1,
      profile: slot.name ? { ...attackerLibrary[slot.name], unitBuffs } : null,
    }
  })
  const selectedAttackers = configuredAttackers.filter(({ name }) => name)
  const resolvedDefenderBuffs = mergeTargetUnitBuffs(
    defenderLibrary[defenderName]?.defenderUnitBuffs,
    defenderExtraBuffs
  )
  const configuredDefender = defenderName
    ? { ...defenderLibrary[defenderName], defenderUnitBuffs: resolvedDefenderBuffs }
    : null

  const invalidate = () => {
    setResults(null)
    setError(null)
  }

  const updateAttacker = (color, name) => {
    setAttackerSlots((current) =>
      current.map((slot) =>
        slot.color === color ? { ...slot, name, extraUnitBuffs: makeUnitBuffs() } : slot
      )
    )
    invalidate()
  }

  const updateAttackerExtraBuffs = (color, extraUnitBuffs) => {
    if (running) return
    setAttackerSlots((current) =>
      current.map((slot) =>
        slot.color === color ? { ...slot, extraUnitBuffs } : slot
      )
    )
    invalidate()
  }

  const updateDefenderExtraBuffs = (extraBuffs) => {
    if (running) return
    setDefenderExtraBuffs(extraBuffs)
    invalidate()
  }

  const addAttacker = () => {
    if (attackerSlots.length >= attackerColors.length) return
    const color = attackerColors.find(
      (value) => !attackerSlots.some((slot) => slot.color === value)
    )
    setAttackerSlots((current) => [
      ...current,
      { name: '', color, extraUnitBuffs: makeUnitBuffs() },
    ])
    invalidate()
  }

  const removeAttacker = (color) => {
    if (attackerSlots.length <= 2) return
    setAttackerSlots((current) =>
      current.filter((slot) => slot.color !== color)
    )
    invalidate()
  }

  const handleRun = () => {
    if (!defenderName) {
      setError(t('selectDefender'))
      return
    }
    if (selectedAttackers.length < 2) {
      setError(t('comparisonMinimumAttackers'))
      return
    }

    setRunning(true)
    setError(null)
    setTimeout(() => {
      try {
        const compared = compareAttackerProfiles(
          selectedAttackers,
          configuredDefender,
          highPrecision ? 10000 : 1000
        )
        setResults(
          compared
            .map((entry, index) => ({
              ...entry,
              name: buildComparisonProfileName(entry.name, selectedAttackers[index].extraUnitBuffs),
              color: selectedAttackers[index].color,
              slotNumber: selectedAttackers[index].slotNumber,
            }))
            .sort(
              // Damage breaks ties, e.g. against a large model nobody kills.
              (left, right) =>
                right.result.expectedKills - left.result.expectedKills ||
                right.result.wipeProbability - left.result.wipeProbability ||
                right.result.expectedDamage - left.result.expectedDamage
            )
        )
      } catch (comparisonError) {
        setError(comparisonError.message || 'Comparison failed.')
      } finally {
        setRunning(false)
      }
    }, 0)
  }

  const canCompare = defenderName && selectedAttackers.length >= 2

  return (
    <section className="profile-comparison-page">
      <header className="attack-sim-section-header profile-page-heading">
        <h2>{t('comparison')}</h2>
      </header>

      {(attackerOptions.length === 0 || defenderOptions.length === 0) && (
        <div className="profile-comparison-empty">
          <strong>{t('comparisonNeedsProfiles')}</strong>
          <Link className="toolbar-button profile-page-link" to="/attack-simulator/profiles">
            {t('manageProfiles')}
          </Link>
        </div>
      )}

      <section className="comparison-selector-section">
        <header>
          <h3>{t('selectDefender')}</h3>
        </header>
        <FormSelect
          className="comparison-select"
          classNamePrefix="profile-select"
          options={defenderOptions}
          value={defenderOptions.find((option) => option.value === defenderName) ?? null}
          placeholder={t('selectDefender')}
          noOptionsMessage={() => t('noSavedProfiles')}
          aria-label={t('selectDefender')}
          isDisabled={running}
          isClearable
          onChange={(option) => {
            setDefenderName(option?.value ?? '')
            setDefenderExtraBuffs(makeTargetUnitBuffs())
            invalidate()
          }}
        />
        {configuredDefender && (
          <>
            <DefenderProfilePreview
              key={defenderName}
              name={defenderName}
              profile={configuredDefender}
              savedProfile={defenderLibrary[defenderName]}
              extraUnitBuffs={defenderExtraBuffs}
            />
            <AdditionalUnitBuffs
              disabled={running}
              empty={isTargetUnitBuffsEmpty(defenderExtraBuffs)}
              onReset={() => updateDefenderExtraBuffs(makeTargetUnitBuffs())}
            >
              <DefenderUnitBuffsPanel
                key={defenderName}
                value={defenderExtraBuffs}
                onChange={updateDefenderExtraBuffs}
                disabled={running}
                additional
              />
            </AdditionalUnitBuffs>
          </>
        )}
      </section>

      <section className="comparison-selector-section">
        <header className="comparison-attacker-heading">
          <h3>{t('attackersToCompare')}</h3>
          <span>{attackerSlots.length} / {attackerColors.length}</span>
        </header>
        <div className="comparison-attacker-grid">
          {configuredAttackers.map(({ name, color, profile, extraUnitBuffs, slotNumber }) => (
            <div
              className="comparison-attacker-slot"
              key={color}
              style={{ '--attacker-color': color }}
            >
              <h4 className="comparison-slot-label">{t('attackerNumber', slotNumber)}</h4>
              <div className="comparison-slot-toolbar">
                <span
                  className="comparison-color-dot"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <FormSelect
                  className="comparison-select"
                  classNamePrefix="profile-select"
                  options={attackerOptions}
                  value={attackerOptions.find((option) => option.value === name) ?? null}
                  placeholder={`${t('selectAttacker')} ${slotNumber}`}
                  noOptionsMessage={() => t('noSavedProfiles')}
                  isDisabled={running}
                  isClearable
                  onChange={(option) =>
                    updateAttacker(color, option?.value ?? '')
                  }
                  aria-label={`${t('selectAttacker')} ${slotNumber}`}
                />
                {attackerSlots.length > 2 && (
                  <button
                    type="button"
                    className="comparison-remove-button"
                    onClick={() => removeAttacker(color)}
                    disabled={running}
                    aria-label={t('removeAttacker', slotNumber)}
                    title={t('removeAttacker', slotNumber)}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              {profile ? (
                <>
                  <AttackerProfilePreview
                    key={name}
                    name={name}
                    profile={profile}
                    savedProfile={attackerLibrary[name]}
                    extraUnitBuffs={extraUnitBuffs}
                  />
                  <AdditionalUnitBuffs
                    disabled={running}
                    empty={isUnitBuffsEmpty(extraUnitBuffs)}
                    onReset={() => updateAttackerExtraBuffs(color, makeUnitBuffs())}
                  >
                    <UnitBuffsPanel
                      key={name}
                      value={extraUnitBuffs}
                      onChange={(next) => updateAttackerExtraBuffs(color, next)}
                      disabled={running}
                      additional
                    />
                  </AdditionalUnitBuffs>
                </>
              ) : (
                <div className="comparison-slot-empty">
                  {t('selectAttacker')}
                </div>
              )}
            </div>
          ))}
        </div>
        {attackerSlots.length < attackerColors.length && (
          <button
            type="button"
            className="add-profile-tile comparison-add-attacker"
            onClick={addAttacker}
            disabled={running}
          >
            <Plus size={15} />
            {t('addAttacker')}
          </button>
        )}
      </section>

      {error && <div className="attack-sim-error" role="alert">{error}</div>}

      <div className="run-row comparison-run-row">
        <button
          type="button"
          className="calculate-button"
          onClick={handleRun}
          disabled={!canCompare || running}
        >
          {running ? t('comparing') : t('runComparison')}
        </button>
        <label className="precision-toggle">
          <input
            type="checkbox"
            checked={highPrecision}
            disabled={running}
            onChange={(event) => {
              setHighPrecision(event.target.checked)
              invalidate()
            }}
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

      {results && <ComparisonResults results={results} />}
    </section>
  )
}

export function ComparisonResults({ results }) {
  const { t } = useT()
  const resultsRef = useRef(null)
  const bestKills = results[0].result.expectedKills

  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      resultsRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
    }
  }, [results])

  return (
    <section
      className="comparison-results"
      ref={resultsRef}
      aria-label={t('comparisonResults')}
    >
      <header className="attack-sim-section-header">
        <h2>{t('comparisonResults')}</h2>
      </header>
      <div className="comparison-table-wrap">
        <table className="comparison-table" role="table">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">#</th>
              <th scope="col" role="columnheader">{t('reportAttacker')}</th>
              <th scope="col" role="columnheader">{t('expectedModelsKilled')}</th>
              <th scope="col" role="columnheader">{t('expectedDamageDealt')}</th>
              <th scope="col" role="columnheader">{t('chanceToWipe')}</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {results.map(({ name, color, result, slotNumber }, index) => (
              <tr key={color} role="row" style={{ '--attacker-color': color }}>
                <td role="cell" className="comparison-rank">{index + 1}</td>
                <th scope="row" role="rowheader" className="comparison-result-name">
                  <span
                    className="comparison-color-dot"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {name}
                  <span className="comparison-result-variant">
                    {t('attackerNumber', slotNumber)}
                  </span>
                </th>
                <td role="cell" data-label={t('expectedModelsKilled')}>
                  <span className="comparison-metric-value">
                    <strong>{result.expectedKills.toFixed(2)}</strong>
                    <small>
                      95% range {result.expectedKillsCILow.toFixed(2)}–
                      {result.expectedKillsCIHigh.toFixed(2)}
                    </small>
                  </span>
                </td>
                <td role="cell" data-label={t('expectedDamageDealt')}>
                  <span className="comparison-metric-value">{result.expectedDamage.toFixed(2)}</span>
                </td>
                <td role="cell" data-label={t('chanceToWipe')}>
                  <span className="comparison-metric-value">{result.wipeProbability.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="comparison-bars">
        <h3>{t('expectedModelsKilled')}</h3>
        {results.map(({ name, color, result, slotNumber }) => (
          <div className="comparison-bar-row" key={color}>
            <span>{t('attackerNumber', slotNumber)} · {name}</span>
            <div className="comparison-bar-track" aria-hidden="true">
              <div
                className="comparison-bar-fill"
                style={{
                  width: `${bestKills > 0 ? (result.expectedKills / bestKills) * 100 : 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <strong>{result.expectedKills.toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
