import { useState } from 'react'
import 'katex/dist/katex.min.css'
import { Page, Tabs } from './ui'
import '../styles/cheatsheet.css'

const CHEATSHEET_TABS = [
  { value: 'd6', label: 'D6' },
  { value: 'd2d6', label: '2D6' }
]

// Cumulative-or-better D6 probabilities for the D6 cheatsheet table.
const calculateD6Probabilities = () => {
  const outcomes = []
  for (let target = 2; target <= 6; target++) {
    const ways = 7 - target
    const probability = ways / 6
    const probabilityRerollOnes = probability + (1 / 6) * probability
    const probabilityRerollFail = 2 * probability - probability * probability

    outcomes.push({
      target,
      ways,
      probability: (probability * 100).toFixed(2),
      probabilityRerollOnes: (probabilityRerollOnes * 100).toFixed(2),
      probabilityRerollFail: (probabilityRerollFail * 100).toFixed(2)
    })
  }
  return outcomes
}

// 2D6 sum-or-better probabilities.
const calculate2D6Probabilities = () => {
  const outcomes = []
  for (let target = 2; target <= 12; target++) {
    let count = 0
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 >= target) count++
      }
    }
    const probability = count / 36
    const probabilityWithReroll = 2 * probability - probability * probability

    outcomes.push({
      target,
      ways: count,
      probability: (probability * 100).toFixed(2),
      probabilityWithReroll: (probabilityWithReroll * 100).toFixed(2)
    })
  }
  return outcomes
}

const probabilityClass = (p) =>
  p >= 80 ? 'healthy' : p >= 50 ? 'medium' : p >= 33 ? 'risky' : p >= 10 ? 'extremely-risky' : 'suicide'

function Cheatsheet() {
  const [activeTab, setActiveTab] = useState('d6')

  const d6Probabilities = calculateD6Probabilities()
  const d2d6Probabilities = calculate2D6Probabilities()

  return (
    <Page title="Cheatsheet">
      <Tabs
        variant="cheatsheet-tabs"
        value={activeTab}
        onChange={setActiveTab}
        tabs={CHEATSHEET_TABS}
      />

      <div>
        {activeTab === 'd6' && (
          <div className="tab-content">
            <table className="probability-table">
              <thead>
                <tr>
                  <th className="col-result">Result</th>
                  <th className="col-probability">Chance</th>
                  <th className="col-probability-reroll">Reroll One</th>
                  <th className="col-probability-reroll">Reroll Fail</th>
                </tr>
              </thead>
              <tbody>
                {d6Probabilities.map((row) => (
                  <tr key={row.target}>
                    <td className="result">{row.target}+</td>
                    <td className="probability">{row.probability}%</td>
                    <td className="probability-reroll">{row.probabilityRerollOnes}%</td>
                    <td className="probability-reroll">{row.probabilityRerollFail}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'd2d6' && (
          <div className="tab-content">
            <table className="probability-table">
              <thead>
                <tr>
                  <th className="col-result">Result</th>
                  <th className="col-probability">Chance</th>
                  <th className="col-probability-reroll">With Reroll</th>
                </tr>
              </thead>
              <tbody>
                {d2d6Probabilities.map((row) => {
                  const prob = parseFloat(row.probability)
                  const probReroll = parseFloat(row.probabilityWithReroll)
                  return (
                    <tr key={row.target}>
                      <td className="result">{row.target}</td>
                      <td className={`probability ${probabilityClass(prob)}`}>{row.probability}%</td>
                      <td className={`probability-reroll ${probabilityClass(probReroll)}`}>
                        {row.probabilityWithReroll}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}

export default Cheatsheet
