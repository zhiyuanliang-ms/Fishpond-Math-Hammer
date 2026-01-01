import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line } from 'recharts'
import Select from 'react-select'
import { InlineMath } from 'react-katex'
import { calculateKillProbability } from './calculationUtils'
import { fnpOptions, saveRerollOptions } from './dropdownOptions'
import { selectStyles, buffSelectStyles } from './selectStyles'

function KillProbabilityCalculator() {
  // Kill Probability State
  const [woundedAttacks, setWoundedAttacks] = useState('10')
  const [damagePerAttack, setDamagePerAttack] = useState('2')
  const [numModels, setNumModels] = useState('5')
  const [modelWounds, setModelWounds] = useState('2')
  const [toSave, setToSave] = useState({ value: '4', label: '4+' })
  const [fnp, setFnp] = useState({ value: '5', label: '5+' })
  const [fnpEnabled, setFnpEnabled] = useState(false)
  const [saveReroll, setSaveReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [killResult, setKillResult] = useState(null)

  // Kill probability calculation handler
  const handleCalculate = (e) => {
    e.preventDefault()

    const result = calculateKillProbability(
      woundedAttacks,
      damagePerAttack,
      numModels,
      modelWounds,
      toSave.value,
      fnpEnabled ? fnp.value : null,
      saveReroll.value
    )

    const numTargets = parseInt(numModels) || 1

    setKillResult({
      expectedKills: result.expectedKills,
      expectedKillsCILow: parseFloat(result.expectedKillsCILow),
      expectedKillsCIHigh: parseFloat(result.expectedKillsCIHigh),
      expectedKillsStdDev: parseFloat(result.expectedKillsStdDev),
      expectedUnsavedAttacks: result.expectedUnsavedAttacks,
      unsavedCILow: parseFloat(result.unsavedCILow),
      unsavedCIHigh: parseFloat(result.unsavedCIHigh),
      unsavedAttackStdDev: parseFloat(result.unsavedAttackStdDev),
      distributionData: result.distributionData,
      numTargets: numTargets,
      killAllProbability: parseFloat(result.killAllProbability),
      killAllCILow: parseFloat(result.killAllCILow),
      killAllCIHigh: parseFloat(result.killAllCIHigh),
      killAllStdDev: parseFloat(result.killAllStdDev),
      maxKills: Math.max(...result.distributionData.map(d => d.kills)),
      calculationId: Date.now()
    })
  }

  return (
    <div className="kill-probability-container">
      <div className="form-side">
        <form onSubmit={handleCalculate} className="calculator-form">
          <div className="form-section-header">
            <h3>Attack Stats</h3>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="woundedAttacks">Number of Attacks</label>
              <input
                type="number"
                id="woundedAttacks"
                min="1"
                max="100"
                value={woundedAttacks}
                onChange={(e) => setWoundedAttacks(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginLeft: 'auto', marginRight: '50px' }}>
              <label htmlFor="damagePerAttack">Damage</label>
              <input
                type="number"
                id="damagePerAttack"
                min="1"
                max="10"
                value={damagePerAttack}
                onChange={(e) => setDamagePerAttack(e.target.value)}
              />
            </div>
          </div>

          <div className="form-section-header">
            <h3>Target Stats</h3>
          </div>

          <div className="form-row">
            <div className="form-group num-attacks-input">
              <label htmlFor="numModels">Number of Models</label>
              <input
                type="number"
                id="numModels"
                min="1"
                max="100"
                value={numModels}
                onChange={(e) => setNumModels(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginLeft: 'auto', marginRight: '52px' }}>
              <label htmlFor="modelWounds">Wound</label>
              <input
                type="number"
                id="modelWounds"
                min="1"
                max="10"
                value={modelWounds}
                onChange={(e) => setModelWounds(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="toSave">To Save:</label>
              <Select
                inputId="toSave"
                options={fnpOptions}
                value={toSave}
                onChange={setToSave}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>

            <div className="form-group form-group--reroll">
              <label htmlFor="saveReroll">Reroll</label>
              <Select
                inputId="saveReroll"
                options={saveRerollOptions}
                value={saveReroll}
                onChange={setSaveReroll}
                styles={selectStyles}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="defense-checkbox-group">
              <div className="form-checkbox">
                <input
                  type="checkbox"
                  id="fnpEnabled"
                  checked={fnpEnabled}
                  onChange={(e) => setFnpEnabled(e.target.checked)}
                />
                <label htmlFor="fnpEnabled">FEEL NO PAIN</label>
              </div>
              <Select
                inputId="fnp"
                options={fnpOptions}
                value={fnp}
                onChange={setFnp}
                styles={buffSelectStyles}
                isSearchable={false}
                isDisabled={!fnpEnabled}
                className={`defense-select ${!fnpEnabled ? 'disabled' : ''}`}
              />
            </div>
          </div>

          <button type="submit" className="calculate-button">
            Calculate
          </button>
        </form>
      </div>

      {killResult && (
        <div className="result-side">
          <div className="result-stats">
            <div className="stat-card">
              <div className="stat-label">Expected Unsaved Attacks</div>
              <div className="stat-value">{killResult.expectedUnsavedAttacks}</div>
              <div className="stat-range"><InlineMath math="\sigma" />: ±{killResult.unsavedAttackStdDev.toFixed(2)}</div>
              <div className="stat-range">95% CI [{killResult.unsavedCILow.toFixed(2)}, {killResult.unsavedCIHigh.toFixed(2)}]</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Expected Models Killed</div>
              <div className="stat-value">{killResult.expectedKills}</div>
              <div className="stat-range"><InlineMath math="\sigma" />: ±{killResult.expectedKillsStdDev.toFixed(2)}</div>
              <div className="stat-range">95% CI [{killResult.expectedKillsCILow.toFixed(2)}, {killResult.expectedKillsCIHigh.toFixed(2)}]</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Chance to Kill All</div>
              <div className="stat-value">{killResult.killAllProbability.toFixed(2)}%</div>
              <div className="stat-range"><InlineMath math="\sigma" />: ±{killResult.killAllStdDev.toFixed(2)}%</div>
              <div className="stat-range">95% CI [{killResult.killAllCILow.toFixed(2)}%, {killResult.killAllCIHigh.toFixed(2)}%]</div>
            </div>
          </div>

          <div className="chart-container">
            <h2>Kill Probability Distribution</h2>
            <ResponsiveContainer width="100%" height={250} key={killResult.calculationId}>
              <ComposedChart data={killResult.distributionData} key={killResult.calculationId}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
                <XAxis 
                  dataKey="kills" 
                  stroke="#d0d0d0"
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
                  {killResult.distributionData.map((entry, index) => (
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
            <p className="simulation-note">
              * Results estimated using Monte Carlo simulation (10,000 iterations)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default KillProbabilityCalculator
