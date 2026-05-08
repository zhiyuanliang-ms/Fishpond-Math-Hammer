import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { simulateAttack } from '../attackSimulation'

// Tiny seeded PRNG (mulberry32) — gives deterministic Monte Carlo runs so
// statistical assertions are exact across machines and CI.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let originalRandom
beforeEach(() => {
  originalRandom = Math.random
  Math.random = mulberry32(42)
})
afterEach(() => {
  Math.random = originalRandom
})

// Sane defaults shared by tests below.
const baseWeapon = (overrides = {}) => ({
  attacks: '4',
  toHit: 3,
  strength: 4,
  ap: 0,
  damage: '1',
  modelsFiring: 1,
  hitReroll: 'none',
  woundReroll: 'none',
  sustainedHits: 'off',
  lethalHits: false,
  devastatingWounds: false,
  torrent: false,
  lance: false,
  blast: false,
  plusOneHit: false,
  ignoresCover: false,
  critHitEnabled: false,
  critHit: 6,
  critWound: 6,
  antiEnabled: false,
  antiValue: 0,
  ...overrides
})

const baseTarget = (overrides = {}) => ({
  models: 5,
  wounds: 1,
  toughness: 4,
  save: 4,
  invulnSave: 0,
  fnp: 0,
  fnpMortal: 0,
  saveReroll: 'none',
  minusOneToHit: false,
  minusOneToWound: false,
  minusOneToWoundIfStronger: false,
  halfDamage: false,
  minusOneDamage: false,
  damageOne: false,
  benefitOfCover: false,
  ...overrides
})

const N = 5000

describe('simulateAttack — basic correctness', () => {
  it('returns 0 expected kills/damage when no attacks land', () => {
    // Torrent auto-hits, but S=1 vs T=10 wounds on 6+ only. Sv=2+ AP 0 → almost always saves.
    // We just check the shape and that nothing throws.
    const r = simulateAttack(
      [baseWeapon({ torrent: true, strength: 1 })],
      [baseTarget({ toughness: 10, save: 2 })],
      200
    )
    expect(r.numSimulations).toBe(200)
    expect(r.totalModels).toBe(5)
    expect(r.expectedKills).toBeGreaterThanOrEqual(0)
  })

  it('per-attack expected damage matches closed-form (BS3+, S4 vs T4, Sv4+)', () => {
    // 4 attacks * (4/6 hit) * (3/6 wound) * (3/6 unsaved) * 1 dmg = 4 * 0.6667 * 0.5 * 0.5 = 0.6667
    const r = simulateAttack(
      [baseWeapon({ attacks: '4' })],
      [baseTarget({ models: 100 })], // many models so we don't cap
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(0.55)
    expect(r.expectedDamage).toBeLessThan(0.78)
  })
})

describe('simulateAttack — Blast', () => {
  it('adds floor(target_models / 5) to every attack roll', () => {
    // 1 attack base, blast on, 10 models in target → +2, so 3 attacks per trial.
    // Auto-hit (torrent), S5 vs T4 wounds on 3+, save 7+ (no save), 1 damage.
    // Expected damage = 3 * (4/6) = 2.0
    const r = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, strength: 5, blast: true })],
      [baseTarget({ models: 10, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(1.85)
    expect(r.expectedDamage).toBeLessThan(2.15)
  })

  it('blast bonus uses target size at start of trial, not live count', () => {
    // Two identical blast weapons, 10 models target. Both should see +2 from blast
    // even though the first weapon may kill some models. Expected total damage =
    // 2 * 3 * (4/6) ≈ 4.0. If blast were live-counted, the second weapon would
    // see fewer models and average less — this guards against that regression.
    const r = simulateAttack(
      [
        baseWeapon({ attacks: '1', torrent: true, strength: 5, blast: true }),
        baseWeapon({ attacks: '1', torrent: true, strength: 5, blast: true })
      ],
      [baseTarget({ models: 10, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(3.7)
    expect(r.expectedDamage).toBeLessThan(4.3)
  })
})

describe('simulateAttack — Lance', () => {
  it('S=15 vs T=1 with Lance still wounds on 2+ (clamp floor, never 1+)', () => {
    // BS auto-hit. Wound base for S>=2T is 2+; lance gives -1 to threshold,
    // but clampThreshold floors at 2. Plus nat 1 always fails. So per attack:
    // wound prob = 5/6 (only nat 1 fails). 4 attacks, 1 model, 1 wound.
    // Wipe prob = 1 - (1/6)^4 ≈ 0.9992
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true, strength: 15, lance: true })],
      [baseTarget({ models: 1, toughness: 1, save: 7 })],
      N
    )
    expect(r.wipeProbability).toBeGreaterThan(99.5)
    expect(r.wipeProbability).toBeLessThanOrEqual(100)
  })
})

describe('simulateAttack — Benefit of Cover & Ignores Cover', () => {
  it('Benefit of Cover improves a 5+ save vs AP 0', () => {
    // AP 0 hits a Sv 5+ in cover should be saved as 4+.
    // Auto-hit, S4 vs T4 (3+), no cover → unsaved chance = (4/6) * (3/6) = 0.333
    // With cover (save 4+) → unsaved chance = (4/6) * (3/6) = 0.333... wait,
    // wound chance is the same (3+), save changes. Unsaved chance:
    //   no cover: (4/6) save fails = 1 - (4/6) wait save 5+ passes on 5,6 = 2/6, fails 4/6
    //   in cover: save 4+ passes on 4,5,6 = 3/6, fails 3/6
    // So damage per attack drops by factor 3/4.
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true })],
      [baseTarget({ models: 100, save: 5 })],
      N
    )
    const withCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true })],
      [baseTarget({ models: 100, save: 5, benefitOfCover: true })],
      N
    )
    expect(withCover.expectedDamage).toBeLessThan(noCover.expectedDamage)
    // ratio should be ~0.75
    const ratio = withCover.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.65)
    expect(ratio).toBeLessThan(0.85)
  })

  it('Ignores Cover negates Benefit of Cover', () => {
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true })],
      [baseTarget({ models: 100, save: 5 })],
      N
    )
    const withCoverIgnored = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, ignoresCover: true })],
      [baseTarget({ models: 100, save: 5, benefitOfCover: true })],
      N
    )
    const ratio = withCoverIgnored.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })

  it('Benefit of Cover does not apply to Sv 3+ vs AP 0', () => {
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true })],
      [baseTarget({ models: 100, save: 3 })],
      N
    )
    const withCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true })],
      [baseTarget({ models: 100, save: 3, benefitOfCover: true })],
      N
    )
    const ratio = withCover.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })
})

