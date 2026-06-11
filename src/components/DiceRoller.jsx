import { useMemo, useState } from 'react'
import { Page } from './ui'
import { DICE_FACES, DIE_GLYPHS, rollD6 } from '../lib/dice'
import '../styles/diceRoller.css'

const MAX_POOL = 100
const DEFAULT_POOL_SIZE = 5

let dieIdCounter = 1
const nextDieId = () => dieIdCounter++
const makeBlank = () => ({ id: nextDieId(), face: null, version: 0 })

function emptyCounts() {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
}

function DiceRoller() {
  const [pool, setPool] = useState(() =>
    Array.from({ length: DEFAULT_POOL_SIZE }, makeBlank)
  )
  const [kept, setKept] = useState([])
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [sizeInput, setSizeInput] = useState(String(DEFAULT_POOL_SIZE))

  const poolCounts = useMemo(() => {
    const c = emptyCounts()
    for (const d of pool) if (d.face) c[d.face]++
    return c
  }, [pool])

  const keptCounts = useMemo(() => {
    const c = emptyCounts()
    for (const d of kept) c[d.face]++
    return c
  }, [kept])

  const hasRolledDice = pool.some((d) => d.face !== null)

  // Selected face counts: how many selected dice show each face.
  const selectedFaceCounts = useMemo(() => {
    const c = emptyCounts()
    for (const d of pool) {
      if (d.face !== null && selectedIds.has(d.id)) c[d.face]++
    }
    return c
  }, [pool, selectedIds])

  const selectedDiceCount = DICE_FACES.reduce(
    (sum, f) => sum + selectedFaceCounts[f],
    0
  )
  const selectedFaceList = DICE_FACES.filter((f) => selectedFaceCounts[f] > 0)

  // A face chip is "fully selected" when every die of that face is selected.
  const isFaceFullySelected = (face) =>
    poolCounts[face] > 0 && selectedFaceCounts[face] === poolCounts[face]

  const clearSelection = () => setSelectedIds(new Set())

  const resizePool = (target) => {
    const clamped = Math.max(0, Math.min(MAX_POOL, Math.floor(target) || 0))
    setPool((prev) => {
      if (clamped === prev.length) return prev
      if (clamped > prev.length) {
        const add = Array.from({ length: clamped - prev.length }, makeBlank)
        return [...prev, ...add]
      }
      return prev.slice(0, clamped)
    })
    setSizeInput(String(clamped))
    clearSelection()
  }

  const handleRollPool = () => {
    if (pool.length === 0) return
    setPool((prev) =>
      prev.map((d) => ({ ...d, face: rollD6(), version: d.version + 1 }))
    )
    clearSelection()
  }

  const handleRerollSelected = () => {
    if (selectedDiceCount === 0) return
    setPool((prev) =>
      prev.map((d) =>
        d.face !== null && selectedIds.has(d.id)
          ? { ...d, face: rollD6(), version: d.version + 1 }
          : d
      )
    )
    clearSelection()
  }

  const handleSendToKept = () => {
    if (selectedDiceCount === 0) return
    const moving = pool.filter(
      (d) => d.face !== null && selectedIds.has(d.id)
    )
    if (moving.length === 0) return
    const remaining = pool.filter(
      (d) => !(d.face !== null && selectedIds.has(d.id))
    )
    setPool(remaining)
    setKept((prev) => [...prev, ...moving])
    setSizeInput(String(remaining.length))
    clearSelection()
  }

  const handleDuplicateToPool = () => {
    if (selectedDiceCount === 0) return
    const selected = pool.filter(
      (d) => d.face !== null && selectedIds.has(d.id)
    )
    if (selected.length === 0) return
    if (pool.length + selected.length > MAX_POOL) return
    const copies = selected.map(() => makeBlank())
    setPool((prev) => {
      const next = [...prev, ...copies]
      setSizeInput(String(next.length))
      return next
    })
    clearSelection()
  }

  const handleRemoveSelected = () => {
    if (selectedDiceCount === 0) return
    setPool((prev) => {
      const next = prev.filter(
        (d) => !(d.face !== null && selectedIds.has(d.id))
      )
      setSizeInput(String(next.length))
      return next
    })
    clearSelection()
  }

  const handleClearPool = () => {
    setPool([])
    setSizeInput('0')
    clearSelection()
  }

  const handleIncrement = () => resizePool(pool.length + 1)
  const handleDecrement = () => resizePool(pool.length - 1)
  const handleSizeInputChange = (e) => setSizeInput(e.target.value)
  const handleSizeInputCommit = () => {
    const parsed = parseInt(sizeInput, 10)
    if (!Number.isFinite(parsed)) {
      setSizeInput(String(pool.length))
      return
    }
    resizePool(parsed)
  }
  const handleSizeInputKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  const toggleDie = (die) => {
    if (die.face === null) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(die.id)) next.delete(die.id)
      else next.add(die.id)
      return next
    })
  }

  // Face chip: toggles all dice of that face. If any die of that face is not
  // selected, select them all; if every die of that face is already selected,
  // deselect them.
  const toggleFace = (face) => {
    if (poolCounts[face] === 0) return
    const targetIds = pool
      .filter((d) => d.face === face)
      .map((d) => d.id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = targetIds.every((id) => next.has(id))
      if (allSelected) {
        for (const id of targetIds) next.delete(id)
      } else {
        for (const id of targetIds) next.add(id)
      }
      return next
    })
  }

  const handleReturnKept = () => {
    if (kept.length === 0) return
    setPool((prev) => {
      const next = [...prev, ...kept]
      setSizeInput(String(next.length))
      return next
    })
    setKept([])
  }

  const handleClearKept = () => setKept([])

  const wouldOverflow = pool.length + kept.length > MAX_POOL

  return (
    <Page title="Dice Roller">
      <div className="dice-roller">
        <section className="dice-pool-section" aria-label="Dice pool">
          <div className="dice-section-header">
            <h3>Dice Pool</h3>
            <span className="dice-count-badge">
              {pool.length} dice
            </span>
          </div>

          {pool.length > 0 && (
            <div className="dice-tray">
              {pool.map((d, idx) => {
                const isBlank = d.face === null
                const isSelected = !isBlank && selectedIds.has(d.id)
                return (
                  <button
                    key={`${d.id}-${d.version}`}
                    type="button"
                    className={`die ${
                      isBlank ? 'die-blank' : `die-face-${d.face}`
                    } ${isSelected ? 'die-selected' : ''}`}
                    onClick={() => toggleDie(d)}
                    aria-label={
                      isBlank
                        ? `Die ${idx + 1}: not rolled`
                        : `Die ${idx + 1}: ${d.face}${
                            isSelected ? ', selected' : ''
                          }`
                    }
                    aria-pressed={isSelected}
                    disabled={isBlank}
                  >
                    {isBlank ? '' : DIE_GLYPHS[d.face]}
                  </button>
                )
              })}
            </div>
          )}
          {pool.length === 0 && (
            <div className="dice-tray dice-tray-empty" aria-hidden="true" />
          )}

          {hasRolledDice && (
            <ul className="face-count-list" aria-label="Counts">
              {DICE_FACES.map((face) => {
                const count = poolCounts[face]
                const isSelected = isFaceFullySelected(face)
                const isPartial =
                  !isSelected && selectedFaceCounts[face] > 0
                const disabled = count === 0
                return (
                  <li
                    key={face}
                    className={`face-count-row ${
                      isSelected ? 'selected' : ''
                    } ${isPartial ? 'partial' : ''} ${
                      disabled ? 'empty' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="face-count-button"
                      onClick={() => toggleFace(face)}
                      disabled={disabled}
                      aria-pressed={isSelected}
                    >
                      <span className={`face-glyph die-face-${face}`}>
                        {DIE_GLYPHS[face]}
                      </span>
                      <span className="face-count-value">
                        {isPartial
                          ? `${selectedFaceCounts[face]}/${count}`
                          : count}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="dice-roller-actions">
            <button
              type="button"
              className="calculate-button"
              onClick={handleRollPool}
              disabled={pool.length === 0}
            >
              Roll
            </button>
          </div>

          {selectedDiceCount > 0 && (
            <div
              className="dice-selection-bar"
              role="group"
              aria-label="Selection actions"
            >
              <div className="dice-selection-summary">
                <span className="dice-selection-label">Selected</span>
                {selectedFaceList.map((f) => (
                  <span key={f} className={`face-glyph die-face-${f}`}>
                    {DIE_GLYPHS[f]}
                  </span>
                ))}
                <span className="dice-selection-count">
                  ({selectedDiceCount} dice)
                </span>
              </div>
              <div className="dice-selection-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleRerollSelected}
                >
                  Reroll
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSendToKept}
                >
                  Keep
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleDuplicateToPool}
                  disabled={pool.length + selectedDiceCount > MAX_POOL}
                  title={
                    pool.length + selectedDiceCount > MAX_POOL
                      ? `Pool would exceed ${MAX_POOL} dice`
                      : 'Add a blank copy of each selected die to the pool'
                  }
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="secondary-button danger"
                  onClick={handleRemoveSelected}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="dice-pool-controls">
            <span className="dice-pool-controls-label">Pool size</span>
            <div className="dice-stepper">
              <button
                type="button"
                className="stepper-button"
                onClick={handleDecrement}
                disabled={pool.length === 0}
                aria-label="Remove one die"
              >
                −
              </button>
              <input
                type="number"
                className="dice-pool-size-input"
                min={0}
                max={MAX_POOL}
                value={sizeInput}
                onChange={handleSizeInputChange}
                onBlur={handleSizeInputCommit}
                onKeyDown={handleSizeInputKey}
                aria-label="Pool size"
              />
              <button
                type="button"
                className="stepper-button"
                onClick={handleIncrement}
                disabled={pool.length >= MAX_POOL}
                aria-label="Add one die"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearPool}
              disabled={pool.length === 0}
            >
              Clear pool
            </button>
          </div>
        </section>

        {kept.length > 0 && (
          <section className="dice-kept-section" aria-label="Kept dice">
            <div className="dice-section-header">
              <h3>Kept</h3>
              <span className="dice-count-badge">
                {kept.length} dice
              </span>
            </div>

            <div className="dice-tray dice-tray-kept">
              {kept.map((d, idx) => (
                <span
                  key={d.id}
                  className={`die die-face-${d.face}`}
                  title={`Kept die ${idx + 1}: ${d.face}`}
                >
                  {DIE_GLYPHS[d.face]}
                </span>
              ))}
            </div>

            <ul
              className="face-count-list face-count-list-compact"
              aria-label="Kept counts"
            >
              {DICE_FACES.map((face) => {
                const count = keptCounts[face]
                if (count === 0) return null
                return (
                  <li key={face} className="face-count-row static">
                    <div className="face-count-button" aria-hidden="true">
                      <span className={`face-glyph die-face-${face}`}>
                        {DIE_GLYPHS[face]}
                      </span>
                      <span className="face-count-value">{count}</span>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="dice-roller-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleReturnKept}
                disabled={wouldOverflow}
                title={
                  wouldOverflow
                    ? `Pool would exceed ${MAX_POOL} dice`
                    : undefined
                }
              >
                Return to pool
              </button>
              <button
                type="button"
                className="secondary-button danger"
                onClick={handleClearKept}
              >
                Clear kept
              </button>
            </div>
          </section>
        )}
      </div>
    </Page>
  )
}

export default DiceRoller
