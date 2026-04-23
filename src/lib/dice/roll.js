// Pure D6 rolling helpers for the Dice Roller page.
// No React, no DOM. Math.random is the only side effect.

export const DICE_FACES = [1, 2, 3, 4, 5, 6]

// Unicode "die face" glyphs, indexed by face value (1..6).
export const DIE_GLYPHS = {
  1: '\u2680',
  2: '\u2681',
  3: '\u2682',
  4: '\u2683',
  5: '\u2684',
  6: '\u2685',
}

// Roll a single D6 (returns 1..6).
export function rollD6() {
  return Math.floor(Math.random() * 6) + 1
}

// Roll `count` D6 and return an array of face values.
export function rollD6s(count) {
  const safeCount = Math.max(0, Math.floor(count) || 0)
  const out = new Array(safeCount)
  for (let i = 0; i < safeCount; i++) out[i] = rollD6()
  return out
}

// Given an existing roll array, replace any die whose face is in
// `faceValuesToReroll` (a Set or array of numbers) with a fresh roll.
// Returns a new array; does not mutate the input.
export function rerollFaces(rolls, faceValuesToReroll) {
  const set =
    faceValuesToReroll instanceof Set
      ? faceValuesToReroll
      : new Set(faceValuesToReroll)
  return rolls.map((face) => (set.has(face) ? rollD6() : face))
}

// Count occurrences of each face value (1..6) in a roll array.
// Returns an object like { 1: 3, 2: 0, 3: 1, 4: 2, 5: 0, 6: 4 }.
export function countFaces(rolls) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  for (const face of rolls) {
    if (counts[face] !== undefined) counts[face]++
  }
  return counts
}
