import SharedTipsBanner from '../../components/ui/TipsBanner'

const TIPS = [
  <>
    Placing symmetrical terrain? Lay it out on one half, then hit
    {' '}<strong>Mirror</strong> in the toolbar to reflect it across the
    board.
  </>,
  <>
    Toggle <strong>Show movement distance</strong> below to preview how far
    units can move from their current position.
  </>,
  <>
    Finished placing terrain? Hit <strong>Save board</strong> so your layout
    sticks around between sessions.
  </>,
  <>
    Check the <span className="mbp-kbd">?</span> button in the top-left of
    the canvas for keyboard shortcuts (rotate, nudge, undo…).
  </>,
  <>
    Built a layout? Use <strong>Share</strong> to generate a code — friends
    can paste it in to load the exact same board.
  </>,
]

export function TipsBanner() {
  return <SharedTipsBanner tips={TIPS} />
}
