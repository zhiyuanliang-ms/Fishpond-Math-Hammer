// Macro Battleplan shell — switches between editions.
//
// 11e is the default. The 10e board is deprecated and only appears when the
// user opts in via the "Legacy Content" checkbox on the About page.

import { useState } from 'react'
import { Tabs } from '../components/ui'
import { isLegacy10eEnabled } from './legacyEdition'
import MacroBattleplan10e from './MacroBattleplan10e'
import MacroBattleplan11e from './MacroBattleplan11e'
import '../styles/macroBattleplan.css'

const EDITION_STORAGE_KEY = 'macroBattleplan:edition'

const readInitialEdition = (legacyEnabled) => {
  if (!legacyEnabled) return '11e'
  try {
    return localStorage.getItem(EDITION_STORAGE_KEY) === '10e' ? '10e' : '11e'
  } catch {
    return '11e'
  }
}

export default function MacroBattleplan() {
  const [legacyEnabled] = useState(isLegacy10eEnabled)
  const [edition, setEdition] = useState(() => readInitialEdition(legacyEnabled))

  const selectEdition = (next) => {
    setEdition(next)
    try {
      localStorage.setItem(EDITION_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const tabs = [{ value: '11e', label: '11th Edition' }]
  if (legacyEnabled) {
    tabs.push({
      value: '10e',
      label: (
        <>
          10th Edition
          <span className="mbp-tab-badge">Deprecated</span>
        </>
      ),
    })
  }

  const activeEdition = legacyEnabled && edition === '10e' ? '10e' : '11e'

  return (
    <div className="mbp-page">
      <Tabs value={activeEdition} onChange={selectEdition} tabs={tabs} variant="mbp-edition-tabs" />
      {activeEdition === '10e' ? <MacroBattleplan10e /> : <MacroBattleplan11e />}
    </div>
  )
}
