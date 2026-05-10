import { useState } from 'react'
import { calculateKillProbability } from '../lib/dice'
import { fnpOptions, saveOptions, saveRerollOptions } from '../lib/dice/options'
import {
  CalculatorLayout,
  DistributionChart,
  FormSelect,
  StatCard,
  StatGrid
} from './ui'
import BuffChipGroup from './attackSim/BuffChipGroup'

function KillProbabilityCalculator() {
  const [woundedAttacks, setWoundedAttacks] = useState('10')
  const [damagePerAttack, setDamagePerAttack] = useState('2')
  const [numModels, setNumModels] = useState('5')
  const [modelWounds, setModelWounds] = useState('2')
  const [toSave, setToSave] = useState({ value: '4', label: '4+' })
  const [fnp, setFnp] = useState({ value: '5', label: '5+' })
  const [fnpEnabled, setFnpEnabled] = useState(false)
  const [saveReroll, setSaveReroll] = useState({ value: 'no-reroll', label: 'No Reroll' })
  const [killResult, setKillResult] = useState(null)

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
      numTargets,
      killAllProbability: parseFloat(result.killAllProbability),
      killAllCILow: parseFloat(result.killAllCILow),
      killAllCIHigh: parseFloat(result.killAllCIHigh),
      killAllStdDev: parseFloat(result.killAllStdDev),
      maxKills: Math.max(...result.distributionData.map((d) => d.kills)),
      calculationId: Date.now()
    })
  }

  const buffs = [
    {
      key: 'fnp',
      label: 'FEEL NO PAIN',
      active: fnpEnabled,
      onToggle: () => setFnpEnabled((v) => !v),
      value: fnp.value,
      valueOptions: fnpOptions,
      onValueChange: (v) =>
        setFnp(fnpOptions.find((o) => o.value === v) || fnpOptions[0])
    }
  ]

  const form = (
    <form onSubmit={handleCalculate} className="calculator-form">
      <div className="form-section-header">
        <h3>Attack Stats</h3>
      </div>
      <div className="stat-line">
        <div className="stat-cell">
          <label htmlFor="woundedAttacks">Attacks</label>
          <input
            type="number"
            id="woundedAttacks"
            min="1"
            max="100"
            value={woundedAttacks}
            onChange={(e) => setWoundedAttacks(e.target.value)}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="damagePerAttack">Damage</label>
          <input
            type="number"
            id="damagePerAttack"
            min="1"
            max="20"
            value={damagePerAttack}
            onChange={(e) => setDamagePerAttack(e.target.value)}
          />
        </div>
      </div>

      <div className="form-section-header">
        <h3>Target Stats</h3>
      </div>
      <div className="stat-line">
        <div className="stat-cell">
          <label htmlFor="numModels">Models</label>
          <input
            type="number"
            id="numModels"
            min="1"
            max="50"
            value={numModels}
            onChange={(e) => setNumModels(e.target.value)}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="modelWounds">Wounds</label>
          <input
            type="number"
            id="modelWounds"
            min="1"
            max="50"
            value={modelWounds}
            onChange={(e) => setModelWounds(e.target.value)}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="toSave">To Save</label>
          <FormSelect
            inputId="toSave"
            variant="buff"
            options={saveOptions}
            value={toSave}
            onChange={setToSave}
          />
        </div>
      </div>

      <div className="reroll-row">
        <div className="reroll-cell">
          <label htmlFor="saveReroll">Save Reroll</label>
          <FormSelect
            inputId="saveReroll"
            options={saveRerollOptions}
            value={saveReroll}
            onChange={setSaveReroll}
          />
        </div>
      </div>

      <div className="buff-row">
        <BuffChipGroup buffs={buffs} />
      </div>

      <button type="submit" className="calculate-button">
        Calculate
      </button>
    </form>
  )

  const resultPanel = killResult && (
    <>
      <StatGrid>
        <StatCard
          label="Expected Unsaved Attacks"
          value={killResult.expectedUnsavedAttacks}
          stdDev={killResult.unsavedAttackStdDev.toFixed(2)}
          ciLow={killResult.unsavedCILow.toFixed(2)}
          ciHigh={killResult.unsavedCIHigh.toFixed(2)}
        />
        <StatCard
          label="Expected Models Killed"
          value={killResult.expectedKills}
          stdDev={killResult.expectedKillsStdDev.toFixed(2)}
          ciLow={killResult.expectedKillsCILow.toFixed(2)}
          ciHigh={killResult.expectedKillsCIHigh.toFixed(2)}
        />
        <StatCard
          label="Chance to Kill All"
          value={killResult.killAllProbability.toFixed(2)}
          valueSuffix="%"
          stdDev={killResult.killAllStdDev.toFixed(2)}
          ciLow={killResult.killAllCILow.toFixed(2)}
          ciHigh={killResult.killAllCIHigh.toFixed(2)}
          ciSuffix="%"
        />
      </StatGrid>

      <DistributionChart
        title="Kill Probability Distribution"
        data={killResult.distributionData}
        xKey="kills"
        chartKey={killResult.calculationId}
        footer={
          <p className="simulation-note">
            * Results estimated using Monte Carlo simulation (10,000 iterations)
          </p>
        }
      />
    </>
  )

  return (
    <CalculatorLayout
      className="kill-probability-container"
      form={form}
      result={resultPanel}
    />
  )
}

export default KillProbabilityCalculator
