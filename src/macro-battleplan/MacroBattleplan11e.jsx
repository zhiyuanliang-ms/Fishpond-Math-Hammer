// 11th edition battleplans: the official Games Workshop map for the chosen
// Force Disposition pairing is shown as the board, with the shared base /
// drawing / ruler tools on top. Terrain, objectives and deployment zones are
// part of the printed layout and are not user-editable.

import { useEffect, useRef, useState } from 'react'
import { Tabs } from '../components/ui'
import { BattleplanSetup } from './board11e/BattleplanSetup'
import { Board11eCanvas } from './board11e/Board11eCanvas'
import { Board11eSidebar } from './board11e/Board11eSidebar'
import { MapReferenceButton } from './board11e/MapReferenceButton'
import { MissionWorkspace } from './board11e/MissionWorkspace'
import { MacroToolBar } from './components/MacroToolBar'
import { TipsButton } from './components/TipsButton'
import { useBoard11eStore } from './store/board11eStore'
import {
  findBattleplan,
  getDisposition,
  mapImageUrl,
  mapReferenceUrl,
} from './config/battleplans11e'

export default function MacroBattleplan11e() {
  const stageContainerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('battlefield')
  const [planningSide, setPlanningSide] = useState('player')
  const setup = useBoard11eStore((s) => s.setup)
  // Bases and drawings live only in memory until exported, so warn before
  // a reload or tab close would discard them.
  const hasUnsavedBoard = useBoard11eStore(
    (s) => s.pieces.length > 0 || s.drawings.length > 0
  )
  useEffect(() => {
    if (!hasUnsavedBoard) return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedBoard])
  const battleplan = findBattleplan(setup.mine, setup.theirs, setup.layout)
  const showBattlefield = activeTab === 'battlefield'

  const referenceTitle = battleplan
    ? `${getDisposition(battleplan.mine.disposition)?.label} vs ${
        getDisposition(battleplan.theirs.disposition)?.label
      } · Layout ${battleplan.layout}`
    : ''

  return (
    <>
      <BattleplanSetup />
      <div className="mbp-workspace-tabs">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: 'battlefield', label: 'Battlefield' },
            { value: 'missions', label: 'Missions & VP' },
          ]}
          ariaLabel="Tactical board views"
        />
      </div>
      <div className="mbp-body" hidden={!showBattlefield} aria-label="Battlefield">
        <div className="mbp-canvas-wrap">
          <main ref={stageContainerRef} className="mbp-canvas">
            <Board11eCanvas
              containerRef={stageContainerRef}
              mapSrc={battleplan ? mapImageUrl(battleplan.map) : null}
              active={showBattlefield}
            />
            <MacroToolBar />
            <TipsButton />
            <MapReferenceButton
              src={battleplan ? mapReferenceUrl(battleplan.map) : null}
              title={referenceTitle}
            />
          </main>
        </div>
        <Board11eSidebar />
      </div>
      {!showBattlefield && (
        <MissionWorkspace
          battleplan={battleplan}
          activeSide={planningSide}
          onSideChange={setPlanningSide}
        />
      )}
    </>
  )
}
