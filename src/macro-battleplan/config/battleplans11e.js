// Official 11e battleplans: 5 Force Dispositions -> 15 pairings -> 3 terrain
// layouts each (A/B/C) = 45 maps. Both players declare a Force Disposition;
// the pairing decides each side's Primary Mission and the recommended layouts.
//
// Map images live in `public/battleplans-11e/` and are cropped to the exact
// play area (44" wide x 60" tall, portrait) — see tools/build_11e_map_assets.py.

import { PX_PER_INCH } from './board'

export const MAP_11E_W_IN = 44
export const MAP_11E_H_IN = 60

export const MAP_11E_W = MAP_11E_W_IN * PX_PER_INCH // 880
export const MAP_11E_H = MAP_11E_H_IN * PX_PER_INCH // 1200

// Fixed canvas larger than the board so pieces can be parked off-map.
export const STAGE_11E_W = 2000
export const STAGE_11E_H = 2400
export const MAP_11E_X = Math.round((STAGE_11E_W - MAP_11E_W) / 2)
export const MAP_11E_Y = Math.round((STAGE_11E_H - MAP_11E_H) / 2)

export const MAP_11E_ASSET_BASE = '/battleplans-11e'
export const PRIMARY_MISSION_ASSET_BASE = `${MAP_11E_ASSET_BASE}/primary-missions`

export const FORCE_DISPOSITIONS = [
  { id: 'take-and-hold', label: 'Take And Hold', color: '#157233' },
  { id: 'purge-the-foe', label: 'Purge The Foe', color: '#a03038' },
  { id: 'disruption', label: 'Disruption', color: '#1d6d92' },
  { id: 'reconnaissance', label: 'Reconnaissance', color: '#248780' },
  { id: 'priority-assets', label: 'Priority Assets', color: '#b09330' },
]

export const LAYOUTS = ['A', 'B', 'C']

export const DEFAULT_DISPOSITION = 'take-and-hold'

// `a` / `b` are [dispositionId, primaryMission] as printed on the page.
const BATTLEPLANS = [
  { map: 'map_01', layout: 'A', a: ['take-and-hold', 'Battlefield Dominance'], b: ['take-and-hold', 'Battlefield Dominance'] },
  { map: 'map_02', layout: 'B', a: ['take-and-hold', 'Battlefield Dominance'], b: ['take-and-hold', 'Battlefield Dominance'] },
  { map: 'map_03', layout: 'C', a: ['take-and-hold', 'Battlefield Dominance'], b: ['take-and-hold', 'Battlefield Dominance'] },
  { map: 'map_04', layout: 'A', a: ['take-and-hold', 'Immovable Object'], b: ['purge-the-foe', 'Unstoppable Force'] },
  { map: 'map_05', layout: 'B', a: ['take-and-hold', 'Immovable Object'], b: ['purge-the-foe', 'Unstoppable Force'] },
  { map: 'map_06', layout: 'C', a: ['take-and-hold', 'Immovable Object'], b: ['purge-the-foe', 'Unstoppable Force'] },
  { map: 'map_07', layout: 'A', a: ['take-and-hold', 'Determined Acquisition'], b: ['disruption', 'Death Trap'] },
  { map: 'map_08', layout: 'B', a: ['take-and-hold', 'Determined Acquisition'], b: ['disruption', 'Death Trap'] },
  { map: 'map_09', layout: 'C', a: ['take-and-hold', 'Determined Acquisition'], b: ['disruption', 'Death Trap'] },
  { map: 'map_10', layout: 'A', a: ['take-and-hold', 'Purge And Secure'], b: ['reconnaissance', 'Reconnaissance Sweep'] },
  { map: 'map_11', layout: 'B', a: ['take-and-hold', 'Purge And Secure'], b: ['reconnaissance', 'Reconnaissance Sweep'] },
  { map: 'map_12', layout: 'C', a: ['take-and-hold', 'Purge And Secure'], b: ['reconnaissance', 'Reconnaissance Sweep'] },
  { map: 'map_13', layout: 'A', a: ['take-and-hold', 'Inescapable Dominion'], b: ['priority-assets', 'Secure Asset'] },
  { map: 'map_14', layout: 'B', a: ['take-and-hold', 'Inescapable Dominion'], b: ['priority-assets', 'Secure Asset'] },
  { map: 'map_15', layout: 'C', a: ['take-and-hold', 'Inescapable Dominion'], b: ['priority-assets', 'Secure Asset'] },
  { map: 'map_16', layout: 'A', a: ['purge-the-foe', 'Meatgrinder'], b: ['purge-the-foe', 'Meatgrinder'] },
  { map: 'map_17', layout: 'B', a: ['purge-the-foe', 'Meatgrinder'], b: ['purge-the-foe', 'Meatgrinder'] },
  { map: 'map_18', layout: 'C', a: ['purge-the-foe', 'Meatgrinder'], b: ['purge-the-foe', 'Meatgrinder'] },
  { map: 'map_19', layout: 'A', a: ['purge-the-foe', 'Punishment'], b: ['disruption', 'Delaying Action'] },
  { map: 'map_20', layout: 'B', a: ['purge-the-foe', 'Punishment'], b: ['disruption', 'Delaying Action'] },
  { map: 'map_21', layout: 'C', a: ['purge-the-foe', 'Punishment'], b: ['disruption', 'Delaying Action'] },
  { map: 'map_22', layout: 'A', a: ['purge-the-foe', 'Consecrate'], b: ['reconnaissance', 'Triangulation'] },
  { map: 'map_23', layout: 'B', a: ['purge-the-foe', 'Consecrate'], b: ['reconnaissance', 'Triangulation'] },
  { map: 'map_24', layout: 'C', a: ['purge-the-foe', 'Consecrate'], b: ['reconnaissance', 'Triangulation'] },
  { map: 'map_25', layout: 'A', a: ['purge-the-foe', 'Destroyer\'s Wrath'], b: ['priority-assets', 'Vital Link'] },
  { map: 'map_26', layout: 'B', a: ['purge-the-foe', 'Destroyer\'s Wrath'], b: ['priority-assets', 'Vital Link'] },
  { map: 'map_27', layout: 'C', a: ['purge-the-foe', 'Destroyer\'s Wrath'], b: ['priority-assets', 'Vital Link'] },
  { map: 'map_28', layout: 'A', a: ['disruption', 'Outmanoeuvre'], b: ['disruption', 'Outmanoeuvre'] },
  { map: 'map_29', layout: 'B', a: ['disruption', 'Outmanoeuvre'], b: ['disruption', 'Outmanoeuvre'] },
  { map: 'map_30', layout: 'C', a: ['disruption', 'Outmanoeuvre'], b: ['disruption', 'Outmanoeuvre'] },
  { map: 'map_31', layout: 'A', a: ['disruption', 'Smoke And Mirrors'], b: ['reconnaissance', 'Surveil The Foe'] },
  { map: 'map_32', layout: 'B', a: ['disruption', 'Smoke And Mirrors'], b: ['reconnaissance', 'Surveil The Foe'] },
  { map: 'map_33', layout: 'C', a: ['disruption', 'Smoke And Mirrors'], b: ['reconnaissance', 'Surveil The Foe'] },
  { map: 'map_34', layout: 'A', a: ['disruption', 'Locate And Deny'], b: ['priority-assets', 'Extract Relic'] },
  { map: 'map_35', layout: 'B', a: ['disruption', 'Locate And Deny'], b: ['priority-assets', 'Extract Relic'] },
  { map: 'map_36', layout: 'C', a: ['disruption', 'Locate And Deny'], b: ['priority-assets', 'Extract Relic'] },
  { map: 'map_37', layout: 'A', a: ['reconnaissance', 'Gather Intel'], b: ['reconnaissance', 'Gather Intel'] },
  { map: 'map_38', layout: 'B', a: ['reconnaissance', 'Gather Intel'], b: ['reconnaissance', 'Gather Intel'] },
  { map: 'map_39', layout: 'C', a: ['reconnaissance', 'Gather Intel'], b: ['reconnaissance', 'Gather Intel'] },
  { map: 'map_40', layout: 'A', a: ['reconnaissance', 'Search And Scour'], b: ['priority-assets', 'Vanguard Operation'] },
  { map: 'map_41', layout: 'B', a: ['reconnaissance', 'Search And Scour'], b: ['priority-assets', 'Vanguard Operation'] },
  { map: 'map_42', layout: 'C', a: ['reconnaissance', 'Search And Scour'], b: ['priority-assets', 'Vanguard Operation'] },
  { map: 'map_43', layout: 'A', a: ['priority-assets', 'Sabotage'], b: ['priority-assets', 'Sabotage'] },
  { map: 'map_44', layout: 'B', a: ['priority-assets', 'Sabotage'], b: ['priority-assets', 'Sabotage'] },
  { map: 'map_45', layout: 'C', a: ['priority-assets', 'Sabotage'], b: ['priority-assets', 'Sabotage'] },
]

