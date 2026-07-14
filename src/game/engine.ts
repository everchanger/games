import {
  ACTIONS,
  BOARD_NODES,
  EFFICIENCY_MAX,
  EFFICIENCY_MIN,
  EFFICIENCY_STEP_LIMIT,
  MAJOR_STRAIN_DAMAGE,
  MAX_ACTIONS_PER_TURN,
  MILD_STRAIN_DAMAGE,
  NODE_ORDER,
  SABOTEUR_AP,
  STABILIZER_AP,
  TICK_INTERVAL_MS,
} from './constants'
import type {
  ActionDefinition,
  ActionSelection,
  DomainResult,
  HiddenFault,
  MatchState,
  NodeId,
  NodeState,
  Role,
  StatusEffect,
} from './types'

const createId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const isAdjacent = (first: NodeId, second: NodeId): boolean => {
  const left = NODE_ORDER.indexOf(first)
  const right = NODE_ORDER.indexOf(second)

  return Math.abs(left - right) === 1
}

const getActionDefinition = (actionId: ActionSelection['actionId']): ActionDefinition | undefined =>
  ACTIONS.find((action) => action.id === actionId)

const apBudgetByRole = (role: Role): number => (role === 'Stabilizer' ? STABILIZER_AP : SABOTEUR_AP)

const addStatus = (node: NodeState, status: StatusEffect): void => {
  node.statuses.push(status)
}

const removeStatusesByType = (node: NodeState, statusTypes: StatusEffect['type'][]): boolean => {
  const previousLength = node.statuses.length
  node.statuses = node.statuses.filter((status) => !statusTypes.includes(status.type))

  return node.statuses.length !== previousLength
}

const applyIntegrityDamage = (node: NodeState, damage: number): void => {
  if (damage <= 0) {
    return
  }

  if (node.hasBuffer) {
    node.hasBuffer = false
    return
  }

  node.integrity = clamp(node.integrity - damage, 0, 100)
}

const applyIntegrityHeal = (node: NodeState, amount: number): void => {
  if (amount <= 0) {
    return
  }

  node.integrity = clamp(node.integrity + amount, 0, 100)
}

const getNode = (match: MatchState, nodeId: NodeId): NodeState | undefined =>
  match.nodes.find((node) => node.id === nodeId)

const revealNodeFaults = (node: NodeState): void => {
  for (const fault of node.hiddenFaults) {
    fault.revealed = true
  }
}

const applyActionEffect = (match: MatchState, action: ActionSelection): DomainResult => {
  const target = action.targets[0]
  const node = getNode(match, target)

  if (!node) {
    return { ok: false, reason: 'Target node not found.', match }
  }

  switch (action.actionId) {
    case 'polish-gears':
      applyIntegrityHeal(node, 12)
      break

    case 'speed-boost': {
      addStatus(node, {
        type: 'speedBoost',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 2,
        throughputDelta: 0.2,
      })
      addStatus(node, {
        type: 'mildStrain',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 2,
      })
      break
    }

    case 'reserve-tank':
      if (node.hasBuffer) {
        return { ok: false, reason: 'Node already has a buffer.', match }
      }
      node.hasBuffer = true
      break

    case 'reroute-batch': {
      addStatus(node, {
        type: 'reroute',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 1,
        throughputDelta: 0.25,
      })
      addStatus(node, {
        type: 'mildStrain',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 1,
      })
      break
    }

    case 'deep-inspection':
      revealNodeFaults(node)
      removeStatusesByType(node, ['falseReading'])
      break

    case 'emergency-patch': {
      const removedNegative = removeStatusesByType(node, ['spill', 'gumSlowdown', 'mildStrain'])
      if (!removedNegative) {
        applyIntegrityHeal(node, 6)
      }
      break
    }

    case 'sticky-spill':
      addStatus(node, {
        type: 'spill',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 2,
        throughputDelta: -0.15,
      })
      break

    case 'ingredient-swap': {
      const existing = node.hiddenFaults.find((fault) => fault.type === 'ingredientSwap' && fault.triggerAtTick > match.tickCount)
      if (existing) {
        return { ok: false, reason: 'Ingredient Swap fault already hidden on this node.', match }
      }
      node.hiddenFaults.push({
        id: createId(),
        type: 'ingredientSwap',
        triggerAtTick: match.tickCount + 2,
        revealed: false,
      })
      break
    }

    case 'gum-works': {
      const second = action.targets[1]
      if (!second || !isAdjacent(target, second)) {
        return { ok: false, reason: 'Gum the Works requires two adjacent targets.', match }
      }

      const firstNode = getNode(match, target)
      const secondNode = getNode(match, second)

      if (!firstNode || !secondNode) {
        return { ok: false, reason: 'Invalid Gum the Works targets.', match }
      }

      const firstIndex = NODE_ORDER.indexOf(firstNode.id)
      const secondIndex = NODE_ORDER.indexOf(secondNode.id)
      const upstream = firstIndex < secondIndex ? firstNode : secondNode
      const downstream = firstIndex < secondIndex ? secondNode : firstNode

      addStatus(upstream, { type: 'mildStrain', activeFromTick: match.tickCount + 1, activeUntilTick: match.tickCount + 2 })
      addStatus(downstream, {
        type: 'gumSlowdown',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 2,
        throughputDelta: -0.1,
      })
      break
    }

    case 'false-reading':
      addStatus(node, { type: 'falseReading', activeFromTick: match.tickCount + 1, activeUntilTick: match.tickCount + 2 })
      break

    case 'sugar-rush-spike':
      addStatus(node, {
        type: 'sugarRushBoost',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 1,
        throughputDelta: 0.15,
      })
      node.hiddenFaults.push({
        id: createId(),
        type: 'ingredientSwap',
        triggerAtTick: match.tickCount + 2,
        revealed: false,
        activeUntilTick: match.tickCount + 2,
      })
      break

    case 'coolant-drain': {
      addStatus(node, { type: 'majorStrain', activeFromTick: match.tickCount + 1, activeUntilTick: match.tickCount + 2 })
      const targetIndex = NODE_ORDER.indexOf(node.id)
      const neighbors = [NODE_ORDER[targetIndex - 1], NODE_ORDER[targetIndex + 1]].filter(Boolean) as NodeId[]
      for (const neighborId of neighbors) {
        const neighborNode = getNode(match, neighborId)
        if (neighborNode) {
          addStatus(neighborNode, { type: 'mildStrain', activeFromTick: match.tickCount + 1, activeUntilTick: match.tickCount + 1 })
        }
      }
      break
    }

    default:
      return { ok: false, reason: 'Unsupported action.', match }
  }

  return { ok: true, match }
}

