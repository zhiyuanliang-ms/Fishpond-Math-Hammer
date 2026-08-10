// Konva stage for the 11e board: the official battleplan image is the
// background, with the shared base / drawing / ruler tools layered on top.

import { useEffect, useRef, useState } from 'react'
import { Image as KonvaImage, Layer, Rect, Stage } from 'react-konva'
import { BaseToken } from '../components/BaseToken'
import { SelectionLayer } from '../components/SelectionLayer'
import { RulerOverlay } from '../components/RulerOverlay'
import { DrawingOverlay } from '../components/DrawingOverlay'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useBoard11eStore } from '../store/board11eStore'
import { MAP_11E_W, MAP_11E_H, MAP_11E_X, MAP_11E_Y } from '../config/battleplans11e'

const BOARD_PAD = 24

function useMapImage(src) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (!cancelled) setImage(img)
    }
    img.src = src
    return () => {
      cancelled = true
      img.onload = null
    }
  }, [src])

  return image
}

export function Board11eCanvas({ containerRef, mapSrc }) {
  const stageRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const pieces = useBoard11eStore((s) => s.pieces)
  const selectPiece = useBoard11eStore((s) => s.selectPiece)
  const selectMany = useBoard11eStore((s) => s.selectMany)
  const activeTool = useBoard11eStore((s) => s.activeTool)
  const mapImage = useMapImage(mapSrc)

  const [rubber, setRubber] = useState(null)
  const rubberStartRef = useRef(null)
  const additiveRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const syncSize = (width, height) => {
      setSize({
        width: Math.max(0, Math.round(width)),
        height: Math.max(0, Math.round(height)),
      })
    }
    const update = () => {
      const rect = el.getBoundingClientRect()
      syncSize(rect.width, rect.height)
    }
    update()
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        update()
        return
      }
      syncSize(entry.contentRect.width, entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || size.width === 0 || size.height === 0) return
    const scale = Math.min(
      size.width / (MAP_11E_W + BOARD_PAD * 2),
      size.height / (MAP_11E_H + BOARD_PAD * 2),
    )
    stage.scale({ x: scale, y: scale })
    const centerX = MAP_11E_X + MAP_11E_W / 2
    const centerY = MAP_11E_Y + MAP_11E_H / 2
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
    return {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY(),
    }
  }

  const isOnInteractiveTarget = (e) => {
    let n = e.target
    while (n) {
      if (n.name() === 'piece') return true
      if (n.getClassName?.() === 'Transformer') return true
      n = n.getParent()
    }
    return false
  }

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      onPointerDown={(e) => {
        if (activeTool !== 'cursor') return
        if (isOnInteractiveTarget(e)) return
        const evt = e.evt
        if (evt && evt.pointerType === 'touch') return
        if (evt && evt.button !== undefined && evt.button !== 0) return
        additiveRef.current = !!(evt.ctrlKey || evt.metaKey || evt.shiftKey)
        const p = getStagePointer()
        if (!p) return
        rubberStartRef.current = p
        setRubber({ x: p.x, y: p.y, w: 0, h: 0 })
      }}
      onPointerMove={() => {
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
      onPointerUp={() => {
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
        const picked = pieces
          .filter(
            (p) =>
              p.x >= rect.x &&
              p.x <= rect.x + rect.w &&
              p.y >= rect.y &&
              p.y <= rect.y + rect.h,
          )
          .map((p) => p.id)
        if (additiveRef.current) {
          const existing = useBoard11eStore.getState().selectedIds
          selectMany(Array.from(new Set([...existing, ...picked])))
        } else {
          selectMany(picked)
        }
      }}
    >
      <Layer listening={false}>
        <Rect
          x={MAP_11E_X}
          y={MAP_11E_Y}
          width={MAP_11E_W}
          height={MAP_11E_H}
          fill="#e9e6df"
          stroke="#111"
          strokeWidth={2}
        />
        {mapImage && (
          <KonvaImage
            image={mapImage}
            x={MAP_11E_X}
            y={MAP_11E_Y}
            width={MAP_11E_W}
            height={MAP_11E_H}
          />
        )}
      </Layer>
      <Layer>
        {pieces.map((p) => (
          <BaseToken key={p.id} piece={p} />
        ))}
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
