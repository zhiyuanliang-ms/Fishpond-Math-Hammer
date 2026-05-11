import { useRef } from 'react'
import { Circle, Group } from 'react-konva'
import { useBoardStore, baseRadiusPx } from '../store/boardStore'
import { PX_PER_INCH } from '../config/board'
import { useGroupDragMove } from '../hooks/useGroupDragMove'

export function ObjectiveToken({ piece }) {
  const markerRadius = baseRadiusPx(piece.diameterMm)
  const controlRadius = piece.controlRadiusIn * PX_PER_INCH
  const selectPiece = useBoardStore((s) => s.selectPiece)
  const toggleSelection = useBoardStore((s) => s.toggleSelection)
  const bringToFront = useBoardStore((s) => s.bringToFront)
  const updatePiece = useBoardStore((s) => s.commitPieceUpdate)
  const commitMoveSelected = useBoardStore((s) => s.commitMoveSelected)
  const selected = useBoardStore((s) => s.selectedIds.includes(piece.id))
  const selectedIds = useBoardStore((s) => s.selectedIds)
  const locked = useBoardStore((s) => s.terrainLocked)

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

  return (
    <Group
      id={piece.id}
      name="piece"
      x={piece.x}
      y={piece.y}
      rotation={piece.rotation}
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
      <Circle
        radius={controlRadius}
        fill="rgba(255, 196, 64, 0.12)"
        stroke={selected ? '#fbbf24' : '#e0a93a'}
        strokeWidth={1}
        dash={[6, 4]}
        listening={false}
      />
      <Circle
        radius={markerRadius}
        fill="#e0a93a"
        stroke={selected ? '#fbbf24' : '#1a1a1a'}
        strokeWidth={1.5}
      />
    </Group>
  )
}
