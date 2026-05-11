import { useEffect, useRef, useState } from 'react'
import { Layer, Rect, Stage } from 'react-konva'
import { BoardBackground } from './BoardBackground'
import { BaseToken } from './BaseToken'
import { TerrainToken } from './TerrainToken'
import { ObjectiveToken } from './ObjectiveToken'
import { SelectionLayer } from './SelectionLayer'
import { RulerOverlay } from './RulerOverlay'
import { DrawingOverlay } from './DrawingOverlay'
import { useBoardStore } from '../store/boardStore'
import { MAP_W, MAP_H, MAP_X, MAP_Y } from '../config/board'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

export function BoardCanvas({ containerRef }) {
  const stageRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const pieces = useBoardStore((s) => s.pieces)
  const selectPiece = useBoardStore((s) => s.selectPiece)
  const selectMany = useBoardStore((s) => s.selectMany)
  const activeTool = useBoardStore((s) => s.activeTool)
  const terrainLocked = useBoardStore((s) => s.terrainLocked)

  const [rubber, setRubber] = useState(null)
  const rubberStartRef = useRef(null)
  const additiveRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || size.width === 0 || size.height === 0) return
    const RULER_PAD = 36
    const requiredW = MAP_W + RULER_PAD * 2
    const requiredH = MAP_H + RULER_PAD * 2
    const scale = Math.min(1, size.width / requiredW, size.height / requiredH)
    stage.scale({ x: scale, y: scale })
    const centerX = MAP_X + MAP_W / 2
    const centerY = MAP_Y + MAP_H / 2
    stage.position({
      x: size.width / 2 - centerX * scale,
      y: size.height / 2 - centerY * scale,
    })
    stage.batchDraw()
  }, [size.width, size.height])

  useKeyboardShortcuts()

  const getStagePointer = () => {
    const stage = stageRef.current
    if (!stage) return null
    const pos = stage.getPointerPosition()
    if (!pos) return null
    const tx = stage.x()
    const ty = stage.y()
    const sx = stage.scaleX()
    const sy = stage.scaleY()
    return { x: (pos.x - tx) / sx, y: (pos.y - ty) / sy }
  }

  const isOnInteractiveTarget = (e) => {
    let n = e.target
    while (n) {
      const className = n.getClassName?.()
      if (n.name() === 'piece') return true
      if (className === 'Transformer') return true
      n = n.getParent()
    }
    return false
  }

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      onMouseDown={(e) => {
        if (activeTool !== 'cursor') return
        if (isOnInteractiveTarget(e)) return
        const evt = e.evt
        additiveRef.current = !!(evt.ctrlKey || evt.metaKey || evt.shiftKey)
        const p = getStagePointer()
        if (!p) return
        rubberStartRef.current = p
        setRubber({ x: p.x, y: p.y, w: 0, h: 0 })
      }}
      onMouseMove={() => {
        if (!rubberStartRef.current) return
        const p = getStagePointer()
        if (!p) return
        const start = rubberStartRef.current
        setRubber({
          x: Math.min(start.x, p.x),
          y: Math.min(start.y, p.y),
          w: Math.abs(p.x - start.x),
          h: Math.abs(p.y - start.y),
        })
      }}
      onMouseUp={() => {
        const start = rubberStartRef.current
        const rect = rubber
        rubberStartRef.current = null
        const isClick = !rect || (rect.w < 3 && rect.h < 3)
        setRubber(null)
        if (!start) return
        if (isClick) {
          if (!additiveRef.current) selectPiece(null)
          return
        }
        const inRect = pieces.filter((p) => {
          if (terrainLocked && (p.kind === 'terrain' || p.kind === 'objective')) return false
          return (
            p.x >= rect.x &&
            p.x <= rect.x + rect.w &&
            p.y >= rect.y &&
            p.y <= rect.y + rect.h
          )
        })
        const picked = inRect.map((p) => p.id)
        if (additiveRef.current) {
          const existing = useBoardStore.getState().selectedIds
          const merged = Array.from(new Set([...existing, ...picked]))
          selectMany(merged)
        } else {
          selectMany(picked)
        }
      }}
    >
      <BoardBackground />
      <Layer>
        {pieces.map((p) => {
          if (p.kind === 'base') return <BaseToken key={p.id} piece={p} />
          if (p.kind === 'objective') return <ObjectiveToken key={p.id} piece={p} />
          return <TerrainToken key={p.id} piece={p} />
        })}
      </Layer>
      <SelectionLayer stageRef={stageRef} />
      <DrawingOverlay stageRef={stageRef} />
      <RulerOverlay stageRef={stageRef} />
      {rubber && (rubber.w > 0 || rubber.h > 0) && (
        <Layer listening={false}>
          <Rect
            x={rubber.x}
            y={rubber.y}
            width={rubber.w}
            height={rubber.h}
            fill="rgba(251, 191, 36, 0.10)"
            stroke="#fbbf24"
            strokeWidth={1}
            dash={[4, 3]}
          />
        </Layer>
      )}
    </Stage>
  )
}
