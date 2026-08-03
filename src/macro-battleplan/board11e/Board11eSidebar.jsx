import { useRef } from 'react'
import { Download, Move, PanelRightClose, RotateCcw, Upload } from 'lucide-react'
import { MacroScoreboard } from '../components/MacroScoreboard'
import { BasesSection, SelectionSection } from '../components/MacroSidebar'
import { useBoard } from '../store/boardContext'
import { FORCE_DISPOSITIONS, LAYOUTS, getDisposition } from '../config/battleplans11e'

function DispositionSelect({ label, value, onChange }) {
  const disposition = getDisposition(value)
  return (
    <label className="mbp11-field">
      <span className="mbp11-field__label">{label}</span>
      <span className="mbp11-field__control">
        <span
          className="mbp11-swatch"
          style={{ backgroundColor: disposition?.color }}
          aria-hidden="true"
        />
        <select
          className="toolbar-select mbp11-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {FORCE_DISPOSITIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

function BattleplanSection() {
  const setup = useBoard((s) => s.setup)
  const setSetup = useBoard((s) => s.setSetup)

  return (
    <div className="mbp-section">
      <div className="mbp-section__header">
        <span>battleplan</span>
      </div>
      <div className="mbp11-setup">
        <DispositionSelect
          label="You"
          value={setup.mine}
          onChange={(mine) => setSetup({ mine })}
        />
        <DispositionSelect
          label="Foe"
          value={setup.theirs}
          onChange={(theirs) => setSetup({ theirs })}
        />
        <div className="mbp-segmented mbp11-layouts">
          {LAYOUTS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setSetup({ layout: id })}
              className={`mbp-segmented__btn ${setup.layout === id ? 'is-active' : ''}`}
            >
              Layout {id}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function BoardSection() {
  const showMoveDistance = useBoard((s) => s.showMoveDistance)
  const toggleShowMoveDistance = useBoard((s) => s.toggleShowMoveDistance)
  const clearBoard = useBoard((s) => s.clearBoard)
  const exportBoard = useBoard((s) => s.exportBoard)
  const importBoard = useBoard((s) => s.importBoard)
  const pieces = useBoard((s) => s.pieces)
  const drawings = useBoard((s) => s.drawings)
  const isEmpty = pieces.length === 0 && drawings.length === 0
  const fileInputRef = useRef(null)

  const handleExport = () => {
    const blob = new Blob([exportBoard()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `battleplan-11e-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isEmpty && !window.confirm('Replace the current board with the imported file?')) return
    try {
      const ok = importBoard(JSON.parse(await file.text()))
      if (!ok) {
        window.alert('Import failed: file is not an 11th edition battleplan export.')
      }
    } catch {
      window.alert('Import failed: file is not valid JSON.')
    }
  }

  return (
    <div className="mbp-section">
      <div className="mbp-section__header">
        <span>board</span>
      </div>
      <label className="mbp-toggle-row" title="Show live distance line while dragging a base">
        <span className="mbp-toggle-row__content">
          <span className="mbp-toggle-row__icon" aria-hidden="true">
            <Move size={13} />
          </span>
          <span className="mbp-toggle-row__label">Show Movement Distance</span>
        </span>
        <span className={`mbp-switch ${showMoveDistance ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={showMoveDistance}
            onChange={toggleShowMoveDistance}
            aria-label="Show Movement Distance"
          />
          <span className="mbp-switch__track" aria-hidden="true">
            <span className="mbp-switch__thumb" />
          </span>
        </span>
      </label>
      <div className="mbp-tool-row">
        <button
          type="button"
          className="mbp-chip mbp-chip--full"
          onClick={handleExport}
          title="Download this battleplan as JSON"
        >
          <Download size={13} /> Export
        </button>
        <button
          type="button"
          className="mbp-chip mbp-chip--full"
          onClick={() => fileInputRef.current?.click()}
          title="Load a battleplan from a JSON file"
        >
          <Upload size={13} /> Import
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="mbp-chip mbp-chip--danger mbp-chip--full"
        onClick={() => {
          if (isEmpty) return
          if (window.confirm('Remove all bases and drawings from the board?')) clearBoard()
        }}
        disabled={isEmpty}
        title="Remove all bases and drawings"
      >
        <RotateCcw size={13} /> Clear Board
      </button>
    </div>
  )
}

export function Board11eSidebar({ onClose }) {
  const addBase = useBoard((s) => s.addBase)
  const addOvalBase = useBoard((s) => s.addOvalBase)
  const addRectBase = useBoard((s) => s.addRectBase)

  return (
    <aside className="mbp-tools">
      {onClose && (
        <div className="mbp-tools__topbar">
          <button
            type="button"
            className="mbp-tools__close"
            onClick={onClose}
            title="Hide panel"
            aria-label="Hide panel"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      )}
      <div className="mbp-tools__scroll">
        <BattleplanSection />
        <MacroScoreboard showPrimaryName={false} />
        <BasesSection addBase={addBase} addOvalBase={addOvalBase} addRectBase={addRectBase} />
        <SelectionSection />
        <BoardSection />
      </div>
    </aside>
  )
}
