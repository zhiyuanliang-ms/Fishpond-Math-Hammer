import { useState } from 'react'
import WoundSuccessCalculator from './WoundSuccessCalculator'
import KillProbabilityCalculator from './KillProbabilityCalculator'
import { Page, Tabs } from './ui'
import '../styles/diceCalculator.css'

const DICE_TABS = [
  { value: 'wound-success', label: 'Wound Success Calculator' },
  { value: 'kill-probability', label: 'Kill Probability Calculator' }
]

function DiceCalculator() {
  const [activeTab, setActiveTab] = useState('wound-success')

  return (
    <Page title="Dice Calculator">
      <Tabs
        variant="calculator-tabs"
        value={activeTab}
        onChange={setActiveTab}
        tabs={DICE_TABS}
      />

      <div className="tab-content">
        {activeTab === 'wound-success' && <WoundSuccessCalculator />}
        {activeTab === 'kill-probability' && <KillProbabilityCalculator />}
      </div>
    </Page>
  )
}

export default DiceCalculator

