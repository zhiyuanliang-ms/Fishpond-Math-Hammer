import Select from 'react-select'
import { selectStyles, buffSelectStyles } from './selectStyles'

// Thin wrapper around react-select that applies the app's shared styles
// and sensible defaults (no search box, consistent indicator look).
//
// Props:
//   variant: 'default' | 'buff'  (buff = compact inline style)
//   ...rest: any react-select prop (options, value, onChange, etc.)
function FormSelect({ variant = 'default', styles, isSearchable = false, ...rest }) {
  const baseStyles = variant === 'buff' ? buffSelectStyles : selectStyles
  return (
    <Select
      styles={styles ?? baseStyles}
      isSearchable={isSearchable}
      {...rest}
    />
  )
}

export default FormSelect
