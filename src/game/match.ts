import { STABILIZER_AP } from './constants'
import { apBudgetByRole, createId, createInitialNodes } from './shared'
import type { MatchState } from './types'

export const createMatch = (now = Date.now()): MatchState => ({
  id: createId(),
  efficiency: 50,
  latestEfficiencyDelta: 0,
  tickCount: 0,
  lastTickAt: now,
  turnNumber: 1,
  activeRole: 'Stabilizer',
  apRemaining: STABILIZER_AP,
  actionsUsed: 0,
  winner: null,
  nodes: createInitialNodes(),
})

export const endTurn = (matchInput: MatchState): MatchState => {
  const match: MatchState = structuredClone(matchInput)

  if (match.winner) {
    return match
  }

  match.activeRole = match.activeRole === 'Stabilizer' ? 'Saboteur' : 'Stabilizer'
  match.turnNumber += 1
  match.actionsUsed = 0
  match.apRemaining = apBudgetByRole(match.activeRole)

  return match
}
