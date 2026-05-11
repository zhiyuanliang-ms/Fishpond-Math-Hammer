// Dropdown option lists for dice-related selects.

export const toHitOptions = [
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' }
]

export const toWoundOptions = [
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' }
]

export const antiOptions = [
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' }
]

export const rerollOptions = [
  { value: 'no-reroll', label: 'No Reroll' },
  { value: 'reroll-one', label: 'Reroll Ones' },
  { value: 'reroll-fail', label: 'Reroll Fails' },
  { value: 'reroll-non-critical', label: 'Reroll Non-Critical' }
]

export const fnpOptions = [
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' }
]

// Armor save options. 7+ means the target cannot make any save roll
// (every save attempt automatically fails).
export const saveOptions = [
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' },
  { value: '7', label: '7+' }
]

export const critOptions = [
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' }
]

export const saveRerollOptions = [
  { value: 'no-reroll', label: 'No Reroll' },
  { value: 'reroll-one', label: 'Reroll One' }
]

// SUSTAINED HITS values shared by the Attack Simulator and the Wound Success
// Calculator. Fixed integers (1/2/3) generate that many extra hits per crit;
// 'D3' rolls a D3 each crit (mean 2, variance 2/3).
export const sustainedOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: 'D3', label: 'D3' }
]

// Mean number of extra hits added per critical hit for a sustained value.
export const sustainedMean = (value) => {
  if (value === 'D3') return 2
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

// Variance of the per-crit extra-hits roll. Fixed values are deterministic
// (variance 0); D3 has variance E[X²] - E[X]² = (1+4+9)/3 - 4 = 2/3.
export const sustainedVariance = (value) => {
  if (value === 'D3') return 2 / 3
  return 0
}

// Maximum possible extra hits per crit (used for upper-bound caps).
export const sustainedMax = (value) => {
  if (value === 'D3') return 3
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}
