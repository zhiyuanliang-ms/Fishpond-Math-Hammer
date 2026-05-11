import { useRef, useState } from 'react'
import { PanelRightOpen } from 'lucide-react'
import { MacroSidebar } from './components/MacroSidebar'
import { BoardCanvas } from './components/BoardCanvas'
import { MacroToolBar } from './components/MacroToolBar'
import { TipsButton } from './components/TipsButton'
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
          <TipsButton />
          {!sidebarOpen && (
            <button
              type="button"
              className="mbp-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              title="Show panel"
              aria-label="Show panel"
            >
              <PanelRightOpen size={16} />
            </button>
          )}
        </main>
        {sidebarOpen && <MacroSidebar onClose={() => setSidebarOpen(false)} />}
      </div>
    </div>
  )
}
