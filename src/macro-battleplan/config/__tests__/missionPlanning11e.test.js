import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  createMissionPlan,
  getChangedPrimarySides,
  getMissionPlanTotals,
  hasMissionPlan,
  hasPrimaryTargets,
  MISSION_ROUNDS,
  normalizePrimaryTarget,
  normalizeSecondaryTarget,
  PRIMARY_SCORE_PHASES,
  sanitizeMissionPlan,
  SECONDARY_MISSIONS,
} from '../missionPlanning11e'

describe('11e Tactical secondary catalogue', () => {
  it('contains all 18 unique cards with readable full-size local PNGs', () => {
    expect(SECONDARY_MISSIONS).toHaveLength(18)
    expect(new Set(SECONDARY_MISSIONS.map((mission) => mission.id)).size).toBe(18)
    for (const mission of SECONDARY_MISSIONS) {
      const image = readFileSync(new URL(`../../../../public${mission.image}`, import.meta.url))
      expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(image.readUInt32BE(16)).toBe(1653)
      expect(image.readUInt32BE(20)).toBe(2833)
      expect(mission.sourceUrl).toBe(
        `https://gdmissions.app/11th/secondary-missions/${mission.id}-defender`,
      )
      expect(mission.points.every((value) => Number.isInteger(value) && value > 0 && value <= 5)).toBe(true)
    }
  })

  it('uses Tactical tiers rather than the different Fixed awards', () => {
    const tiers = Object.fromEntries(SECONDARY_MISSIONS.map((mission) => [mission.id, mission.points]))
    expect(tiers['a-grievous-blow']).toEqual([5])
    expect(tiers.assassination).toEqual([5])
    expect(tiers['bring-it-down']).toEqual([5])
    expect(tiers['engage-on-all-fronts']).toEqual([3, 5])
    expect(tiers['burden-of-trust']).toEqual([2, 4, 5])
    expect(tiers['no-prisoners']).toEqual([2, 4, 5])
    expect(tiers['overwhelming-force']).toEqual([3, 5])
    expect(tiers['defend-stronghold']).toEqual([3, 5])
  })
})

