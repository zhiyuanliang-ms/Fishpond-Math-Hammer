import { useState } from 'react'
import { Page } from './ui'
import {
  DICE_FACES,
  DIE_GLYPHS,
  rollD6s,
  rerollFaces,
  countFaces,
} from '../lib/dice'
import '../styles/diceRoller.css'

const MAX_DICE = 100
const MIN_DICE = 1

function DiceRoller() {
  const [diceCountInput, setDiceCountInput] = useState('5')
  const [rolls, setRolls] = useState([])
  const [selectedFaces, setSelectedFaces] = useState(() => new Set())
  const [rollNumber, setRollNumber] = useState(0)

  const parsedCount = parseInt(diceCountInput, 10)
  const isValidCount =
    Number.isFinite(parsedCount) &&
    parsedCount >= MIN_DICE &&
    parsedCount <= MAX_DICE

  const counts = countFaces(rolls)

  const handleRoll = () => {
    if (!isValidCount) return
    setRolls(rollD6s(parsedCount))
    setSelectedFaces(new Set())
    setRollNumber((n) => n + 1)
  }

  const handleReroll = () => {
    if (rolls.length === 0 || selectedFaces.size === 0) return
    setRolls((prev) => rerollFaces(prev, selectedFaces))
    setSelectedFaces(new Set())
    setRollNumber((n) => n + 1)
  }

  const toggleFace = (face) => {
    setSelectedFaces((prev) => {
      const next = new Set(prev)
      if (next.has(face)) next.delete(face)
      else next.add(face)
      return next
    })
  }

  const handleClear = () => {
    setRolls([])
    setSelectedFaces(new Set())
    setRollNumber(0)
  }

  // Disable face rows whose count is 0 so users can't "reroll" nothing.
  const canReroll =
    rolls.length > 0 &&
    selectedFaces.size > 0 &&
    DICE_FACES.some((f) => selectedFaces.has(f) && counts[f] > 0)

  return (
    <Page title="Dice Roller">
      <div className="dice-roller">
        <div className="calculator-form dice-roller-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dice-count">Number of dice</label>
              <input
                id="dice-count"
                type="number"
                min={MIN_DICE}
                max={MAX_DICE}
                value={diceCountInput}
                onChange={(e) => setDiceCountInput(e.target.value)}
              />
            </div>
          </div>

          <div className="dice-roller-actions">
            <button
              type="button"
              className="calculate-button"
              onClick={handleRoll}
              disabled={!isValidCount}
            >
              Roll Dice
            </button>
            {rolls.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>

          {!isValidCount && (
            <p className="dice-roller-hint warn">
              Enter a number between {MIN_DICE} and {MAX_DICE}.
            </p>
          )}
        </div>

        {rolls.length > 0 && (
          <>
            <section className="dice-result-section">
              <div className="dice-tray" key={rollNumber}>
                {rolls.map((face, idx) => (
                  <span
                    key={`${rollNumber}-${idx}`}
                    className={`die die-face-${face} ${
                      selectedFaces.has(face) ? 'die-selected' : ''
                    }`}
                    title={`Die ${idx + 1}: ${face}`}
                  >
                    {DIE_GLYPHS[face]}
                  </span>
                ))}
              </div>
            </section>

            <section className="dice-result-section">
              <div className="dice-section-header">
                <h3>Counts</h3>
              </div>

              <ul className="face-count-list">
                {DICE_FACES.map((face) => {
                  const count = counts[face]
                  const isSelected = selectedFaces.has(face)
                  const disabled = count === 0
                  return (
                    <li
                      key={face}
                      className={`face-count-row ${
                        isSelected ? 'selected' : ''
                      } ${disabled ? 'empty' : ''}`}
                    >
                      <label className="face-count-label">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => toggleFace(face)}
                        />
                        <span className={`face-glyph die-face-${face}`}>
                          {DIE_GLYPHS[face]}
                        </span>
                      </label>
                      <span className="face-count-value">{count}</span>
                    </li>
                  )
                })}
              </ul>

              <div className="dice-roller-actions">
                <button
                  type="button"
                  className="calculate-button"
                  onClick={handleReroll}
                  disabled={!canReroll}
                >
                  Reroll Selected
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </Page>
  )
}

export default DiceRoller
