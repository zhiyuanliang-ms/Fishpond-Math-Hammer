import { useEffect, useState } from 'react'

// Numeric input that allows transient empty / partial drafts during typing,
// so deleting the only digit on a phone keypad doesn't snap the field back to
// the fallback value before the user can type the replacement digit.
//
// Behaviour:
//   - Mirrors `value` from props as a string.
//   - While focused, accepts empty input and any digits without committing.
//   - On a valid integer keystroke, commits via onChange immediately.
//   - On blur, if the draft is empty or invalid, falls back to `fallback`
//     (clamped to [min, max]) and commits.
function IntInput({ value, onChange, min, max, fallback, ...rest }) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  // Keep draft in sync when the parent value changes from outside (e.g.
  // duplicating a profile, importing a scenario), but don't clobber the
  // user's in-progress typing.
  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const clamp = (n) => {
    if (typeof min === 'number' && n < min) return min
    if (typeof max === 'number' && n > max) return max
    return n
  }

  const handleChange = (e) => {
    const raw = e.target.value
    if (raw === '') {
      setDraft('') // allow transient empty
      return
    }
    if (!/^\d+$/.test(raw)) return // ignore non-digit input (e.g. "-", "e")
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return
    const c = clamp(n)
    // Normalize the displayed draft (strips leading zeros, applies clamp)
    // so "01" becomes "1" and "999" becomes the max value.
    setDraft(String(c))
    onChange(c)
  }

  const handleBlur = () => {
    setFocused(false)
    const n = parseInt(draft, 10)
    if (!Number.isFinite(n)) {
      const fb = clamp(fallback)
      setDraft(String(fb))
      onChange(fb)
    } else {
      const c = clamp(n)
      setDraft(String(c))
      if (c !== n) onChange(c)
    }
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
      {...rest}
    />
  )
}

export default IntInput
