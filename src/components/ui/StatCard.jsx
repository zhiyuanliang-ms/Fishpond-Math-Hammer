// Reusable result tile used by every calculator. Provides the consistent
// label + big amber value + (optional) spread / interval rows.
//
// Props:
//   label: top label text
//   value: main value (string or number, already formatted)
//   valueSuffix: appended to the value (e.g. '%')
//   stdDev, ciLow, ciHigh: optional dispersion stats. Strings/numbers — formatted
//                          by the caller. ciSuffix appended to interval bounds.
//   stdDevLabel: label for the ± row. Defaults to σ (spread of outcomes);
//                pass 'SE' when stdDev is the standard error of an estimate.
//   rangeLabel:  label for the interval row. Defaults to '95% range' (where
//                ~95% of outcomes fall); pass '95% CI' only for a confidence
//                interval of an estimate, such as a simulated wipe chance.
function StatCard({
  label,
  value,
  valueSuffix = '',
  stdDev,
  ciLow,
  ciHigh,
  ciSuffix = '',
  stdDevLabel = 'σ',
  rangeLabel = '95% range',
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {valueSuffix}
      </div>
      {stdDev !== undefined && stdDev !== null && (
        <div className="stat-range">
          {stdDevLabel}: ±{stdDev}
          {ciSuffix}
        </div>
      )}
      {ciLow !== undefined && ciLow !== null && ciHigh !== undefined && ciHigh !== null && (
        <div className="stat-range">
          {rangeLabel} [{ciLow}
          {ciSuffix}, {ciHigh}
          {ciSuffix}]
        </div>
      )}
    </div>
  )
}

export default StatCard
