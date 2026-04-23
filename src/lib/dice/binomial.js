// Binomial probability helpers and distribution builders.

// P(X = k) for X ~ Binomial(n, p).
export const binomialProbability = (n, k, p) => {
  if (k > n) return 0
  if (p === 0) return k === 0 ? 1 : 0
  if (p === 1) return k === n ? 1 : 0

  let coefficient = 1
  for (let i = 0; i < k; i++) {
    coefficient *= (n - i) / (i + 1)
  }

  return coefficient * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

// Build a distribution array of { [xKey]: x, probability, cumulative } rows
// where probability is a percentage (0..100) and cumulative is clamped to 100.
//
// `probabilityFn(x)` returns the probability mass at value x (0..1).
// Iterates x from `min` to `max` inclusive. Cumulative is computed across the
// full range (so values omitted from the visible window still contribute).
export const buildDistribution = ({
  min = 0,
  max,
  probabilityFn,
  xKey = 'x',
  visibleMin = min
}) => {
  const data = []
  let cumulative = 0
  for (let x = min; x <= max; x++) {
    const p = probabilityFn(x)
    cumulative += p * 100
    const clampedCumulative = Math.min(cumulative, 100)
    if (x >= visibleMin) {
      data.push({
        [xKey]: x,
        probability: p * 100,
        cumulative: clampedCumulative
      })
    }
  }
  return data
}
