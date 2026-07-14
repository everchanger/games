import { useEffect, useMemo, useState } from 'react'
import {
  ACTIONS,
  advanceByElapsedTime,
  applyAction,
  createMatch,
  endTurn,
  getActionsForRole,
  getSecondsUntilNextTick,
  getVisibleState,
  type ActionDefinition,
  type MatchState,
  type NodeId,
} from '../game'
import { localStorageMatchRepository } from '../data/matchRepository'

const initializeMatch = (): MatchState => {
  const saved = localStorageMatchRepository.load()

  if (!saved) {
    return createMatch()
  }

  return advanceByElapsedTime(saved)
}

const formatDelta = (value: number): string => {
  if (value > 0) {
    return `+${value}`
  }

  return `${value}`
}

const pickDefaultAction = (actions: ActionDefinition[]): ActionDefinition => actions[0]

function GameApp() {
  const [match, setMatch] = useState<MatchState>(initializeMatch)
  const [selectedActionId, setSelectedActionId] = useState<ActionDefinition['id']>('polish-gears')
  const [selectedTargets, setSelectedTargets] = useState<NodeId[]>([])
  const [error, setError] = useState<string>('')
  const [now, setNow] = useState<number>(Date.now())

  const visible = useMemo(() => getVisibleState(match, match.activeRole), [match])
  const availableActions = useMemo(() => getActionsForRole(visible.activeRole), [visible.activeRole])
  const selectedAction = useMemo(
    () => availableActions.find((action) => action.id === selectedActionId) ?? pickDefaultAction(availableActions),
    [availableActions, selectedActionId],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
      setMatch((previous) => advanceByElapsedTime(previous))
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorageMatchRepository.save(match)
  }, [match])

  useEffect(() => {
    const nextDefault = availableActions[0]
    if (nextDefault && !availableActions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(nextDefault.id)
    }
    setSelectedTargets([])
    setError('')
  }, [availableActions, selectedActionId])

  const handleToggleTarget = (nodeId: NodeId): void => {
    const maxTargets = selectedAction.maxTargets

    if (maxTargets === 1) {
      setSelectedTargets([nodeId])
      return
    }

    setSelectedTargets((current) => {
      if (current.includes(nodeId)) {
        return current.filter((id) => id !== nodeId)
      }

      const next = [...current, nodeId]
      return next.slice(-maxTargets)
    })
  }

  const handleApplyAction = (): void => {
    const result = applyAction(match, {
      actionId: selectedAction.id,
      targets: selectedTargets,
    })

    if (!result.ok) {
      setError(result.reason ?? 'Action failed.')
      return
    }

    setMatch(result.match)
    setError('')
    setSelectedTargets([])
  }

  const handleEndTurn = (): void => {
    setMatch((previous) => endTurn(previous))
    setError('')
  }

  const handleNewMatch = (): void => {
    localStorageMatchRepository.clear()
    setMatch(createMatch())
    setError('')
    setSelectedTargets([])
  }

  const secondsUntilTick = getSecondsUntilNextTick(match, now)

  return (
    <main className="app">
      <header className="panel">
        <h1>Candy Factory Duel — POC</h1>
        <div className="metrics">
          <p>
            <strong>Efficiency:</strong> {visible.efficiency}
          </p>
          <p>
            <strong>Delta:</strong> {formatDelta(visible.latestEfficiencyDelta)}
          </p>
          <p>
            <strong>Current player:</strong> {visible.activeRole}
          </p>
          <p>
            <strong>AP:</strong> {visible.apRemaining}
          </p>
          <p>
            <strong>Actions this turn:</strong> {visible.actionsUsed}/3
          </p>
          <p>
            <strong>Next tick:</strong> {secondsUntilTick}s
          </p>
        </div>
        {visible.winner ? <p className="winner">Winner: {visible.winner}</p> : null}
      </header>

      <section className="panel board" aria-label="Factory board">
        {visible.nodes.map((node) => (
          <article
            key={node.id}
            className={`node ${selectedTargets.includes(node.id) ? 'selected' : ''}`}
            onClick={() => handleToggleTarget(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleToggleTarget(node.id)
              }
            }}
            role="button"
            tabIndex={0}
          >
            <h2>{node.name}</h2>
            <p>
              Integrity tier: <strong>{node.integrityTier}</strong>
            </p>
            <p>Buffer: {node.hasBuffer ? 'Yes' : 'No'}</p>
            <p>Status: {node.visibleStatuses.length > 0 ? node.visibleStatuses.join(', ') : 'None'}</p>
            <p>Revealed faults: {node.revealedFaults.length > 0 ? node.revealedFaults.join(', ') : 'None'}</p>
          </article>
        ))}
      </section>

      <section className="panel controls">
        <h2>Available actions ({visible.activeRole})</h2>
        <label>
          Action
          <select value={selectedAction.id} onChange={(event) => setSelectedActionId(event.target.value as ActionDefinition['id'])}>
            {availableActions.map((action) => (
              <option key={action.id} value={action.id}>
                {action.label} (cost {action.cost}, targets {action.minTargets}
                {action.maxTargets !== action.minTargets ? `-${action.maxTargets}` : ''})
              </option>
            ))}
          </select>
        </label>
        <p>
          Selected targets: {selectedTargets.length > 0 ? selectedTargets.join(', ') : 'none'}
        </p>
        {error ? <p className="error">{error}</p> : null}
        <div className="actions">
          <button type="button" onClick={handleApplyAction} disabled={Boolean(visible.winner)}>
            Apply action
          </button>
          <button type="button" onClick={handleEndTurn} disabled={Boolean(visible.winner)}>
            End turn
          </button>
          <button type="button" onClick={handleNewMatch}>
            New match
          </button>
        </div>
        <small>Game logic runs in pure domain modules under src/game and updates UI from derived visible state only.</small>
      </section>

      <footer className="panel">
        <h2>Action catalog</h2>
        <ul>
          {ACTIONS.filter((action) => action.role === visible.activeRole).map((action) => (
            <li key={action.id}>
              {action.label} — {action.cost} AP
            </li>
          ))}
        </ul>
      </footer>
    </main>
  )
}

export default GameApp
