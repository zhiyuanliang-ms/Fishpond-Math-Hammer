import { useState } from 'react'
import {
  AOS_CRIT_EFFECTS,
  aosCritEffectOptions,
  aosWardOptions,
  calculateAoSDamage,
  isValidAoSDiceExpression,
  saveOptions,
  toHitOptions,
  toWoundOptions,
} from '../lib/dice'
import IntInput from './attackSim/IntInput'
import {
  CalculatorLayout,
  FormSelect,
  StatCard,
  StatGrid,
} from './ui'

function AoSDamageCalculator() {
  const [attacks, setAttacks] = useState('4')
  const [toHit, setToHit] = useState(toHitOptions[1])
  const [toWound, setToWound] = useState(toWoundOptions[1])
  const [rend, setRend] = useState(1)
  const [damage, setDamage] = useState('2')
  const [critEffect, setCritEffect] = useState(aosCritEffectOptions[0])
  const [save, setSave] = useState(saveOptions[1])
  const [ward, setWard] = useState(aosWardOptions[0])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const attacksValid = isValidAoSDiceExpression(attacks)
  const damageValid = isValidAoSDiceExpression(damage)

  const handleCalculate = (event) => {
    event.preventDefault()
    setError(null)

    try {
      const calculation = calculateAoSDamage(
        {
          modelsFiring: 1,
          attacks,
          toHit: parseInt(toHit.value, 10),
          toWound: parseInt(toWound.value, 10),
          rend,
          damage,
          critEffect: critEffect.value,
        },
        {
          save: parseInt(save.value, 10),
          ward: parseInt(ward.value, 10),
        }
      )
      setResult({
        ...calculation,
        critEffect: critEffect.value,
      })
    } catch (calculationError) {
      setResult(null)
      setError(calculationError.message || 'Calculation failed.')
    }
  }

  const form = (
    <form onSubmit={handleCalculate} className="calculator-form">
      <div className="form-section-header">
        <h3>Weapon Profile</h3>
      </div>
      <div className="stat-line">
        <div className="stat-cell">
          <label htmlFor="aosAttacks">Attacks</label>
          <input
            type="text"
            id="aosAttacks"
            className={attacksValid ? '' : 'invalid'}
            value={attacks}
            onChange={(event) => setAttacks(event.target.value)}
            placeholder="e.g. 4 or D6+1"
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="aosHit">Hit</label>
          <FormSelect
            inputId="aosHit"
            variant="buff"
            options={toHitOptions}
            value={toHit}
            onChange={setToHit}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="aosWound">Wound</label>
          <FormSelect
            inputId="aosWound"
            variant="buff"
            options={toWoundOptions}
            value={toWound}
            onChange={setToWound}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="aosRend">Rend</label>
          <IntInput
            id="aosRend"
            min={0}
            max={5}
            fallback={0}
            value={rend}
            onChange={setRend}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="aosDamage">Damage</label>
          <input
            type="text"
            id="aosDamage"
            className={damageValid ? '' : 'invalid'}
            value={damage}
            onChange={(event) => setDamage(event.target.value)}
            placeholder="e.g. 2 or D3"
          />
        </div>
      </div>

      <div className="form-section-header">
        <h3>Attack Effect</h3>
      </div>
      <div className="reroll-row">
        <div className="reroll-cell">
          <label htmlFor="aosCritEffect">Critical Hit Effect</label>
          <FormSelect
            inputId="aosCritEffect"
            options={aosCritEffectOptions}
            value={critEffect}
            onChange={setCritEffect}
          />
        </div>
      </div>

      <div className="form-section-header">
        <h3>Defender Profile</h3>
      </div>
      <div className="stat-line">
        <div className="stat-cell">
          <label htmlFor="aosSave">Save</label>
          <FormSelect
            inputId="aosSave"
            variant="buff"
            options={saveOptions}
            value={save}
            onChange={setSave}
          />
        </div>
        <div className="stat-cell">
          <label htmlFor="aosWard">Ward</label>
          <FormSelect
            inputId="aosWard"
            variant="buff"
            options={aosWardOptions}
            value={ward}
            onChange={setWard}
          />
        </div>
      </div>

      {error && <div className="calculator-error">{error}</div>}

      <button type="submit" className="calculate-button">
        Calculate
      </button>
    </form>
  )

  const resultPanel = result && (
    <>
      <StatGrid>
        <StatCard
          label="Expected Damage After Ward"
          value={result.expectedDamage.toFixed(2)}
        />
        <StatCard
          label="Expected Hits"
          value={result.expectedHits.toFixed(2)}
        />
        <StatCard
          label="Wounds Reaching Save Roll"
          value={result.expectedWounds.toFixed(2)}
        />
        <StatCard
          label="Expected Failed Saves"
          value={result.expectedFailedSaves.toFixed(2)}
        />
        {result.critEffect !== AOS_CRIT_EFFECTS.NONE && (
          <StatCard
            label="Expected Critical Hits"
            value={result.expectedCriticalHits.toFixed(2)}
          />
        )}
        {result.critEffect === AOS_CRIT_EFFECTS.MORTAL && (
          <StatCard
            label="Mortal Damage After Ward"
            value={result.expectedMortalDamage.toFixed(2)}
          />
        )}
      </StatGrid>
      <p className="simulation-note">
        * Exact expected values using the AoS 4E attack sequence; Ward applies
        to normal and mortal damage.
      </p>
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

export default AoSDamageCalculator
