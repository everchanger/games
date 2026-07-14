export type Role = 'Stabilizer' | 'Saboteur'

export const NODE_IDS = [
  'ingredient-hopper',
  'mixing-vat',
  'conveyor-belt',
  'packaging-line',
] as const

export type NodeId = (typeof NODE_IDS)[number]

export type IntegrityTier = 'green' | 'yellow' | 'red' | 'broken'

export type StatusType =
  | 'speedBoost'
  | 'mildStrain'
  | 'majorStrain'
  | 'spill'
  | 'reroute'
  | 'falseReading'
  | 'gumSlowdown'
  | 'sugarRushBoost'
  | 'sugarCrashSlowdown'
  | 'coolantDrain'

export interface StatusEffect {
  type: StatusType
  activeFromTick: number
  activeUntilTick: number
  throughputDelta?: number
}

export interface HiddenFault {
  id: string
  type: 'ingredientSwap' | 'sugarRushSpike'
  triggerAtTick: number
  revealed: boolean
}

export interface NodeState {
  id: NodeId
  name: string
  integrity: number
  baseThroughput: number
  hasBuffer: boolean
  statuses: StatusEffect[]
  hiddenFaults: HiddenFault[]
}

export type ActionId =
  | 'polish-gears'
  | 'speed-boost'
  | 'reserve-tank'
  | 'reroute-batch'
  | 'deep-inspection'
  | 'emergency-patch'
  | 'sticky-spill'
  | 'ingredient-swap'
  | 'gum-works'
  | 'false-reading'
  | 'sugar-rush-spike'
  | 'coolant-drain'

export interface ActionSelection {
  actionId: ActionId
  targets: NodeId[]
}

export interface MatchState {
  id: string
  efficiency: number
  latestEfficiencyDelta: number
  tickCount: number
  lastTickAt: number
  turnNumber: number
  activeRole: Role
  apRemaining: number
  actionsUsed: number
  nodes: NodeState[]
  winner: Role | null
}

export interface VisibleNodeState {
  id: NodeId
  name: string
  integrityTier: IntegrityTier
  hasBuffer: boolean
  visibleStatuses: string[]
  revealedFaults: string[]
}

export interface VisibleMatchState {
  id: string
  efficiency: number
  latestEfficiencyDelta: number
  tickCount: number
  turnNumber: number
  activeRole: Role
  apRemaining: number
  actionsUsed: number
  winner: Role | null
  nodes: VisibleNodeState[]
}

export interface ActionDefinition {
  id: ActionId
  role: Role
  label: string
  cost: number
  maxTargets: number
  minTargets: number
}

export interface DomainResult {
  ok: boolean
  reason?: string
  match: MatchState
}
