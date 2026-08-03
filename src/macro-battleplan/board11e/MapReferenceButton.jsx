// Small canvas button that opens the original annotated page map, so players
// can check the printed deployment zones and measurements the clean board
// image leaves out.

import { useEffect, useState } from 'react'
import { Map as MapIcon, X } from 'lucide-react'

export function MapReferenceButton({ src, title }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!src) return null

  return (
    <>
      <button
        type="button"
        className="mbp11-ref-btn"
        onClick={() => setOpen(true)}
        title="Show official terrain layout"
        aria-label="Show official terrain layout"
      >
        <MapIcon size={16} />
      </button>

      {open && (
        <div
          className="mbp11-ref-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <div className="mbp11-ref-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mbp11-ref-dialog__bar">
              <span className="mbp11-ref-dialog__title">{title}</span>
              <button
                type="button"
                className="mbp11-ref-dialog__close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <img className="mbp11-ref-dialog__img" src={src} alt={title} />
          </div>
        </div>
      )}
    </>
  )
}
