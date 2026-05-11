import { useRef } from 'react'
import { Group, Line, Rect } from 'react-konva'
import { useBoardStore } from '../store/boardStore'
import { PX_PER_INCH } from '../config/board'
import { useGroupDragMove } from '../hooks/useGroupDragMove'

export function TerrainToken({ piece }) {
  const w = piece.widthIn * PX_PER_INCH
  const h = piece.heightIn * PX_PER_INCH
  const selectPiece = useBoardStore((s) => s.selectPiece)
  const toggleSelection = useBoardStore((s) => s.toggleSelection)
  const bringToFront = useBoardStore((s) => s.bringToFront)
  const updatePiece = useBoardStore((s) => s.commitPieceUpdate)
  const commitMoveSelected = useBoardStore((s) => s.commitMoveSelected)
  const selected = useBoardStore((s) => s.selectedIds.includes(piece.id))
  const selectedIds = useBoardStore((s) => s.selectedIds)
  const locked = useBoardStore((s) => s.terrainLocked)

  const footprintStroke = selected ? '#fbbf24' : '#888'
  const footprintFill = 'rgba(255, 255, 255, 0.05)'

  const dragStartRef = useRef(null)
  const { onGroupDragStart, onGroupDragMove, onGroupDragEnd } = useGroupDragMove({
    pieceId: piece.id,
    selected,
    selectedIds,
  })

  const handleSelect = (e) => {
    e.cancelBubble = true
    const evt = e.evt
    const additive = evt.ctrlKey || evt.metaKey || evt.shiftKey
    if (additive) {
      toggleSelection(piece.id)
    } else if (!selected) {
      selectPiece(piece.id)
    }
    bringToFront(piece.id)
  }

  const renderBuilding = () => {
    if (piece.shape === 'rect') {
      return (
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={piece.color}
          stroke="#1a1a1a"
          strokeWidth={1}
          listening={false}
        />
      )
    }

    const bL = (piece.buildingLengthIn ?? 9) * PX_PER_INCH
    const bW = (piece.buildingWidthIn ?? 5) * PX_PER_INCH
    const t = (piece.wallThicknessIn ?? 1) * PX_PER_INCH
    const margin = 1 * PX_PER_INCH
    const insetY = margin
    const insetX = piece.mirrorX ? w - margin - bL : margin

    const x0 = insetX
    const y0 = insetY
    const points = piece.mirrorX
      ? [
          x0,           y0,
          x0 + bL,      y0,
          x0 + bL,      y0 + bW,
          x0 + bL - t,  y0 + bW,
          x0 + bL - t,  y0 + t,
          x0,           y0 + t,
        ]
      : [
          x0,           y0,
          x0 + bL,      y0,
          x0 + bL,      y0 + t,
          x0 + t,       y0 + t,
          x0 + t,       y0 + bW,
          x0,           y0 + bW,
        ]

    return (
      <Line
        points={points}
        closed
        fill={piece.color}
        listening={false}
      />
    )
  }

  return (
    <Group
      id={piece.id}
      name="piece"
      x={piece.x}
      y={piece.y}
      rotation={piece.rotation}
      offsetX={w / 2}
      offsetY={h / 2}
      draggable={!locked}
      listening={!locked}
      onMouseDown={handleSelect}
      onTouchStart={handleSelect}
      onDragStart={(e) => {
        dragStartRef.current = { x: piece.x, y: piece.y }
        onGroupDragStart(e)
      }}
      onDragMove={onGroupDragMove}
      onDragEnd={(e) => {
        const start = dragStartRef.current
        dragStartRef.current = null
        onGroupDragEnd()
        const newX = e.target.x()
        const newY = e.target.y()
        if (selected && selectedIds.length > 1 && start) {
          const dx = newX - start.x
          const dy = newY - start.y
          e.target.position({ x: start.x, y: start.y })
          commitMoveSelected(dx, dy)
        } else {
          updatePiece(piece.id, { x: newX, y: newY })
        }
      }}
      onTransformEnd={(e) => {
        const node = e.target
        updatePiece(piece.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        })
      }}
    >
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={footprintFill}
        stroke={footprintStroke}
        strokeWidth={selected ? 2 : 1}
        dash={[4, 3]}
      />

      {renderBuilding()}
    </Group>
  )
}
