import { InlineMath } from 'react-katex'

// Reusable result tile used by every calculator. Provides the consistent
// label + big amber value + (optional) std-dev / 95% CI rows.
//
// Props:
//   label: top label text
//   value: main value (string or number, already formatted)
//   valueSuffix: appended to the value (e.g. '%')
//   stdDev, ciLow, ciHigh: optional dispersion stats. Strings/numbers — formatted
//                          by the caller. ciSuffix appended to CI bounds.
function StatCard({ label, value, valueSuffix = '', stdDev, ciLow, ciHigh, ciSuffix = '' }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {valueSuffix}
      </div>
      {stdDev !== undefined && stdDev !== null && (
        <div className="stat-range">
          <InlineMath math="\sigma" />: ±{stdDev}
          {ciSuffix}
        </div>
      )}
      {ciLow !== undefined && ciLow !== null && ciHigh !== undefined && ciHigh !== null && (
        <div className="stat-range">
          95% CI [{ciLow}
          {ciSuffix}, {ciHigh}
          {ciSuffix}]
        </div>
      )}
    </div>
  )
}

export default StatCard
