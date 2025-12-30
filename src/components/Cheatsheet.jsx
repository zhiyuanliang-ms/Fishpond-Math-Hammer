import { useState } from 'react'
import { InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import './Cheatsheet.css'

function Cheatsheet() {
  const [activeTab, setActiveTab] = useState('d6')

  // Calculate 2D6 probabilities
  const calculate2D6Probabilities = () => {
    const outcomes = []
    
    for (let target = 2; target <= 12; target++) {
      let count = 0
      // Count ways to get 2D6 >= target
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

  const _2d6Probabilities = calculate2D6Probabilities()

  // Calculate D6 probabilities
  const calculateD6Probabilities = () => {
    const outcomes = []
    
    for (let target = 2; target <= 6; target++) {
      const ways = 7 - target // 2+ = 5 ways, 3+ = 4 ways, etc
      const probability = ways / 6
      
      // Reroll 1s: add (1/6) chance of success after rerolling
      const probabilityRerollOnes = probability + (1/6) * probability
      
      // Reroll failures: 2p - p²
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

  const _d6Probabilities = calculateD6Probabilities()

  return (
    <div className="page">
      <h1>Cheatsheet</h1>
      
      <div className="cheatsheet-tabs">
        <button
          className={`tab-button ${activeTab === 'd6' ? 'active' : ''}`}
          onClick={() => setActiveTab('d6')}
        >
          D6
        </button>
        <button
          className={`tab-button ${activeTab === 'd2d6' ? 'active' : ''}`}
          onClick={() => setActiveTab('d2d6')}
        >
          2D6
        </button>
      </div>

      <div className="cheatsheet-content">
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
                {_d6Probabilities.map((row) => {
                  return (
                    <tr key={row.target}>
                      <td className="result">{row.target}+</td>
                      <td className="probability">{row.probability}%</td>
                      <td className="probability-reroll">{row.probabilityRerollOnes}%</td>
                      <td className="probability-reroll">{row.probabilityRerollFail}%</td>
                    </tr>
                  )
                })}
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
                {_2d6Probabilities.map((row) => {
                  const prob = parseFloat(row.probability)
                  const probReroll = parseFloat(row.probabilityWithReroll)
                  
                  let probClass = prob >= 80 ? 'healthy' : prob >= 50 ? 'medium' : prob >= 33 ? 'risky' : prob >= 10 ? 'extremely-risky' : 'suicide'
                  let rerollClass = probReroll >= 80 ? 'healthy' : probReroll >= 50 ? 'medium' : probReroll >= 33 ? 'risky' : probReroll >= 10 ? 'extremely-risky' : 'suicide'
                  
                  return (
                    <tr key={row.target}>
                      <td className="result">{row.target}</td>
                      <td className={`probability ${probClass}`}>{row.probability}%</td>
                      <td className={`probability-reroll ${rerollClass}`}>{row.probabilityWithReroll}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cheatsheet
