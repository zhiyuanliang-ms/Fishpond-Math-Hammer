import { useState } from 'react'
import { calculateWoundPool } from '../lib/dice'
import { trackEvent, TELEMETRY_EVENTS } from '../lib/telemetry'
import {
  toHitOptions,
  toWoundOptions,
  antiOptions,
  rerollOptions,
  woundRerollOptions,
  failedRerollOptions,
  critOptions,
  sustainedOptions
} from '../lib/dice/options'
import {
  CalculatorLayout,
  DistributionChart,
  FormSelect,
  StatCard,
  StatGrid,
  BuffChipGroup
} from './ui'

// To-Hit options with an extra "Torrent" entry tacked on the end. Picking
// "Torrent" auto-hits every attack and hides the rest of the hit-roll inputs.
const TORRENT_OPTION = { value: 'torrent', label: 'Torrent' }
const toHitWithTorrentOptions = [...toHitOptions, TORRENT_OPTION]

function WoundSuccessCalculator() {
  // Hit Roll State
  const [numDice, setNumDice] = useState('20')
  const [toHit, setToHit] = useState({ value: '3', label: '3+' })
  const [hitReroll, setHitReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [rerollFailedHit, setRerollFailedHit] = useState(0)
  const [sustainedHit, setSustainedHit] = useState(false)
  const [sustainedHitValue, setSustainedHitValue] = useState('1')
  const [lethalHit, setLethalHit] = useState(false)

  // Wound Roll State
  const [toWound, setToWound] = useState({ value: '4', label: '4+' })
  const [woundReroll, setWoundReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [rerollFailedWound, setRerollFailedWound] = useState(0)
  const [devastatingWounds, setDevastatingWounds] = useState(false)
  const [critEnabled, setCritEnabled] = useState(false)
  const [crit, setCrit] = useState({ value: '6', label: '6+' })
  const [antiEnabled, setAntiEnabled] = useState(false)
  const [antiValue, setAntiValue] = useState({ value: '4', label: '4+' })

  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const torrent = toHit.value === 'torrent'

  const showResult = (stats) => setResult({
    expectedHits: stats.expectedHits.toFixed(2),
    hitsStdDev: stats.hitsStdDev.toFixed(2),
    criticalHits: stats.expectedCrits.toFixed(2),
    criticalStdDev: stats.criticalStdDev.toFixed(2),
    expectedWounds: stats.expectedWounds.toFixed(2),
    stdDev: stats.stdDev.toFixed(2),
    woundChance: (stats.woundChance * 100).toFixed(1),
    expectedDevastatingWounds: stats.expectedDevastatingWounds.toFixed(2),
    devastatingWoundsStdDev: stats.devastatingWoundsStdDev.toFixed(2),
    hitsCILow: stats.hitsCILow.toFixed(2),
    hitsCIHigh: stats.hitsCIHigh.toFixed(2),
    criticalCILow: stats.criticalCILow.toFixed(2),
    criticalCIHigh: stats.criticalCIHigh.toFixed(2),
    woundsCILow: stats.woundsCILow.toFixed(2),
    woundsCIHigh: stats.woundsCIHigh.toFixed(2),
    devastatingCILow: devastatingWounds ? stats.devastatingCILow.toFixed(2) : null,
    devastatingCIHigh: devastatingWounds ? stats.devastatingCIHigh.toFixed(2) : null,
    distributionData: stats.distributionData,
    maxWounds: stats.maxWounds,
    hasLethalHit: lethalHit,
    hasSustainedHit: sustainedHit,
    hasDevastatingWounds: devastatingWounds,
    hasAnti: antiEnabled,
    calculationId: Date.now()
  })

  const handleCalculate = (e) => {
    e.preventDefault()
    setError(null)
    trackEvent(TELEMETRY_EVENTS.DiceCalculator, { calculator: '40k-wound' })

    try {
      showResult(calculateWoundPool({
        numAttacks: Number(numDice),
        toHit: toHit.value,
        toWound: toWound.value,
        hitReroll: hitReroll.value,
        woundReroll: woundReroll.value,
        critHit: critEnabled ? crit.value : '6',
        antiValue: antiEnabled ? antiValue.value : null,
        torrent,
        sustainedHits: sustainedHit ? sustainedHitValue : 'off',
        lethalHits: lethalHit,
        devastatingWounds,
        rerollFailedHit,
        rerollFailedWound,
      }))
    } catch (calculationError) {
      setResult(null)
      setError(calculationError.message || 'Calculation failed.')
    }
  }

  // Buff chip descriptors split into Hit and Wound groups so each section
  // of the form gets its own labeled set of toggles. Same shape as
  // Attack Simulator profile buffs so the visual style stays consistent.
  const hitBuffs = [
    {
      key: 'rerollFailedHit',
      label: 'REROLL FAILED HIT DICE',
      active: rerollFailedHit > 0,
      onToggle: () => setRerollFailedHit((value) => value ? 0 : 1),
      value: (rerollFailedHit || 1).toString(),
      valueOptions: failedRerollOptions,
      onValueChange: (value) => setRerollFailedHit(Number(value))
    },
    {
      key: 'critHit',
      label: 'CRITICAL HIT',
      active: critEnabled,
      onToggle: () => setCritEnabled((v) => !v),
      value: crit.value,
      valueOptions: critOptions,
      onValueChange: (v) =>
        setCrit(critOptions.find((o) => o.value === v) || critOptions[0])
    },
    {
      key: 'lethalHit',
      label: 'LETHAL HITS',
      active: lethalHit,
      onToggle: () => setLethalHit((v) => !v)
    },
    {
      key: 'sustainedHit',
      label: 'SUSTAINED HITS',
      active: sustainedHit,
      onToggle: () => setSustainedHit((v) => !v),
      value: sustainedHitValue,
      valueOptions: sustainedOptions,
      onValueChange: (v) => setSustainedHitValue(v)
    }
  ]

  const woundBuffs = [
    {
      key: 'rerollFailedWound',
      label: 'REROLL FAILED WOUND DICE',
      active: rerollFailedWound > 0,
      onToggle: () => setRerollFailedWound((value) => value ? 0 : 1),
      value: (rerollFailedWound || 1).toString(),
      valueOptions: failedRerollOptions,
      onValueChange: (value) => setRerollFailedWound(Number(value))
    },
    {
      key: 'devastating',
      label: 'DEVASTATING WOUNDS',
      active: devastatingWounds,
      onToggle: () => setDevastatingWounds((v) => !v)
    },
    {
      key: 'anti',
      label: 'ANTI',
      active: antiEnabled,
      onToggle: () => setAntiEnabled((v) => !v),
      value: antiValue.value,
      valueOptions: antiOptions,
      onValueChange: (v) =>
        setAntiValue(antiOptions.find((o) => o.value === v) || antiOptions[0])
    }
  ]

  const form = (
    <form onSubmit={handleCalculate} className="calculator-form">
      <div className="form-section-header">
        <h3>Hit</h3>
      </div>
      <div className="stat-line">
        <div className="stat-cell">
          <label htmlFor="numDice">Attacks</label>
          <input
            type="number"
            id="numDice"
            min="1"
            max="100"
            value={numDice}
            onChange={(e) => setNumDice(e.target.value)}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="toHit">BS/WS</label>
          <FormSelect
            inputId="toHit"
            variant="buff"
            options={toHitWithTorrentOptions}
            value={toHit}
            onChange={setToHit}
          />
        </div>
      </div>

      {!torrent && (
        <>
          <div className="reroll-row">
            <div className="reroll-cell">
              <label htmlFor="hitReroll">Hit Reroll</label>
              <FormSelect
                inputId="hitReroll"
                options={rerollOptions}
                value={hitReroll}
                onChange={setHitReroll}
              />
            </div>
          </div>

          <div className="buff-row">
            <BuffChipGroup buffs={hitBuffs} />
          </div>
        </>
      )}

      <div className="form-section-header">
        <h3>Wound</h3>
      </div>
      <div className="stat-line">
        <div className="stat-cell">
          <label htmlFor="toWound">To Wound</label>
          <FormSelect
            inputId="toWound"
            variant="buff"
            options={toWoundOptions}
            value={toWound}
            onChange={setToWound}
          />
        </div>
      </div>
      <div className="reroll-row">
        <div className="reroll-cell">
          <label htmlFor="woundReroll">Wound Reroll</label>
          <FormSelect
            inputId="woundReroll"
            options={woundRerollOptions}
            value={woundReroll}
            onChange={setWoundReroll}
          />
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={woundBuffs} />
      </div>

      {error && <div className="calculator-error" role="alert">{error}</div>}
      <button type="submit" className="calculate-button">
        Calculate
      </button>
    </form>
  )

  const resultPanel = result && (
    <>
      <StatGrid>
        <StatCard
          label="Expected Hits"
          value={result.expectedHits}
          stdDev={result.hitsStdDev}
          ciLow={result.hitsCILow}
          ciHigh={result.hitsCIHigh}
        />
        {(result.hasLethalHit || result.hasSustainedHit) && (
          <StatCard
            label="Critical Hits"
            value={result.criticalHits}
            stdDev={result.criticalStdDev}
            ciLow={result.criticalCILow}
            ciHigh={result.criticalCIHigh}
          />
        )}
        <StatCard
          label="Expected Wounds"
          value={result.expectedWounds}
          stdDev={result.stdDev}
          ciLow={result.woundsCILow}
          ciHigh={result.woundsCIHigh}
        />
        {result.hasDevastatingWounds && (
          <StatCard
            label="Devastating Wounds"
            value={result.expectedDevastatingWounds}
            stdDev={result.devastatingWoundsStdDev}
            ciLow={result.devastatingCILow}
            ciHigh={result.devastatingCIHigh}
          />
        )}
      </StatGrid>

      <DistributionChart
        title="Wound Probability Distribution"
        data={result.distributionData}
        xKey="wounds"
        xInterval={result.maxWounds > 50 ? Math.floor(result.maxWounds / 10) : 0}
        chartKey={result.calculationId}
      />
    </>
  )

  return (
    <CalculatorLayout
      className="wound-success-container"
      form={form}
      result={resultPanel}
    />
  )
}

export default WoundSuccessCalculator
