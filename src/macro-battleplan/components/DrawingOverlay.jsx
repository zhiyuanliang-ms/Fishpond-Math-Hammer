import { useEffect, useRef, useState } from 'react'
import { Layer, Line, Rect, Text } from 'react-konva'
import { useBoardStore } from '../store/boardStore'
import { PX_PER_INCH } from '../config/board'

const STROKE_WIDTH = 2.5
const FREEDRAW_MIN_DIST = 2.5
const ERASER_RADIUS = 10

// SVG ring cursor for the eraser. Diameter matches 2 * ERASER_RADIUS, centered.
const ERASER_CURSOR_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.08)" stroke="#fafafa" stroke-width="1.5"/></svg>`,
)
const ERASER_CURSOR = `url("data:image/svg+xml;utf8,${ERASER_CURSOR_SVG}") 12 12, crosshair`

// Squared distance from point (px,py) to segment (ax,ay)->(bx,by).
function segPointDist2(ax, ay, bx, by, px, py) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) {
    const ex = px - ax
    const ey = py - ay
    return ex * ex + ey * ey
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  if (t < 0) t = 0
  else if (t > 1) t = 1
  const cx = ax + t * dx
  const cy = ay + t * dy
  const ex = px - cx
  const ey = py - cy
  return ex * ex + ey * ey
}

