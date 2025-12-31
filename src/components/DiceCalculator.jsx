import { useState } from 'react'
import WoundSuccessCalculator from './WoundSuccessCalculator'
import KillProbabilityCalculator from './KillProbabilityCalculator'
import './DiceCalculator.css'

function DiceCalculator() {
  const [activeTab, setActiveTab] = useState('wound-success')

  return (
    <div className="page">
      <h1>Dice Calculator</h1>

      <div className="calculator-tabs">
        <button
          className={`tab-button ${activeTab === 'wound-success' ? 'active' : ''}`}
          onClick={() => setActiveTab('wound-success')}
        >
          Wound Success Calculator
        </button>
        <button
          className={`tab-button ${activeTab === 'kill-probability' ? 'active' : ''}`}
          onClick={() => setActiveTab('kill-probability')}
        >
          Kill Probability Calculator
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'wound-success' && <WoundSuccessCalculator />}
        {activeTab === 'kill-probability' && <KillProbabilityCalculator />}
      </div>
    </div>
  )
}

export default DiceCalculator

