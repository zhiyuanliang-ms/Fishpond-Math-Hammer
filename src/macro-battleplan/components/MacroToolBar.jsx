import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  MousePointer2,
  Ruler,
  Pencil,
  Slash,
  Eraser,
  Trash2,
  Palette,
  Undo2,
  GripHorizontal,
} from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import { DRAW_COLOR_PALETTE } from '../config/board'

const TOOLS = [
  { id: 'cursor', icon: MousePointer2, title: 'Cursor (Esc)' },
  { id: 'ruler', icon: Ruler, title: 'Ruler (R)' },
  { id: 'draw', icon: Pencil, title: 'Draw (D)' },
  { id: 'line', icon: Slash, title: 'Line (S)' },
  { id: 'eraser', icon: Eraser, title: 'Eraser (X)' },
]

export function MacroToolBar() {
  const activeTool = useBoardStore((s) => s.activeTool)
  const setActiveTool = useBoardStore((s) => s.setActiveTool)
  const drawings = useBoardStore((s) => s.drawings)
  const clearDrawings = useBoardStore((s) => s.clearDrawings)
  const drawColor = useBoardStore((s) => s.drawColor)
  const setDrawColor = useBoardStore((s) => s.setDrawColor)
  const undo = useBoardStore((s) => s.undo)
  const canUndo = useBoardStore((s) => (s.history?.length ?? 0) > 0)

  const [colorOpen, setColorOpen] = useState(false)
  const colorWrapRef = useRef(null)

  const barRef = useRef(null)
  const handleRef = useRef(null)
  const [snapEdge, setSnapEdge] = useState('right')
  const [dragPos, setDragPos] = useState(null)

  useLayoutEffect(() => {
    const handle = handleRef.current
    const bar = barRef.current
    if (!handle || !bar) return
    const parent = bar.offsetParent
    if (!parent) return

    let activeId = null
    let startPointer = null
    let startBar = null

    const onDown = (ev) => {
      if (ev.button !== undefined && ev.button !== 0) return
      activeId = ev.pointerId
      ev.preventDefault()
      try { handle.setPointerCapture(ev.pointerId) } catch { /* noop */ }
      const barRect = bar.getBoundingClientRect()
      const parentRect = parent.getBoundingClientRect()
      startPointer = { x: ev.clientX, y: ev.clientY }
      startBar = {
        x: barRect.left - parentRect.left,
        y: barRect.top - parentRect.top,
      }
      setDragPos(startBar)
    }
    const onMove = (ev) => {
      if (activeId === null || ev.pointerId !== activeId) return
      ev.preventDefault()
      const parentRect = parent.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      const dx = ev.clientX - startPointer.x
      const dy = ev.clientY - startPointer.y
      const maxX = Math.max(0, parentRect.width - barRect.width)
      const maxY = Math.max(0, parentRect.height - barRect.height)
      const x = Math.min(maxX, Math.max(0, startBar.x + dx))
      const y = Math.min(maxY, Math.max(0, startBar.y + dy))
      setDragPos({ x, y })
    }
    const onUp = (ev) => {
      if (activeId === null || ev.pointerId !== activeId) return
      activeId = null
      try { handle.releasePointerCapture(ev.pointerId) } catch { /* noop */ }
      const parentRect = parent.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      // Snap to whichever parent edge the bar is closest to (edge-to-edge gap).
      // Using gaps (not center distance) lets a tall vertical bar still snap
      // to the top edge when its top side is dragged near the canvas top.
      const distances = {
        left: barRect.left - parentRect.left,
        right: parentRect.right - barRect.right,
        top: barRect.top - parentRect.top,
        bottom: parentRect.bottom - barRect.bottom,
      }
      const nearest = Object.keys(distances).reduce((a, b) =>
        distances[a] <= distances[b] ? a : b,
      )
      setSnapEdge(nearest)
      setDragPos(null)
    }
    const onCancel = () => {
      activeId = null
      setDragPos(null)
    }

    handle.addEventListener('pointerdown', onDown)
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
    handle.addEventListener('pointercancel', onCancel)
    return () => {
      handle.removeEventListener('pointerdown', onDown)
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
      handle.removeEventListener('pointercancel', onCancel)
    }
  }, [])

  useEffect(() => {
    if (!colorOpen) return
    const onDown = (e) => {
      if (colorWrapRef.current && !colorWrapRef.current.contains(e.target)) {
        setColorOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [colorOpen])

  const handleClear = () => {
    if (drawings.length === 0) return
    if (window.confirm(`Clear all ${drawings.length} drawn line(s)?`)) {
      clearDrawings()
    }
  }

  return (
    <div
      ref={barRef}
      className={`mbp-toolbar mbp-toolbar--snap-${snapEdge}`}
      style={
        dragPos
          ? {
              left: `${dragPos.x}px`,
              top: `${dragPos.y}px`,
              right: 'auto',
              bottom: 'auto',
              transform: 'none',
            }
          : undefined
      }
      role="toolbar"
      aria-label="Map tools"
    >
      <div
        ref={handleRef}
        className="mbp-toolbar__handle"
        title="Drag to move · release to snap to nearest edge"
        aria-label="Drag to reposition tool bar"
      >
        <GripHorizontal size={14} />
      </div>
      {TOOLS.map(({ id, icon: Icon, title }) => {
        const active = activeTool === id
        return (
          <button
            key={id}
            type="button"
            onClick={(e) => {
              setActiveTool(id)
              // Drop focus so a later hotkey switch doesn't leave a stale
              // focus outline on the previously-clicked tool, which would
              // make two buttons look selected at once.
              e.currentTarget.blur()
            }}
            title={title}
            aria-label={title}
            aria-pressed={active}
            className={`mbp-toolbar__btn ${active ? 'is-active' : ''}`}
          >
            <Icon size={15} />
          </button>
        )
      })}

      <div className="mbp-toolbar__sep" />

      <div className="mbp-toolbar__color-wrap" ref={colorWrapRef}>
        <button
          type="button"
          onClick={() => setColorOpen((v) => !v)}
          title="Line color"
          aria-label="Line color"
          aria-expanded={colorOpen}
          className={`mbp-toolbar__btn mbp-toolbar__btn--color ${colorOpen ? 'is-active' : ''}`}
        >
          <Palette size={15} />
          <span
            className="mbp-toolbar__color-dot"
            style={{ backgroundColor: drawColor }}
            aria-hidden="true"
          />
        </button>
        {colorOpen && (
          <div className="mbp-toolbar__color-popover" role="listbox" aria-label="Pick line color">
            {DRAW_COLOR_PALETTE.map((c) => {
              const active = drawColor.toLowerCase() === c.value.toLowerCase()
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setDrawColor(c.value)
                    setColorOpen(false)
                  }}
                  title={c.name}
                  aria-label={c.name}
                  aria-selected={active}
                  className={`mbp-toolbar__color-swatch ${active ? 'is-active' : ''}`}
                  style={{ backgroundColor: c.value }}
                />
              )
            })}
          </div>
        )}
      </div>

      <div className="mbp-toolbar__sep" />

      <button
        type="button"
        onClick={undo}
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
        className="mbp-toolbar__btn"
        disabled={!canUndo}
      >
        <Undo2 size={15} />
      </button>

      <button
        type="button"
        onClick={handleClear}
        title="Clear all drawn lines"
        aria-label="Clear all drawn lines"
        className="mbp-toolbar__btn mbp-toolbar__btn--danger"
        disabled={drawings.length === 0}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
