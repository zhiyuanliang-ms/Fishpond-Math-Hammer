// Stats panel that lays out a row of StatCards using the shared `result-stats`
// grid. Use as a child of CalculatorLayout's `result` panel.
function StatGrid({ children }) {
  return <div className="result-stats">{children}</div>
}

export default StatGrid