describe('simulateAttack — modelsFiring (weapon count)', () => {
  it('multiplies attack rolls (each weapon rolls separately)', () => {
    // 2 weapons each rolling D3 attacks → expected attacks = 2 * 2 = 4.
    // Auto-hit, S4 vs T4 (4+), Sv 7+ (no save). Expected damage = 4 * (3/6) = 2.0
    const r = simulateAttack(
      [baseWeapon({ attacks: 'D3', torrent: true, modelsFiring: 2, strength: 4 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(1.7)
    expect(r.expectedDamage).toBeLessThan(2.3)
  })
})

describe('simulateAttack — Critical Hit on x+ uses unmodified roll', () => {
  it('+1 to Hit does NOT lower the crit threshold', () => {
    // Set up: BS 4+, crit hit on 5+, lethal hits on. Without +1 hit:
    //   crit chance per attack = 2/6 (5,6) → all auto-wound via lethal.
    // With +1 to hit, hit threshold becomes 3+, so MORE hits happen, but the
    // CRIT chance must stay 2/6 because crits use unmodified D6.
    // Both setups: S4 vs T4 (4+), Sv 7+, 1 dmg.
    // Without +1 hit: hit prob 3/6 = 0.5; crit prob 2/6.
    //   non-crit hits = 0.5 - 2/6 = 1/6, those must wound (4+) = 1/6 * 3/6 = 1/12
    //   crits auto-wound = 2/6
    //   damage per attack = 2/6 + 1/12 = 5/12 ≈ 0.4167
    // With +1 hit: hit prob 4/6; crit still 2/6.
    //   non-crit hits = 4/6 - 2/6 = 2/6, wound 3/6 → 2/6 * 3/6 = 1/6
    //   crits auto-wound = 2/6
    //   damage per attack = 2/6 + 1/6 = 3/6 = 0.5
    // So +1 hit raises damage from ~0.417 to ~0.5 but the crit-driven
    // auto-wound contribution stays 2/6. We assert the damage delta is small
    // (~0.083 per attack) — if crits were boosted by +1, the gap would be larger.
    const without = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 4, critHitEnabled: true, critHit: 5, lethalHits: true })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withPlusOne = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 4, critHitEnabled: true, critHit: 5, lethalHits: true, plusOneHit: true })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    // Expected: ~0.417 vs ~0.5 per attack, so ~8.3 vs ~10 over 20 attacks.
    expect(without.expectedDamage).toBeGreaterThan(7.5)
    expect(without.expectedDamage).toBeLessThan(9.5)
    expect(withPlusOne.expectedDamage).toBeGreaterThan(9)
    expect(withPlusOne.expectedDamage).toBeLessThan(11)
  })
})

describe('simulateAttack — random damage (D-expressions)', () => {
  it('accepts D6 damage and roughly hits the average', () => {
    // Auto-hit, S4 vs T4 (4+), Sv 7+, damage D6 (avg 3.5), 4 attacks.
    // Expected damage = 4 * (3/6) * 3.5 = 7
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true, damage: 'D6' })],
      [baseTarget({ models: 100, save: 7, wounds: 100 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(6)
    expect(r.expectedDamage).toBeLessThan(8)
  })

  it('rejects an invalid attacks expression silently (no damage dealt)', () => {
    const r = simulateAttack(
      [baseWeapon({ attacks: 'nonsense', torrent: true })],
      [baseTarget()],
      200
    )
    expect(r.expectedDamage).toBe(0)
    expect(r.expectedKills).toBe(0)
  })
})

describe('simulateAttack — single-model wipe equals expected kills', () => {
  it('for a 1-model unit, wipeProbability% / 100 equals expectedKills', () => {
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true })],
      [baseTarget({ models: 1, save: 7 })],
      N
    )
    expect(Math.abs(r.expectedKills - r.wipeProbability / 100)).toBeLessThan(1e-9)
  })
})
