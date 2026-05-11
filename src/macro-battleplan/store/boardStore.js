import { create } from 'zustand'
import { MAP_X, MAP_Y, MAP_W, MAP_H, PX_PER_INCH, MM_PER_INCH, DEFAULT_DRAW_COLOR } from '../config/board'

export const EXPORT_SCHEMA = 'fishpond-mathhammer-macro-battleplan/v1'

const HISTORY_LIMIT = 3
let clipboard = []
const PASTE_OFFSET_PX = 18

const newId = () => Math.random().toString(36).slice(2, 10)

const centerX = MAP_X + MAP_W / 2
const centerY = MAP_Y + MAP_H / 2

const STORAGE_KEY = 'fishpond-mathhammer-macro-battleplan:boards'
// Legacy key from the standalone app; imported once for continuity.
const LEGACY_STORAGE_KEY = '40k-macro-battleplan:boards'

const lastOrNull = (ids) => (ids.length > 0 ? ids[ids.length - 1] : null)

function readSavedBoards() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((b) => b && typeof b.name === 'string' && Array.isArray(b.pieces))
      .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))
  } catch {
    return []
  }
}

function writeSavedBoards(boards) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
  } catch {
    // Ignore quota / serialization errors.
  }
}

export const useBoardStore = create((set, get) => {
  const pushHistory = () => {
    const s = get()
    const snap = {
      pieces: s.pieces,
      drawings: s.drawings,
      selectedIds: s.selectedIds,
    }
    const next = [snap, ...s.history].slice(0, HISTORY_LIMIT)
    set({ history: next })
  }

  return {
    pieces: [],
    selectedIds: [],
    selectedId: null,
    zCounter: 1,
    terrainLocked: false,
    showMoveDistance: false,
    savedBoards: readSavedBoards(),
    activeTool: 'cursor',
    drawings: [],
    drawColor: DEFAULT_DRAW_COLOR,
    history: [],

    addBase: (diameterMm) => {
      pushHistory()
      set((s) => {
        const piece = {
          id: newId(),
          kind: 'base',
          x: centerX,
          y: centerY,
          rotation: 0,
          diameterMm,
          shape: 'round',
        }
        return { pieces: [...s.pieces, piece], selectedIds: [piece.id], selectedId: piece.id }
      })
    },

    addOvalBase: (widthMm, heightMm) => {
      pushHistory()
      set((s) => {
        const piece = {
          id: newId(),
          kind: 'base',
          x: centerX,
          y: centerY,
          rotation: 0,
          diameterMm: Math.max(widthMm, heightMm),
          shape: 'oval',
          widthMm,
          heightMm,
        }
        return { pieces: [...s.pieces, piece], selectedIds: [piece.id], selectedId: piece.id }
      })
    },

    addObjective: () => {
      pushHistory()
      set((s) => {
        const piece = {
          id: newId(),
          kind: 'objective',
          x: centerX,
          y: centerY,
          rotation: 0,
          diameterMm: 40,
          controlRadiusIn: 3,
        }
        return { pieces: [...s.pieces, piece], selectedIds: [piece.id], selectedId: piece.id }
      })
    },

    addTerrain: (preset) => {
      pushHistory()
      set((s) => {
        const piece = {
          id: newId(),
          kind: 'terrain',
          x: centerX,
          y: centerY,
          rotation: 0,
          widthIn: preset.widthIn,
          heightIn: preset.heightIn,
          label: preset.label,
          shape: preset.shape,
          buildingLengthIn: preset.buildingLengthIn,
          buildingWidthIn: preset.buildingWidthIn,
          wallThicknessIn: preset.wallThicknessIn,
          mirrorX: preset.mirrorX,
          color: preset.color,
        }
        return { pieces: [...s.pieces, piece], selectedIds: [piece.id], selectedId: piece.id }
      })
    },

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
        pieces: st.pieces.map((p) =>
          sel.has(p.id) ? { ...p, x: p.x + dx, y: p.y + dy } : p,
        ),
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

    selectPiece: (id) =>
      set({
        selectedIds: id ? [id] : [],
        selectedId: id,
      }),

    toggleSelection: (id) =>
      set((s) => {
        const has = s.selectedIds.includes(id)
        const next = has ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id]
        return { selectedIds: next, selectedId: lastOrNull(next) }
      }),

    selectMany: (ids) =>
      set({
        selectedIds: ids,
        selectedId: lastOrNull(ids),
      }),

    bringToFront: (id) =>
      set((s) => {
        const idx = s.pieces.findIndex((p) => p.id === id)
        if (idx < 0) return s
        const next = [...s.pieces]
        const [item] = next.splice(idx, 1)
        next.push(item)
        return { pieces: next }
      }),

    toggleTerrainLocked: () =>
      set((s) => {
        const nextLocked = !s.terrainLocked
        let nextIds = s.selectedIds
        if (nextLocked) {
          nextIds = s.selectedIds.filter((id) => {
            const p = s.pieces.find((pp) => pp.id === id)
            return p?.kind === 'base'
          })
        }
        return {
          terrainLocked: nextLocked,
          selectedIds: nextIds,
          selectedId: lastOrNull(nextIds),
        }
      }),

    toggleShowMoveDistance: () =>
      set((s) => ({ showMoveDistance: !s.showMoveDistance })),

    clearBoard: () => {
      pushHistory()
      set({ pieces: [], selectedIds: [], selectedId: null, drawings: [] })
    },

    // Mirror all terrain & objective pieces by central (point) symmetry
    // around the map center. Each source piece is duplicated to the
    // opposite side: (x, y) -> (2*cx - x, 2*cy - y) with rotation +180°.
    // Bases (models) are intentionally not mirrored.
    mirrorScenery: () => {
      const s = get()
      const sources = s.pieces.filter(
        (p) => p.kind === 'terrain' || p.kind === 'objective',
      )
      if (sources.length === 0) return
      pushHistory()
      const mirrored = sources.map((p) => ({
        ...p,
        id: newId(),
        x: 2 * centerX - p.x,
        y: 2 * centerY - p.y,
        rotation: (p.rotation ?? 0) + 180,
      }))
      set((st) => ({ pieces: [...st.pieces, ...mirrored] }))
    },

    setActiveTool: (tool) =>
      set((s) => ({
        activeTool: tool,
        selectedIds: tool === 'cursor' ? s.selectedIds : [],
        selectedId: tool === 'cursor' ? s.selectedId : null,
      })),

    addDrawing: (d) => {
      pushHistory()
      set((s) => ({
        drawings: [...s.drawings, { ...d, id: newId() }],
      }))
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

    saveBoard: (name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const entry = {
        name: trimmed,
        savedAt: Date.now(),
        pieces: get().pieces,
        drawings: get().drawings,
      }
      const others = get().savedBoards.filter((b) => b.name !== trimmed)
      const next = [entry, ...others]
      writeSavedBoards(next)
      set({ savedBoards: next })
    },

    loadBoard: (name) => {
      const board = get().savedBoards.find((b) => b.name === name)
      if (!board) return
      pushHistory()
      const pieces = board.pieces.map((p) => ({ ...p, id: newId() }))
      const drawings = (board.drawings ?? []).map((d) => ({ ...d, id: newId() }))
      set({ pieces, drawings, selectedIds: [], selectedId: null })
    },

    deleteSavedBoard: (name) => {
      const next = get().savedBoards.filter((b) => b.name !== name)
      writeSavedBoards(next)
      set({ savedBoards: next })
    },

    exportBoard: () => {
      const s = get()
      return JSON.stringify(
        {
          schema: EXPORT_SCHEMA,
          savedAt: Date.now(),
          pieces: s.pieces,
          drawings: s.drawings,
        },
        null,
        2,
      )
    },

    importBoard: (data) => {
      if (!data || typeof data !== 'object') return false
      // Accept both the new schema and the legacy 40k-macro-battleplan/v1 schema.
      if (data.schema !== EXPORT_SCHEMA && data.schema !== '40k-macro-battleplan/v1') return false
      if (!Array.isArray(data.pieces)) return false
      const pieces = data.pieces
        .filter((p) => p && typeof p === 'object' && typeof p.kind === 'string')
        .map((p) => ({ ...p, id: newId() }))
      const drawings = (Array.isArray(data.drawings) ? data.drawings : [])
        .filter((d) => d && Array.isArray(d.points))
        .map((d) => ({ ...d, id: newId() }))
      pushHistory()
      set({ pieces, drawings, selectedIds: [], selectedId: null })
      return true
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
  }
})

export const baseRadiusPx = (diameterMm) =>
  ((diameterMm / MM_PER_INCH) * PX_PER_INCH) / 2
