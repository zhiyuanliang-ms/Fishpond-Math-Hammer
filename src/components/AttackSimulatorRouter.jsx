// Routes `/attack-simulator` between the classic UI (v1) and the new
// two-layer-buff UI (v2). The user's choice is persisted to localStorage
// so it survives reloads.
//
// Defaults to v2 (the new two-layer buff UI). Users who explicitly opt
// back to Classic have their choice remembered.

import { useState } from 'react'
import AttackSimulator from './AttackSimulator'
import AttackSimulatorV2 from './AttackSimulatorV2'
import '../styles/attackSimulatorRouter.css'

const STORAGE_KEY = 'attackSim:uiVersion'

const readInitial = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'v1' ? 'v1' : 'v2'
  } catch {
    return 'v2'
  }
}

function AttackSimulatorRouter() {
  const [version, setVersion] = useState(readInitial)

  const select = (next) => {
    setVersion(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }

  return (
    <>
      <div className="attack-sim-version-bar" role="group" aria-label="Attack Simulator UI version">
        <button
          type="button"
          className={`attack-sim-version-btn${version === 'v1' ? ' active' : ''}`}
          onClick={() => select('v1')}
          aria-pressed={version === 'v1'}
        >
          Classic
        </button>
        <button
          type="button"
          className={`attack-sim-version-btn${version === 'v2' ? ' active' : ''}`}
          onClick={() => select('v2')}
          aria-pressed={version === 'v2'}
        >
          New
          <span className="attack-sim-version-badge">BETA</span>
        </button>
      </div>
      {version === 'v2' ? <AttackSimulatorV2 /> : <AttackSimulator />}
    </>
  )
}

export default AttackSimulatorRouter