export function DrawingOverlay({ stageRef }) {
  const activeTool = useBoardStore((s) => s.activeTool)
  const drawings = useBoardStore((s) => s.drawings)
  const addDrawing = useBoardStore((s) => s.addDrawing)
  const removeDrawing = useBoardStore((s) => s.removeDrawing)
  const drawColor = useBoardStore((s) => s.drawColor)

  const drawActive = activeTool === 'draw'
  const lineActive = activeTool === 'line'
  const eraserActive = activeTool === 'eraser'
  const captureActive = drawActive || lineActive

  const [linePreview, setLinePreview] = useState(null)
  const [freePreview, setFreePreview] = useState(null)
  const startRef = useRef(null)
  const lastPtRef = useRef(null)
  const freeBufRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const container = stage.container()
    if (!container) return
    if (eraserActive) {
      container.style.cursor = ERASER_CURSOR
      return () => {
        container.style.cursor = ''
      }
    }
    if (captureActive) {
      container.style.cursor = 'crosshair'
      return () => {
        container.style.cursor = ''
      }
    }
  }, [captureActive, eraserActive, stageRef])

  useEffect(() => {
    if (!captureActive) return
    const stage = stageRef.current
    if (!stage) return
    const container = stage.container()
    if (!container) return

    const setPointerFromEvent = (ev) => {
      stage.setPointersPositions(ev)
    }
    const getPos = () => {
      const p = stage.getRelativePointerPosition()
      return p ? { x: p.x, y: p.y } : null
    }

    const reset = () => {
      startRef.current = null
      lastPtRef.current = null
      freeBufRef.current = null
      setLinePreview(null)
      setFreePreview(null)
    }

    const onDown = (ev) => {
      if (ev.button !== 0) return
      ev.preventDefault()
      setPointerFromEvent(ev)
      const p = getPos()
      if (!p) return
      startRef.current = p
      lastPtRef.current = p
      if (lineActive) {
        setLinePreview({ start: p, end: p })
      } else {
        freeBufRef.current = [p.x, p.y]
        setFreePreview(freeBufRef.current.slice())
      }
    }

    const onMove = (ev) => {
      const start = startRef.current
      if (!start) return
      setPointerFromEvent(ev)
      const p = getPos()
      if (!p) return
      if (lineActive) {
        setLinePreview({ start, end: p })
      } else {
        const last = lastPtRef.current
        if (last) {
          const dx = p.x - last.x
          const dy = p.y - last.y
          if (dx * dx + dy * dy < FREEDRAW_MIN_DIST * FREEDRAW_MIN_DIST) return
        }
        lastPtRef.current = p
        const buf = freeBufRef.current
        if (buf) {
          buf.push(p.x, p.y)
          setFreePreview(buf.slice())
        }
      }
    }

    const finish = (ev) => {
      const start = startRef.current
      if (!start) {
        reset()
        return
      }
      if (ev) setPointerFromEvent(ev)
      const endPos = getPos() ?? start
      if (lineActive) {
        const dx = endPos.x - start.x
        const dy = endPos.y - start.y
        if (dx * dx + dy * dy >= 4) {
          addDrawing({
            kind: 'line',
            points: [start.x, start.y, endPos.x, endPos.y],
            color: drawColor,
            strokeWidth: STROKE_WIDTH,
          })
        }
      } else {
        const buf = freeBufRef.current
        if (buf && buf.length >= 4) {
          addDrawing({
            kind: 'free',
            points: buf.slice(),
            color: drawColor,
            strokeWidth: STROKE_WIDTH,
          })
        }
      }
      reset()
    }

    const onUp = (ev) => finish(ev)
    const onLeave = () => {
      if (startRef.current) finish()
    }

    container.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    container.addEventListener('mouseleave', onLeave)

    return () => {
      container.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      container.removeEventListener('mouseleave', onLeave)
      reset()
    }
  }, [captureActive, lineActive, stageRef, addDrawing, drawColor])

  // Circle eraser: press & drag removes any line inside the cursor radius.
  useEffect(() => {
    if (!eraserActive) return
    const stage = stageRef.current
    if (!stage) return
    const container = stage.container()
    if (!container) return

    let pressed = false

    const setPointerFromEvent = (ev) => {
      stage.setPointersPositions(ev)
    }
    const getPos = () => {
      const p = stage.getRelativePointerPosition()
      return p ? { x: p.x, y: p.y } : null
    }
    const eraseAt = (p) => {
      const list = useBoardStore.getState().drawings
      const toRemove = []
      for (const d of list) {
        const pts = d.points
        if (!pts || pts.length < 4) continue
        const threshold = ERASER_RADIUS + (d.strokeWidth || 0) / 2
        const t2 = threshold * threshold
        for (let i = 0; i + 3 < pts.length; i += 2) {
          if (segPointDist2(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], p.x, p.y) <= t2) {
            toRemove.push(d.id)
            break
          }
        }
      }
      for (const id of toRemove) removeDrawing(id)
    }

    const onDown = (ev) => {
      if (ev.button !== 0) return
      ev.preventDefault()
      pressed = true
      setPointerFromEvent(ev)
      const p = getPos()
      if (p) eraseAt(p)
    }
    const onMove = (ev) => {
      if (!pressed) return
      setPointerFromEvent(ev)
      const p = getPos()
      if (p) eraseAt(p)
    }
    const onUp = () => {
      pressed = false
    }
    const onLeave = () => {
      pressed = false
    }

    container.addEventListener('mousedown', onDown)
    container.addEventListener('mouseleave', onLeave)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      container.removeEventListener('mousedown', onDown)
      container.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [eraserActive, stageRef, removeDrawing])

  return (
    <Layer>
      {drawings.map((d) => (
        <Line
          key={d.id}
          points={d.points}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={d.kind === 'free' ? 0.4 : 0}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}

      {drawActive && freePreview && freePreview.length >= 4 && (
        <Line
          points={freePreview}
          stroke={drawColor}
          strokeWidth={STROKE_WIDTH}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          opacity={0.85}
          listening={false}
        />
      )}

      {lineActive &&
        linePreview &&
        (() => {
          const { start, end } = linePreview
          const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
          const inches = Math.hypot(end.x - start.x, end.y - start.y) / PX_PER_INCH
          const label = `${inches.toFixed(2)}″`
          const labelW = 64
          const labelH = 18
          return [
            <Line
              key="lp-line"
              points={[start.x, start.y, end.x, end.y]}
              stroke={drawColor}
              strokeWidth={STROKE_WIDTH}
              opacity={0.85}
              listening={false}
            />,
            <Rect
              key="lp-bg"
              x={mid.x - labelW / 2}
              y={mid.y - labelH / 2}
              width={labelW}
              height={labelH}
              fill="rgba(15, 17, 21, 0.85)"
              cornerRadius={4}
              listening={false}
            />,
            <Text
              key="lp-text"
              x={mid.x - labelW / 2}
              y={mid.y - labelH / 2}
              width={labelW}
              height={labelH}
              text={label}
              fontSize={12}
              fontStyle="bold"
              fill="#fbbf24"
              align="center"
              verticalAlign="middle"
              listening={false}
            />,
          ]
        })()}
    </Layer>
  )
}
