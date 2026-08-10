import { useState } from 'react'
import { Circle as CircleIcon, Trash2 } from 'lucide-react'
import { useBoard11eStore } from '../store/board11eStore'
import {
  BASE_SIZES_MM,
  OVAL_BASE_SIZES_MM,
  BASE_COLOR_PALETTE,
  DEFAULT_BASE_COLOR,
  MM_PER_INCH,
} from '../config/board'

const RECT_PRESETS = [
  { id: 'rhino', label: 'Rhino', lengthIn: 4.5, widthIn: 3 },
]

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

function Chip({ onClick, children, title, variant = 'default', full }) {
  const className = [
    'mbp-chip',
    variant === 'accent' ? 'mbp-chip--accent' : '',
    variant === 'danger' ? 'mbp-chip--danger' : '',
    full ? 'mbp-chip--full' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" onClick={onClick} title={title} className={className}>
      {children}
    </button>
  )
}

const parseDimension = (raw) => {
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const snapped = Math.round(value * 4) / 4
  return Math.min(12, Math.max(0.25, snapped))
}

const formatInches = (value) => value.toFixed(2).replace(/\.?0+$/, '')

export function BasesSection({ addBase, addOvalBase, addRectBase }) {
  const [tab, setTab] = useState('round')
  const [rectWidth, setRectWidth] = useState('2')
  const [rectHeight, setRectHeight] = useState('1')

  const handleAddRect = () => {
    const widthIn = parseDimension(rectWidth)
    const heightIn = parseDimension(rectHeight)
    if (widthIn === null || heightIn === null) return
    setRectWidth(formatInches(widthIn))
    setRectHeight(formatInches(heightIn))
    addRectBase(
      Math.round(widthIn * MM_PER_INCH),
      Math.round(heightIn * MM_PER_INCH),
    )
  }

  const handleAddPreset = (preset) => {
    addRectBase(
      Math.round(preset.lengthIn * MM_PER_INCH),
      Math.round(preset.widthIn * MM_PER_INCH),
    )
  }

  const tabButton = (id, label) => (
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
        {tabButton('round', 'Round')}
        {tabButton('oval', 'Oval')}
        {tabButton('rect', 'Rect')}
      </div>
      {tab === 'rect' ? (
        <div className="mbp-rect-base">
          <div className="mbp-rect-base__row">
            <label className="mbp-rect-base__field">
              <span>W</span>
              <input
                type="number"
                min={0.25}
                max={12}
                step={0.25}
                value={rectWidth}
                onChange={(event) => setRectWidth(event.target.value)}
                onBlur={(event) => {
                  const value = parseDimension(event.target.value)
                  if (value !== null) setRectWidth(formatInches(value))
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleAddRect()
                    event.target.blur()
                  }
                }}
              />
            </label>
            <span className="mbp-rect-base__x">×</span>
            <label className="mbp-rect-base__field">
              <span>H</span>
              <input
                type="number"
                min={0.25}
                max={12}
                step={0.25}
                value={rectHeight}
                onChange={(event) => setRectHeight(event.target.value)}
                onBlur={(event) => {
                  const value = parseDimension(event.target.value)
                  if (value !== null) setRectHeight(formatInches(value))
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleAddRect()
                    event.target.blur()
                  }
                }}
              />
            </label>
            <span className="mbp-rect-base__unit">inch</span>
          </div>
          <Chip
            onClick={handleAddRect}
            title={`Add ${rectWidth}×${rectHeight}″ rectangular base`}
            variant="accent"
            full
          >
            Add {rectWidth}×{rectHeight}″
          </Chip>
          <div className="mbp-rect-base__presets">
            {RECT_PRESETS.map((preset) => (
              <Chip
                key={preset.id}
                onClick={() => handleAddPreset(preset)}
                title={`${preset.label} footprint: ${preset.lengthIn}″ × ${preset.widthIn}″`}
                full
              >
                {preset.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <div className="mbp-section__row">
          {tab === 'round'
            ? BASE_SIZES_MM.map((diameterMm) => (
                <Chip
                  key={diameterMm}
                  onClick={() => addBase(diameterMm)}
                  title={`${diameterMm} mm round base`}
                >
                  {diameterMm}
                </Chip>
              ))
            : OVAL_BASE_SIZES_MM.map((base) => (
                <Chip
                  key={base.label}
                  onClick={() => addOvalBase(base.widthMm, base.heightMm)}
                  title={`${base.widthMm}×${base.heightMm} mm oval base`}
                >
                  {base.label}
                </Chip>
              ))}
        </div>
      )}
    </div>
  )
}

const describeBase = (piece) => {
  if (piece.shape === 'oval' && piece.widthMm && piece.heightMm) {
    return `Oval ${piece.widthMm}×${piece.heightMm}`
  }
  if (piece.shape === 'rect' && piece.widthMm && piece.heightMm) {
    return `Rect ${piece.widthMm}×${piece.heightMm}`
  }
  return `Base ${piece.diameterMm}mm`
}

export function SelectionSection() {
  const selectedIds = useBoard11eStore((state) => state.selectedIds)
  const piece = useBoard11eStore((state) => {
    if (state.selectedIds.length !== 1) return null
    return state.pieces.find((candidate) => candidate.id === state.selectedIds[0]) ?? null
  })
  const updatePiece = useBoard11eStore((state) => state.commitPieceUpdate)
  const copySelected = useBoard11eStore((state) => state.copySelected)
  const pasteCopied = useBoard11eStore((state) => state.pasteCopied)
  const deleteSelected = useBoard11eStore((state) => state.deleteSelected)

  const aura = piece?.auraIn ?? 0
  const [auraDraft, setAuraDraft] = useState({ pieceId: null, value: '6' })
  const auraText = auraDraft.pieceId === piece?.id
    ? auraDraft.value
    : (aura > 0 ? String(aura) : '6')
  const setAuraText = (value) => setAuraDraft({ pieceId: piece?.id ?? null, value })

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
          <Trash2 size={13} /> Delete Selection
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
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    const clamped = Math.min(24, Math.max(1, Math.round(value)))
    updatePiece(piece.id, { auraIn: clamped })
    setAuraText(String(clamped))
  }

  return (
    <Section label={`Selection · ${describeBase(piece)}`} icon={<CircleIcon size={12} />}>
      <div className="mbp-tool-row">
        <Chip onClick={copySelected} title="Copy (Ctrl+C)" full>
          Copy
        </Chip>
        <Chip onClick={pasteCopied} title="Paste (Ctrl+V)" full>
          Paste
        </Chip>
      </div>
      <Chip onClick={deleteSelected} variant="danger" title="Delete (Del)" full>
        <Trash2 size={13} /> Delete
      </Chip>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
        <div className="mbp-sublabel">Color</div>
        <div className="mbp-color-grid">
          {BASE_COLOR_PALETTE.map((color) => {
            const current = piece.color ?? DEFAULT_BASE_COLOR
            const isActive = current.toLowerCase() === color.value.toLowerCase()
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => updatePiece(piece.id, { color: color.value })}
                title={color.name}
                className={`mbp-color-swatch ${isActive ? 'is-active' : ''}`}
                style={{ backgroundColor: color.value }}
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
            onChange={(event) => setAuraText(event.target.value)}
            onBlur={(event) => commitAura(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitAura(event.target.value)
                event.target.blur()
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
            <Chip
              onClick={() => updatePiece(piece.id, { auraIn: undefined })}
              variant="danger"
              title="Remove aura"
              full
            >
              Remove
            </Chip>
          )}
        </div>
      </div>
    </Section>
  )
}