import { useMemo, useState } from 'react'
import { Lightbulb, X, ChevronRight } from 'lucide-react'

/**
 * Shared onboarding tip banner. Pass an array of React nodes (one per tip).
 * Picks a random starting tip; the ChevronRight button cycles through the
 * remaining tips in a stable shuffled order before looping. The X button
 * dismisses the banner for the lifetime of the component instance.
 */
export default function TipsBanner({ tips, className = '' }) {
  const [dismissed, setDismissed] = useState(false)
  const order = useMemo(() => {
    const arr = tips.map((_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tips.length])
  const [orderPos, setOrderPos] = useState(0)

  if (dismissed || tips.length === 0) return null

  const tipIndex = order[orderPos] ?? 0
  const handleNext = () => setOrderPos((p) => (p + 1) % order.length)

  return (
    <div className={`tips-banner ${className}`.trim()} role="status" aria-live="polite">
      <Lightbulb size={14} className="tips-banner__icon" aria-hidden="true" />
      <div className="tips-banner__text">
        <span className="tips-banner__label">Tip</span>
        <span className="tips-banner__body">{tips[tipIndex]}</span>
      </div>
      <div className="tips-banner__actions">
        {tips.length > 1 && (
          <button
            type="button"
            className="tips-banner__action"
            onClick={handleNext}
            title="Next tip"
            aria-label="Next tip"
          >
            <ChevronRight size={14} />
          </button>
        )}
        <button
          type="button"
          className="tips-banner__action"
          onClick={() => setDismissed(true)}
          title="Dismiss"
          aria-label="Dismiss tip"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
