import { useBoard } from '../store/boardContext'

const ROUNDS = [1, 2, 3, 4, 5]

function clamp(n) {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 50) return 50
  return n
}

export function MacroScoreboard({ showPrimaryName = true }) {
  const state = useBoard((s) => s.scoreboard)
  const setScoreboard = useBoard((s) => s.setScoreboard)

  const total = (side) =>
    ROUNDS.reduce(
      (sum, r) => sum + (typeof state.scores[side][r] === 'number' ? state.scores[side][r] : 0),
      0,
    )

  const setScore = (side, round, raw) => {
    setScoreboard((s) => {
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
      {showPrimaryName && (
        <input
          className="mbp-scoreboard__primary-input"
          type="text"
          placeholder="Primary Mission"
          value={state.primaryName}
          onChange={(e) => setScoreboard((s) => ({ ...s, primaryName: e.target.value }))}
        />
      )}

      <table className="mbp-scoretable">
        <thead>
          <tr>
            <th className="mbp-th-side"></th>
            {ROUNDS.map((r) => (
              <th key={r}>T{r}</th>
            ))}
            <th className="mbp-th-total">VP</th>
          </tr>
        </thead>
        <tbody>
          {['player', 'opponent'].map((side) => {
            const t = side === 'player' ? playerTotal : opponentTotal
            return (
              <tr key={side}>
                <td className="mbp-td-side">
                  <input
                    type="text"
                    value={side === 'player' ? state.playerName : state.opponentName}
                    onChange={(e) =>
                      setScoreboard((s) => ({
                        ...s,
                        [side === 'player' ? 'playerName' : 'opponentName']: e.target.value,
                      }))
                    }
                  />
                </td>
                {ROUNDS.map((r) => (
                  <td key={r}>{cellInput(side, r)}</td>
                ))}
                <td className="mbp-total">{t}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
