import { useRef, useState } from 'react'
import { Circle, Ellipse, Group, Line, Rect, Text } from 'react-konva'
import { useBoard11eStore } from '../store/board11eStore'
import { PX_PER_INCH, MM_PER_INCH, DEFAULT_BASE_COLOR, baseRadiusPx } from '../config/board'
import { useGroupDragMove } from '../hooks/useGroupDragMove'

const mmToPx = (mm) => (mm / MM_PER_INCH) * PX_PER_INCH

export function BaseToken({ piece }) {
  const isOval = piece.shape === 'oval' && piece.widthMm && piece.heightMm
  const isRect = piece.shape === 'rect' && piece.widthMm && piece.heightMm
  const radius = baseRadiusPx(piece.diameterMm)
  const radiusX = isOval || isRect ? mmToPx(piece.widthMm) / 2 : radius
  const radiusY = isOval || isRect ? mmToPx(piece.heightMm) / 2 : radius
  const fillColor = piece.color ?? DEFAULT_BASE_COLOR
  const auraPx = piece.auraIn ? piece.auraIn * PX_PER_INCH : 0

  const selectPiece = useBoard11eStore((s) => s.selectPiece)
  const toggleSelection = useBoard11eStore((s) => s.toggleSelection)
  const bringToFront = useBoard11eStore((s) => s.bringToFront)
  const updatePiece = useBoard11eStore((s) => s.commitPieceUpdate)
  const commitMoveSelected = useBoard11eStore((s) => s.commitMoveSelected)
  const selected = useBoard11eStore((s) => s.selectedIds.includes(piece.id))
  const selectedIds = useBoard11eStore((s) => s.selectedIds)
  const showMoveDistance = useBoard11eStore((s) => s.showMoveDistance)

  const dragStartRef = useRef(null)
  const [dragPos, setDragPos] = useState(null)
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

  const showDistance =
    showMoveDistance &&
    dragStartRef.current !== null &&
    dragPos !== null &&
    (dragPos.x !== dragStartRef.current.x || dragPos.y !== dragStartRef.current.y)

  const distancePx = showDistance
    ? Math.hypot(
        dragPos.x - dragStartRef.current.x,
        dragPos.y - dragStartRef.current.y,
      )
    : 0
  const distanceIn = distancePx / PX_PER_INCH

  return (
    <>
      <Group
        id={piece.id}
        name="piece"
        x={piece.x}
        y={piece.y}
        rotation={piece.rotation}
        draggable
        onMouseDown={handleSelect}
        onTouchStart={handleSelect}
        onDragStart={(e) => {
          dragStartRef.current = { x: piece.x, y: piece.y }
          setDragPos({ x: piece.x, y: piece.y })
          onGroupDragStart(e)
        }}
        onDragMove={(e) => {
          setDragPos({ x: e.target.x(), y: e.target.y() })
          onGroupDragMove(e)
        }}
        onDragEnd={(e) => {
          const start = dragStartRef.current
          dragStartRef.current = null
          setDragPos(null)
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
        {auraPx > 0 &&
          (isOval ? (
            <Ellipse
              radiusX={radiusX + auraPx}
              radiusY={radiusY + auraPx}
              fill="rgba(196, 61, 61, 0.10)"
              stroke="rgba(255, 120, 120, 0.7)"
              strokeWidth={1}
              dash={[6, 4]}
              listening={false}
            />
          ) : isRect ? (
            <Rect
              x={-(radiusX + auraPx)}
              y={-(radiusY + auraPx)}
              width={(radiusX + auraPx) * 2}
              height={(radiusY + auraPx) * 2}
              cornerRadius={auraPx}
              fill="rgba(196, 61, 61, 0.10)"
              stroke="rgba(255, 120, 120, 0.7)"
              strokeWidth={1}
              dash={[6, 4]}
              listening={false}
            />
          ) : (
            <Circle
              radius={radius + auraPx}
              fill="rgba(196, 61, 61, 0.10)"
              stroke="rgba(255, 120, 120, 0.7)"
              strokeWidth={1}
              dash={[6, 4]}
              listening={false}
            />
          ))}

        {isOval ? (
          <Ellipse
            radiusX={radiusX}
            radiusY={radiusY}
            fill={fillColor}
            stroke={selected ? '#fbbf24' : '#1a1a1a'}
            strokeWidth={1}
          />
        ) : isRect ? (
          <Rect
            x={-radiusX}
            y={-radiusY}
            width={radiusX * 2}
            height={radiusY * 2}
            fill={fillColor}
            stroke={selected ? '#fbbf24' : '#1a1a1a'}
            strokeWidth={1}
          />
        ) : (
          <Circle
            radius={radius}
            fill={fillColor}
            stroke={selected ? '#fbbf24' : '#1a1a1a'}
            strokeWidth={1}
          />
        )}
      </Group>

      {showDistance && (
        <Group listening={false}>
          <Line
            points={[
              dragStartRef.current.x,
              dragStartRef.current.y,
              dragPos.x,
              dragPos.y,
            ]}
            stroke="#fbbf24"
            strokeWidth={1.5}
            dash={[6, 4]}
          />
          <Circle
            x={dragStartRef.current.x}
            y={dragStartRef.current.y}
            radius={3}
            fill="#fbbf24"
          />
          <Text
            x={(dragStartRef.current.x + dragPos.x) / 2 + 6}
            y={(dragStartRef.current.y + dragPos.y) / 2 - 14}
            text={`${distanceIn.toFixed(2)}″`}
            fontSize={13}
            fontStyle="600"
            fill="#fbbf24"
            shadowColor="#000"
            shadowBlur={3}
            shadowOpacity={0.8}
          />
        </Group>
      )}
    </>
  )
}
