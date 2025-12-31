import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line } from 'recharts'
import Select from 'react-select'
import { calculateKillProbability } from './calculationUtils'

function KillProbabilityCalculator() {
  // Kill Probability State
  const [woundedAttacks, setWoundedAttacks] = useState('10')
  const [damagePerAttack, setDamagePerAttack] = useState('2')
  const [numModels, setNumModels] = useState('5')
  const [modelWounds, setModelWounds] = useState('2')
  const [toSave, setToSave] = useState({ value: '4', label: '4+' })
  const [fnp, setFnp] = useState({ value: '5', label: '5+' })
  const [fnpEnabled, setFnpEnabled] = useState(false)
  const [killResult, setKillResult] = useState(null)

  // Options for dropdowns
  const toHitOptions = [
    { value: '2', label: '2+' },
    { value: '3', label: '3+' },
    { value: '4', label: '4+' },
    { value: '5', label: '5+' },
    { value: '6', label: '6+' }
  ]

  // Kill probability calculation handler
  const handleCalculate = (e) => {
    e.preventDefault()

    const result = calculateKillProbability(
      woundedAttacks,
      damagePerAttack,
      modelWounds,
      toSave.value,
      fnpEnabled ? fnp.value : null
    )

    setKillResult({
      expectedKills: result.expectedKills,
      distributionData: result.distributionData,
      maxKills: Math.max(...result.distributionData.map(d => d.kills)),
      calculationId: Date.now()
    })
  }

  return (
    <div className="kill-probability-container">
      <div className="form-side">
        <form onSubmit={handleCalculate} className="calculator-form">
          <div className="form-row">
            <div className="attacks-container">
              <div className="form-group">
                <label htmlFor="woundedAttacks">Number of Attacks:</label>
              </div>
              <div className="form-group num-attacks-input">
                <input
                  type="number"
                  id="woundedAttacks"
                  min="1"
                  max="100"
                  value={woundedAttacks}
                  onChange={(e) => setWoundedAttacks(e.target.value)}
                />
              </div>
            </div>

            <div className="damage-container">
              <div className="form-group">
                <label htmlFor="damagePerAttack">Damage:</label>
              </div>
              <div className="form-group">
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
          </div>

          {/* Target Information Section */}
          <div className="form-section-header">
            <h3>Target Stats</h3>
          </div>

          <div className="form-row">
            <div className="form-group num-attacks-input">
              <label htmlFor="numModels">Number of Models:</label>
              <input
                type="number"
                id="numModels"
                min="1"
                max="100"
                value={numModels}
                onChange={(e) => setNumModels(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="modelWounds">Wound:</label>
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
                options={toHitOptions}
                value={toSave}
                onChange={setToSave}
                classNamePrefix="select"
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
                <label htmlFor="fnpEnabled">Feel No Pain:</label>
              </div>
              <Select
                inputId="fnp"
                options={toHitOptions}
                value={fnp}
                onChange={setFnp}
                classNamePrefix="select"
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
              <div className="stat-label">Expected Models Killed</div>
              <div className="stat-value">{killResult.expectedKills}</div>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default KillProbabilityCalculator
