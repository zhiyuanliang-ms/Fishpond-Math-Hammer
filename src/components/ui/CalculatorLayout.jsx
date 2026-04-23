// Shared two-column layout used by every calculator: a form on the left
// and a results panel on the right. Container class name matches the
// existing CSS (`wound-success-container`, `kill-probability-container`)
// so legacy media queries keep working.
//
// Props:
//   form: form ReactNode (rendered inside `.form-side`)
//   result: result ReactNode (rendered inside `.result-side`); falsy => hidden
//   className: extra wrapper class (defaults to 'wound-success-container')
function CalculatorLayout({ form, result, className = 'wound-success-container' }) {
  return (
    <div className={className}>
      <div className="form-side">{form}</div>
      {result && <div className="result-side">{result}</div>}
    </div>
  )
}

export default CalculatorLayout
