import { useState } from 'react'
import {
  calculateHitProbability,
  calculateWoundProbability,
  buildWoundDistribution
} from '../lib/dice'
import {
  toHitOptions,
  toWoundOptions,
  antiOptions,
  rerollOptions,
  critOptions
} from '../lib/dice/options'
import {
  CalculatorLayout,
  DistributionChart,
  FormSelect,
  LabeledCheckbox,
  StatCard,
  StatGrid
} from './ui'

const Z_95 = 1.96

function WoundSuccessCalculator() {
  // Hit Roll State
  const [numDice, setNumDice] = useState('20')
  const [torrent, setTorrent] = useState(false)
  const [toHit, setToHit] = useState({ value: '3', label: '3+' })
  const [hitReroll, setHitReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [sustainedHit, setSustainedHit] = useState(false)
  const [sustainedHitValue, setSustainedHitValue] = useState('1')
  const [lethalHit, setLethalHit] = useState(false)

  // Wound Roll State
  const [toWound, setToWound] = useState({ value: '4', label: '4+' })
  const [woundReroll, setWoundReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [devastatingWounds, setDevastatingWounds] = useState(false)
  const [crit, setCrit] = useState({ value: '6', label: '6+' })
  const [antiEnabled, setAntiEnabled] = useState(false)
  const [antiValue, setAntiValue] = useState({ value: '4', label: '4+' })

  const [result, setResult] = useState(null)

  const handleCalculate = (e) => {
    e.preventDefault()

    const diceCount = parseInt(numDice) || 0
    const sustainedValue = parseInt(sustainedHitValue) || 1

    if (diceCount <= 0) {
      setResult(null)
      return
    }

    const { hitChance: baseHitChance, criticalChance: baseCriticalChance } =
      calculateHitProbability(toHit.value, hitReroll.value, crit.value)

    // If torrent is enabled, all attacks auto-hit
    const hitChance = torrent ? 1 : baseHitChance
    const criticalChance = torrent ? 0 : baseCriticalChance

    const { woundChance, criticalWoundChance } = calculateWoundProbability(
      toWound.value,
      woundReroll.value,
      antiEnabled,
      antiValue.value
    )

    // Expected hits (with optional sustained hits adding extra successful hits per crit)
    let expectedHits = diceCount * hitChance
    const expectedCrits = diceCount * criticalChance
    if (sustainedHit) {
      expectedHits += expectedCrits * sustainedValue
    }

    // Expected wounds (lethal hits => crits auto-wound)
    let expectedWounds
    let expectedDevastatingWounds = 0
    if (lethalHit) {
      const nonCriticalHits = expectedHits - expectedCrits
      expectedWounds = expectedCrits + nonCriticalHits * woundChance
    } else {
      expectedWounds = expectedHits * woundChance
    }

    if (devastatingWounds) {
      if (lethalHit) {
        const nonCriticalHits = expectedHits - expectedCrits
        expectedDevastatingWounds = nonCriticalHits * criticalWoundChance
      } else {
        expectedDevastatingWounds = expectedHits * criticalWoundChance
      }
    }

    // Variance / std dev for expected wounds
    let variance
    if (lethalHit) {
      const nonCriticalHits = expectedHits - expectedCrits
      variance = nonCriticalHits * woundChance * (1 - woundChance)
    } else {
      variance = expectedHits * woundChance * (1 - woundChance)
    }
    const stdDev = Math.sqrt(variance)

    // Std dev for hits (with sustained-hit contribution)
    let hitVariance = diceCount * hitChance * (1 - hitChance)
    if (sustainedHit) {
      const sustainedVariance =
        sustainedValue * sustainedValue * diceCount * criticalChance * (1 - criticalChance)
      hitVariance += sustainedVariance
    }
    const hitsStdDev = Math.sqrt(hitVariance)
    const hitsCILow = Math.max(0, expectedHits - Z_95 * hitsStdDev)
    const hitsCIHigh = Math.min(
      diceCount + expectedCrits * (sustainedHit ? sustainedValue : 0),
      expectedHits + Z_95 * hitsStdDev
    )

    // Std dev for critical hits
    const criticalVariance = diceCount * criticalChance * (1 - criticalChance)
    const criticalStdDev = Math.sqrt(criticalVariance)
    const criticalCILow = Math.max(0, expectedCrits - Z_95 * criticalStdDev)
    const criticalCIHigh = Math.min(diceCount, expectedCrits + Z_95 * criticalStdDev)

    // Std dev for devastating wounds
    let devastatingWoundsStdDev = 0
    let devastatingCILow = 0
    let devastatingCIHigh = 0
    if (devastatingWounds) {
      const devVariance = expectedHits * criticalWoundChance * (1 - criticalWoundChance)
      devastatingWoundsStdDev = Math.sqrt(devVariance)
      devastatingCILow = Math.max(0, expectedDevastatingWounds - Z_95 * devastatingWoundsStdDev)
      devastatingCIHigh = expectedDevastatingWounds + Z_95 * devastatingWoundsStdDev
    }

    // Build distribution via shared helper
    const { distributionData, maxWounds } = buildWoundDistribution({
      expectedHits,
      expectedCrits,
      woundChance,
      stdDev,
      lethalHit,
      expectedWounds
    })

    setResult({
      expectedHits: expectedHits.toFixed(2),
      hitsStdDev: hitsStdDev.toFixed(2),
      criticalHits: expectedCrits.toFixed(2),
      criticalStdDev: criticalStdDev.toFixed(2),
      expectedWounds: expectedWounds.toFixed(2),
      stdDev: stdDev.toFixed(2),
      woundChance: (woundChance * 100).toFixed(1),
      expectedDevastatingWounds: expectedDevastatingWounds.toFixed(2),
      devastatingWoundsStdDev: devastatingWoundsStdDev.toFixed(2),
      hitsCILow: hitsCILow.toFixed(2),
      hitsCIHigh: hitsCIHigh.toFixed(2),
      criticalCILow: criticalCILow.toFixed(2),
      criticalCIHigh: criticalCIHigh.toFixed(2),
      woundsCILow: Math.max(0, expectedWounds - Z_95 * stdDev).toFixed(2),
      woundsCIHigh: (expectedWounds + Z_95 * stdDev).toFixed(2),
      devastatingCILow: devastatingWounds ? devastatingCILow.toFixed(2) : null,
      devastatingCIHigh: devastatingWounds ? devastatingCIHigh.toFixed(2) : null,
      distributionData,
      maxWounds,
      hasLethalHit: lethalHit,
      hasSustainedHit: sustainedHit,
      hasDevastatingWounds: devastatingWounds,
      hasAnti: antiEnabled,
      calculationId: Date.now()
    })
  }

  const form = (
    <form onSubmit={handleCalculate} className="calculator-form">
      <div className="form-section-header">
        <h3>Attack Stats</h3>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="numDice">Number of Attacks</label>
          <div className="attacks-input-row">
            <input
              type="number"
              id="numDice"
              min="1"
              max="100"
              value={numDice}
              onChange={(e) => setNumDice(e.target.value)}
            />
            <LabeledCheckbox
              id="torrent"
              label="TORRENT"
              checked={torrent}
              onChange={setTorrent}
            />
          </div>
        </div>
      </div>

      {!torrent && (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="toHit">To Hit</label>
            <FormSelect
              inputId="toHit"
              options={toHitOptions}
              value={toHit}
              onChange={setToHit}
            />
          </div>

          <div className="form-group form-group--reroll">
            <label htmlFor="hitReroll">Reroll</label>
            <FormSelect
              inputId="hitReroll"
              options={rerollOptions}
              value={hitReroll}
              onChange={setHitReroll}
            />
          </div>
        </div>
      )}

      {!torrent && (
        <div>
          <div className="form-row crit-row">
            <label htmlFor="crit">Critical Hit On</label>
            <div className="crit-select">
              <FormSelect
                inputId="crit"
                options={critOptions}
                value={crit}
                onChange={setCrit}
              />
            </div>
          </div>

          <div className="form-row hit-buff-section">
            <div className="checkbox-group">
              <LabeledCheckbox
                id="lethalHit"
                label="LETHAL HITS"
                checked={lethalHit}
                onChange={setLethalHit}
              />

              <div className="sustained-hits-container">
                <LabeledCheckbox
                  id="sustainedHit"
                  label="SUSTAINED HITS"
                  checked={sustainedHit}
                  onChange={setSustainedHit}
                />
                <input
                  type="number"
                  id="sustainedHitValue"
                  min="1"
                  max="3"
                  value={sustainedHitValue}
                  onChange={(e) => setSustainedHitValue(e.target.value)}
                  disabled={!sustainedHit}
                  className={`small-input ${!sustainedHit ? 'disabled' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="toWound">To Wound</label>
          <FormSelect
            inputId="toWound"
            options={toWoundOptions}
            value={toWound}
            onChange={setToWound}
          />
        </div>

        <div className="form-group form-group--reroll">
          <label htmlFor="woundReroll">Reroll</label>
          <FormSelect
            inputId="woundReroll"
            options={rerollOptions}
            value={woundReroll}
            onChange={setWoundReroll}
          />
        </div>
      </div>

      <div className="form-row wound-buff-section">
        <div className="checkbox-group">
          <LabeledCheckbox
            id="devastatingWounds"
            label="DEVASTATING WOUNDS"
            checked={devastatingWounds}
            onChange={setDevastatingWounds}
          />

          <div className="anti-wounds-container">
            <LabeledCheckbox
              id="antiWounds"
              label="ANTI"
              checked={antiEnabled}
              onChange={setAntiEnabled}
            />
            <FormSelect
              variant="buff"
              inputId="antiValue"
              options={antiOptions}
              value={antiValue}
              onChange={setAntiValue}
              isDisabled={!antiEnabled}
              className={`anti-wounds-select ${!antiEnabled ? 'disabled' : ''}`}
            />
          </div>
        </div>
      </div>

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
