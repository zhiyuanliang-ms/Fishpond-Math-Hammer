import { useRef } from 'react'
import { MacroSidebar } from './components/MacroSidebar'
import { BoardCanvas } from './components/BoardCanvas'
import { MacroToolBar } from './components/MacroToolBar'
import { TipsButton } from './components/TipsButton'
import '../styles/macroBattleplan.css'

export default function MacroBattleplan() {
  const stageContainerRef = useRef(null)

  return (
    <div className="mbp-page">
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
    </div>
  )
}
