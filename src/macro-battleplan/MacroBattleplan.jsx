import { useRef, useState } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { MacroSidebar } from './components/MacroSidebar'
import { BoardCanvas } from './components/BoardCanvas'
import { MacroToolBar } from './components/MacroToolBar'
import '../styles/macroBattleplan.css'

export default function MacroBattleplan() {
  const stageContainerRef = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="mbp-page">
      <div className={`mbp-body ${sidebarOpen ? '' : 'mbp-body--collapsed'}`}>
        <main ref={stageContainerRef} className="mbp-canvas">
          <BoardCanvas containerRef={stageContainerRef} />
          <MacroToolBar />
          <button
            type="button"
            className="mbp-sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Hide panel' : 'Show panel'}
            aria-label={sidebarOpen ? 'Hide panel' : 'Show panel'}
          >
            {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </main>
        {sidebarOpen && <MacroSidebar />}
      </div>
    </div>
  )
}
