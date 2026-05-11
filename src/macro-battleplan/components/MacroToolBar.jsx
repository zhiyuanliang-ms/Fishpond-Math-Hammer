import { useEffect, useRef, useState } from 'react'
import { MousePointer2, Ruler, Pencil, Slash, Eraser, Trash, Palette } from 'lucide-react'
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

  const [colorOpen, setColorOpen] = useState(false)
  const colorWrapRef = useRef(null)

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
    <div className="mbp-toolbar" role="toolbar" aria-label="Map tools">
      {TOOLS.map(({ id, icon: Icon, title }) => {
        const active = activeTool === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTool(id)}
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
        onClick={handleClear}
        title="Clear all drawn lines"
        aria-label="Clear all drawn lines"
        className="mbp-toolbar__btn mbp-toolbar__btn--danger"
        disabled={drawings.length === 0}
      >
        <Trash size={15} />
      </button>
    </div>
  )
}
