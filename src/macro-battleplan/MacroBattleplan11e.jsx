// 11th edition battleplans: the official Games Workshop map for the chosen
// Force Disposition pairing is shown as the board, with the shared base /
// drawing / ruler tools on top. Terrain, objectives and deployment zones are
// part of the printed layout and are not user-editable.

import { useRef } from 'react'
import { Board11eCanvas } from './board11e/Board11eCanvas'
import { Board11eSidebar } from './board11e/Board11eSidebar'
import { MacroToolBar } from './components/MacroToolBar'
import { TipsButton } from './components/TipsButton'
import { BoardStoreProvider } from './store/boardContext'
import { useBoard11eStore } from './store/board11eStore'
import { findBattleplan, mapImageUrl } from './config/battleplans11e'

export default function MacroBattleplan11e() {
  const stageContainerRef = useRef(null)
  const setup = useBoard11eStore((s) => s.setup)
  const battleplan = findBattleplan(setup.mine, setup.theirs, setup.layout)

  return (
    <BoardStoreProvider store={useBoard11eStore}>
      <div className="mbp-body">
        <div className="mbp-canvas-wrap">
          <main ref={stageContainerRef} className="mbp-canvas">
            <Board11eCanvas
              containerRef={stageContainerRef}
              mapSrc={battleplan ? mapImageUrl(battleplan.map) : null}
            />
            <MacroToolBar />
            <TipsButton />
          </main>
        </div>
        <Board11eSidebar />
      </div>
    </BoardStoreProvider>
  )
}
