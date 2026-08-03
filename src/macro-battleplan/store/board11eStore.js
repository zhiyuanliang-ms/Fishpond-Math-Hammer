// State for the 11e battleplan board. Deliberately separate from the 10e
// store: the 11e board has no user-placed terrain, objectives or deployment
// zones (they are baked into the official map image), and its coordinates use
// the portrait 44x60" stage.

import { create } from 'zustand'
import { DEFAULT_DRAW_COLOR, PX_PER_INCH } from '../config/board'
import {
  MAP_11E_X,
  MAP_11E_Y,
  MAP_11E_W,
  MAP_11E_H,
  DEFAULT_DISPOSITION,
  LAYOUTS,
  getDisposition,
} from '../config/battleplans11e'

export const EXPORT_11E_SCHEMA = 'fishpond-mathhammer-battleplan-11e/v1'

const HISTORY_LIMIT = 3
const PASTE_OFFSET_PX = 18
const SETUP_STORAGE_KEY = 'macroBattleplan11e:setup'
const SCOREBOARD_STORAGE_KEY = 'macroBattleplan11e:scoreboard'

let clipboard = []

const newId = () => Math.random().toString(36).slice(2, 10)
const centerX = MAP_11E_X + MAP_11E_W / 2
const centerY = MAP_11E_Y + MAP_11E_H / 2
const lastOrNull = (ids) => (ids.length > 0 ? ids[ids.length - 1] : null)

const SCOREBOARD_ROUNDS = [1, 2, 3, 4, 5]
const emptyScoreboardRounds = () => ({ 1: '', 2: '', 3: '', 4: '', 5: '' })

const initialScoreboard = () => ({
  primaryName: '',
  playerName: 'You',
  opponentName: 'Opponent',
  scores: { player: emptyScoreboardRounds(), opponent: emptyScoreboardRounds() },
})

function sanitizeScoreboardRounds(raw) {
  const base = emptyScoreboardRounds()
  if (!raw || typeof raw !== 'object') return base
  for (const r of SCOREBOARD_ROUNDS) {
    const v = raw[r]
    if (typeof v === 'number' && Number.isFinite(v)) {
      base[r] = v
    } else if (typeof v === 'string' && v !== '') {
      const n = Number.parseInt(v, 10)
      base[r] = Number.isFinite(n) ? n : ''
    }
  }
  return base
}

function sanitizeScoreboard(raw) {
  const def = initialScoreboard()
  if (!raw || typeof raw !== 'object') return def
  return {
    primaryName: typeof raw.primaryName === 'string' ? raw.primaryName : def.primaryName,
    playerName: typeof raw.playerName === 'string' ? raw.playerName : def.playerName,
    opponentName: typeof raw.opponentName === 'string' ? raw.opponentName : def.opponentName,
    scores: {
      player: sanitizeScoreboardRounds(raw.scores?.player),
      opponent: sanitizeScoreboardRounds(raw.scores?.opponent),
    },
  }
}

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota / private-mode failures; the board stays usable.
  }
}

const sanitizeSetup = (raw) => ({
  mine: getDisposition(raw?.mine)?.id ?? DEFAULT_DISPOSITION,
  theirs: getDisposition(raw?.theirs)?.id ?? DEFAULT_DISPOSITION,
  layout: LAYOUTS.includes(raw?.layout) ? raw.layout : LAYOUTS[0],
})

// Exports store positions as inches from the top-left of the 44x60" board so
// the file stays readable and independent of the stage pixel layout.
const round3 = (n) => Math.round(n * 1000) / 1000
const xToIn = (px) => round3((px - MAP_11E_X) / PX_PER_INCH)
const yToIn = (px) => round3((px - MAP_11E_Y) / PX_PER_INCH)
const xToPx = (inches) => MAP_11E_X + inches * PX_PER_INCH
const yToPx = (inches) => MAP_11E_Y + inches * PX_PER_INCH

const pointsToIn = (points) =>
  points.map((v, i) => (i % 2 === 0 ? xToIn(v) : yToIn(v)))

