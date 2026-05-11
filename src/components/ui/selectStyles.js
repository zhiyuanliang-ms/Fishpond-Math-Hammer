// React-Select custom styles configuration shared across the app.
// Centralizes the dark theme + amber-accent look used by every form select.
//
// Heights are unified with the shared form controls (stat-cell inputs,
// toolbar-select, toolbar-button) at 34px so dropdowns and input boxes
// line up cleanly across the Attack Simulator and Dice Calculator pages.
const CONTROL_HEIGHT = 34

export const selectStyles = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: '#2a2a2a',
    borderColor: state.isFocused ? '#fbbf24' : '#4a4a4a',
    boxShadow: state.isFocused ? 'none' : 'none',
    minHeight: `${CONTROL_HEIGHT}px`,
    height: `${CONTROL_HEIGHT}px`,
    padding: '0 2px',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#fbbf24'
    }
  }),
  valueContainer: (baseStyles) => ({
    ...baseStyles,
    padding: '0 6px'
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: '#d0d0d0'
  }),
  menuList: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: '#2a2a2a'
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: state.isFocused ? '#3a3a3a' : '#2a2a2a',
    color: state.isSelected ? '#fbbf24' : '#d0d0d0',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#3a3a3a'
    }
  }),
  indicatorSeparator: (baseStyles) => ({
    ...baseStyles,
    backgroundColor: '#4a4a4a'
  }),
  dropdownIndicator: (baseStyles) => ({
    ...baseStyles,
    padding: '2px 4px',
    color: '#d0d0d0',
    '& svg': {
      width: '16px',
      height: '16px'
    }
  })
}

// Compact variant used for small inline buff selects (ANTI, FNP).
export const buffSelectStyles = {
  ...selectStyles,
  container: (baseStyles) => ({
    ...baseStyles,
    width: '70px'
  }),
  control: (baseStyles, state) => ({
    ...selectStyles.control(baseStyles, state),
    minHeight: `${CONTROL_HEIGHT}px`,
    height: `${CONTROL_HEIGHT}px`,
    padding: '0 2px'
  }),
  valueContainer: (baseStyles) => ({
    ...selectStyles.valueContainer(baseStyles),
    padding: '0 4px'
  }),
  singleValue: (baseStyles) => ({
    ...selectStyles.singleValue(baseStyles),
    fontSize: '13px',
    overflow: 'visible',
    textOverflow: 'clip',
    maxWidth: '100%'
  }),
  option: (baseStyles, state) => ({
    ...selectStyles.option(baseStyles, state),
    fontSize: '13px',
    padding: '4px 8px'
  }),
  dropdownIndicator: (baseStyles) => ({
    ...selectStyles.dropdownIndicator(baseStyles),
    padding: '2px',
    '& svg': {
      width: '14px',
      height: '14px'
    }
  })
}
