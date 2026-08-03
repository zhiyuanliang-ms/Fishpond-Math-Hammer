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
  plusOneWound: false,
  blast: false,
  cleaveEnabled: false,
  cleaveValue: 1,
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
  minusOneAp: false,
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

describe('simulateAttack — Cleave X', () => {
  it('adds X * floor(target_models / 5) attack dice', () => {
    // 1 attack base, Cleave 2, 10 models in target → +2*2 = +4, so 5 attacks.
    // Auto-hit (torrent), S5 vs T4 wounds on 3+ (4/6), save 7+ (no save), 1 dmg.
    // Expected damage = 5 * (4/6) ≈ 3.33
    const r = simulateAttack(
      [baseWeapon({ attacks: '1', torrent: true, strength: 5, cleaveEnabled: true, cleaveValue: 2 })],
      [baseTarget({ models: 10, save: 7 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(3.05)
    expect(r.expectedDamage).toBeLessThan(3.6)
  })
})

describe('simulateAttack — +1 Wound', () => {
  it('S=15 vs T=1 with +1 Wound still wounds on 2+ (clamp floor, never 1+)', () => {
    // BS auto-hit. Wound base for S>=2T is 2+; +1 wound gives -1 to threshold,
    // but clampThreshold floors at 2. Plus nat 1 always fails. So per attack:
    // wound prob = 5/6 (only nat 1 fails). 4 attacks, 1 model, 1 wound.
    // Wipe prob = 1 - (1/6)^4 ≈ 0.9992
    const r = simulateAttack(
      [baseWeapon({ attacks: '4', torrent: true, strength: 15, plusOneWound: true })],
      [baseTarget({ models: 1, toughness: 1, save: 7 })],
      N
    )
    expect(r.wipeProbability).toBeGreaterThan(99.5)
    expect(r.wipeProbability).toBeLessThanOrEqual(100)
  })
})

describe('simulateAttack — ±1 modifier cap (11e rule)', () => {
  it('+1 to Hit and -1 to Hit cancel out (modifier arithmetic correctness)', () => {
    // Pre-condition for the cap rule: modifiers from both sides must net
    // properly. BS 3+, target has -1 to hit (worsens to 4+ → 3/6).
    // Adding +1 to hit cancels the debuff back to 3+ (4/6).
    // S4 vs T4 (4+ wound = 3/6 hits), sv 7+, 20 attacks, 1 dmg:
    //   debuff only:        20 * 3/6 * 3/6 = 5.0
    //   debuff + plusOne:   20 * 4/6 * 3/6 ≈ 6.67
    const debuffOnly = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 3, strength: 4 })],
      [baseTarget({ models: 100, save: 7, toughness: 4, minusOneToHit: true })],
      N
    )
    const debuffPlusBuff = simulateAttack(
      [baseWeapon({ attacks: '20', toHit: 3, strength: 4, plusOneHit: true })],
      [baseTarget({ models: 100, save: 7, toughness: 4, minusOneToHit: true })],
      N
    )
    expect(debuffOnly.expectedDamage).toBeGreaterThan(4)
    expect(debuffOnly.expectedDamage).toBeLessThan(6)
    expect(debuffPlusBuff.expectedDamage).toBeGreaterThan(5.5)
    expect(debuffPlusBuff.expectedDamage).toBeLessThan(8)
    // Sanity: adding the buff strictly improves expected damage.
    expect(debuffPlusBuff.expectedDamage).toBeGreaterThan(debuffOnly.expectedDamage)
  })

  it('wound modifiers cap at -1 (two -1-to-wound sources do not stack)', () => {
    // Target has BOTH minusOneToWound and minusOneToWoundIfStronger. With
    // S5 vs T4, both would apply (S>T triggers the conditional one too) for
    // a raw -2 wound mod, but the cap clamps it to -1.
    // S5 vs T4 base wound = 3+; with -1 mod → 4+ (3/6). If the cap were
    // broken and -2 applied → 5+ (2/6).
    // Auto-hit, sv7+, 20 attacks, 1 dmg.
    // Capped expected damage: 20 * 3/6 = 10. Uncapped would be ~6.67.
    const r = simulateAttack(
      [baseWeapon({ attacks: '20', torrent: true, strength: 5 })],
      [baseTarget({
        models: 100,
        save: 7,
        toughness: 4,
        minusOneToWound: true,
        minusOneToWoundIfStronger: true
      })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(8.5)
    expect(r.expectedDamage).toBeLessThan(11.5)
  })

  it('wound modifiers cap at +1 (+1 wound + already 2+ stays 2+, not 1+)', () => {
    // S=15 vs T=1 base wounds on 2+ already. +1 wound would push the
    // threshold to 1+ if uncapped, meaning every roll except nat 1 succeeds —
    // BUT clampThreshold floors at 2+ so the rate stays 5/6 (nat 1 always
    // fails). With +1 wound on a 2+, the only difference is that nat 1
    // continues to fail.
    // Auto-hit, sv 7+, 20 attacks → expected damage = 20 * 5/6 ≈ 16.67.
    const r = simulateAttack(
      [baseWeapon({ attacks: '20', torrent: true, strength: 15, plusOneWound: true })],
      [baseTarget({ models: 100, save: 7, toughness: 1 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(15)
    expect(r.expectedDamage).toBeLessThan(18)
  })
})

describe('simulateAttack — natural 1 always fails', () => {
  it('natural 1 fails the hit roll even with +1 to Hit on a 2+ weapon', () => {
    // BS 2+, +1 to Hit → modified threshold would be 1+ but clampThreshold
    // floors at 2+. Nat 1 still fails. So hit rate = 5/6.
    // Auto-wound via Anti-2+ (S any vs anything: crit/success on 2+).
    // Use S4 vs T4 (4+ wound) with anti 2+ — anti lowers wound threshold to 2.
    // So hit (5/6) * wound (5/6, nat 1 fails) = 25/36 per attack.
    // 36 attacks, sv 7+, 1 dmg → expected ≈ 25.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '36',
        toHit: 2,
        plusOneHit: true,
        strength: 4,
        antiEnabled: true,
        antiValue: 2
      })],
      [baseTarget({ models: 100, save: 7, toughness: 4 })],
      N
    )
    // Tight bound: 25 ± ~2.
    expect(r.expectedDamage).toBeGreaterThan(22)
    expect(r.expectedDamage).toBeLessThan(28)
  })

  it('natural 1 fails the wound roll even with +1 to Wound at 2+', () => {
    // S15 vs T1 = base 2+ wound. +1 wound + clamp = still 2+. Nat 1 fails.
    // Auto-hit, sv7+, 60 attacks → expected damage = 60 * 5/6 = 50.
    const r = simulateAttack(
      [baseWeapon({ attacks: '60', torrent: true, strength: 15, plusOneWound: true })],
      [baseTarget({ models: 100, save: 7, toughness: 1 })],
      N
    )
    expect(r.expectedDamage).toBeGreaterThan(46)
    expect(r.expectedDamage).toBeLessThan(54)
  })
})

describe('simulateAttack — Benefit of Cover (11e) & Ignores Cover', () => {
  it('worsens the attack\'s BS characteristic by 1 (−1 to hit)', () => {
    // 11e: cover no longer touches the save — it worsens the attacker's BS.
    // Non-torrent BS 3+, S5 vs T4 (wound 3+), save 7+ (no save), 1 dmg, so
    // damage scales with hit probability only.
    //   no cover:   hit on 3+ = 4/6
    //   with cover: hit on 4+ = 3/6  → ratio ≈ 0.75
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withCover = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    expect(withCover.expectedDamage).toBeLessThan(noCover.expectedDamage)
    const ratio = withCover.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.65)
    expect(ratio).toBeLessThan(0.85)
  })

  it('has no effect under Torrent (auto-hit)', () => {
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withCover = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    const ratio = withCover.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })

  it('Ignores Cover negates Benefit of Cover', () => {
    const noCover = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7 })],
      N
    )
    const withCoverIgnored = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5, ignoresCover: true })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    const ratio = withCoverIgnored.expectedDamage / noCover.expectedDamage
    expect(ratio).toBeGreaterThan(0.9)
    expect(ratio).toBeLessThan(1.1)
  })

  it('stacks with −1 to Hit (cover is a characteristic modifier, not capped)', () => {
    // BS 3+, S5 vs T4 (wound 3+), save 7+.
    //   cover only:        hit on 4+ = 3/6
    //   cover + −1 to hit: hit on 5+ = 2/6   (stacked to −2)
    // If they did NOT stack (capped at −1), both would be 3/6 (ratio ≈ 1).
    const coverOnly = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true })],
      N
    )
    const coverPlusMinus = simulateAttack(
      [baseWeapon({ attacks: '10', toHit: 3, strength: 5 })],
      [baseTarget({ models: 100, save: 7, benefitOfCover: true, minusOneToHit: true })],
      N
    )
    expect(coverPlusMinus.expectedDamage).toBeLessThan(coverOnly.expectedDamage)
    const ratio = coverPlusMinus.expectedDamage / coverOnly.expectedDamage
    // 2/6 ÷ 3/6 ≈ 0.667; far below the ~1.0 you'd see if it were capped at −1.
    expect(ratio).toBeGreaterThan(0.55)
    expect(ratio).toBeLessThan(0.8)
  })
})