const pointsToPx = (points) =>
  points.map((v, i) => (i % 2 === 0 ? xToPx(v) : yToPx(v)))

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export const useBoard11eStore = create((set, get) => {
  const pushHistory = () => {
    const s = get()
    const snap = { pieces: s.pieces, drawings: s.drawings, selectedIds: s.selectedIds }
    set({ history: [snap, ...s.history].slice(0, HISTORY_LIMIT) })
  }

  const addPiece = (piece) => {
    pushHistory()
    set((s) => ({
      pieces: [...s.pieces, piece],
      selectedIds: [piece.id],
      selectedId: piece.id,
    }))
  }

  return {
    pieces: [],
    selectedIds: [],
    selectedId: null,
    showMoveDistance: false,
    activeTool: 'cursor',
    drawings: [],
    drawColor: DEFAULT_DRAW_COLOR,
    history: [],
    setup: sanitizeSetup(readJson(SETUP_STORAGE_KEY)),
    scoreboard: sanitizeScoreboard(readJson(SCOREBOARD_STORAGE_KEY)),

    setSetup: (patch) =>
      set((s) => {
        const next = sanitizeSetup({ ...s.setup, ...patch })
        writeJson(SETUP_STORAGE_KEY, next)
        return { setup: next }
      }),

    setScoreboard: (updater) =>
      set((s) => {
        const next = typeof updater === 'function' ? updater(s.scoreboard) : updater
        const sanitized = sanitizeScoreboard(next)
        writeJson(SCOREBOARD_STORAGE_KEY, sanitized)
        return { scoreboard: sanitized }
      }),

    addBase: (diameterMm) =>
      addPiece({
        id: newId(),
        kind: 'base',
        x: centerX,
        y: centerY,
        rotation: 0,
        diameterMm,
        shape: 'round',
      }),

    addOvalBase: (widthMm, heightMm) =>
      addPiece({
        id: newId(),
        kind: 'base',
        x: centerX,
        y: centerY,
        rotation: 0,
        diameterMm: Math.max(widthMm, heightMm),
        shape: 'oval',
        widthMm,
        heightMm,
      }),

    addRectBase: (widthMm, heightMm) =>
      addPiece({
        id: newId(),
        kind: 'base',
        x: centerX,
        y: centerY,
        rotation: 0,
        diameterMm: Math.max(widthMm, heightMm),
        shape: 'rect',
        widthMm,
        heightMm,
      }),

    updatePiece: (id, patch) =>
      set((s) => ({
        pieces: s.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),

    commitPieceUpdate: (id, patch) => {
      pushHistory()
      set((s) => ({
        pieces: s.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }))
    },

    commitMoveSelected: (dx, dy) => {
      const s = get()
      if (s.selectedIds.length === 0 || (dx === 0 && dy === 0)) return
      const sel = new Set(s.selectedIds)
      pushHistory()
      set((st) => ({
        pieces: st.pieces.map((p) => (sel.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
      }))
    },

    rotateSelected: (delta) => {
      const s = get()
      if (s.selectedIds.length === 0) return
      const sel = new Set(s.selectedIds)
      pushHistory()
      set((st) => ({
        pieces: st.pieces.map((p) =>
          sel.has(p.id) ? { ...p, rotation: p.rotation + delta } : p,
        ),
      }))
    },

    deleteSelected: () => {
      const s = get()
      if (s.selectedIds.length === 0) return
      const sel = new Set(s.selectedIds)
      pushHistory()
      set((st) => ({
        pieces: st.pieces.filter((p) => !sel.has(p.id)),
        selectedIds: [],
        selectedId: null,
      }))
    },

    selectPiece: (id) => set({ selectedIds: id ? [id] : [], selectedId: id }),

    toggleSelection: (id) =>
      set((s) => {
        const has = s.selectedIds.includes(id)
        const next = has ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id]
        return { selectedIds: next, selectedId: lastOrNull(next) }
      }),

    selectMany: (ids) => set({ selectedIds: ids, selectedId: lastOrNull(ids) }),

    bringToFront: (id) =>
      set((s) => {
        const idx = s.pieces.findIndex((p) => p.id === id)
        if (idx < 0) return s
        const next = [...s.pieces]
        const [item] = next.splice(idx, 1)
        next.push(item)
        return { pieces: next }
      }),

    toggleShowMoveDistance: () => set((s) => ({ showMoveDistance: !s.showMoveDistance })),

    setActiveTool: (tool) =>
      set((s) => ({
        activeTool: tool,
        selectedIds: tool === 'cursor' ? s.selectedIds : [],
        selectedId: tool === 'cursor' ? s.selectedId : null,
      })),

    addDrawing: (d) => {
      pushHistory()
      set((s) => ({ drawings: [...s.drawings, { ...d, id: newId() }] }))
    },

    setDrawColor: (color) => set({ drawColor: color }),

    removeDrawing: (id) => {
      pushHistory()
      set((s) => ({ drawings: s.drawings.filter((d) => d.id !== id) }))
    },

    clearDrawings: () => {
      pushHistory()
      set({ drawings: [] })
    },

    clearBoard: () => {
      pushHistory()
      set({ pieces: [], selectedIds: [], selectedId: null, drawings: [] })
    },

    undo: () => {
      const s = get()
      if (s.history.length === 0) return
      const [prev, ...rest] = s.history
      set({
        pieces: prev.pieces,
        drawings: prev.drawings,
        selectedIds: prev.selectedIds,
        selectedId: lastOrNull(prev.selectedIds),
        history: rest,
      })
    },

    copySelected: () => {
      const s = get()
      if (s.selectedIds.length === 0) return
      const sel = new Set(s.selectedIds)
      clipboard = s.pieces.filter((p) => sel.has(p.id)).map((p) => ({ ...p }))
    },

    pasteCopied: () => {
      if (clipboard.length === 0) return
      pushHistory()
      const copies = clipboard.map((src) => ({
        ...src,
        id: newId(),
        x: src.x + PASTE_OFFSET_PX,
        y: src.y + PASTE_OFFSET_PX,
      }))
      clipboard = copies.map((c) => ({ ...c }))
      const ids = copies.map((c) => c.id)
      set((st) => ({
        pieces: [...st.pieces, ...copies],
        selectedIds: ids,
        selectedId: lastOrNull(ids),
      }))
    },

    clearAllStorage: () => {
      try {
        localStorage.removeItem(SETUP_STORAGE_KEY)
        localStorage.removeItem(SCOREBOARD_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      set({ scoreboard: initialScoreboard() })
    },

    exportBoard: () => {
      const s = get()
      return JSON.stringify(
        {
          schema: EXPORT_11E_SCHEMA,
          savedAt: Date.now(),
          board: { widthIn: MAP_11E_W / PX_PER_INCH, heightIn: MAP_11E_H / PX_PER_INCH },
          setup: s.setup,
          bases: s.pieces
            .filter((p) => p.kind === 'base')
            .map((p) => ({
              x: xToIn(p.x),
              y: yToIn(p.y),
              rotation: round3(p.rotation ?? 0),
              shape: p.shape ?? 'round',
              diameterMm: p.diameterMm,
              ...(p.widthMm ? { widthMm: p.widthMm } : {}),
              ...(p.heightMm ? { heightMm: p.heightMm } : {}),
              ...(p.color ? { color: p.color } : {}),
              ...(p.auraIn ? { auraIn: p.auraIn } : {}),
            })),
          drawings: s.drawings.map((d) => ({
            kind: d.kind,
            color: d.color,
            strokeWidth: d.strokeWidth,
            points: pointsToIn(d.points),
          })),
          scoreboard: s.scoreboard,
        },
        null,
        2,
      )
    },

    importBoard: (data) => {
      if (!data || typeof data !== 'object' || data.schema !== EXPORT_11E_SCHEMA) return false

      const pieces = (Array.isArray(data.bases) ? data.bases : [])
        .filter((b) => b && num(b.x) !== null && num(b.y) !== null && num(b.diameterMm) !== null)
        .map((b) => ({
          id: newId(),
          kind: 'base',
          x: xToPx(b.x),
          y: yToPx(b.y),
          rotation: num(b.rotation) ?? 0,
          shape: b.shape === 'oval' || b.shape === 'rect' ? b.shape : 'round',
          diameterMm: b.diameterMm,
          ...(num(b.widthMm) !== null ? { widthMm: b.widthMm } : {}),
          ...(num(b.heightMm) !== null ? { heightMm: b.heightMm } : {}),
          ...(typeof b.color === 'string' ? { color: b.color } : {}),
          ...(num(b.auraIn) !== null ? { auraIn: b.auraIn } : {}),
        }))

      const drawings = (Array.isArray(data.drawings) ? data.drawings : [])
        .filter((d) => d && Array.isArray(d.points) && d.points.length >= 4)
        .map((d) => ({
          id: newId(),
          kind: d.kind === 'line' ? 'line' : 'free',
          color: typeof d.color === 'string' ? d.color : DEFAULT_DRAW_COLOR,
          strokeWidth: num(d.strokeWidth) ?? 2.5,
          points: pointsToPx(d.points),
        }))

      const setup = sanitizeSetup(data.setup)
      const scoreboard = sanitizeScoreboard(data.scoreboard)
      writeJson(SETUP_STORAGE_KEY, setup)
      writeJson(SCOREBOARD_STORAGE_KEY, scoreboard)
      pushHistory()
      set({ pieces, drawings, selectedIds: [], selectedId: null, setup, scoreboard })
      return true
    },
  }
})
