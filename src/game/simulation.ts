import { EFFICIENCY_MAX, EFFICIENCY_MIN, EFFICIENCY_STEP_LIMIT, TICK_INTERVAL_MS } from './constants'
import { addStatus, applyIntegrityDamage, applyStrainDamage, clamp, getActiveStatuses, hasStatus, markFaultRevealed } from './shared'
import type { HiddenFault, MatchState, NodeState } from './types'

const sumThroughputDelta = (node: NodeState, tick: number): number => {
  const statusDelta = getActiveStatuses(node, tick).reduce((sum, status) => sum + (status.throughputDelta ?? 0), 0)
  const bufferPenalty = node.hasBuffer ? -0.05 : 0

  return statusDelta + bufferPenalty
}

const calculateNodeFactor = (node: NodeState, tick: number): number => {
  const throughputModifier = Math.max(0, 1 + sumThroughputDelta(node, tick))
  const integrityFactor = Math.max(0, node.integrity / 100)

  return Math.max(0, node.baseThroughput * throughputModifier * integrityFactor)
}

const resolveTriggerEffects = (node: NodeState, fault: HiddenFault): void => {
  if (fault.type === 'ingredientSwap') {
    applyIntegrityDamage(node, 12)
    addStatus(node, { type: 'mildStrain', activeFromTick: fault.triggerAtTick + 1, activeUntilTick: fault.triggerAtTick + 1 })
    markFaultRevealed(fault)
    return
  }

  applyIntegrityDamage(node, 10)
  addStatus(node, {
    type: 'sugarCrashSlowdown',
    activeFromTick: fault.triggerAtTick,
    activeUntilTick: fault.triggerAtTick,
    throughputDelta: -0.1,
  })
  markFaultRevealed(fault)
}

const getSystemFactor = (match: MatchState, nextTick: number): number => {
  const nodeEntries = match.nodes.map((node) => {
    const nodeFactor = calculateNodeFactor(node, nextTick)
    const reroutedFactor = hasStatus(node, 'reroute', nextTick)
      ? nodeFactor + Math.max(0, node.baseThroughput - nodeFactor) * 0.5
      : nodeFactor

    return { nodeFactor, reroutedFactor }
  })

  const minFactor = Math.min(...nodeEntries.map((entry) => entry.reroutedFactor))
  const averageFactor = nodeEntries.reduce((sum, entry) => sum + entry.nodeFactor, 0) / nodeEntries.length

  return 0.6 * minFactor + 0.4 * averageFactor
}

const checkWinner = (match: MatchState): void => {
  if (match.winner) {
    return
  }

  if (match.efficiency >= 100) {
    match.winner = 'Stabilizer'
    return
  }

  if (match.efficiency <= 0) {
    match.winner = 'Saboteur'
  }
}

export const advanceOneTick = (matchInput: MatchState): MatchState => {
  const match: MatchState = structuredClone(matchInput)

  if (match.winner) {
    return match
  }

  const nextTick = match.tickCount + 1

  for (const node of match.nodes) {
    for (const fault of node.hiddenFaults) {
      if (fault.triggerAtTick === nextTick) {
        resolveTriggerEffects(node, fault)
      }
    }
  }

  const systemFactor = getSystemFactor(match, nextTick)
  const targetEfficiency = clamp(Math.round(systemFactor * 100), EFFICIENCY_MIN, EFFICIENCY_MAX)
  const efficiencyDelta = clamp(targetEfficiency - match.efficiency, -EFFICIENCY_STEP_LIMIT, EFFICIENCY_STEP_LIMIT)
  match.efficiency = clamp(match.efficiency + efficiencyDelta, EFFICIENCY_MIN, EFFICIENCY_MAX)
  match.latestEfficiencyDelta = efficiencyDelta

  for (const node of match.nodes) {
    applyStrainDamage(node, nextTick)
  }

  match.tickCount = nextTick
  match.nodes = match.nodes.map((node) => ({
    ...node,
    statuses: node.statuses.filter((status) => status.activeUntilTick > match.tickCount),
    hiddenFaults: node.hiddenFaults.filter((fault) => fault.triggerAtTick > match.tickCount || fault.revealed),
  }))

  checkWinner(match)

  return match
}

export const advanceByElapsedTime = (matchInput: MatchState, now = Date.now()): MatchState => {
  const elapsedMs = Math.max(0, now - matchInput.lastTickAt)
  const elapsedTicks = Math.floor(elapsedMs / TICK_INTERVAL_MS)

  if (elapsedTicks === 0 || matchInput.winner) {
    return { ...matchInput, lastTickAt: matchInput.lastTickAt + elapsedTicks * TICK_INTERVAL_MS }
  }

  let nextMatch = structuredClone(matchInput)

  for (let index = 0; index < elapsedTicks; index += 1) {
    nextMatch = advanceOneTick(nextMatch)
  }

  nextMatch.lastTickAt = matchInput.lastTickAt + elapsedTicks * TICK_INTERVAL_MS

  return nextMatch
}

export const getSecondsUntilNextTick = (match: MatchState, now = Date.now()): number => {
  const elapsed = Math.max(0, now - match.lastTickAt)
  const remainder = elapsed % TICK_INTERVAL_MS

  return Math.ceil((TICK_INTERVAL_MS - remainder) / 1000)
}
