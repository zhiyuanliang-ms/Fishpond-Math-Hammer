import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OVAL_BASE_SIZES_MM } from '../../config/board'
import { createMissionPlan, getMissionPlanTotals, hasMissionPlan } from '../../config/missionPlanning11e'

const PLAN_KEY = 'macroBattleplan11e:missionPlan'
const legacyExport = () => ({
  schema: 'fishpond-mathhammer-battleplan-11e/v1',
  setup: { mine: 'take-and-hold', theirs: 'take-and-hold', layout: 'A' },
  bases: [{ x: 10, y: 15, rotation: 30, diameterMm: 32, shape: 'round' }],
  drawings: [{ kind: 'line', color: '#ffffff', strokeWidth: 2, points: [1, 2, 3, 4] }],
  scoreboard: {
    playerName: 'Alice',
    opponentName: 'Bob',
    scores: { player: { 1: 13, 2: '' }, opponent: { 1: 9 } },
  },
})

describe('11e mission plan persistence and board compatibility', () => {
  let store
  let values

  beforeEach(async () => {
    vi.resetModules()
    values = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    })
    store = (await import('../board11eStore')).useBoard11eStore
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('adds the 150x95 mm oval preset and preserves its dimensions through export/import', () => {
    const preset = OVAL_BASE_SIZES_MM.find(
      (base) => base.widthMm === 150 && base.heightMm === 95,
    )
    expect(preset).toEqual({ widthMm: 150, heightMm: 95, label: '150×95' })

    store.getState().addOvalBase(preset.widthMm, preset.heightMm)
    const dimensions = { shape: 'oval', diameterMm: 150, widthMm: 150, heightMm: 95 }
    expect(store.getState().pieces).toEqual([expect.objectContaining(dimensions)])

    const exported = JSON.parse(store.getState().exportBoard())
    expect(exported.bases).toEqual([expect.objectContaining(dimensions)])
    store.getState().clearBoard()
    expect(store.getState().importBoard(exported)).toBe(true)
    expect(store.getState().pieces).toEqual([expect.objectContaining(dimensions)])
  })

  it('imports old v1 boards without losing names, recorded scores, bases, or drawings', () => {
    expect(store.getState().importBoard(legacyExport())).toBe(true)
    const state = store.getState()
    expect(state.scoreboard.playerName).toBe('Alice')
    expect(state.scoreboard.opponentName).toBe('Bob')
    expect(state.scoreboard.scores.player).toEqual({ 1: 13, 2: '', 3: '', 4: '', 5: '' })
    expect(state.scoreboard.scores.opponent[1]).toBe(9)
    expect(state.pieces).toHaveLength(1)
    expect(state.drawings).toHaveLength(1)
    expect(hasMissionPlan(state.missionPlan)).toBe(false)
    expect(state.exportBoard()).toContain('"missionPlan"')
  })

  it('round-trips both plans through the existing export schema without mixing actual scores', () => {
    store.getState().importBoard(legacyExport())
    const plan = createMissionPlan()
    plan.primary.player[2] = { command: 12, duringRound: 16, endGame: 5 }
    plan.primary.opponent[5] = { command: 0, duringRound: '', endGame: 15 }
    plan.secondary.player['no-prisoners'] = { status: 'included', target: 4 }
    plan.secondary.player.assassination = { status: 'included', target: 2 }
    plan.secondary.player.plunder = { status: 'included', target: '' }
    plan.secondary.opponent.beacon = { status: 'excluded', target: 3 }
    plan.secondary.opponent.cleanse = { status: 'included', target: 0 }
    store.getState().setMissionPlan(plan)
    const exported = JSON.parse(store.getState().exportBoard())
    expect(exported.schema).toBe('fishpond-mathhammer-battleplan-11e/v1')
    expect(exported.missionPlan).toEqual(plan)
    expect(exported.scoreboard.scores.player[1]).toBe(13)

    store.getState().setMissionPlan(createMissionPlan())
    expect(store.getState().importBoard(exported)).toBe(true)
    expect(store.getState().missionPlan).toEqual(plan)
    expect(JSON.parse(values.get(PLAN_KEY))).toEqual(plan)
  })

  it('rehydrates the plan from browser storage', async () => {
    const plan = createMissionPlan()
    plan.primary.player[1] = { command: 4, duringRound: 20, endGame: 2 }
    plan.primary.opponent[5] = { command: '', duringRound: 0, endGame: 12 }
    plan.secondary.player.beacon = { status: 'included', target: 2 }
    plan.secondary.opponent.assassination = { status: 'included', target: 1 }
    plan.secondary.opponent.plunder = { status: 'included', target: '' }
    store.getState().setMissionPlan(plan)
    vi.resetModules()
    const restored = (await import('../board11eStore')).useBoard11eStore
    expect(restored.getState().missionPlan).toEqual(plan)
  })

  it('migrates single-score primary rounds from old exports and browser storage', async () => {
    const oldPlan = {
      primary: { player: { 1: 12, 2: 0 }, opponent: { 5: 20 } },
      secondary: { player: { beacon: { status: 'included', target: 5 } } },
    }
    expect(store.getState().importBoard({ ...legacyExport(), missionPlan: oldPlan })).toBe(true)
    const migrated = store.getState().missionPlan
    expect(migrated.primary.player[1]).toEqual({ command: '', duringRound: 12, endGame: '' })
    expect(migrated.primary.player[2]).toEqual({ command: '', duringRound: 0, endGame: '' })
    expect(migrated.primary.opponent[5]).toEqual({ command: '', duringRound: 20, endGame: '' })
    expect(migrated.secondary.player.beacon.target).toBe(5)
    expect(migrated.secondary.opponent.beacon.target).toBe('')
    expect(getMissionPlanTotals(migrated, 'opponent').primary).toBe(20)
    values.set(PLAN_KEY, JSON.stringify(oldPlan))
    vi.resetModules()
    const restored = (await import('../board11eStore')).useBoard11eStore
    expect(restored.getState().missionPlan).toEqual(migrated)
  })

  it('normalizes manual numeric input updates without changing the other player or recorded scores', () => {
    store.getState().importBoard(legacyExport())
    const originalOpponent = store.getState().missionPlan.secondary.opponent
    const originalScoreboard = store.getState().scoreboard
    for (const [raw, expected] of [['2', 2], ['', ''], ['0', 0], ['9', 5], ['-1', 0]]) {
      store.getState().setMissionPlan((plan) => ({
        ...plan,
        secondary: {
          ...plan.secondary,
          player: {
            ...plan.secondary.player,
            assassination: { status: 'included', target: raw },
          },
        },
      }))

      expect(store.getState().missionPlan.secondary.player.assassination.target).toBe(expected)
      expect(JSON.parse(values.get(PLAN_KEY)).secondary.player.assassination.target).toBe(expected)
      expect(store.getState().missionPlan.secondary.opponent).toEqual(originalOpponent)
      expect(store.getState().scoreboard).toEqual(originalScoreboard)
    }
  })

  it('does not carry a previous plan into an older imported file', () => {
    const plan = createMissionPlan()
    plan.secondary.player.beacon.status = 'included'
    store.getState().setMissionPlan(plan)
    store.getState().importBoard(legacyExport())
    expect(store.getState().missionPlan).toEqual(createMissionPlan())
  })

  it('preserves targets on layout changes and clears only changed primary missions', () => {
    store.getState().importBoard(legacyExport())
    const plan = createMissionPlan()
    plan.primary.player[2].duringRound = 12
    plan.primary.opponent[3].endGame = 8
    plan.secondary.player.beacon.status = 'included'
    store.getState().setMissionPlan(plan)
    const scores = store.getState().scoreboard
    store.getState().setSetup({ layout: 'B' })
    expect(store.getState().missionPlan).toEqual(plan)
    store.getState().setSetup({ theirs: 'purge-the-foe' })
    expect(store.getState().missionPlan.primary).toEqual(createMissionPlan().primary)
    expect(store.getState().missionPlan.secondary).toEqual(plan.secondary)
    expect(store.getState().scoreboard).toEqual(scores)
    expect(JSON.parse(values.get(PLAN_KEY))).toEqual(store.getState().missionPlan)
  })

  it('clearing the map leaves mission plans and recorded scores alone', () => {
    store.getState().importBoard(legacyExport())
    const plan = createMissionPlan()
    plan.primary.player[2].command = 10
    store.getState().setMissionPlan(plan)
    store.getState().clearBoard()
    expect(store.getState().pieces).toEqual([])
    expect(store.getState().drawings).toEqual([])
    expect(store.getState().missionPlan).toEqual(plan)
    expect(store.getState().scoreboard.scores.player[1]).toBe(13)
  })

  it('clears the new storage key together with the existing score data', () => {
    store.getState().importBoard(legacyExport())
    expect(values.has(PLAN_KEY)).toBe(true)
    store.getState().clearAllStorage()
    expect(values.has(PLAN_KEY)).toBe(false)
    expect(values.has('macroBattleplan11e:scoreboard')).toBe(false)
    expect(values.has('macroBattleplan11e:setup')).toBe(false)
    expect(store.getState().missionPlan).toEqual(createMissionPlan())
    expect(store.getState().scoreboard.playerName).toBe('You')
  })

  it('reports storage failures while keeping the current plan exportable, then clears the warning on recovery', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem = () => { throw new Error('Storage unavailable') }
    const plan = createMissionPlan()
    plan.secondary.player.beacon.status = 'included'
    store.getState().setMissionPlan(plan)
    expect(warning).toHaveBeenCalled()
    expect(store.getState().missionPlanStorageError).toContain('Export the board')
    expect(JSON.parse(store.getState().exportBoard()).missionPlan).toEqual(plan)
    localStorage.setItem = (key, value) => values.set(key, value)
    store.getState().setMissionPlan(plan)
    expect(store.getState().missionPlanStorageError).toBeNull()
  })

  it('logs corrupt saved JSON and starts safely instead of crashing', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    values.set(PLAN_KEY, '{not valid JSON')
    vi.resetModules()
    const restored = (await import('../board11eStore')).useBoard11eStore
    expect(warning).toHaveBeenCalled()
    expect(restored.getState().missionPlan).toEqual(createMissionPlan())
  })

  it('rejects an unrelated import without altering the current plan', () => {
    const plan = createMissionPlan()
    plan.primary.player[2].duringRound = 9
    store.getState().setMissionPlan(plan)
    expect(store.getState().importBoard({ schema: 'unknown', missionPlan: createMissionPlan() })).toBe(false)
    expect(store.getState().missionPlan).toEqual(plan)
  })

  it('round-trips a base max move through export/import and drops invalid values', () => {
    store.getState().addBase(32)
    const id = store.getState().selectedIds[0]
    store.getState().commitPieceUpdate(id, { maxMoveIn: 12 })
    const exported = JSON.parse(store.getState().exportBoard())
    expect(exported.bases[0].maxMoveIn).toBe(12)

    exported.bases.push({ ...exported.bases[0], maxMoveIn: -1 })
    expect(store.getState().importBoard(exported)).toBe(true)
    const [kept, dropped] = store.getState().pieces
    expect(kept.maxMoveIn).toBe(12)
    expect(dropped).not.toHaveProperty('maxMoveIn')
  })
})
