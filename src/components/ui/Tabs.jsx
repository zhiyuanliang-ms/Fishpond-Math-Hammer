// A reusable tab strip. Visual style comes from the existing `tab-button`
// CSS classes shared via styles/tabs.css so all tab strips look identical.
//
// Props:
//   value: currently-selected tab value
//   onChange: (value) => void
//   tabs: [{ value, label }]
//   variant: extra modifier class on the wrapper, e.g. 'calculator-tabs'
//            or 'cheatsheet-tabs' — consumers can use this to apply
//            page-specific spacing while sharing button styles.
function Tabs({ value, onChange, tabs, variant }) {
  const wrapperClass = ['tabs', variant].filter(Boolean).join(' ')
  return (
    <div className={wrapperClass}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`tab-button ${value === tab.value ? 'active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
