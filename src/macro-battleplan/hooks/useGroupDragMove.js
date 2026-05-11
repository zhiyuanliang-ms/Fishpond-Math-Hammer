import { useRef } from 'react'

/**
 * Returns handlers that, when the piece is part of a multi-selection,
 * translate every OTHER selected Konva node live during drag so the group
 * stays together without any wrapping Transformer rectangle.
 *
 * On dragEnd, `commitMoveSelected(dx, dy)` is responsible for syncing the
 * store; the visual positions already match because we translated nodes
 * directly during the drag.
 */
export function useGroupDragMove({ pieceId, selected, selectedIds }) {
  const lastRef = useRef(null)

  const onDragStart = (e) => {
    lastRef.current = { x: e.target.x(), y: e.target.y() }
  }

  const onDragMove = (e) => {
    if (!selected || selectedIds.length <= 1) return
    const node = e.target
    const last = lastRef.current
    if (!last) return
    const dx = node.x() - last.x
    const dy = node.y() - last.y
    if (dx === 0 && dy === 0) return
    lastRef.current = { x: node.x(), y: node.y() }
    const stage = node.getStage()
    if (!stage) return
    for (const id of selectedIds) {
      if (id === pieceId) continue
      const other = stage.findOne(`#${id}`)
      if (!other) continue
      other.x(other.x() + dx)
      other.y(other.y() + dy)
    }
    stage.batchDraw()
  }

  const onDragEnd = () => {
    lastRef.current = null
  }

  return { onGroupDragStart: onDragStart, onGroupDragMove: onDragMove, onGroupDragEnd: onDragEnd }
}
