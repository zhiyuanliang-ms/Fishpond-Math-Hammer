import { useEffect, useRef, useState } from 'react'
import { BookOpen, Repeat2, X } from 'lucide-react'
import { getDisposition, getMissionCardImages } from '../config/battleplans11e'

function MissionCard({ player, disposition, mission }) {
  const [showBack, setShowBack] = useState(false)
  const dispositionInfo = getDisposition(disposition)
  const images = getMissionCardImages(disposition, mission)

  if (!dispositionInfo || !images) return null

  const image = showBack && images.back ? images.back : images.front
  const face = showBack ? 'back' : 'front'

  return (
    <article className="mbp11-mission-card">
      <header className="mbp11-mission-card__header">
        <div className="mbp11-mission-card__meta">
          <span className="mbp11-mission-card__player">{player}</span>
          <span className="mbp11-mission-card__disposition">
            <span
              className="mbp11-mission-card__swatch"
              style={{ backgroundColor: dispositionInfo.color }}
              aria-hidden="true"
            />
            {dispositionInfo.label}
          </span>
          <strong>{mission}</strong>
        </div>
        {images.back && (
          <button
            type="button"
            className="mbp11-mission-card__flip"
            onClick={() => setShowBack((value) => !value)}
            title={`Show ${showBack ? 'front' : 'back'} of ${mission}`}
            aria-label={`Show ${showBack ? 'front' : 'back'} of ${mission}`}
          >
            <Repeat2 size={14} />
          </button>
        )}
      </header>
      <img
        className="mbp11-mission-card__image"
        src={image}
        alt={`${mission} ${face}`}
        decoding="async"
      />
    </article>
  )
}

export function MissionCardsButton({ battleplan }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!battleplan) return null

  const mine = battleplan.mine
  const theirs = battleplan.theirs
  const mirror = mine.disposition === theirs.disposition && mine.mission === theirs.mission
  const mineDisposition = getDisposition(mine.disposition)?.label
  const theirDisposition = getDisposition(theirs.disposition)?.label
  const dialogTitle = `${mineDisposition} vs ${theirDisposition} · Primary Missions`

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mbp11-missions-btn"
        onClick={() => setOpen(true)}
        title="Show current matchup missions"
        aria-label={`Show current missions: ${mine.mission} and ${theirs.mission}`}
      >
        <BookOpen size={16} />
      </button>

      {open && (
        <div className="mbp11-ref-overlay" onClick={close}>
          <section
            className="mbp11-missions-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mbp11-missions-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mbp11-ref-dialog__bar">
              <span id="mbp11-missions-title" className="mbp11-ref-dialog__title">
                {dialogTitle}
              </span>
              <button
                ref={closeRef}
                type="button"
                className="mbp11-ref-dialog__close"
                onClick={close}
                aria-label="Close missions"
              >
                <X size={16} />
              </button>
            </div>
            <div className={`mbp11-missions-grid ${mirror ? 'is-mirror' : ''}`}>
              <MissionCard
                key={`${mine.disposition}-${mine.mission}`}
                player={mirror ? 'Both players' : 'Attacker'}
                disposition={mine.disposition}
                mission={mine.mission}
              />
              {!mirror && (
                <MissionCard
                  key={`${theirs.disposition}-${theirs.mission}`}
                  player="Defender"
                  disposition={theirs.disposition}
                  mission={theirs.mission}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}