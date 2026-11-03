import { findBattleplan } from './battleplans11e'

export const MISSION_ROUNDS = [1, 2, 3, 4, 5]
export const SECONDARY_MISSION_VP_CAP = 5
export const MISSION_VP_CAP = 45
export const SECONDARY_MISSION_SOURCE = 'https://gdmissions.app/11th/secondary-missions'

export const MISSION_SIDES = [
  { id: 'player', battleplanKey: 'mine', label: 'Attacker' },
  { id: 'opponent', battleplanKey: 'theirs', label: 'Defender' },
]

export const PRIMARY_SCORE_PHASES = [
  { id: 'command', label: 'Command' },
  { id: 'duringRound', label: 'This round' },
  { id: 'endGame', label: 'End game' },
]

// Tactical scoring only; per-event awards include their card's 5 VP cap.
export const SECONDARY_MISSIONS = [
  ['a-grievous-blow', 'A Grievous Blow', [5]],
  ['a-tempting-target', 'A Tempting Target', [5]],
  ['assassination', 'Assassination', [5]],
  ['beacon', 'Beacon', [3, 5]],
  ['behind-enemy-lines', 'Behind Enemy Lines', [3, 5]],
  ['bring-it-down', 'Bring it Down', [5]],
  ['burden-of-trust', 'Burden of Trust', [2, 4, 5]],
  ['centre-ground', 'Centre Ground', [3, 5]],
  ['cleanse', 'Cleanse', [2, 5]],
  ['defend-stronghold', 'Defend Stronghold', [3, 5]],
  ['display-of-might', 'Display of Might', [2, 5]],
  ['engage-on-all-fronts', 'Engage on All Fronts', [3, 5]],
  ['forward-position', 'Forward Position', [5]],
  ['no-prisoners', 'No Prisoners', [2, 4, 5]],
  ['outflank', 'Outflank', [3, 5]],
  ['overwhelming-force', 'Overwhelming Force', [3, 5]],
  ['plunder', 'Plunder', [5]],
  ['secure-no-man-s-land', "Secure No Man's Land", [5]],
].map(([id, name, points]) => ({
  id,
  name,
  points,
  image: `/battleplans-11e/secondary-missions/${id}.png`,
  sourceUrl: `${SECONDARY_MISSION_SOURCE}/${id}-defender`,
}))

function normalizeTarget(raw, cap) {
  if (typeof raw !== 'number' && typeof raw !== 'string') return ''
  if (typeof raw === 'string' && raw.trim() === '') return ''
  const value = Number(raw)
  return Number.isFinite(value)
    ? Math.min(cap, Math.max(0, Math.trunc(value)))
    : ''
}

export const normalizePrimaryTarget = (raw) => normalizeTarget(raw, MISSION_VP_CAP)
export const normalizeSecondaryTarget = (raw) => normalizeTarget(raw, SECONDARY_MISSION_VP_CAP)

function normalizePrimaryRound(raw) {
  const staged = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
  return Object.fromEntries(
    PRIMARY_SCORE_PHASES.map(({ id }) => [
      id,
      normalizePrimaryTarget(staged ? raw[id] : undefined),
    ]),
  )
}

export const emptyPrimaryTargets = () =>
  Object.fromEntries(MISSION_ROUNDS.map((round) => [round, normalizePrimaryRound()]))

export function createMissionPlan() {
  return {
    primary: Object.fromEntries(MISSION_SIDES.map(({ id }) => [id, emptyPrimaryTargets()])),
    secondary: Object.fromEntries(
      MISSION_SIDES.map(({ id }) => [
        id,
        Object.fromEntries(
          SECONDARY_MISSIONS.map((mission) => [
            mission.id,
            { status: 'unassessed', target: '' },
          ]),
        ),
      ]),
    ),
  }
}

export function sanitizeMissionPlan(raw) {
  const plan = createMissionPlan()
  for (const { id: side } of MISSION_SIDES) {
    for (const round of MISSION_ROUNDS) {
      plan.primary[side][round] = normalizePrimaryRound(raw?.primary?.[side]?.[round])
    }
    for (const mission of SECONDARY_MISSIONS) {
      const entry = raw?.secondary?.[side]?.[mission.id]
      if (['included', 'excluded', 'unassessed'].includes(entry?.status)) {
        plan.secondary[side][mission.id].status = entry.status
      }
      if (entry?.target !== undefined) {
        plan.secondary[side][mission.id].target = normalizeSecondaryTarget(entry.target)
      }
    }
  }
  return plan
}

export function getMissionPlanTotals(plan, side) {
  const primaryRaw = MISSION_ROUNDS.reduce(
    (sum, round) => sum + Object.values(normalizePrimaryRound(plan.primary[side][round]))
      .reduce((roundSum, value) => roundSum + (value || 0), 0),
    0,
  )
  let secondaryRaw = 0
  let included = 0
  let excluded = 0
  for (const mission of SECONDARY_MISSIONS) {
    const entry = plan.secondary[side][mission.id]
    if (entry.status === 'included') {
      included += 1
      secondaryRaw += normalizeSecondaryTarget(entry.target) || 0
    } else if (entry.status === 'excluded') {
      excluded += 1
    }
  }
  const primary = Math.min(MISSION_VP_CAP, primaryRaw)
  const secondary = Math.min(MISSION_VP_CAP, secondaryRaw)
  return {
    primaryRaw,
    primary,
    secondaryRaw,
    secondary,
    included,
    excluded,
    unassessed: SECONDARY_MISSIONS.length - included - excluded,
    total: primary + secondary,
  }
}

export function hasPrimaryTargets(plan, side) {
  return MISSION_ROUNDS.some((round) =>
    Object.values(normalizePrimaryRound(plan?.primary?.[side]?.[round]))
      .some((value) => value !== ''),
  )
}

export function hasMissionPlan(plan) {
  return MISSION_SIDES.some(
    ({ id: side }) =>
      hasPrimaryTargets(plan, side) ||
      SECONDARY_MISSIONS.some((mission) => {
        const entry = plan.secondary[side][mission.id]
        return (
          entry.status !== 'unassessed' ||
          entry.target !== ''
        )
      }),
  )
}

export function getChangedPrimarySides(previousSetup, nextSetup) {
  const previous = findBattleplan(previousSetup.mine, previousSetup.theirs, previousSetup.layout)
  const next = findBattleplan(nextSetup.mine, nextSetup.theirs, nextSetup.layout)
  if (!previous || !next) throw new Error('Cannot compare primary missions for an invalid battleplan.')
  return MISSION_SIDES.filter(
    ({ battleplanKey }) =>
      previous[battleplanKey].mission !== next[battleplanKey].mission,
  ).map(({ id }) => id)
}
