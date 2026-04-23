import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

// Shared probability-distribution chart.
// Renders a bar of `probability` plus an overlaid cumulative-% line, with
// the consistent dark theme + amber/blue palette used across the app.
//
// Props:
//   data: [{ [xKey]: number, probability: number, cumulative: number }]
//   xKey: which field to use for the X axis (e.g. 'wounds', 'kills')
//   title: chart title shown above the plot
//   height: chart height in px (default 250)
//   xInterval: forwarded to <XAxis interval=...> for sparse labelling
//   chartKey: forwarded to inner ResponsiveContainer/ComposedChart `key` prop
//             so the chart fully re-mounts on each calculation
//   footer: optional node rendered under the chart
function DistributionChart({
  data,
  xKey,
  title,
  height = 250,
  xInterval = 0,
  chartKey,
  footer
}) {
  return (
    <div className="chart-container">
      {title && <h2>{title}</h2>}
      <ResponsiveContainer width="100%" height={height} key={chartKey}>
        <ComposedChart data={data} key={chartKey}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4a4a4a" />
          <XAxis
            dataKey={xKey}
            stroke="#d0d0d0"
            interval={xInterval}
            allowDecimals={false}
          />
          <YAxis
            stroke="#d0d0d0"
            yAxisId="left"
            label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            stroke="#a0a0a0"
            yAxisId="right"
            orientation="right"
            label={{ value: 'Cumulative (%)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              background: '#3a3a3a',
              border: '1px solid #fbbf24',
              borderRadius: '4px'
            }}
            labelStyle={{ color: '#fbbf24' }}
            formatter={(value, name) => {
              if (name === 'probability') {
                return [value.toFixed(2) + '%', 'Probability']
              } else if (name === 'cumulative') {
                return [value.toFixed(1) + '%', 'Cumulative']
              }
              return value
            }}
          />
          <Bar dataKey="probability" yAxisId="left" fill="#fbbf24">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill="#fbbf24" />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {footer}
    </div>
  )
}

export default DistributionChart
