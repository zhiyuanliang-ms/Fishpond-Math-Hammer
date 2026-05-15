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
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' }
]

export const saveRerollOptions = [
  { value: 'no-reroll', label: 'No Reroll' },
  { value: 'reroll-one', label: 'Reroll One' }
]

// Reroll options for random Attacks / Damage dice. Only the "reroll 1-3s"
// threshold is exposed because it is the only one that yields a positive
// expected-value gain on a fair d6 (rerolling 1s or 1-2s is neutral or
// negative on average).
export const randomRerollOptions = [
  { value: 'no-reroll', label: 'No Reroll' },
  { value: 'reroll-1-2-3', label: 'Reroll ≤3' }
]

// Scope toggle shared by every reroll select in the Attack Simulator.
// 'all'    → every qualifying die in the rolling event gets one reroll
// 'single' → only one qualifying die (the lowest) is rerolled
export const rerollScopeOptions = [
  { value: 'all', label: 'All' },
  { value: 'single', label: 'One' }
]

// SUSTAINED HITS values shared by the Attack Simulator and the Wound Success
// Calculator. Single-digit fixed integers generate that many extra hits per
// crit; D3 and D6 roll that die each crit.
export const sustainedOptions = [
  ...Array.from({ length: 9 }, (_, index) => {
    const value = (index + 1).toString()
    return { value, label: value }
  }),
  { value: 'D3', label: 'D3' },
  { value: 'D6', label: 'D6' }
]

// Mean number of extra hits added per critical hit for a sustained value.
export const sustainedMean = (value) => {
  if (value === 'D3') return 2
  if (value === 'D6') return 3.5
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

// Variance of the per-crit extra-hits roll. Fixed values are deterministic
// (variance 0); D3 has variance 2/3 and D6 has variance 35/12.
export const sustainedVariance = (value) => {
  if (value === 'D3') return 2 / 3
  if (value === 'D6') return 35 / 12
  return 0
}

// Maximum possible extra hits per crit (used for upper-bound caps).
export const sustainedMax = (value) => {
  if (value === 'D3') return 3
  if (value === 'D6') return 6
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}
