// Tag-style multi-select for weapon / target buffs. Each item is rendered as
// a "chip" that toggles on click; some buffs include an inline value editor
// (e.g. SUSTAINED HITS X, ANTI X+, FNP X+).
//
// Props:
//   buffs: array of buff descriptors, each:
//     {
//       key: string,                 // unique identifier
//       label: string,               // chip label
//       active: bool,                // current on/off state
//       onToggle: () => void,        // toggle handler
//       value?: any,                 // optional inline value
//       valueOptions?: [{ value, label }],
//       onValueChange?: (v) => void
//     }
function BuffChipGroup({ buffs }) {
  return (
    <div className="buff-chip-group">
      {buffs.map((b) => (
        <div key={b.key} className={`buff-chip ${b.active ? 'active' : ''}`}>
          <button
            type="button"
            className="buff-chip-toggle"
            onClick={b.onToggle}
          >
            {b.label}
          </button>
          {b.active && b.valueOptions && (
            <select
              className="buff-chip-value"
              value={b.value}
              onChange={(e) => b.onValueChange(e.target.value)}
            >
              {b.valueOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  )
}

export default BuffChipGroup
