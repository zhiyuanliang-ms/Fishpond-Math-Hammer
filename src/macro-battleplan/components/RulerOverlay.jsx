import { useEffect, useRef, useState } from 'react'
import { Layer, Line, Rect, Text } from 'react-konva'
import { useBoard11eStore } from '../store/board11eStore'
import { PX_PER_INCH } from '../config/board'

const X_MARK_TTL_MS = 2000
const DRAG_THRESHOLD_PX = 4

let nextId = 1

export function RulerOverlay({ stageRef }) {
  const activeTool = useBoard11eStore((s) => s.activeTool)
  const active = activeTool === 'ruler'

  const [drag, setDrag] = useState(null)
  const [marks, setMarks] = useState([])
  const dragStartRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const stage = stageRef.current
    if (!stage) return

    const getPos = () => {
      const p = stage.getRelativePointerPosition()
      return p ? { x: p.x, y: p.y } : null
    }

    const onDown = (e) => {
      if (e.evt && e.evt.button !== undefined && e.evt.button !== 0) return
      if (e.target !== stage) return
      if (e.evt && typeof e.evt.preventDefault === 'function') e.evt.preventDefault()
      const p = getPos()
      if (!p) return
      dragStartRef.current = p
      setDrag({ start: p, end: p })
    }

    const onMove = () => {
      if (!dragStartRef.current) return
      const p = getPos()
      if (!p) return
      setDrag({ start: dragStartRef.current, end: p })
    }

    const finish = () => {
      if (!dragStartRef.current) return
      const start = dragStartRef.current
      const endPos = getPos()
      const end = endPos ?? start
      dragStartRef.current = null
      setDrag(null)

      const distPx = Math.hypot(end.x - start.x, end.y - start.y)
      if (distPx < DRAG_THRESHOLD_PX) {
        const id = nextId++
        setMarks((m) => [...m, { id, x: start.x, y: start.y }])
        window.setTimeout(() => {
          setMarks((m) => m.filter((mk) => mk.id !== id))
        }, X_MARK_TTL_MS)
      }
    }

    stage.on('mousedown.ruler touchstart.ruler', onDown)
    stage.on('mousemove.ruler touchmove.ruler', onMove)
    stage.on('mouseup.ruler touchend.ruler', finish)
    stage.on('mouseleave.ruler touchcancel.ruler', finish)

    const container = stage.container()
    const prevCursor = container?.style.cursor ?? ''
    const prevTouchAction = container?.style.touchAction ?? ''
    if (container) {
      container.style.cursor = 'crosshair'
      container.style.touchAction = 'none'
    }

    return () => {
      stage.off(
        'mousedown.ruler touchstart.ruler mousemove.ruler touchmove.ruler mouseup.ruler touchend.ruler mouseleave.ruler touchcancel.ruler',
      )
      if (container) {
        container.style.cursor = prevCursor
        container.style.touchAction = prevTouchAction
      }
      dragStartRef.current = null
    }
  }, [active, stageRef])

  const distLabel = (a, b) => {
    const inches = Math.hypot(b.x - a.x, b.y - a.y) / PX_PER_INCH
    return `${inches.toFixed(2)}″`
  }

  const renderXMark = (m) => {
    const r = 8
    return (
      <Line
        key={`mark-${m.id}`}
        points={[m.x - r, m.y - r, m.x + r, m.y + r, m.x, m.y, m.x + r, m.y - r, m.x - r, m.y + r]}
        stroke="#ff6464"
        strokeWidth={2.5}
        lineCap="round"
        lineJoin="round"
        listening={false}
        shadowColor="#000"
        shadowBlur={3}
        shadowOpacity={0.6}
      />
    )
  }

  const renderLive = (start, end) => {
    const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    const label = distLabel(start, end)
    const labelW = 64
    const labelH = 18
    return [
      <Line
        key="live-line"
        points={[start.x, start.y, end.x, end.y]}
        stroke="#fbbf24"
        strokeWidth={2}
        listening={false}
      />,
      <Rect
        key="live-bg"
        x={mid.x - labelW / 2}
        y={mid.y - labelH / 2}
        width={labelW}
        height={labelH}
        fill="rgba(26, 26, 26, 0.88)"
        cornerRadius={4}
        listening={false}
      />,
      <Text
        key="live-text"
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
  }

  return (
    <Layer listening={false}>
      {marks.map(renderXMark)}
      {drag && renderLive(drag.start, drag.end)}
    </Layer>
  )
}
