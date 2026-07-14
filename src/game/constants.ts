import type { ActionDefinition, NodeId } from './types'

export const TICK_INTERVAL_MS = 10_000
export const MAX_ACTIONS_PER_TURN = 3
export const STABILIZER_AP = 4
export const SABOTEUR_AP = 3

export const EFFICIENCY_MIN = 0
export const EFFICIENCY_MAX = 100
export const EFFICIENCY_STEP_LIMIT = 8

export const MILD_STRAIN_DAMAGE = 2
export const MAJOR_STRAIN_DAMAGE = 5

export const BOARD_NODES: ReadonlyArray<{ id: NodeId; name: string; integrity: number }> = [
  { id: 'ingredient-hopper', name: 'Ingredient Hopper', integrity: 78 },
  { id: 'mixing-vat', name: 'Mixing Vat', integrity: 74 },
  { id: 'conveyor-belt', name: 'Conveyor Belt', integrity: 72 },
  { id: 'packaging-line', name: 'Packaging Line', integrity: 76 },
]

export const ACTIONS: ReadonlyArray<ActionDefinition> = [
  { id: 'polish-gears', role: 'Stabilizer', label: 'Polish the Gears', cost: 1, minTargets: 1, maxTargets: 1 },
  { id: 'speed-boost', role: 'Stabilizer', label: 'Speed Boost', cost: 2, minTargets: 1, maxTargets: 1 },
  { id: 'reserve-tank', role: 'Stabilizer', label: 'Add Reserve Tank', cost: 2, minTargets: 1, maxTargets: 1 },
  { id: 'reroute-batch', role: 'Stabilizer', label: 'Reroute Batch', cost: 2, minTargets: 1, maxTargets: 1 },
  { id: 'deep-inspection', role: 'Stabilizer', label: 'Deep Inspection', cost: 3, minTargets: 1, maxTargets: 1 },
  { id: 'emergency-patch', role: 'Stabilizer', label: 'Emergency Patch', cost: 1, minTargets: 1, maxTargets: 1 },
  { id: 'sticky-spill', role: 'Saboteur', label: 'Sticky Spill', cost: 1, minTargets: 1, maxTargets: 1 },
  { id: 'ingredient-swap', role: 'Saboteur', label: 'Ingredient Swap', cost: 2, minTargets: 1, maxTargets: 1 },
  { id: 'gum-works', role: 'Saboteur', label: 'Gum the Works', cost: 2, minTargets: 2, maxTargets: 2 },
  { id: 'false-reading', role: 'Saboteur', label: 'False Reading', cost: 2, minTargets: 1, maxTargets: 1 },
  { id: 'sugar-rush-spike', role: 'Saboteur', label: 'Sugar Rush Spike', cost: 2, minTargets: 1, maxTargets: 1 },
  { id: 'coolant-drain', role: 'Saboteur', label: 'Coolant Drain', cost: 3, minTargets: 1, maxTargets: 1 },
]

export const NODE_ORDER: NodeId[] = BOARD_NODES.map((node) => node.id)
