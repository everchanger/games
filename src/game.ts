export type Side = 'builder' | 'saboteur'
export type StageId = 'intake' | 'relay' | 'forge' | 'export'

export interface StageState {
  id: StageId
  label: string
  throughput: number
  resilience: number
  buffer: number
  friction: number
  faults: number
}

export interface PlannedAction {
  actionId: ActionId
  stageId: StageId
}

export interface PendingTurn {
  side: Side
  actions: PlannedAction[]
  spent: number
  submittedAt: string
}

export interface StageReport {
  stageId: StageId
  label: string
  flow: number
  pressure: number
  tags: string[]
}

export interface ResolutionSummary {
  round: number
  outputBefore: number
  outputAfter: number
  delta: number
  notes: string[]
  stageReports: StageReport[]
  resolvedAt: string
}

export interface MatchState {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  round: number
  targetOutput: number
  systemOutput: number
  nextSide: Side
  winner: Side | null
  stages: StageState[]
  pendingTurn: PendingTurn | null
  history: ResolutionSummary[]
}

export type ActionId =
  | 'calibrate-flow'
  | 'reinforce-stage'
  | 'add-buffer'
  | 'reroute-pulse'
  | 'purge-instability'
  | 'gum-up'
  | 'seed-fault'
  | 'overload-stage'
  | 'drain-buffer'
  | 'crack-supports'

export interface ActionDefinition {
  id: ActionId
  side: Side
  label: string
  cost: number
  description: string
}

const ACTION_BUDGETS: Record<Side, number> = {
  builder: 4,
  saboteur: 3,
}

const DEFAULT_STAGES: StageState[] = [
  {
    id: 'intake',
    label: 'Intake',
    throughput: 3,
    resilience: 3,
    buffer: 1,
    friction: 1,
    faults: 0,
  },
  {
    id: 'relay',
    label: 'Relay',
    throughput: 2,
    resilience: 3,
    buffer: 1,
    friction: 1,
    faults: 1,
  },
  {
    id: 'forge',
    label: 'Forge',
    throughput: 3,
    resilience: 2,
    buffer: 0,
    friction: 1,
    faults: 1,
  },
  {
    id: 'export',
    label: 'Export',
    throughput: 3,
    resilience: 3,
    buffer: 1,
    friction: 0,
    faults: 1,
  },
]

export const SIDE_LABELS: Record<Side, string> = {
  builder: 'Builder',
  saboteur: 'Saboteur',
}

export const ACTIONS: ActionDefinition[] = [
  {
    id: 'calibrate-flow',
    side: 'builder',
    label: 'Calibrate flow',
    cost: 1,
    description: 'Raise local throughput and shave away minor drag.',
  },
  {
    id: 'reinforce-stage',
    side: 'builder',
    label: 'Reinforce stage',
    cost: 1,
    description: 'Harden the stage and tidy up an exposed fault line.',
  },
  {
    id: 'add-buffer',
    side: 'builder',
    label: 'Add buffer',
    cost: 1,
    description: 'Create a little slack so the stage can absorb pressure.',
  },
  {
    id: 'reroute-pulse',
    side: 'builder',
    label: 'Reroute pulse',
    cost: 2,
    description: 'Push more flow through a stage while adding a backup pocket.',
  },
  {
    id: 'purge-instability',
    side: 'builder',
    label: 'Purge instability',
    cost: 2,
    description: 'Strip out built-up faults and some sticky drag.',
  },
  {
    id: 'gum-up',
    side: 'saboteur',
    label: 'Gum up flow',
    cost: 1,
    description: 'Add friction that quietly slows a stage.',
  },
  {
    id: 'seed-fault',
    side: 'saboteur',
    label: 'Seed fault',
    cost: 1,
    description: 'Introduce a fault that stresses future resolutions.',
  },
  {
    id: 'overload-stage',
    side: 'saboteur',
    label: 'Overload stage',
    cost: 2,
    description: 'Trade a sharp throughput hit for a burst of friction and faults.',
  },
  {
    id: 'drain-buffer',
    side: 'saboteur',
    label: 'Drain buffer',
    cost: 1,
    description: 'Empty local slack and leave residue behind.',
  },
  {
    id: 'crack-supports',
    side: 'saboteur',
    label: 'Crack supports',
    cost: 2,
    description: 'Knock resilience down and expose the stage to new faults.',
  },
]


