import { Save, Trash2 } from 'lucide-react'

function SavedSetControls({
  value,
  options,
  placeholder,
  onChange,
  onSave,
  saveLabel = 'Save Set…',
  onDelete,
  deleteDisabled,
  deleteTitle,
  groupAriaLabel,
  selectAriaLabel,
  deleteAriaLabel
}) {
  return (
    <div className="profile-set-controls" role="group" aria-label={groupAriaLabel}>
      <select
        className="toolbar-select profile-set-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={selectAriaLabel}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button type="button" className="toolbar-button" onClick={onSave}>
        <Save size={14} />
        <span>{saveLabel}</span>
      </button>
      <button
        type="button"
        className="toolbar-button toolbar-button--danger"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteTitle}
        aria-label={deleteAriaLabel}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default SavedSetControls