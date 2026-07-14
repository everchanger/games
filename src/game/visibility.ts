import type { IntegrityTier, MatchState, Role, VisibleMatchState, VisibleNodeState } from './types'

const toTier = (integrity: number): IntegrityTier => {
  if (integrity <= 0) {
    return 'broken'
  }

  if (integrity <= 34) {
    return 'red'
  }

  if (integrity <= 69) {
    return 'yellow'
  }

  return 'green'
}

const shiftTierHealthier = (tier: IntegrityTier): IntegrityTier => {
  if (tier === 'red') {
    return 'yellow'
  }

  if (tier === 'yellow') {
    return 'green'
  }

  return tier
}

const toVisibleStatusName = (status: string): string => {
  if (status === 'mildStrain') {
    return 'Mild strain'
  }

  if (status === 'majorStrain') {
    return 'Major strain'
  }

  if (status === 'spill') {
    return 'Sticky spill'
  }

  if (status === 'speedBoost' || status === 'sugarRushBoost') {
    return 'Boost'
  }

  if (status === 'gumSlowdown' || status === 'sugarCrashSlowdown') {
    return 'Slowdown'
  }

  if (status === 'reroute') {
    return 'Reroute'
  }

  return 'Status'
}

const toVisibleFaultName = (faultType: string): string => {
  if (faultType === 'ingredientSwap') {
    return 'Ingredient Swap'
  }

  if (faultType === 'sugarRushSpike') {
    return 'Sugar Rush Spike'
  }

  return 'Fault'
}

const toVisibleNode = (match: MatchState, viewerRole: Role): VisibleNodeState[] =>
  match.nodes.map((node) => {
    const activeStatuses = node.statuses.filter(
      (status) => status.activeFromTick <= match.tickCount && status.activeUntilTick >= match.tickCount,
    )
    const statusNames = activeStatuses
      .map((status) => status.type)
      .filter((status) => status !== 'falseReading')
      .map(toVisibleStatusName)

    const isFalseReadingActive = activeStatuses.some((status) => status.type === 'falseReading')
    const baseTier = toTier(node.integrity)
    const visibleTier = viewerRole === 'Stabilizer' && isFalseReadingActive ? shiftTierHealthier(baseTier) : baseTier

    return {
      id: node.id,
      name: node.name,
      integrityTier: visibleTier,
      hasBuffer: node.hasBuffer,
      visibleStatuses: statusNames,
      revealedFaults: node.hiddenFaults.filter((fault) => fault.revealed).map((fault) => toVisibleFaultName(fault.type)),
    }
  })

export const getVisibleState = (match: MatchState, viewerRole: Role): VisibleMatchState => ({
  id: match.id,
  efficiency: match.efficiency,
  latestEfficiencyDelta: match.latestEfficiencyDelta,
  tickCount: match.tickCount,
  turnNumber: match.turnNumber,
  activeRole: match.activeRole,
  apRemaining: match.apRemaining,
  actionsUsed: match.actionsUsed,
  winner: match.winner,
  nodes: toVisibleNode(match, viewerRole),
})

export { toTier }