function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function now() {
  return new Date().toISOString()
}

function getStageById(stages: StageState[], stageId: StageId) {
  const stage = stages.find((candidate) => candidate.id === stageId)

  if (!stage) {
    throw new Error(`Unknown stage: ${stageId}`)
  }

  return stage
}

function applyAction(stage: StageState, actionId: ActionId) {
  switch (actionId) {
    case 'calibrate-flow':
      stage.throughput = clamp(stage.throughput + 1, 1, 6)
      stage.friction = clamp(stage.friction - 1, 0, 5)
      break
    case 'reinforce-stage':
      stage.resilience = clamp(stage.resilience + 1, 1, 6)
      stage.faults = clamp(stage.faults - 1, 0, 5)
      break
    case 'add-buffer':
      stage.buffer = clamp(stage.buffer + 1, 0, 3)
      break
    case 'reroute-pulse':
      stage.throughput = clamp(stage.throughput + 1, 1, 6)
      stage.buffer = clamp(stage.buffer + 1, 0, 3)
      stage.friction = clamp(stage.friction - 1, 0, 5)
      break
    case 'purge-instability':
      stage.faults = clamp(stage.faults - 2, 0, 5)
      stage.friction = clamp(stage.friction - 1, 0, 5)
      break
    case 'gum-up':
      stage.friction = clamp(stage.friction + 1, 0, 5)
      break
    case 'seed-fault':
      stage.faults = clamp(stage.faults + 1, 0, 5)
      break
    case 'overload-stage':
      stage.throughput = clamp(stage.throughput - 1, 1, 6)
      stage.friction = clamp(stage.friction + 1, 0, 5)
      stage.faults = clamp(stage.faults + 1, 0, 5)
      break
    case 'drain-buffer':
      stage.buffer = clamp(stage.buffer - 1, 0, 3)
      stage.friction = clamp(stage.friction + 1, 0, 5)
      break
    case 'crack-supports':
      stage.resilience = clamp(stage.resilience - 1, 1, 6)
      stage.faults = clamp(stage.faults + 1, 0, 5)
      break
  }
}

export function getBudget(side: Side) {
  return ACTION_BUDGETS[side]
}

export function getActionsForSide(side: Side) {
  return ACTIONS.filter((action) => action.side === side)
}

export function getSpent(actions: PlannedAction[]) {
  return actions.reduce((total, action) => total + getAction(action.actionId).cost, 0)
}

export function getAction(actionId: ActionId) {
  const action = ACTIONS.find((candidate) => candidate.id === actionId)

  if (!action) {
    throw new Error(`Unknown action: ${actionId}`)
  }

  return action
}

export function getStageFlow(stage: StageState) {
  const score =
    stage.throughput * 2 + stage.buffer + stage.resilience - stage.friction * 2 - stage.faults * 2

  return clamp(score, 0, 18)
}

export function getStagePressure(stage: StageState) {
  return clamp(stage.friction + stage.faults - stage.buffer - Math.floor(stage.resilience / 2), 0, 10)
}

export function getSystemOutput(stages: StageState[]) {
  const totalFlow = stages.reduce((sum, stage) => sum + getStageFlow(stage), 0)
  return clamp(Math.round((totalFlow / (stages.length * 18)) * 100), 0, 100)
}

export function getStageTags(stage: StageState) {
  const tags: string[] = []
  const flow = getStageFlow(stage)
  const pressure = getStagePressure(stage)

  if (flow >= 12) {
    tags.push('surging')
  } else if (flow <= 4) {
    tags.push('stalled')
  }

  if (pressure >= 5) {
    tags.push('critical pressure')
  } else if (pressure >= 3) {
    tags.push('strained')
  }

  if (stage.buffer >= 2) {
    tags.push('buffered')
  }

  if (stage.faults === 0 && stage.friction === 0) {
    tags.push('clean')
  }

  return tags.length > 0 ? tags : ['steady']
}

