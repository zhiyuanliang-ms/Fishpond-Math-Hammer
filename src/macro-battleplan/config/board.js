// Domain constants for the 40K macro battleplan board.

export const PX_PER_INCH = 20
export const MM_PER_INCH = 25.4

// Standard 40K base sizes (mm).
export const BASE_SIZES_MM = [25, 28, 32, 40, 50, 60, 80, 100, 130, 160]

// Standard Citadel oval base sizes (mm).
export const OVAL_BASE_SIZES_MM = [
  { widthMm: 60, heightMm: 35, label: '60×35' },
  { widthMm: 75, heightMm: 42, label: '75×42' },
  { widthMm: 90, heightMm: 52, label: '90×52' },
  { widthMm: 105, heightMm: 70, label: '105×70' },
  { widthMm: 120, heightMm: 92, label: '120×92' },
  { widthMm: 170, heightMm: 105, label: '170×105' },
]

export const BASE_COLOR_PALETTE = [
  { name: 'White',        value: '#f5f5f5' },
  { name: 'Cream',        value: '#e8d8b0' },
  { name: 'Bone',         value: '#c8b88a' },
  { name: 'Sand',         value: '#a89370' },
  { name: 'Copper',       value: '#a45a3b' },
  { name: 'Bronze',       value: '#7a5a3a' },
  { name: 'Burnt Orange', value: '#c2570a' },
  { name: 'Crimson',      value: '#c43d3d' },
  { name: 'Burgundy',     value: '#7c1d1d' },
  { name: 'Wine',         value: '#5a1e3a' },
  { name: 'Plum',         value: '#6b3a6b' },
  { name: 'Mauve',        value: '#9d6b8d' },
  { name: 'Indigo',       value: '#4b3b7a' },
  { name: 'Navy',         value: '#1f2a4a' },
  { name: 'Slate Blue',   value: '#3b5b7a' },
  { name: 'Teal',         value: '#2c7a7b' },
  { name: 'Sea Green',    value: '#3d7a6b' },
  { name: 'Forest',       value: '#2e5d3a' },
  { name: 'Olive',        value: '#6b7d3a' },
  { name: 'Moss',         value: '#5a6b3a' },
]

export const DEFAULT_BASE_COLOR = BASE_COLOR_PALETTE[0].value

export const baseRadiusPx = (diameterMm) =>
  ((diameterMm / MM_PER_INCH) * PX_PER_INCH) / 2

// Five draw-tool colors used by the ruler/line/free draw overlay.
// Chosen to remain visible over the official map images and base colors.
// Green & red match GitHub's diff +/- so they read as "good / bad" markers.
export const DRAW_COLOR_PALETTE = [
  { name: 'Steel Blue', value: '#6b8caf' }, // 蓝灰 (default)
  { name: 'Diff Red',   value: '#f85149' }, // GitHub diff -
  { name: 'Diff Green', value: '#3fb950' }, // GitHub diff +
  { name: 'Gold',       value: '#e3b341' }, // saturated yellow
  { name: 'Pearl',      value: '#e6e1d3' }, // 灰白
]

export const DEFAULT_DRAW_COLOR = DRAW_COLOR_PALETTE[0].value