describe('mission planning state', () => {
  it('creates independent blank plans for both players', () => {
    const plan = createMissionPlan()
    expect(hasMissionPlan(plan)).toBe(false)
    expect(getMissionPlanTotals(plan, 'player')).toMatchObject({
      primary: 0, secondary: 0, included: 0, excluded: 0, unassessed: 18, total: 0,
    })
    for (const side of ['player', 'opponent']) {
      for (const mission of SECONDARY_MISSIONS) {
        expect(plan.secondary[side][mission.id].target).toBe('')
      }
    }
    plan.primary.player[1].command = 10
    plan.secondary.player.beacon.status = 'included'
    expect(plan.primary.opponent[1]).toEqual({ command: '', duringRound: '', endGame: '' })
    expect(plan.primary.player[2].command).toBe('')
    expect(plan.secondary.opponent.beacon.status).toBe('unassessed')
    expect(createMissionPlan().secondary.player.beacon.status).toBe('unassessed')
  })

  it.each([
    ['', ''],
    ['  ', ''],
    [undefined, ''],
    [null, ''],
    [false, ''],
    ['invalid', ''],
    [Infinity, ''],
    [NaN, ''],
    ['12', 12],
    ['0', 0],
    [-3, 0],
    [4.9, 4],
    [20, 20],
    [45, 45],
    [60, 45],
  ])('normalizes primary target %s to %s', (raw, expected) => {
    expect(normalizePrimaryTarget(raw)).toBe(expected)
  })

  it.each([
    ['', ''],
    ['  ', ''],
    [undefined, ''],
    [null, ''],
    [false, ''],
    ['invalid', ''],
    [Infinity, ''],
    [NaN, ''],
    ['0', 0],
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', 4],
    ['5', 5],
    [0, 0],
    [-3, 0],
    [4.9, 4],
    [6, 5],
  ])('normalizes manually entered secondary target %s to %s', (raw, expected) => {
    expect(normalizeSecondaryTarget(raw)).toBe(expected)
  })

  it('whitelists valid cards and verdicts while preserving manual scores without notes or secondary rounds', () => {
    const plan = sanitizeMissionPlan({
      primary: {
        player: {
          1: { duringRound: '9' },
          2: { duringRound: 30 },
          3: { duringRound: -1 },
          4: { duringRound: 'bad' },
          6: { duringRound: 12 },
        },
      },
      secondary: {
        player: {
          'no-prisoners': { status: 'included', target: 4, round: 3, notes: 'Not stored' },
          assassination: { status: 'included', target: 3 },
          beacon: { status: 'invalid', target: 3 },
          unknown: { status: 'included', target: 100 },
        },
      },
      notes: 'Not stored',
    })
    expect(plan.primary.player).toEqual({
      1: { command: '', duringRound: 9, endGame: '' },
      2: { command: '', duringRound: 30, endGame: '' },
      3: { command: '', duringRound: 0, endGame: '' },
      4: { command: '', duringRound: '', endGame: '' },
      5: { command: '', duringRound: '', endGame: '' },
    })
    expect(plan.secondary.player['no-prisoners']).toEqual({ status: 'included', target: 4 })
    expect(plan.secondary.player.assassination).toEqual({ status: 'included', target: 3 })
    expect(plan.secondary.player.beacon).toEqual({ status: 'unassessed', target: 3 })
    expect(plan.secondary.player.unknown).toBeUndefined()
    expect(Object.keys(plan)).toEqual(['primary', 'secondary'])
    expect(sanitizeMissionPlan(null)).toEqual(createMissionPlan())
  })

  it('normalizes all three primary stages without imposing a 15 VP round limit', () => {
    const plan = sanitizeMissionPlan({
      primary: {
        player: {
          1: { command: '12', duringRound: '20', endGame: '3', unknown: 9 },
          2: { command: -1, duringRound: '', endGame: 'invalid' },
        },
        opponent: { 5: { duringRound: 18 } },
      },
    })

    expect(plan.primary.player[1]).toEqual({ command: 12, duringRound: 20, endGame: 3 })
    expect(plan.primary.player[2]).toEqual({ command: 0, duringRound: '', endGame: '' })
    expect(plan.primary.opponent[5]).toEqual({ command: '', duringRound: 18, endGame: '' })
    expect(getMissionPlanTotals(plan, 'player')).toMatchObject({ primaryRaw: 35, primary: 35 })
    plan.primary.player[2].endGame = 20
    expect(getMissionPlanTotals(plan, 'player')).toMatchObject({ primaryRaw: 55, primary: 45 })
    expect(getMissionPlanTotals(plan, 'opponent')).toMatchObject({ primaryRaw: 18, primary: 18 })
  })

  it.each(PRIMARY_SCORE_PHASES)('recognizes zeroes in $id without treating blank rounds as entered scores', ({ id }) => {
    const plan = createMissionPlan()
    expect(hasPrimaryTargets(plan, 'player')).toBe(false)
    plan.primary.player[3][id] = 0

    expect(hasPrimaryTargets(plan, 'player')).toBe(true)
    expect(hasPrimaryTargets(plan, 'opponent')).toBe(false)
    expect(hasMissionPlan(plan)).toBe(true)
    plan.primary.player[3][id] = ''
    expect(hasPrimaryTargets(plan, 'player')).toBe(false)
    expect(hasMissionPlan(plan)).toBe(false)
  })

  it('does not assign a default score when a secondary is included', () => {
    const plan = createMissionPlan()
    for (const mission of SECONDARY_MISSIONS) {
      plan.secondary.player[mission.id].status = 'included'
    }

    expect(getMissionPlanTotals(plan, 'player')).toMatchObject({
      included: 18, secondaryRaw: 0, secondary: 0,
    })
    expect(sanitizeMissionPlan(plan)).toEqual(plan)
  })

  it('accepts manually entered scores outside the printed tiers for every card and both players', () => {
    const raw = createMissionPlan()
    for (const mission of SECONDARY_MISSIONS) {
      raw.secondary.player[mission.id] = { status: 'included', target: '1' }
      raw.secondary.opponent[mission.id] = { status: 'included', target: '2' }
    }
    const plan = sanitizeMissionPlan(raw)

    for (const mission of SECONDARY_MISSIONS) {
      expect(plan.secondary.player[mission.id]).toEqual({ status: 'included', target: 1 })
      expect(plan.secondary.opponent[mission.id]).toEqual({ status: 'included', target: 2 })
    }
    expect(getMissionPlanTotals(plan, 'player').secondaryRaw).toBe(18)
    expect(getMissionPlanTotals(plan, 'opponent').secondaryRaw).toBe(36)
  })

  it.each(['', 0])('preserves a cleared or zero score (%s) and keeps totals numeric', (target) => {
    const raw = createMissionPlan()
    raw.secondary.player.assassination = { status: 'included', target }
    raw.secondary.player.beacon = { status: 'included', target: '2' }
    const plan = sanitizeMissionPlan(raw)

    expect(plan.secondary.player.assassination.target).toBe(target)
    expect(getMissionPlanTotals(plan, 'player')).toMatchObject({
      secondaryRaw: 2, secondary: 2, included: 2, total: 2,
    })
  })

  it('counts only included targets and keeps the two players independent', () => {
    const plan = createMissionPlan()
    plan.primary.player[2].duringRound = 12
    plan.secondary.player['no-prisoners'] = { status: 'included', target: 4 }
    plan.secondary.player.beacon = { status: 'excluded', target: 5 }
    plan.secondary.opponent.beacon = { status: 'included', target: 3 }
    expect(getMissionPlanTotals(plan, 'player')).toEqual({
      primaryRaw: 12, primary: 12, secondaryRaw: 4, secondary: 4,
      included: 1, excluded: 1, unassessed: 16, total: 16,
    })
    expect(getMissionPlanTotals(plan, 'opponent')).toMatchObject({
      secondaryRaw: 3, included: 1, excluded: 0, total: 3,
    })
  })

  it('preserves the raw target pool while capping each source independently at 45 VP', () => {
    const plan = createMissionPlan()
    for (const round of MISSION_ROUNDS) plan.primary.player[round].duringRound = 15
    for (const mission of SECONDARY_MISSIONS) {
      plan.secondary.player[mission.id].status = 'included'
      plan.secondary.player[mission.id].target = 5
    }
    expect(getMissionPlanTotals(plan, 'player')).toEqual({
      primaryRaw: 75, primary: 45, secondaryRaw: 90, secondary: 45,
      included: 18, excluded: 0, unassessed: 0, total: 90,
    })
  })

  it('recognizes entered zeroes, exclusions, and changed unassessed targets as existing work', () => {
    const zero = createMissionPlan()
    zero.primary.player[1].command = 0
    expect(hasMissionPlan(zero)).toBe(true)
    const excluded = createMissionPlan()
    excluded.secondary.opponent.beacon.status = 'excluded'
    expect(hasMissionPlan(excluded)).toBe(true)
    const target = createMissionPlan()
    target.secondary.player.beacon.target = 3
    expect(hasMissionPlan(target)).toBe(true)
  })

  it('detects primary changes but not a change to layout alone', () => {
    const setup = { mine: 'take-and-hold', theirs: 'take-and-hold', layout: 'A' }
    expect(getChangedPrimarySides(setup, { ...setup, layout: 'C' })).toEqual([])
    expect(getChangedPrimarySides(setup, { ...setup, theirs: 'purge-the-foe' }))
      .toEqual(['player', 'opponent'])
    expect(() => getChangedPrimarySides(setup, { ...setup, mine: 'invalid' })).toThrow('invalid battleplan')
  })
})
