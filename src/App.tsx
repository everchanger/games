import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createMatch,
  getAction,
  getActionsForSide,
  getBudget,
  getSpent,
  getStageFlow,
  getStagePressure,
  getStageTags,
  submitTurn,
  type MatchState,
  type PlannedAction,
  type Side,
  SIDE_LABELS,
} from './game'

const STORAGE_KEY = 'async-system-duel-poc'

function loadMatches() {
  if (typeof window === 'undefined') {
    return [createMatch('Prototype Match')]
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return [createMatch('Prototype Match')]
  }

  try {
    const parsed = JSON.parse(stored) as MatchState[]
    return parsed.length > 0 ? parsed : [createMatch('Prototype Match')]
  } catch {
    return [createMatch('Prototype Match')]
  }
}

function formatRelativeTime(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function App() {
  const [matches, setMatches] = useState<MatchState[]>(() => loadMatches())
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [viewerSide, setViewerSide] = useState<Side>('builder')
  const [queuedActions, setQueuedActions] = useState<PlannedAction[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(matches))
  }, [matches])

  useEffect(() => {
    if (!matches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(matches[0]?.id ?? '')
    }
  }, [matches, selectedMatchId])

  useEffect(() => {
    setQueuedActions([])
    setError('')
  }, [selectedMatchId, viewerSide])

  const currentMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? matches[0],
    [matches, selectedMatchId],
  )

  const isActiveTurn = currentMatch ? currentMatch.nextSide === viewerSide && !currentMatch.winner : false
  const budget = getBudget(viewerSide)
  const spent = getSpent(queuedActions)
  const remaining = budget - spent
  const latestSummary = currentMatch?.history[0]

  function updateMatch(updatedMatch: MatchState) {
    setMatches((existing) =>
      existing.map((match) => (match.id === updatedMatch.id ? updatedMatch : match)),
    )
  }

  function handleCreateMatch() {
    const newMatch = createMatch()
    setMatches((existing) => [newMatch, ...existing])
    setSelectedMatchId(newMatch.id)
    setViewerSide('builder')
  }

  function handleResetCurrentMatch() {
    if (!currentMatch) {
      return
    }

    const replacement = createMatch(currentMatch.name)
    setMatches((existing) =>
      existing.map((match) => (match.id === currentMatch.id ? replacement : match)),
    )
    setSelectedMatchId(replacement.id)
    setQueuedActions([])
  }

  function handleQueueAction(actionId: PlannedAction['actionId'], stageId: PlannedAction['stageId']) {
    const action = getAction(actionId)

    if (spent + action.cost > budget) {
      return
    }

    setQueuedActions((existing) => [...existing, { actionId, stageId }])
  }

  function handleSubmitTurn() {
    if (!currentMatch) {
      return
    }

    try {
      const updatedMatch = submitTurn(currentMatch, viewerSide, queuedActions)
      updateMatch(updatedMatch)
      setQueuedActions([])
      setError('')

      if (viewerSide === 'builder') {
        setViewerSide('saboteur')
      } else if (!updatedMatch.winner) {
        setViewerSide('builder')
      }
    } catch (submissionError) {
      if (submissionError instanceof Error) {
        setError(submissionError.message)
      }
    }
  }

  if (!currentMatch) {
    return null
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Async System Duel POC</p>
          <h1>Hidden edits, visible fallout.</h1>
          <p className="hero-copy">
            A small local-first prototype for the design in <code>GAME_DESIGN_DOCUMENT.md</code>.
            Builder and saboteur trade action-budget turns on the same compact system, then the
            system resolves and only symptoms are revealed.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={handleCreateMatch}>
            Create match
          </button>
          <button type="button" className="secondary" onClick={handleResetCurrentMatch}>
            Reset current match
          </button>
        </div>
      </header>

      <main className="layout">
        <aside className="panel sidebar">
          <div className="panel-heading">
            <h2>Matches</h2>
            <span>{matches.length} saved</span>
          </div>
          <div className="match-list">
            {matches.map((match) => (
              <button
                key={match.id}
                type="button"
                className={`match-tile ${match.id === currentMatch.id ? 'selected' : ''}`}
                onClick={() => setSelectedMatchId(match.id)}
              >
                <strong>{match.name}</strong>
                <span>
                  Round {match.round} · {match.winner ? `${SIDE_LABELS[match.winner]} won` : `${SIDE_LABELS[match.nextSide]} to act`}
                </span>
                <span>Output {match.systemOutput}/{match.targetOutput}</span>
              </button>
            ))}
          </div>
          <div className="viewer-toggle">
            <h3>Testing seat</h3>
            <div>
              {(['builder', 'saboteur'] as Side[]).map((side) => (
                <button
                  key={side}
                  type="button"
                  className={viewerSide === side ? 'selected' : 'secondary'}
                  onClick={() => setViewerSide(side)}
                >
                  View as {SIDE_LABELS[side]}
                </button>
              ))}
            </div>
          </div>
          <p className="muted">
            Match state is stored in local browser storage for this POC. Swapping in a hosted data
            store is the main next step for real async playtests.
          </p>
        </aside>

        <section className="content-column">
          <section className="panel status-grid">
            <div>
              <p className="eyebrow">Current exchange</p>
              <h2>
                {currentMatch.winner
                  ? `${SIDE_LABELS[currentMatch.winner]} wins`
                  : `${SIDE_LABELS[currentMatch.nextSide]} to act`}
              </h2>
              <p>
                Round {currentMatch.round} · Last update {formatRelativeTime(currentMatch.updatedAt)}
              </p>
            </div>
            <div>
              <div className="meter-labels">
                <span>Output</span>
                <strong>
                  {currentMatch.systemOutput}/{currentMatch.targetOutput}
                </strong>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${currentMatch.systemOutput}%` }} />
              </div>
              <p className="muted">
                Builder wins at 100. Saboteur wins if the system collapses to 0.
              </p>
            </div>
            <div className="pending-card">
              <h3>Hidden action state</h3>
              {currentMatch.pendingTurn ? (
                <>
                  <p>
                    {currentMatch.pendingTurn.side === viewerSide
                      ? `You locked in ${currentMatch.pendingTurn.actions.length} hidden edits.`
                      : `Opponent already banked ${currentMatch.pendingTurn.actions.length} hidden edits.`}
                  </p>
                  <span className="pill warning">Resolution is waiting on the response turn.</span>
                </>
              ) : (
                <>
                  <p>No hidden edits are waiting to resolve right now.</p>
                  <span className="pill">Fresh exchange</span>
                </>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Shared system</h2>
              <span>Compact four-stage board</span>
            </div>
            <div className="stage-grid">
              {currentMatch.stages.map((stage) => (
                <article key={stage.id} className="stage-card">
                  <div className="stage-card-header">
                    <div>
                      <h3>{stage.label}</h3>
                      <p>{getStageTags(stage).join(' · ')}</p>
                    </div>
                    <strong>{getStageFlow(stage)} flow</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Throughput</dt>
                      <dd>{stage.throughput}</dd>
                    </div>
                    <div>
                      <dt>Resilience</dt>
                      <dd>{stage.resilience}</dd>
                    </div>
                    <div>
                      <dt>Buffer</dt>
                      <dd>{stage.buffer}</dd>
                    </div>
                    <div>
                      <dt>Friction</dt>
                      <dd>{stage.friction}</dd>
                    </div>
                    <div>
                      <dt>Faults</dt>
                      <dd>{stage.faults}</dd>
                    </div>
                    <div>
                      <dt>Pressure</dt>
                      <dd>{getStagePressure(stage)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="panel composer-panel">
            <div className="panel-heading">
              <h2>{isActiveTurn ? `Plan ${SIDE_LABELS[viewerSide]} actions` : 'Waiting state'}</h2>
              <span>
                Budget {spent}/{budget}
              </span>
            </div>

            {currentMatch.winner ? (
              <p className="muted">This match is finished. Reset it or create a new match to play again.</p>
            ) : isActiveTurn ? (
              <>
                <p className="muted">
                  Queue several edits. The opponent will only see the post-resolution symptoms, not
                  the exact actions you chose.
                </p>
                <div className="action-grid">
                  {getActionsForSide(viewerSide).map((action) => (
                    <article key={action.id} className="action-card">
                      <div>
                        <h3>{action.label}</h3>
                        <p>{action.description}</p>
                      </div>
                      <div className="action-card-footer">
                        <span className="pill">Cost {action.cost}</span>
                        <div className="target-buttons">
                          {currentMatch.stages.map((stage) => (
                            <button
                              key={`${action.id}-${stage.id}`}
                              type="button"
                              className="secondary"
                              disabled={spent + action.cost > budget}
                              onClick={() => handleQueueAction(action.id, stage.id)}
                            >
                              {stage.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="queue-panel">
                  <div>
                    <h3>Queued hidden edits</h3>
                    <p>{remaining} budget remaining</p>
                  </div>
                  {queuedActions.length > 0 ? (
                    <ol>
                      {queuedActions.map((action, index) => (
                        <li key={`${action.actionId}-${action.stageId}-${index}`}>
                          <span>
                            {getAction(action.actionId).label} ·{' '}
                            {currentMatch.stages.find((stage) => stage.id === action.stageId)?.label}
                          </span>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                              setQueuedActions((existing) => existing.filter((_, item) => item !== index))
                            }
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">No edits queued yet.</p>
                  )}
                </div>

                {error ? <p className="error-text">{error}</p> : null}

                <button
                  type="button"
                  className="submit-button"
                  disabled={queuedActions.length === 0}
                  onClick={handleSubmitTurn}
                >
                  {viewerSide === 'builder' ? 'Lock hidden edits' : 'Resolve exchange'}
                </button>
              </>
            ) : (
              <div className="waiting-card">
                <p>
                  {viewerSide === 'builder'
                    ? 'The saboteur still needs to respond before the next builder turn opens.'
                    : 'The builder has not committed the hidden setup for this exchange yet.'}
                </p>
                <p className="muted">
                  Switch seats to test both roles locally, or open another browser profile for a more
                  realistic hidden-information flow.
                </p>
              </div>
            )}
          </section>

          <section className="panel history-panel">
            <div className="panel-heading">
              <h2>Resolution history</h2>
              <span>Only symptoms are revealed</span>
            </div>

            {latestSummary ? (
              <article className="summary-card">
                <div className="summary-card-header">
                  <div>
                    <p className="eyebrow">Latest resolution</p>
                    <h3>Round {latestSummary.round}</h3>
                  </div>
                  <strong className={latestSummary.delta >= 0 ? 'up' : 'down'}>
                    {latestSummary.delta >= 0 ? '+' : ''}
                    {latestSummary.delta}
                  </strong>
                </div>
                <ul>
                  {latestSummary.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <div className="report-grid">
                  {latestSummary.stageReports.map((report) => (
                    <div key={report.stageId} className="report-card">
                      <h4>{report.label}</h4>
                      <p>
                        Flow {report.flow} · Pressure {report.pressure}
                      </p>
                      <p className="muted">{report.tags.join(' · ')}</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : (
              <p className="muted">
                No exchange has resolved yet. Builder must act first, then the saboteur answers.
              </p>
            )}

            {currentMatch.history.length > 1 ? (
              <div className="history-list">
                {currentMatch.history.slice(1).map((entry) => (
                  <article key={`${entry.round}-${entry.resolvedAt}`} className="history-item">
                    <strong>Round {entry.round}</strong>
                    <span>
                      Output {entry.outputBefore} → {entry.outputAfter}
                    </span>
                    <span>{entry.notes[0]}</span>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  )
}

export default App