const DISPOSITION_BY_ID = new Map(FORCE_DISPOSITIONS.map((d) => [d.id, d]))

const MISSIONS_WITH_BACK = new Set([
  'Death Trap',
  'Extract Relic',
  'Gather Intel',
  'Locate And Deny',
  'Sabotage',
  'Secure Asset',
  'Smoke And Mirrors',
  'Surveil The Foe',
  'Triangulation',
  'Vanguard Operation',
  'Vital Link',
])

export const getDisposition = (id) => DISPOSITION_BY_ID.get(id) ?? null

export function getMissionCardImages(disposition, mission) {
  if (!getDisposition(disposition) || !mission) return null

  const slug = mission.toLowerCase().replaceAll("'", '').replaceAll(' ', '-')
  const base = `${PRIMARY_MISSION_ASSET_BASE}/${disposition}/${slug}`
  return {
    front: `${base}.png`,
    back: MISSIONS_WITH_BACK.has(mission) ? `${base}-back.png` : null,
  }
}

export const mapImageUrl = (map) => `${MAP_11E_ASSET_BASE}/${map}.webp`

// The original page map, with deployment shading and printed measurements.
export const mapReferenceUrl = (map) => `${MAP_11E_ASSET_BASE}/${map}_ref.webp`

/**
 * Resolve the official battleplan for a pairing. `mine` / `theirs` are
 * disposition ids; the printed page lists each pairing in a fixed order, so
 * the sides are swapped when needed to match the caller's point of view.
 */
export function findBattleplan(mine, theirs, layout) {
  const entry = BATTLEPLANS.find(
    (b) =>
      b.layout === layout &&
      ((b.a[0] === mine && b.b[0] === theirs) || (b.a[0] === theirs && b.b[0] === mine)),
  )
  if (!entry) return null

  const mineFirst = entry.a[0] === mine
  const [myDisp, myMission] = mineFirst ? entry.a : entry.b
  const [theirDisp, theirMission] = mineFirst ? entry.b : entry.a
  return {
    map: entry.map,
    layout: entry.layout,
    mine: { disposition: myDisp, mission: myMission },
    theirs: { disposition: theirDisp, mission: theirMission },
  }
}
