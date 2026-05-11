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
  critOptions,
  sustainedOptions,
  sustainedMean,
  sustainedVariance,
  sustainedMax
} from '../lib/dice/options'
import {
  CalculatorLayout,
  DistributionChart,
  FormSelect,
  StatCard,
  StatGrid,
  BuffChipGroup
} from './ui'

const Z_95 = 1.96

// To-Hit options with an extra "Torrent" entry tacked on the end. Picking
// "Torrent" auto-hits every attack and hides the rest of the hit-roll inputs.
const TORRENT_OPTION = { value: 'torrent', label: 'Torrent' }
const toHitWithTorrentOptions = [...toHitOptions, TORRENT_OPTION]

function WoundSuccessCalculator() {
  // Hit Roll State
  const [numDice, setNumDice] = useState('20')
  const [toHit, setToHit] = useState({ value: '3', label: '3+' })
  const [hitReroll, setHitReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [sustainedHit, setSustainedHit] = useState(false)
  const [sustainedHitValue, setSustainedHitValue] = useState('1')
  const [lethalHit, setLethalHit] = useState(false)

  // Wound Roll State
  const [toWound, setToWound] = useState({ value: '4', label: '4+' })
  const [woundReroll, setWoundReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [devastatingWounds, setDevastatingWounds] = useState(false)
  const [critEnabled, setCritEnabled] = useState(false)
  const [crit, setCrit] = useState({ value: '6', label: '6+' })
  const [antiEnabled, setAntiEnabled] = useState(false)
  const [antiValue, setAntiValue] = useState({ value: '4', label: '4+' })

  const [result, setResult] = useState(null)

  const torrent = toHit.value === 'torrent'

  const handleCalculate = (e) => {
    e.preventDefault()

    const diceCount = parseInt(numDice) || 0
    const sustainedAvg = sustainedHit ? sustainedMean(sustainedHitValue) : 0
    const sustainedVar = sustainedHit ? sustainedVariance(sustainedHitValue) : 0
    const sustainedCap = sustainedHit ? sustainedMax(sustainedHitValue) : 0

    if (diceCount <= 0) {
      setResult(null)
      return
    }

    const { hitChance: baseHitChance, criticalChance: baseCriticalChance } = torrent
      ? { hitChance: 1, criticalChance: 0 }
      : calculateHitProbability(toHit.value, hitReroll.value, critEnabled ? crit.value : '6')

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
      expectedHits += expectedCrits * sustainedAvg
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

    // Std dev for hits (with sustained-hit contribution).
    // Let N = number of crits ~ Binomial(diceCount, criticalChance) and let
    // D be the per-crit extra-hits roll (D3 or fixed). Then total extras
    // X = sum_{i=1..N} D_i and by the law of total variance:
    //   Var(X) = E[N]*Var(D) + E[D]^2 * Var(N)
    // For fixed values Var(D) = 0 and this collapses to m^2 * Var(N).
    let hitVariance = diceCount * hitChance * (1 - hitChance)
    if (sustainedHit) {
      const expectedN = diceCount * criticalChance
      const varN = diceCount * criticalChance * (1 - criticalChance)
      hitVariance += expectedN * sustainedVar + sustainedAvg * sustainedAvg * varN
    }
    const hitsStdDev = Math.sqrt(hitVariance)
    const hitsCILow = Math.max(0, expectedHits - Z_95 * hitsStdDev)
    const hitsCIHigh = Math.min(
      diceCount + expectedCrits * sustainedCap,
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

  // Buff chip descriptors split into Hit and Wound groups so each section
  // of the form gets its own labeled set of toggles. Same shape as
  // WeaponProfileCard's buffs so the visual style stays consistent.
  const hitBuffs = [
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
            options={rerollOptions}
            value={woundReroll}
            onChange={setWoundReroll}
          />
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={woundBuffs} />
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
