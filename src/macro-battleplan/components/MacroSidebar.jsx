import { useEffect, useRef, useState } from 'react'
import {
  Circle as CircleIcon,
  Square,
  Target,
  Lock,
  Unlock,
  Save,
  Share2,
  Trash,
  Download,
  Upload,
  Move,
  Link2,
  PanelRightClose,
  FlipHorizontal2,
} from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { MacroScoreboard } from './MacroScoreboard'
import {
  BASE_SIZES_MM,
  WTC_TERRAIN,
  OVAL_BASE_SIZES_MM,
  BASE_COLOR_PALETTE,
  DEFAULT_BASE_COLOR,
} from '../config/board'

function Section({ label, icon, children }) {
  return (
    <div className="mbp-section">
      <div className="mbp-section__header">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mbp-section__row">{children}</div>
    </div>
  )
}

function Chip({ onClick, children, title, variant = 'default', full, className = '' }) {
  const cls = [
    'mbp-chip',
    variant === 'accent' ? 'mbp-chip--accent' : '',
    variant === 'danger' ? 'mbp-chip--danger' : '',
    full ? 'mbp-chip--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" onClick={onClick} title={title} className={cls}>
      {children}
    </button>
  )
}

function IconAction({
  onClick,
  icon,
  label,
  title,
  variant = 'default',
  disabled = false,
}) {
  const cls = [
    'mbp-icon-action',
    variant === 'accent' ? 'mbp-icon-action--accent' : '',
    variant === 'danger' ? 'mbp-icon-action--danger' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={label}
      className={cls}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}

function ToggleRow({ label, icon, checked, onChange, title }) {
  return (
    <label className="mbp-toggle-row" title={title}>
      <span className="mbp-toggle-row__content">
        <span className="mbp-toggle-row__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="mbp-toggle-row__label">{label}</span>
      </span>
      <span className={`mbp-switch ${checked ? 'is-on' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-label={label}
        />
        <span className="mbp-switch__track" aria-hidden="true">
          <span className="mbp-switch__thumb" />
        </span>
      </span>
    </label>
  )
}

function BasesSection({ addBase, addOvalBase }) {
  const [tab, setTab] = useState('round')
  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`mbp-segmented__btn ${tab === id ? 'is-active' : ''}`}
    >
      {label}
    </button>
  )
  return (
    <div className="mbp-section">
      <div className="mbp-section__header">
        <span>bases</span>
      </div>
      <div className="mbp-segmented">
        {tabBtn('round', 'Round')}
        {tabBtn('oval', 'Oval')}
      </div>
      <div className="mbp-section__row">
        {tab === 'round'
          ? BASE_SIZES_MM.map((mm) => (
              <Chip key={mm} onClick={() => addBase(mm)} title={`${mm} mm round base`}>
                {mm}
              </Chip>
            ))
          : OVAL_BASE_SIZES_MM.map((o) => (
              <Chip
                key={o.label}
                onClick={() => addOvalBase(o.widthMm, o.heightMm)}
                title={`${o.widthMm}×${o.heightMm} mm oval base`}
              >
                {o.label}
              </Chip>
            ))}
      </div>
    </div>
  )
}

function ScenerySection({ addObjective, addTerrain }) {
  const [tab, setTab] = useState('objective')
  const tabBtn = (id, label, icon) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`mbp-segmented__btn ${tab === id ? 'is-active' : ''}`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="mbp-section">
      <div className="mbp-section__header">
        <span>Battlefield</span>
      </div>
      <div className="mbp-segmented">
        {tabBtn('objective', 'Objective', <Target size={11} />)}
        {tabBtn('terrain', 'Terrain', <Square size={11} />)}
      </div>
      <div className="mbp-section__row">
        {tab === 'objective' ? (
          <Chip
            onClick={() => addObjective()}
            title="40mm objective marker with a 3″ aura from the marker edge"
            full
          >
            Objective
          </Chip>
        ) : (
          WTC_TERRAIN.map((t) => (
            <Chip
              key={t.id}
              onClick={() => addTerrain(t)}
              title={`Footprint ${t.widthIn}×${t.heightIn}″`}
              full
            >
              {t.label}
            </Chip>
          ))
        )}
      </div>
    </div>
  )
}

function BoardSection() {
  const terrainLocked = useBoardStore((s) => s.terrainLocked)
  const toggleTerrainLocked = useBoardStore((s) => s.toggleTerrainLocked)
  const showMoveDistance = useBoardStore((s) => s.showMoveDistance)
  const toggleShowMoveDistance = useBoardStore((s) => s.toggleShowMoveDistance)
  const savedBoards = useBoardStore((s) => s.savedBoards)
  const saveBoard = useBoardStore((s) => s.saveBoard)
  const loadBoard = useBoardStore((s) => s.loadBoard)
  const clearBoard = useBoardStore((s) => s.clearBoard)
  const exportBoard = useBoardStore((s) => s.exportBoard)
  const importBoard = useBoardStore((s) => s.importBoard)
  const exportBattlefieldCode = useBoardStore((s) => s.exportBattlefieldCode)
  const importBattlefieldCode = useBoardStore((s) => s.importBattlefieldCode)
  const mirrorScenery = useBoardStore((s) => s.mirrorScenery)
  const pieces = useBoardStore((s) => s.pieces)

  const [selectedBoard, setSelectedBoard] = useState('')
  const fileInputRef = useRef(null)
  const savedBoardNames = savedBoards.map((board) => board.name)

  useEffect(() => {
    if (selectedBoard && !savedBoards.some((board) => board.name === selectedBoard)) {
      setSelectedBoard('')
    }
  }, [savedBoards, selectedBoard])

  const handleSave = () => {
    const suggested = selectedBoard || `Board ${new Date().toLocaleString()}`
    const name = window.prompt('Save board as:', suggested)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) return
    if (savedBoardNames.includes(trimmed) && trimmed !== selectedBoard) {
      if (!window.confirm(`Board "${trimmed}" already exists. Overwrite?`)) return
    }
    saveBoard(trimmed)
    setSelectedBoard(trimmed)
  }

  const handleClear = () => {
    if (pieces.length === 0) return
    if (window.confirm('Clear all pieces from the board?')) clearBoard()
  }

  const sceneryCount = pieces.filter(
    (p) => p.kind === 'terrain' || p.kind === 'objective',
  ).length
  const canMirror = sceneryCount > 0
  const canClear = pieces.length > 0

  const handleMirror = () => {
    if (sceneryCount === 0) return
    if (
      window.confirm(
        `Mirror ${sceneryCount} terrain/objective piece(s) to the other half (point-symmetric around the map center)?`,
      )
    ) {
      mirrorScenery()
    }
  }

  const handleLoad = (name) => {
    if (!name) {
      setSelectedBoard('')
      return
    }
    if (
      pieces.length > 0 &&
      !window.confirm(`Replace current board with "${name}"?`)
    ) {
      return
    }
    loadBoard(name)
    setSelectedBoard(name)
  }

  const handleExport = () => {
    const json = exportBoard()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.href = url
    a.download = `battleplan-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (
      pieces.length > 0 &&
      !window.confirm('Replace current board with the imported file?')
    ) {
      return
    }
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const ok = importBoard(parsed)
      if (!ok) {
        window.alert(
          'Import failed: file does not look like a battleplan export (wrong schema).',
        )
      }
    } catch {
      window.alert('Import failed: file is not valid JSON.')
    }
  }

  const handleShareBattlefield = async () => {
    const code = exportBattlefieldCode()
    if (!code) {
      window.alert('There are no terrain or objective pieces to share yet.')
      return
    }

    try {
      await navigator.clipboard.writeText(code)
      window.alert('Battlefield share code copied to clipboard.')
    } catch {
      window.prompt('Copy this battlefield share code:', code)
    }
  }

  const handleLoadBattlefieldCode = () => {
    const code = window.prompt('Paste battlefield share code:')
    if (code === null) return
    const trimmed = code.trim()
    if (!trimmed) return

    const ok = importBattlefieldCode(trimmed)
    if (!ok) {
      window.alert('Import failed: code is not a valid battlefield share code.')
    }
  }

  return (
    <Section label="Board">
      <div className="mbp-board-settings">
        <ToggleRow
          label="Lock Terrain & Objectives"
          icon={terrainLocked ? <Lock size={12} /> : <Unlock size={12} />}
          checked={terrainLocked}
          onChange={() => toggleTerrainLocked()}
          title={
            terrainLocked
              ? 'Unlock terrain & objectives'
              : 'Lock terrain & objectives in place'
          }
        />

        <ToggleRow
          label="Show Movement Distance"
          icon={<Move size={12} />}
          checked={showMoveDistance}
          onChange={() => toggleShowMoveDistance()}
          title={
            showMoveDistance
              ? 'Hide live distance line while dragging a base'
              : 'Show live distance line while dragging a base'
          }
        />
      </div>

      <div className="mbp-board-actions">
        <IconAction
          onClick={handleMirror}
          icon={<FlipHorizontal2 size={15} />}
          label="Mirror board"
          title="Duplicate every terrain & objective to the opposite half (point-symmetric around the map center). Deploy one half, then mirror."
          disabled={!canMirror}
        />
        <IconAction
          onClick={handleSave}
          icon={<Save size={15} />}
          label="Save board"
          title="Save current board to browser storage"
        />
        <IconAction
          onClick={handleClear}
          icon={<Trash size={15} />}
          label="Clear board"
          title="Remove all pieces from the board"
          variant="danger"
          disabled={!canClear}
        />
        <IconAction
          onClick={handleShareBattlefield}
          icon={<Share2 size={15} />}
          label="Share battlefield code"
          title="Copy a share code for the current terrain and objective layout"
          disabled={sceneryCount === 0}
        />
        <IconAction
          onClick={handleLoadBattlefieldCode}
          icon={<Link2 size={15} />}
          label="Load battlefield code"
          title="Load terrain and objective layout from a shared code"
        />
      </div>

      <div className="mbp-board-load">
        <select
          className="toolbar-select mbp-board-load__select"
          value={selectedBoard}
          onChange={(e) => handleLoad(e.target.value)}
          aria-label="Load saved board"
        >
          <option value="">Load Board…</option>
          {savedBoardNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="mbp-tool-row">
        <Chip onClick={handleExport} title="Download current board as JSON" full>
          <Download size={13} /> Export
        </Chip>
        <Chip onClick={handleImportClick} title="Load board from JSON file" full>
          <Upload size={13} /> Import
        </Chip>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />
    </Section>
  )
}

function SelectionSection() {
  const selectedIds = useBoardStore((s) => s.selectedIds)
  const piece = useBoardStore((s) => {
    if (s.selectedIds.length !== 1) return null
    return s.pieces.find((p) => p.id === s.selectedIds[0]) ?? null
  })
  const updatePiece = useBoardStore((s) => s.commitPieceUpdate)
  const copySelected = useBoardStore((s) => s.copySelected)
  const pasteCopied = useBoardStore((s) => s.pasteCopied)
  const deleteSelected = useBoardStore((s) => s.deleteSelected)

  const isBase = piece?.kind === 'base'
  const aura = isBase ? piece.auraIn ?? 0 : 0
  const [auraText, setAuraText] = useState(aura > 0 ? String(aura) : '6')

  useEffect(() => {
    if (isBase) setAuraText(aura > 0 ? String(aura) : '6')
  }, [piece?.id, aura, isBase])

  if (selectedIds.length > 1) {
    return (
      <Section
        label={`Selection · ${selectedIds.length} pieces`}
        icon={<CircleIcon size={12} />}
      >
        <div className="mbp-tool-row">
          <Chip onClick={copySelected} title="Copy (Ctrl+C)" full>
            Copy
          </Chip>
          <Chip onClick={pasteCopied} title="Paste (Ctrl+V)" full>
            Paste
          </Chip>
        </div>
        <Chip onClick={deleteSelected} variant="danger" title="Delete (Del)" full>
          <Trash size={13} /> Delete Selection
        </Chip>
        <div className="mbp-section__note">
          Drag any selected piece to move the whole group. Use Q/E to rotate
          each in place.
        </div>
      </Section>
    )
  }

  if (!piece) return null

  const commitAura = (raw) => {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    const clamped = Math.min(24, Math.max(1, Math.round(n)))
    updatePiece(piece.id, { auraIn: clamped })
    setAuraText(String(clamped))
  }

  const removeAura = () => {
    updatePiece(piece.id, { auraIn: undefined })
  }

  const kindLabel =
    piece.kind === 'base'
      ? piece.shape === 'oval' && piece.widthMm && piece.heightMm
        ? `Oval ${piece.widthMm}×${piece.heightMm}`
        : `Base ${piece.diameterMm}mm`
      : piece.kind === 'objective'
      ? 'Objective'
      : 'Terrain'

  return (
    <Section label={`Selection · ${kindLabel}`} icon={<CircleIcon size={12} />}>
      <div className="mbp-tool-row">
        <Chip onClick={copySelected} title="Copy (Ctrl+C)" full>
          Copy
        </Chip>
        <Chip onClick={pasteCopied} title="Paste (Ctrl+V)" full>
          Paste
        </Chip>
      </div>
      <Chip onClick={deleteSelected} variant="danger" title="Delete (Del)" full>
        <Trash size={13} /> Delete
      </Chip>

      {isBase && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          <div className="mbp-sublabel">Color</div>
          <div className="mbp-color-grid">
            {BASE_COLOR_PALETTE.map((c) => {
              const current = piece.color ?? DEFAULT_BASE_COLOR
              const isActive = current.toLowerCase() === c.value.toLowerCase()
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updatePiece(piece.id, { color: c.value })}
                  title={c.name}
                  className={`mbp-color-swatch ${isActive ? 'is-active' : ''}`}
                  style={{ backgroundColor: c.value }}
                />
              )
            })}
          </div>

          <div className="mbp-sublabel">Aura</div>
          <div className="mbp-aura-row">
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              value={auraText}
              onChange={(e) => setAuraText(e.target.value)}
              onBlur={(e) => commitAura(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitAura(e.target.value)
                  e.target.blur()
                }
              }}
            />
            <span>inch (1–24)</span>
          </div>
          <div className="mbp-tool-row">
            <Chip
              onClick={() => commitAura(auraText)}
              variant={aura > 0 ? 'accent' : 'default'}
              title="Show aura range ring around this base"
              full
            >
              {aura > 0 ? `Aura ${aura}″` : 'Add Aura'}
            </Chip>
            {aura > 0 && (
              <Chip onClick={removeAura} variant="danger" title="Remove aura" full>
                Remove
              </Chip>
            )}
          </div>
        </div>
      )}
    </Section>
  )
}

export function MacroSidebar({ onClose }) {
  const addBase = useBoardStore((s) => s.addBase)
  const addOvalBase = useBoardStore((s) => s.addOvalBase)
  const addTerrain = useBoardStore((s) => s.addTerrain)
  const addObjective = useBoardStore((s) => s.addObjective)

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
        <MacroScoreboard />
        <BasesSection addBase={addBase} addOvalBase={addOvalBase} />
        <SelectionSection />
        <ScenerySection addObjective={addObjective} addTerrain={addTerrain} />
        <BoardSection />
      </div>
    </aside>
  )
}
