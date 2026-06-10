// Generic modal dialog shell used by both WeaponBuffsDialog and
// TargetBuffsDialog. Handles the backdrop, Escape key, focus capture, and
// body scroll lock. Children render inside `.weapon-buffs-dialog-body`.

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useT } from '../attackSim/lang'

function BuffsDialog({ title, subtitle, onClose, children }) {
  const { t } = useT()
  const dialogRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div
      className="weapon-buffs-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="weapon-buffs-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="weapon-buffs-dialog-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? (
              <span className="weapon-buffs-dialog-subtitle">{subtitle}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="weapon-buffs-dialog-close"
            onClick={onClose}
            aria-label={t('closeBuffs')}
          >
            <X size={16} />
          </button>
        </header>
        <div className="weapon-buffs-dialog-body">{children}</div>
        <footer className="weapon-buffs-dialog-footer">
          <button
            type="button"
            className="weapon-buffs-dialog-done"
            onClick={onClose}
          >
            {t('closeBuffs')}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default BuffsDialog
