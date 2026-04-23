// Shared labeled checkbox with consistent layout and class names.

function LabeledCheckbox({ id, label, checked, onChange, disabled = false }) {
  return (
    <div className="form-checkbox">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

export default LabeledCheckbox
