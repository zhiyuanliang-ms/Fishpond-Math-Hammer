import { useEffect, useRef } from 'react'
import { Layer, Transformer } from 'react-konva'
import { useBoard11eStore } from '../store/board11eStore'

const ROTATION_SNAPS = Array.from({ length: 24 }, (_, i) => i * 15)

export function SelectionLayer({ stageRef }) {
  const transformerRef = useRef(null)
  const selectedIds = useBoard11eStore((s) => s.selectedIds)
  const pieces = useBoard11eStore((s) => s.pieces)
  const updatePiece = useBoard11eStore((s) => s.commitPieceUpdate)

  const rotateEnabled = (() => {
    if (selectedIds.length !== 1) return false
    const piece = pieces.find((p) => p.id === selectedIds[0])
    if (!piece) return false
    // Round bases have no meaningful rotation — hide the rotate handle.
    if (piece.shape === 'round') return false
    return true
  })()

  useEffect(() => {
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage) return
    // For multi-select we don't want any wrapping rect or transformer UI —
    // each piece already shows its own selected border. Only attach the
    // transformer for single-selection rotatable pieces.
    const nodes =
      selectedIds.length === 1
        ? selectedIds
            .map((id) => stage.findOne(`#${id}`))
            .filter((n) => !!n)
        : []
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, pieces, stageRef])

  return (
    <Layer>
      <Transformer
        ref={transformerRef}
        rotateEnabled={rotateEnabled}
        resizeEnabled={false}
        rotationSnaps={ROTATION_SNAPS}
        anchorSize={9}
        borderEnabled={false}
        rotateAnchorOffset={28}
        onTransformEnd={() => {
          const node = transformerRef.current?.nodes()[0]
          if (!node) return
          updatePiece(node.id(), { rotation: node.rotation() })
        }}
      />
    </Layer>
  )
}
