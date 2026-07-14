import { ACTIONS, MAX_ACTIONS_PER_TURN, NODE_ORDER } from './constants'
import {
  addStatus,
  applyIntegrityHeal,
  createId,
  getNode,
  isAdjacent,
  removeStatusesByType,
  revealNodeFaults,
} from './shared'
import type { ActionDefinition, ActionSelection, DomainResult, MatchState, NodeId } from './types'

const getActionDefinition = (actionId: ActionSelection['actionId']): ActionDefinition | undefined =>
  ACTIONS.find((action) => action.id === actionId)

const createHiddenFault = (
  type: 'ingredientSwap' | 'sugarRushSpike',
  triggerAtTick: number,
): MatchState['nodes'][number]['hiddenFaults'][number] => ({
  id: createId(),
  type,
  triggerAtTick,
  revealed: false,
})

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

    case 'speed-boost':
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

    case 'reserve-tank':
      if (node.hasBuffer) {
        return { ok: false, reason: 'Node already has a buffer.', match }
      }
      node.hasBuffer = true
      break

    case 'reroute-batch':
      addStatus(node, {
        type: 'reroute',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 1,
      })
      addStatus(node, {
        type: 'mildStrain',
        activeFromTick: match.tickCount + 1,
        activeUntilTick: match.tickCount + 1,
      })
      break

    case 'deep-inspection':
      revealNodeFaults(node)
      removeStatusesByType(node, ['falseReading'])
      break

    case 'emergency-patch': {
      const removedNegative = removeStatusesByType(node, ['spill', 'gumSlowdown', 'mildStrain', 'sugarCrashSlowdown'])
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
      node.hiddenFaults.push(createHiddenFault('ingredientSwap', match.tickCount + 2))
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
      node.hiddenFaults.push(createHiddenFault('sugarRushSpike', match.tickCount + 2))
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

export const getActionsForRole = (role: MatchState['activeRole']): ActionDefinition[] =>
  ACTIONS.filter((action) => action.role === role)

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
