import { useEffect, useState } from 'react'

const STORAGE_KEY = 'fishpond-mathhammer-macro-battleplan:scoreboard'
const LEGACY_STORAGE_KEY = '40k-macro-battleplan:scoreboard'
const ROUNDS = [1, 2, 3, 4, 5]

const emptyRounds = () => ({ 1: '', 2: '', 3: '', 4: '', 5: '' })

const initialState = () => ({
  primaryName: '',
  playerName: 'You',
  opponentName: 'Opponent',
  scores: { player: emptyRounds(), opponent: emptyRounds() },
})

function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw)
    return {
      ...initialState(),
      ...parsed,
      scores: {
        player: { ...emptyRounds(), ...(parsed.scores?.player ?? {}) },
        opponent: { ...emptyRounds(), ...(parsed.scores?.opponent ?? {}) },
      },
    }
  } catch {
    return initialState()
  }
}

function clamp(n) {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 50) return 50
  return n
}

export function MacroScoreboard() {
  const [state, setState] = useState(() => loadState())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore quota errors
    }
  }, [state])

  const total = (side) =>
    ROUNDS.reduce(
      (sum, r) => sum + (typeof state.scores[side][r] === 'number' ? state.scores[side][r] : 0),
      0,
    )

  const setScore = (side, round, raw) => {
    setState((s) => {
      const next = {
        ...s,
        scores: {
          player: { ...s.scores.player },
          opponent: { ...s.scores.opponent },
        },
      }
      if (raw === '') {
        next.scores[side][round] = ''
      } else {
        const n = clamp(parseInt(raw, 10))
        next.scores[side][round] = n
      }
      return next
    })
  }

  const playerTotal = total('player')
  const opponentTotal = total('opponent')
  const leader =
    playerTotal === opponentTotal
      ? 'tie'
      : playerTotal > opponentTotal
      ? 'player'
      : 'opponent'

  const cellInput = (side, round) => {
    const v = state.scores[side][round]
    return (
      <input
        type="number"
        min={0}
        max={50}
        step={1}
        value={v === '' ? '' : v}
        onChange={(e) => setScore(side, round, e.target.value)}
      />
    )
  }

  return (
    <div className="mbp-scoreboard">
      <input
        className="mbp-scoreboard__primary-input"
        type="text"
        placeholder="Primary Mission"
        value={state.primaryName}
        onChange={(e) => setState((s) => ({ ...s, primaryName: e.target.value }))}
      />

      <table className="mbp-scoretable">
        <thead>
          <tr>
            <th className="mbp-th-side"></th>
            {ROUNDS.map((r) => (
              <th key={r}>R{r}</th>
            ))}
            <th className="mbp-th-total">VP</th>
          </tr>
        </thead>
        <tbody>
          {['player', 'opponent'].map((side) => {
            const isWinner = leader === side
            const t = side === 'player' ? playerTotal : opponentTotal
            return (
              <tr key={side}>
                <td className="mbp-td-side">
                  <input
                    type="text"
                    value={side === 'player' ? state.playerName : state.opponentName}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        [side === 'player' ? 'playerName' : 'opponentName']: e.target.value,
                      }))
                    }
                  />
                </td>
                {ROUNDS.map((r) => (
                  <td key={r}>{cellInput(side, r)}</td>
                ))}
                <td className={`mbp-total ${isWinner ? 'mbp-total--winner' : ''}`}>{t}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
