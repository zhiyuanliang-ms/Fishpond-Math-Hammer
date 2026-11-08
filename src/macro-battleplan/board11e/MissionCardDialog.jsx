import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { trackEvent, TELEMETRY_EVENTS } from '../../lib/telemetry'

export function MissionCardDialog({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    trackEvent(TELEMETRY_EVENTS.MissionCard)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus()
      }
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="mbp11-card-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="mbp11-ref-dialog__bar">
        <span id={titleId} className="mbp11-ref-dialog__title">{title}</span>
        <button
          type="button"
          className="mbp11-ref-dialog__close"
          onClick={onClose}
          aria-label="Close mission cards"
          autoFocus
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export function MissionCardImage({ src, alt, sourceUrl }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <p className="mbp-mission-image-error" role="alert">
        This mission card could not be loaded. Please reload the page.
        {sourceUrl && (
          <> <a href={sourceUrl} target="_blank" rel="noreferrer">View the source card</a>.</>
        )}
      </p>
    )
  }

  return (
    <img
      className="mbp11-mission-card__image"
      src={src}
      alt={alt}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
