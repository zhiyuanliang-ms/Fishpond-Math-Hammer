// Deprecated 10th-edition board (WTC-style layout, manual terrain placement).
// Only reachable when the `legacy10e` feature flag is enabled — see
// MacroBattleplan.jsx.

import { useRef } from 'react'
import { MacroSidebar } from './components/MacroSidebar'
import { BoardCanvas } from './components/BoardCanvas'
import { MacroToolBar } from './components/MacroToolBar'
import { TipsButton } from './components/TipsButton'

export default function MacroBattleplan10e() {
  const stageContainerRef = useRef(null)

  return (
    <div className="mbp-body">
      <div className="mbp-canvas-wrap">
        <main ref={stageContainerRef} className="mbp-canvas">
          <BoardCanvas containerRef={stageContainerRef} />
          <MacroToolBar />
          <TipsButton />
        </main>
      </div>
      <MacroSidebar />
    </div>
  )
}