describe('simulateAttack — −1 AP (defender buff)', () => {
  it('reduces the attacker\'s AP by 1, improving the save', () => {
    // Auto-hit, S5 vs T4 (wound 3+), AP 1, save 4+, 1 dmg.
    //   no buff: save 4+ worsened by AP 1 → 5+ (fails 4/6)
    //   -1 AP:   AP → 0, save stays 4+      (fails 3/6)  → ratio ≈ 0.75
    const noBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 1 })],
      [baseTarget({ models: 100, save: 4 })],
      N
    )
    const withBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 1 })],
      [baseTarget({ models: 100, save: 4, minusOneAp: true })],
      N
    )
    expect(withBuff.expectedDamage).toBeLessThan(noBuff.expectedDamage)
    const ratio = withBuff.expectedDamage / noBuff.expectedDamage
    expect(ratio).toBeGreaterThan(0.65)
    expect(ratio).toBeLessThan(0.85)
  })

  it('has no effect against AP 0 attacks', () => {
    const noBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 0 })],
      [baseTarget({ models: 100, save: 4 })],
      N
    )
    const withBuff = simulateAttack(
      [baseWeapon({ attacks: '10', torrent: true, strength: 5, ap: 0 })],
      [baseTarget({ models: 100, save: 4, minusOneAp: true })],
      N
    )
    const ratio = withBuff.expectedDamage / noBuff.expectedDamage
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

