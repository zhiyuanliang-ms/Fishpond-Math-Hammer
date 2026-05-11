import { useState } from 'react'
import {
  sanitizeDraftValue,
  findMatchingValue,
  formatDisplayValue,
  getAllowedValuesLabel
} from './buffChipInputUtils'

function BuffChipValueInput({ buff }) {
  const currentValue = formatDisplayValue(buff.value, buff.valueOptions)
  const [draftValue, setDraftValue] = useState(currentValue)
  const [isInvalid, setIsInvalid] = useState(false)

  const commitDraft = () => {
    const matchedOption = findMatchingValue(draftValue, buff.valueOptions)
    if (!matchedOption) {
      setIsInvalid(true)
      return
    }

    setIsInvalid(false)
    setDraftValue(matchedOption.label)

    if (matchedOption.value.toString() !== buff.value?.toString()) {
      buff.onValueChange(matchedOption.value)
    }
  }

  return (
    <div className={`buff-chip-picker ${isInvalid ? 'invalid' : ''}`}>
      <input
        type="text"
        className={`buff-chip-input ${isInvalid ? 'invalid' : ''}`}
        value={draftValue}
        maxLength={2}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label={`${buff.label} value`}
        title={getAllowedValuesLabel(buff)}
        onChange={(e) => {
          const nextValue = sanitizeDraftValue(e.target.value)
          setDraftValue(nextValue)
          setIsInvalid(!findMatchingValue(nextValue, buff.valueOptions))
        }}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitDraft()
          }

          if (e.key === 'Escape') {
            e.preventDefault()
            setDraftValue(currentValue)
            setIsInvalid(false)
            e.currentTarget.blur()
          }
        }}
      />
    </div>
  )
}

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
      {buffs.map((b) => {
        const hasValue = b.active && b.valueOptions?.length
        const currentValue = formatDisplayValue(b.value, b.valueOptions)

        return (
          <div
            key={b.key}
            className={`buff-chip ${b.active ? 'active' : ''} ${hasValue ? 'with-value' : ''}`}
          >
            <button
              type="button"
              className="buff-chip-toggle"
              onClick={b.onToggle}
            >
              {b.label}
            </button>
            {hasValue && (
              <BuffChipValueInput key={`${b.key}-${currentValue}`} buff={b} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default BuffChipGroup
