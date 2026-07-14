import { BOARD_NODES, MAJOR_STRAIN_DAMAGE, MILD_STRAIN_DAMAGE, NODE_ORDER, SABOTEUR_AP, STABILIZER_AP } from './constants'
import type { HiddenFault, MatchState, NodeId, NodeState, Role, StatusEffect } from './types'

export const createId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export const apBudgetByRole = (role: Role): number => (role === 'Stabilizer' ? STABILIZER_AP : SABOTEUR_AP)

export const createInitialNodes = (): NodeState[] =>
  BOARD_NODES.map((node) => ({
    id: node.id,
    name: node.name,
    integrity: node.integrity,
    baseThroughput: 1,
    hasBuffer: false,
    statuses: [],
    hiddenFaults: [],
  }))

export const isAdjacent = (first: NodeId, second: NodeId): boolean => {
  const left = NODE_ORDER.indexOf(first)
  const right = NODE_ORDER.indexOf(second)

  return Math.abs(left - right) === 1
}

export const getNode = (match: MatchState, nodeId: NodeId): NodeState | undefined =>
  match.nodes.find((node) => node.id === nodeId)

export const addStatus = (node: NodeState, status: StatusEffect): void => {
  node.statuses.push(status)
}

export const getActiveStatuses = (node: NodeState, tick: number): StatusEffect[] =>
  node.statuses.filter((status) => status.activeFromTick <= tick && status.activeUntilTick >= tick)

export const hasStatus = (node: NodeState, statusType: StatusEffect['type'], tick: number): boolean =>
  getActiveStatuses(node, tick).some((status) => status.type === statusType)

export const removeStatusesByType = (node: NodeState, statusTypes: StatusEffect['type'][]): boolean => {
  const previousLength = node.statuses.length
  node.statuses = node.statuses.filter((status) => !statusTypes.includes(status.type))

  return node.statuses.length !== previousLength
}

export const applyIntegrityDamage = (node: NodeState, damage: number): void => {
  if (damage <= 0) {
    return
  }

  if (node.hasBuffer) {
    node.hasBuffer = false
    return
  }

  node.integrity = clamp(node.integrity - damage, 0, 100)
}

export const applyIntegrityHeal = (node: NodeState, amount: number): void => {
  if (amount <= 0) {
    return
  }

  node.integrity = clamp(node.integrity + amount, 0, 100)
}

export const revealNodeFaults = (node: NodeState): void => {
  for (const fault of node.hiddenFaults) {
    fault.revealed = true
  }
}

export const applyStrainDamage = (node: NodeState, tick: number): void => {
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

export const markFaultRevealed = (fault: HiddenFault): void => {
  fault.revealed = true
}
