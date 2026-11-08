import { useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { getDisposition } from '../config/battleplans11e'
import {
  getMissionPlanTotals,
  MISSION_ROUNDS,
  MISSION_SIDES,
  MISSION_VP_CAP,
  PRIMARY_SCORE_PHASES,
  SECONDARY_MISSION_VP_CAP,
  SECONDARY_MISSIONS,
} from '../config/missionPlanning11e'
import { useBoard11eStore } from '../store/board11eStore'
import { MissionCardDialog, MissionCardImage } from './MissionCardDialog'
import { MissionCardsButton } from './MissionCardsButton'
import { trackEvent, TELEMETRY_EVENTS } from '../../lib/telemetry'

function MissionSideLabel({ side }) {
  return (
    <span className="mbp-mission-side-label">
      <span className="mbp11-swatch" style={{ backgroundColor: side.color }} aria-hidden="true" />
      {side.label}
    </span>
  )
}

function PlanOverview({ side, totals }) {
  return (
    <section
      className="mbp-section mbp-plan-overview"
      aria-label={`${side.label} plan overview`}
      style={{ '--mbp-side-color': side.color }}
    >
      <div className="mbp-section__header mbp-plan-overview__heading">
        <MissionSideLabel side={side} />
        <strong>{totals.total}<small> VP</small></strong>
      </div>
      <div className="mbp-plan-overview__metrics">
        <div>
          <span>Primary</span>
          <strong>{totals.primary}<small> / {MISSION_VP_CAP}</small></strong>
        </div>
        <div>
          <span>Secondary</span>
          <strong>{totals.secondary}<small> / {MISSION_VP_CAP}</small></strong>
        </div>
      </div>
      {(totals.primaryRaw > MISSION_VP_CAP || totals.secondaryRaw > MISSION_VP_CAP) && (
        <div className="mbp-plan-warning" role="status">
          {totals.primaryRaw > MISSION_VP_CAP && (
            <span>Primary: {totals.primaryRaw} / {MISSION_VP_CAP} VP</span>
          )}
          {totals.secondaryRaw > MISSION_VP_CAP && (
            <span>Secondary pool: {totals.secondaryRaw} / {MISSION_VP_CAP} VP</span>
          )}
        </div>
      )}
    </section>
  )
}

export function MissionWorkspace({ battleplan, activeSide, onSideChange }) {
  const plan = useBoard11eStore((s) => s.missionPlan)
  const setMissionPlan = useBoard11eStore((s) => s.setMissionPlan)
  const storageError = useBoard11eStore((s) => s.missionPlanStorageError)
  const [viewedMission, setViewedMission] = useState(null)
  // Typing "12" into one field is one VP edit, not two: only a change to a
  // different field than the last one edited counts as a new RecordVP.
  const lastVpFieldRef = useRef(null)
  const trackVpEdit = (field) => {
    if (lastVpFieldRef.current === field) return
    lastVpFieldRef.current = field
    trackEvent(TELEMETRY_EVENTS.RecordVP)
  }

  if (!battleplan) {
    return <p role="alert">Select a valid battleplan on the Battlefield tab to plan your missions.</p>
  }

  const sides = MISSION_SIDES.map((side) => ({
    ...side,
    color: getDisposition(battleplan[side.battleplanKey].disposition).color,
  }))
  const activeSideInfo = sides.find((side) => side.id === activeSide)
  const activeTotals = getMissionPlanTotals(plan, activeSide)

  const setPrimaryTarget = (round, phase, raw) => {
    trackVpEdit(`primary:${activeSide}:${round}:${phase}`)
    setMissionPlan((current) => ({
      ...current,
      primary: {
        ...current.primary,
        [activeSide]: {
          ...current.primary[activeSide],
          [round]: { ...current.primary[activeSide][round], [phase]: raw },
        },
      },
    }))
  }

  const setSecondary = (missionId, patch) => {
    trackVpEdit(`secondary:${activeSide}:${missionId}:${Object.keys(patch).join(',')}`)
    setMissionPlan((current) => ({
      ...current,
      secondary: {
        ...current.secondary,
        [activeSide]: {
          ...current.secondary[activeSide],
          [missionId]: { ...current.secondary[activeSide][missionId], ...patch },
        },
      },
    }))
  }

  return (
    <div className="mbp-missions" role="region" aria-label="Missions & VP">
      {storageError && <p className="mbp-plan-warning" role="alert">{storageError}</p>}

      <div className="mbp-plan-overviews">
        {sides.map((side) => (
          <PlanOverview
            key={side.id}
            side={side}
            totals={getMissionPlanTotals(plan, side.id)}
          />
        ))}
      </div>

      <div className="mbp-segmented mbp-plan-side-switch" role="group" aria-label="Mission scoring side">
        {sides.map((side) => (
          <button
            key={side.id}
            type="button"
            className={`mbp-segmented__btn ${activeSide === side.id ? 'is-active' : ''}`}
            aria-label={side.label}
            aria-controls="mbp-mission-scores"
            aria-pressed={activeSide === side.id}
            onClick={() => onSideChange(side.id)}
          >
            <MissionSideLabel side={side} />
          </button>
        ))}
      </div>

      <div className="mbp-mission-columns" id="mbp-mission-scores">
        <section className="mbp-section mbp-mission-section" aria-label="Primary missions">
          <header className="mbp-primary-header">
            <div className="mbp-section__header mbp-mission-section__heading">
              <h2 id="mbp-primary-title">Primary missions</h2>
            </div>
            <div className="mbp-section__header mbp-mission-section__heading mbp-primary-heading">
              <MissionCardsButton
                mission={battleplan[activeSideInfo.battleplanKey]}
                player={activeSideInfo.label}
              />
              <output className="mbp-primary-total" aria-label={`${activeSideInfo.label} primary VP`}>
                {activeTotals.primary}/{MISSION_VP_CAP} VP
              </output>
            </div>
          </header>
          <table className="mbp-primary-table" aria-label={`${activeSideInfo.label} primary scoring`}>
            <tbody>
              {MISSION_ROUNDS.map((round) => (
                <tr key={round}>
                  <th scope="row">R{round}</th>
                  {PRIMARY_SCORE_PHASES.map((phase) => (
                    <td key={phase.id}>
                      <input
                        type="number"
                        min={0}
                        max={MISSION_VP_CAP}
                        step={1}
                        inputMode="numeric"
                        placeholder="-"
                        aria-label={`${activeSideInfo.label} ${phase.label} VP round ${round}`}
                        value={plan.primary[activeSide][round][phase.id]}
                        onChange={(event) => setPrimaryTarget(round, phase.id, event.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mbp-section mbp-mission-section" aria-labelledby="mbp-secondary-title">
          <header className="mbp-section__header mbp-mission-section__heading">
            <h2 id="mbp-secondary-title">Secondary missions</h2>
          </header>

          <div className="mbp-secondary-summary" aria-live="polite" aria-atomic="true">
            <span>
              <strong>{activeTotals.included}</strong> / {SECONDARY_MISSIONS.length} selected
            </span>
            <span className="mbp-secondary-summary__scores">
              <strong>{activeTotals.secondaryRaw}/{MISSION_VP_CAP} VP</strong>
            </span>
          </div>

          <ul className="mbp-secondary-list" aria-label={`${activeSideInfo.label} secondary missions`}>
            {SECONDARY_MISSIONS.map((mission) => {
              const entry = plan.secondary[activeSide][mission.id]
              const included = entry.status === 'included'
              return (
                <li key={mission.id} className={`mbp-secondary-card is-${included ? 'included' : 'unassessed'}`}>
                  <label className="mbp-secondary-checkbox">
                    <input
                      type="checkbox"
                      aria-label={`Include ${mission.name}`}
                      checked={included}
                      onChange={(event) => setSecondary(mission.id, {
                        status: event.target.checked ? 'included' : 'unassessed',
                      })}
                    />
                    <span className="mbp-secondary-checkbox__indicator" aria-hidden="true">
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                  </label>
                  <button
                    type="button"
                    className="mbp-secondary-card__name"
                    onClick={() => setViewedMission(mission)}
                    aria-label={`View ${mission.name} card`}
                  >
                    <span>{mission.name}</span>
                  </button>
                  <div className="mbp-secondary-card__controls">
                    <label className="mbp-secondary-target">
                      <input
                        type="number"
                        min={0}
                        max={SECONDARY_MISSION_VP_CAP}
                        step={1}
                        inputMode="numeric"
                        placeholder="-"
                        aria-label={`${activeSideInfo.label} VP for ${mission.name}`}
                        value={entry.target}
                        onChange={(event) => setSecondary(mission.id, { target: event.target.value })}
                      />
                      <span>VP</span>
                    </label>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {viewedMission && (
        <MissionCardDialog title={viewedMission.name} onClose={() => setViewedMission(null)}>
          <div className="mbp11-missions-grid is-mirror">
            <article className="mbp11-mission-card">
              <MissionCardImage
                key={viewedMission.id}
                src={viewedMission.image}
                alt={`${viewedMission.name} secondary mission card`}
                sourceUrl={viewedMission.sourceUrl}
              />
              <a
                className="mbp-mission-source"
                href={viewedMission.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View source on gdmissions.app
              </a>
            </article>
          </div>
        </MissionCardDialog>
      )}
    </div>
  )
}