function summarizeResolution(
  before: StageState[],
  after: StageState[],
  round: number,
  outputBefore: number,
  outputAfter: number,
) {
  const delta = outputAfter - outputBefore
  const notes: string[] = []

  if (delta > 0) {
    notes.push(`The system found ${delta} points of output after this exchange.`)
  } else if (delta < 0) {
    notes.push(`The system dropped ${Math.abs(delta)} output points during resolution.`)
  } else {
    notes.push('The system held position, but pressure shifted under the surface.')
  }

  const improvingStage = after
    .map((stage, index) => ({
      stage,
      flowDelta: getStageFlow(stage) - getStageFlow(before[index]),
    }))
    .sort((left, right) => right.flowDelta - left.flowDelta)[0]

  if (improvingStage && improvingStage.flowDelta > 0) {
    notes.push(`${improvingStage.stage.label} is moving cleaner than before.`)
  }

  const pressuredStage = after
    .map((stage, index) => ({
      stage,
      pressureDelta: getStagePressure(stage) - getStagePressure(before[index]),
    }))
    .sort((left, right) => right.pressureDelta - left.pressureDelta)[0]

  if (pressuredStage && pressuredStage.pressureDelta > 0) {
    notes.push(`${pressuredStage.stage.label} shows fresh pressure symptoms.`)
  }

  if (after.some((stage) => getStagePressure(stage) >= 5)) {
    notes.push('At least one stage is close to cascading failure.')
  }

  if (after.some((stage) => getStageFlow(stage) <= 2)) {
    notes.push('A local bottleneck is nearly choking the whole line.')
  }

  const stageReports = after.map((stage) => ({
    stageId: stage.id,
    label: stage.label,
    flow: getStageFlow(stage),
    pressure: getStagePressure(stage),
    tags: getStageTags(stage),
  }))

  return {
    round,
    outputBefore,
    outputAfter,
    delta,
    notes,
    stageReports,
    resolvedAt: now(),
  } satisfies ResolutionSummary
}

export function createMatch(name?: string): MatchState {
  const stages = DEFAULT_STAGES.map((stage) => ({ ...stage }))
  const systemOutput = getSystemOutput(stages)
  const createdAt = now()

  return {
    id: crypto.randomUUID(),
    name: name ?? `Match ${Math.floor(Math.random() * 900 + 100)}`,
    createdAt,
    updatedAt: createdAt,
    round: 1,
    targetOutput: 100,
    systemOutput,
    nextSide: 'builder',
    winner: null,
    stages,
    pendingTurn: null,
    history: [],
  }
}

export function submitTurn(match: MatchState, side: Side, actions: PlannedAction[]): MatchState {
  if (match.winner) {
    return match
  }

  if (match.nextSide !== side) {
    throw new Error(`It is not ${SIDE_LABELS[side]}'s turn.`)
  }

  const spent = getSpent(actions)

  if (spent === 0) {
    throw new Error('Choose at least one action before resolving the turn.')
  }

  if (spent > getBudget(side)) {
    throw new Error('This turn exceeds the action budget.')
  }

  if (side === 'builder') {
    return {
      ...match,
      nextSide: 'saboteur',
      pendingTurn: {
        side,
        actions,
        spent,
        submittedAt: now(),
      },
      updatedAt: now(),
    }
  }

  if (!match.pendingTurn) {
    throw new Error('The builder must lock in hidden edits first.')
  }

  const beforeStages = match.stages.map((stage) => ({ ...stage }))
  const afterStages = match.stages.map((stage) => ({ ...stage }))

  for (const action of match.pendingTurn.actions) {
    applyAction(getStageById(afterStages, action.stageId), action.actionId)
  }

  for (const action of actions) {
    applyAction(getStageById(afterStages, action.stageId), action.actionId)
  }

  const outputBefore = match.systemOutput
  const outputAfter = getSystemOutput(afterStages)
  const summary = summarizeResolution(beforeStages, afterStages, match.round, outputBefore, outputAfter)
  const winner = outputAfter >= match.targetOutput ? 'builder' : outputAfter <= 0 ? 'saboteur' : null

  return {
    ...match,
    stages: afterStages,
    systemOutput: outputAfter,
    winner,
    nextSide: 'builder',
    pendingTurn: null,
    history: [summary, ...match.history].slice(0, 8),
    round: match.round + 1,
    updatedAt: now(),
  }
}