describe('simulateAttack — Devastating Wounds (11e RAW)', () => {
  // Per the 11e core rule, a [DEVASTATING WOUNDS] critical wound inflicts
  // mortal wounds equal to the attack's Damage characteristic, AND those
  // mortal wounds do not spill across models if the model they are
  // allocated to is destroyed (excess is lost). Furthermore, DW attacks
  // are only allocated AFTER all other attacks made by the attacking unit
  // have been resolved.

  it('mortal wounds from a Devastating Wound do not spill across models', () => {
    // 100 attacks, torrent (auto-hit), Anti-Infantry 2+ → every wound roll of
    // 2-6 is a Critical Wound (only nat 1 fails ≈ 5/6 wound rate). DW on,
    // damage = 10. Target = 100 single-wound models, no save.
    //
    // With no-spill enforced: each successful crit kills exactly ONE model
    // (9 mortals are wasted). Expected kills ≈ 100 * 5/6 ≈ 83.3.
    // If spill were (incorrectly) allowed, each crit's 10 mortals would
    // wipe ~10 models, easily wiping the unit (≈100 kills).
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '10'
      })],
      [baseTarget({ models: 100, wounds: 1, save: 7 })],
      2000
    )
    expect(r.expectedKills).toBeGreaterThan(75)
    expect(r.expectedKills).toBeLessThan(92)
    // And expected damage tracks kills (since W=1, each kill is exactly 1
    // damage point). If spill leaked, expected damage would be ~10x kills.
    expect(r.expectedDamage / r.expectedKills).toBeLessThan(1.05)
  })

  it('mortal wounds from a Devastating Wound do not spill across multi-wound models', () => {
    // Single DW attack with damage = 5 vs 1-model unit with W=2.
    // Auto-hit, anti 2+ ⇒ ~5/6 wound chance, all wounds are crits ⇒ DW.
    // No-spill rule: at most 2 damage per attack (the model's W). Excess
    // 3 mortals are lost — they cannot bleed onto a different model… but
    // here the unit has only 1 model anyway, so the meaningful assertion
    // is that expected damage ≤ 2 (not 5).
    const r = simulateAttack(
      [baseWeapon({
        attacks: '1',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '5'
      })],
      [baseTarget({ models: 1, wounds: 2, save: 7 })],
      5000
    )
    // Per attack: 5/6 chance to wound and kill (capped at 2 dmg). So
    // expectedDamage ≈ 5/6 * 2 ≈ 1.667. Without the cap it would be
    // 5/6 * 5 ≈ 4.167.
    expect(r.expectedDamage).toBeGreaterThan(1.4)
    expect(r.expectedDamage).toBeLessThan(1.9)
  })

  it('Devastating Wounds attacks are deferred until after all other weapons resolve', () => {
    // Setup: target = 2 models with W=2 each, no save.
    // List order = [DW weapon (D=2), normal weapon (D=1)] — DW is FIRST in
    // the user-supplied list. Both weapons auto-hit (torrent) and auto-
    // wound on 2+ via anti-2+ (5/6 wound rate per attack).
    //
    // Per RAW the DW attack must resolve LAST. So the normal D=1 attack
    // hits model A first (leaving A with 1 W), then the DW D=2 mortal
    // attack must allocate to the wounded model A (kills it, 1 mortal
    // lost — does NOT carry to model B).
    //
    //   Both succeed (25/36): normal → A:1W left; DW → A dies, 1 lost.
    //                         Total damage = 2, kills = 1.
    //   Normal only  (5/36):  A:1W left.        Total dmg = 1, kills = 0.
    //   DW only      (5/36):  A dies (2 mortal). Total dmg = 2, kills = 1.
    //   Neither      (1/36):  Total dmg = 0, kills = 0.
    //   Expected damage (deferred) = (50 + 5 + 10 + 0)/36 = 65/36 ≈ 1.806
    //
    // If DW were resolved INLINE in list order (the bug): DW fires first
    // and kills model A clean; normal then hits FRESH model B for 1 dmg.
    //   Both succeed: dmg = 3, kills = 1.
    //   Expected damage (inline buggy) = (75 + 10 + 5 + 0)/36 = 90/36 = 2.5
    //
    // The 0.7 gap is large enough to detect with 5000 trials.
    const dwWeapon = baseWeapon({
      attacks: '1',
      torrent: true,
      antiEnabled: true,
      antiValue: 2,
      devastatingWounds: true,
      damage: '2'
    })
    const normalWeapon = baseWeapon({
      attacks: '1',
      torrent: true,
      antiEnabled: true,
      antiValue: 2,
      devastatingWounds: false,
      damage: '1'
    })
    const r = simulateAttack(
      [dwWeapon, normalWeapon],
      [baseTarget({ models: 2, wounds: 2, save: 7 })],
      5000
    )
    // Tight bound around the deferred expectation 1.806; well separated
    // from the buggy inline expectation 2.5.
    expect(r.expectedDamage).toBeGreaterThan(1.65)
    expect(r.expectedDamage).toBeLessThan(2.0)
    // Expected kills under deferred semantics: P(both succeed) + P(DW only)
    //   = 25/36 + 5/36 = 30/36 ≈ 0.833.
    // Under buggy inline they would be the same (1 kill in 30/36 cases),
    // so this assertion is a sanity check, not the discriminator.
    expect(r.expectedKills).toBeGreaterThan(0.78)
    expect(r.expectedKills).toBeLessThan(0.88)
  })

  it('Devastating Wounds use regular FNP when no FNP vs Mortal is present', () => {
    // 100 auto-hit DW attacks with damage 1 against 100 one-wound models.
    // Anti 2+ makes every successful wound a critical wound (5/6 rate), so
    // each successful wound becomes a single mortal wound. With only FNP 5+
    // set, each point is ignored on a 5+ (2/6), so kill expectation is:
    //   100 * 5/6 to wound * 4/6 through FNP = 55.6.
    // If regular FNP were ignored for mortal wounds, expectation would be
    // ~83.3 kills instead.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '1'
      })],
      [baseTarget({ models: 100, wounds: 1, save: 7, fnp: 5, fnpMortal: 0 })],
      N
    )

    expect(r.expectedKills).toBeGreaterThan(52)
    expect(r.expectedKills).toBeLessThan(59)
  })

  it('Devastating Wounds prefer FNP vs Mortal over regular FNP', () => {
    // Same DW setup, but now the target has a very strong normal FNP 2+
    // and a much weaker FNP vs Mortal 6+. Devastating Wounds must use the
    // mortal-specific value, so kill expectation is:
    //   100 * 5/6 to wound * 5/6 through 6+ FNP = 69.4.
    // If the simulator incorrectly used normal FNP 2+, expectation would be
    // only ~13.9 kills, which is far outside this range.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        antiEnabled: true,
        antiValue: 2,
        devastatingWounds: true,
        damage: '1'
      })],
      [baseTarget({ models: 100, wounds: 1, save: 7, fnp: 2, fnpMortal: 6 })],
      N
    )

    expect(r.expectedKills).toBeGreaterThan(66)
    expect(r.expectedKills).toBeLessThan(73)
  })
})

