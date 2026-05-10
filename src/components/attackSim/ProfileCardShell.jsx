import { ArrowUp, ArrowDown, Copy, X } from 'lucide-react'

function ProfileCardShell({
  name,
  placeholder,
  index,
  total,
  onNameChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  children
}) {
  return (
    <div className="profile-card">
      <div className="profile-card-header">
        <input
          type="text"
          className="profile-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={placeholder}
        />
        <div className="profile-card-actions">
          <button type="button" title="Move up" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp size={14} />
          </button>
          <button type="button" title="Move down" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown size={14} />
          </button>
          <button type="button" title="Duplicate" onClick={onDuplicate}>
            <Copy size={14} />
          </button>
          <button type="button" className="danger" title="Remove" onClick={onRemove}>
            <X size={14} />
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}

export default ProfileCardShell