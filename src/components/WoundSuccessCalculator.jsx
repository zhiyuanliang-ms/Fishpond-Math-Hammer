import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line } from 'recharts'
import Select from 'react-select'
import { calculateHitProbability, calculateWoundProbability, binomialProbability } from './calculationUtils'
import { toHitOptions, toWoundOptions, antiOptions, rerollOptions, critOptions } from './dropdownOptions'
import { selectStyles, buffSelectStyles } from './selectStyles'

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

  // Main calculation function
  const handleCalculate = (e) => {
    e.preventDefault()

    const diceCount = parseInt(numDice) || 0
    const sustainedValue = parseInt(sustainedHitValue) || 1

    if (diceCount <= 0) {
      setResult(null)
      return
    }

    const { hitChance: baseHitChance, criticalChance: baseCriticalChance } = calculateHitProbability(toHit.value, hitReroll.value, crit.value)
    
    // If torrent is enabled, all attacks auto-hit
    const hitChance = torrent ? 1 : baseHitChance
    const criticalChance = torrent ? 0 : baseCriticalChance
    
    const { woundChance, criticalWoundChance } = calculateWoundProbability(
      toWound.value,
      woundReroll.value,
      antiEnabled,
      antiValue.value
    )

    // Calculate expected hits
    let expectedHits = diceCount * hitChance
    let expectedCrits = diceCount * criticalChance

    // Add sustained hits (each critical hit generates extra guaranteed successful hits)
    if (sustainedHit) {
      // Each critical hit generates sustainedValue additional successful hits
      expectedHits += expectedCrits * sustainedValue
    }

    // Lethal hit: critical hits automatically wound
    let expectedWounds = 0
    let expectedDevastatingWounds = 0
    
    if (lethalHit) {
      // Critical hits wound automatically
      // Non-critical hits need to wound normally
      const nonCriticalHits = expectedHits - expectedCrits
      expectedWounds = expectedCrits + (nonCriticalHits * woundChance)
    } else {
      // Without lethal hits, all hits need to wound
      expectedWounds = expectedHits * woundChance
    }

    // Calculate expected devastating wounds if devastating wounds is enabled
    if (devastatingWounds) {
      if (lethalHit) {
        // With Lethal Hits: only non-critical hits roll for devastating wounds
        // Critical hits auto-wound and skip the wound roll
        const nonCriticalHits = expectedHits - expectedCrits
        expectedDevastatingWounds = nonCriticalHits * criticalWoundChance
      } else {
        // Without Lethal Hits: all hits roll for devastating wounds
        expectedDevastatingWounds = expectedHits * criticalWoundChance
      }
    }

    // Calculate standard deviation first
    let variance = 0
    if (lethalHit) {
      // Variance when lethal hits is enabled
      const nonCriticalHits = expectedHits - expectedCrits
      variance = nonCriticalHits * woundChance * (1 - woundChance)
    } else {
      // Standard variance
      variance = expectedHits * woundChance * (1 - woundChance)
    }
    const stdDev = Math.sqrt(variance)

    // Calculate standard deviation for hits
    let hitVariance = diceCount * hitChance * (1 - hitChance)
    if (sustainedHit) {
      // Add variance from sustained hits (each crit generates sustainedValue guaranteed hits)
      const sustainedVariance = (sustainedValue * sustainedValue) * diceCount * criticalChance * (1 - criticalChance)
      hitVariance += sustainedVariance
    }
    const hitsStdDev = Math.sqrt(hitVariance)

    // Calculate standard deviation for critical hits
    const criticalVariance = diceCount * criticalChance * (1 - criticalChance)
    const criticalStdDev = Math.sqrt(criticalVariance)

    // Calculate standard deviation for devastating wounds
    let devastatingWoundsStdDev = 0
    if (devastatingWounds) {
      // Use criticalWoundChance which accounts for reroll modifiers and ANTI buff
      const devVariance = expectedHits * criticalWoundChance * (1 - criticalWoundChance)
      devastatingWoundsStdDev = Math.sqrt(devVariance)
    }

    // Generate probability distribution with cumulative probability
    // Use 3 standard deviations to capture ~99.7% of the distribution
    const maxPossibleWounds = Math.ceil(expectedWounds + stdDev * 3)
    // Calculate minimum wounds to display - start from where meaningful probability begins
    const minPossibleWounds = Math.max(0, Math.floor(expectedWounds - stdDev * 3))
    const distributionData = []
    let cumulativeProbability = 0

    // For lethal hits, we need a different probability calculation
    if (lethalHit) {
      // Distribution is based on critical hits (always wound) + non-critical wounds
      const nonCriticalHits = expectedHits - expectedCrits
      for (let wounds = 0; wounds <= maxPossibleWounds; wounds++) {
        // Probability that we get 'wounds - expectedCrits' non-critical wounds
        const nonCriticalWounds = Math.max(0, wounds - Math.ceil(expectedCrits))
        const probability = binomialProbability(Math.ceil(nonCriticalHits), nonCriticalWounds, woundChance)
        cumulativeProbability += probability * 100
        // Clamp cumulative probability to 100% to avoid floating point errors
        const clampedCumulative = Math.min(cumulativeProbability, 100)
        // Only add to distribution if within display range
        if (wounds >= minPossibleWounds) {
          distributionData.push({
            wounds,
            probability: probability * 100,
            cumulative: clampedCumulative
          })
        }
      }
    } else {
      // Standard binomial distribution
      for (let wounds = 0; wounds <= maxPossibleWounds; wounds++) {
        const probability = binomialProbability(Math.ceil(expectedHits), wounds, woundChance)
        cumulativeProbability += probability * 100
        // Clamp cumulative probability to 100% to avoid floating point errors
        const clampedCumulative = Math.min(cumulativeProbability, 100)
        // Only add to distribution if within display range
        if (wounds >= minPossibleWounds) {
          distributionData.push({
            wounds,
            probability: probability * 100,
            cumulative: clampedCumulative
          })
        }
      }
    }

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
      distributionData,
      maxWounds: maxPossibleWounds,
      hasLethalHit: lethalHit,
      hasSustainedHit: sustainedHit,
      hasDevastatingWounds: devastatingWounds,
      hasAnti: antiEnabled,
      calculationId: Date.now()
    })
  }

  return (
    <div className="wound-success-container">
      <div className="form-side">
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
                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="torrent"
                    checked={torrent}
                    onChange={(e) => setTorrent(e.target.checked)}
                  />
                  <label htmlFor="torrent">TORRENT</label>
                </div>
              </div>
            </div>
          </div>

          {!torrent && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="toHit">To Hit</label>
              <Select
                inputId="toHit"
                options={toHitOptions}
                value={toHit}
                onChange={setToHit}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>

            <div className="form-group form-group--reroll">
              <label htmlFor="hitReroll">Reroll</label>
              <Select
                inputId="hitReroll"
                options={rerollOptions}
                value={hitReroll}
                onChange={setHitReroll}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>
          </div>
          )}

          {!torrent && (
          <div>
            <div className="form-row">
              <label htmlFor="crit">Critical Hit On</label>
              <Select
                inputId="crit"
                options={critOptions}
                value={crit}
                onChange={setCrit}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>
          
            <div className="form-row hit-buff-section">
              <div className="checkbox-group">
                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="lethalHit"
                    checked={lethalHit}
                    onChange={(e) => setLethalHit(e.target.checked)}
                  />
                  <label htmlFor="lethalHit">LETHAL HITS</label>
                </div>

                <div className="sustained-hits-container">
                  <div className="form-checkbox">
                    <input
                      type="checkbox"
                      id="sustainedHit"
                      checked={sustainedHit}
                      onChange={(e) => setSustainedHit(e.target.checked)}
                    />
                    <label htmlFor="sustainedHit">SUSTAINED HITS</label>
                  </div>

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
              <Select
                inputId="toWound"
                options={toWoundOptions}
                value={toWound}
                onChange={setToWound}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>

            <div className="form-group form-group--reroll">
              <label htmlFor="woundReroll">Reroll</label>
              <Select
                inputId="woundReroll"
                options={rerollOptions}
                value={woundReroll}
                onChange={setWoundReroll}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="form-row wound-buff-section">
            <div className="checkbox-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="devastatingWounds"
                  checked={devastatingWounds}
                  onChange={(e) => setDevastatingWounds(e.target.checked)}
                />
                <label htmlFor="devastatingWounds">DEVASTATING WOUNDS</label>
              </div>

              <div className="anti-wounds-container">
                <div className="form-checkbox">
                  <input
                    type="checkbox"
                    id="antiWounds"
                    checked={antiEnabled}
                    onChange={(e) => setAntiEnabled(e.target.checked)}
                  />
                  <label htmlFor="antiWounds">ANTI</label>
                </div>

                <Select
                  inputId="antiValue"
                  options={antiOptions}
                  value={antiValue}
                  onChange={setAntiValue}
                  styles={buffSelectStyles}
                  isSearchable={false}
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
      </div>

      {result && (
        <div className="result-side">
          <div className="result-stats">
            <div className="stat-card">
              <div className="stat-label">Expected Hits</div>
              <div className="stat-value">{result.expectedHits}</div>
              <div className="stat-range">±{result.hitsStdDev}</div>
            </div>
            {result && (result.hasLethalHit || result.hasSustainedHit) && (
              <div className="stat-card">
                <div className="stat-label">Critical Hits</div>
                <div className="stat-value">{result.criticalHits}</div>
                <div className="stat-range">±{result.criticalStdDev}</div>
              </div>
            )}
            <div className="stat-card">
              <div className="stat-label">Expected Wounds</div>
              <div className="stat-value">{result.expectedWounds}</div>
              <div className="stat-range">±{result.stdDev}</div>
            </div>
            {result && result.hasDevastatingWounds && (
              <div className="stat-card">
                <div className="stat-label">Devastating Wounds</div>
                <div className="stat-value">{result.expectedDevastatingWounds}</div>
                <div className="stat-range">±{result.devastatingWoundsStdDev}</div>
              </div>
            )}
          </div>

          <div className="chart-container">
            <h2>Wound Probability Distribution</h2>
            <ResponsiveContainer width="100%" height={250} key={result.calculationId}>
              <ComposedChart data={result.distributionData} key={result.calculationId}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                <XAxis 
                  dataKey="wounds" 
                  stroke="#d0d0d0"
                  interval={result.maxWounds > 50 ? Math.floor(result.maxWounds / 10) : 0}
                  allowDecimals={false}
                />
                <YAxis stroke="#d0d0d0" yAxisId="left" label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }} />
                <YAxis stroke="#a0a0a0" yAxisId="right" orientation="right" label={{ value: 'Cumulative (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  contentStyle={{ background: '#3a3a3a', border: '1px solid #fbbf24', borderRadius: '4px' }}
                  labelStyle={{ color: '#fbbf24' }}
                  formatter={(value, name) => {
                    if (name === 'probability') {
                      return [value.toFixed(2) + '%', 'Probability']
                    } else if (name === 'cumulative') {
                      return [value.toFixed(1) + '%', 'Cumulative']
                    }
                    return value
                  }}
                />
                <Bar dataKey="probability" yAxisId="left" fill="#fbbf24">
                  {result.distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#fbbf24" />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

export default WoundSuccessCalculator