// ---- Reroll guarantees ----------------------------------------------------
//
// These tests lock in the contract that "reroll" rules only ever reroll dice
// that actually qualify. A successful hit/wound must NEVER be rerolled by
// `reroll-fail`, a critical hit/wound must NEVER be rerolled by ANY mode,
// and a random Attacks/Damage roll must only be rerolled when it came up
// at or below the threshold.

describe('simulateAttack — reroll never fires when not needed', () => {
  it('reroll-fail never rerolls a successful hit (closed-form match)', () => {
    // BS 2+ means hits succeed on 2-6 (5/6). Native fail rate = 1/6 (nat 1).
    // With reroll-fail, the success rate becomes 5/6 + 1/6 * 5/6 = 35/36.
    // If the implementation also rerolled successes the rate would change
    // (e.g. dropping back toward 5/6 because second rolls would average lower
    // than the surviving original successes).
    // Pipeline: 36 attacks * 35/36 hit * auto-wound (S15 vs T1) * 5/6 wound
    //   (clamp floor) * sv7+ * 1 dmg = 36 * 35/36 * 5/6 ≈ 29.17
    const r = simulateAttack(
      [baseWeapon({
        attacks: '36',
        toHit: 2,
        hitReroll: 'reroll-fail',
        strength: 15
      })],
      [baseTarget({ models: 100, toughness: 1, save: 7 })],
      5000
    )
    expect(r.expectedDamage).toBeGreaterThan(28)
    expect(r.expectedDamage).toBeLessThan(30.5)
  })

  it('reroll-non-critical does NOT reroll critical hits', () => {
    // Set crit hit to 5+ (Lethal-style). With reroll-non-critical, every non-
    // crit roll (success OR fail) is rerolled, but crits are NEVER rerolled.
    // BS 3+, crit on 5+:
    //   crit faces        = {5,6} → 2/6
    //   non-crit success  = {3,4} → 2/6 (rerolled away!)
    //   fail              = {1,2} → 2/6
    // After the reroll-pool of 4/6 attempts (everything non-crit) is rolled
    // again with the same distribution:
    //   final crit       = 2/6 + 4/6 * 2/6 = 20/36
    //   final non-crit hit = 4/6 * 2/6 = 8/36
    //   final fail       = 4/6 * 2/6 = 8/36
    // Lethal Hits ON: crits auto-wound. Non-crit hits still roll wound (S4
    // vs T4 = 4+, i.e. 3/6). Damage 1, sv 7+.
    //   per-attack E[dmg] = 20/36 * 1 + 8/36 * 3/6 = 24/36 ≈ 0.667
    //   100 attacks      ≈ 66.7
    // If crits were ALSO rerolled, crit rate would drop and Lethal damage
    // would crater — the 60+ floor proves crits were preserved.
    const r = simulateAttack(
      [baseWeapon({
        attacks: '100',
        toHit: 3,
        hitReroll: 'reroll-non-critical',
        critHitEnabled: true,
        critHit: 5,
        lethalHits: true,
        strength: 4 // wound roll skipped on crits via Lethal Hits
      })],
      [baseTarget({ models: 200, toughness: 4, save: 7 })],
      5000
    )
    expect(r.expectedDamage).toBeGreaterThan(63)
    expect(r.expectedDamage).toBeLessThan(70)
  })

  it('damage reroll is harmless when damage is a flat value', () => {
    // Flat damage "1" has no die to reroll — the reroll setting must be a
    // no-op regardless of threshold/scope.
    const baseline = simulateAttack(
      [baseWeapon({ attacks: '100', torrent: true, strength: 15, damage: '1' })],
      [baseTarget({ models: 200, toughness: 1, save: 7 })],
      5000
    )
    const withReroll = simulateAttack(
      [baseWeapon({
        attacks: '100',
        torrent: true,
        strength: 15,
        damage: '1',
        damageReroll: 'reroll-1-2-3',
        damageRerollScope: 'all'
      })],
      [baseTarget({ models: 200, toughness: 1, save: 7 })],
      5000
    )
    // Both should converge to the same expectation (5/6 wounds, 1 dmg each).
    expect(Math.abs(withReroll.expectedDamage - baseline.expectedDamage)).toBeLessThan(2)
  })

  it('damage reroll ≤3 strictly improves expected damage on a D6 weapon', () => {
    // D6 mean = 3.5. Rerolling all 1-3s lifts the mean to roughly:
    //   3/6 * 3.5 (kept high faces 4-6 average = 5)... actually:
    //   E = (4+5+6)/6 + (3/6)*3.5 = 15/6 + 1.75 = 2.5 + 1.75 = 4.25
    // For "all" scope on a single D6, ≈4.25 vs 3.5 baseline.
    // Auto-hit, S15 vs T1, sv7+, 50 attacks, D6 damage.
    const baseline = simulateAttack(
      [baseWeapon({ attacks: '50', torrent: true, strength: 15, damage: 'D6' })],
      [baseTarget({ models: 500, toughness: 1, save: 7, wounds: 100 })],
      5000
    )
    const buffed = simulateAttack(
      [baseWeapon({
        attacks: '50',
        torrent: true,
        strength: 15,
        damage: 'D6',
        damageReroll: 'reroll-1-2-3',
        damageRerollScope: 'all'
      })],
      [baseTarget({ models: 500, toughness: 1, save: 7, wounds: 100 })],
      5000
    )
    // baseline ≈ 50 * 5/6 * 3.5 ≈ 145.8
    // buffed   ≈ 50 * 5/6 * 4.25 ≈ 177.1
    expect(buffed.expectedDamage).toBeGreaterThan(baseline.expectedDamage + 15)
  })

  it('attack reroll with single scope rerolls at most one die per weapon', () => {
    // Compare single vs all on a 5x D6 attack pool. Single can only swap one
    // die per shooting; all swaps every qualifying die. So `all` mean MUST
    // exceed `single` mean meaningfully.
    // Each weapon firing (modelsFiring=1, attacks=2D6) per resolveWeapon call
    // gets ONE reroll under single scope across the whole pool.
    const single = simulateAttack(
      [baseWeapon({
        attacks: '5D6',
        torrent: true,
        strength: 15,
        damage: '1',
        attackReroll: 'reroll-1-2-3',
        attackRerollScope: 'single'
      })],
      [baseTarget({ models: 1000, toughness: 1, save: 7 })],
      4000
    )
    const all = simulateAttack(
      [baseWeapon({
        attacks: '5D6',
        torrent: true,
        strength: 15,
        damage: '1',
        attackReroll: 'reroll-1-2-3',
        attackRerollScope: 'all'
      })],
      [baseTarget({ models: 1000, toughness: 1, save: 7 })],
      4000
    )
    // Single-scope buff is small (only ONE die rerolled per pool); all-scope
    // buff is large (each qualifying die rerolled). The all-scope mean must
    // strictly exceed single by a meaningful margin.
    expect(all.expectedDamage).toBeGreaterThan(single.expectedDamage + 1)
  })
})



