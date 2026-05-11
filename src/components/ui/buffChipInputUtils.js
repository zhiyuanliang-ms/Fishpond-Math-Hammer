export const normalizeToken = (value) => value.toString().trim().toUpperCase().replace(/\s+/g, '')

export const sanitizeDraftValue = (value) => (value == null
  ? ''
  : value.toString().toUpperCase().replace(/\s+/g, '').slice(0, 2))

export const findMatchingValue = (draftValue, valueOptions) => {
  const normalizedDraft = normalizeToken(draftValue)
  if (!normalizedDraft) return null

  return valueOptions.find((opt) => {
    return normalizeToken(opt.value) === normalizedDraft || normalizeToken(opt.label) === normalizedDraft
  }) || null
}

export const formatDisplayValue = (value, valueOptions) => {
  const matchedOption = valueOptions ? findMatchingValue(value, valueOptions) : null
  return matchedOption ? matchedOption.label : sanitizeDraftValue(value)
}

export const getAllowedValuesLabel = (buff) => {
  if (buff.key === 'sustainedHits') return '1-9, D3, D6'
  return buff.valueOptions.map((opt) => opt.label).join(', ')
}