const resolveTriggerEffects = (node: NodeState, fault: HiddenFault): void => {
  if (fault.type === 'ingredientSwap') {
    const isSugarCrash = fault.activeUntilTick !== undefined
    applyIntegrityDamage(node, isSugarCrash ? 10 : 12)

    if (isSugarCrash) {
      addStatus(node, {
        type: 'sugarCrashSlowdown',
        activeFromTick: fault.triggerAtTick,
        activeUntilTick: fault.triggerAtTick,
        throughputDelta: -0.1,
      })
      fault.revealed = true
      return
    }

    addStatus(node, { type: 'mildStrain', activeFromTick: fault.triggerAtTick + 1, activeUntilTick: fault.triggerAtTick + 1 })
    fault.revealed = true
  }
}

const getActiveStatuses = (node: NodeState, tick: number): StatusEffect[] =>
  node.statuses.filter((status) => status.activeFromTick <= tick && status.activeUntilTick >= tick)

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

const hasStatus = (node: NodeState, statusType: StatusEffect['type'], tick: number): boolean =>
  getActiveStatuses(node, tick).some((status) => status.type === statusType)

const applyStrainDamage = (node: NodeState, tick: number): void => {
  const hasMajorStrain = hasStatus(node, 'majorStrain', tick)
  const hasMildStrain = hasStatus(node, 'mildStrain', tick)

  if (hasMajorStrain) {
    applyIntegrityDamage(node, MAJOR_STRAIN_DAMAGE)
    return
  }

  if (hasMildStrain) {
    applyIntegrityDamage(node, MILD_STRAIN_DAMAGE)
  }
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
  nodes: BOARD_NODES.map((node) => ({
    id: node.id,
    name: node.name,
    integrity: node.integrity,
    baseThroughput: 1,
    hasBuffer: false,
    statuses: [],
    hiddenFaults: [],
  })),
})

export const getActionsForRole = (role: Role): ActionDefinition[] => ACTIONS.filter((action) => action.role === role)

export const applyAction = (matchInput: MatchState, action: ActionSelection): DomainResult => {
  const definition = getActionDefinition(action.actionId)

  if (!definition) {
    return { ok: false, reason: 'Unknown action.', match: matchInput }
  }

  if (matchInput.winner) {
    return { ok: false, reason: 'Match is already finished.', match: matchInput }
  }

  if (definition.role !== matchInput.activeRole) {
    return { ok: false, reason: `Only ${matchInput.activeRole} actions are allowed right now.`, match: matchInput }
  }

  if (action.targets.length < definition.minTargets || action.targets.length > definition.maxTargets) {
    return { ok: false, reason: 'Invalid number of targets.', match: matchInput }
  }

  if (matchInput.actionsUsed >= MAX_ACTIONS_PER_TURN) {
    return { ok: false, reason: 'Maximum actions for this turn reached.', match: matchInput }
  }

  if (matchInput.apRemaining < definition.cost) {
    return { ok: false, reason: 'Not enough action points.', match: matchInput }
  }

  const match: MatchState = structuredClone(matchInput)
  const effectResult = applyActionEffect(match, action)

  if (!effectResult.ok) {
    return effectResult
  }

  match.apRemaining -= definition.cost
  match.actionsUsed += 1

  return { ok: true, match }
}

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

  const nodeFactors = match.nodes.map((node) => calculateNodeFactor(node, nextTick))
  const minFactor = Math.min(...nodeFactors)
  const averageFactor = nodeFactors.reduce((sum, factor) => sum + factor, 0) / nodeFactors.length
  const systemFactor = 0.6 * minFactor + 0.4 * averageFactor
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
    hiddenFaults: node.hiddenFaults.filter((fault) => {
      if (fault.triggerAtTick > match.tickCount) {
        return true
      }

      return fault.revealed
    }),
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
