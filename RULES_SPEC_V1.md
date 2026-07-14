# Rules Spec V1

## Purpose
This document is the implementation source of truth for the first playable prototype described in `plan.md`.

If there is ambiguity between documents for the first web POC:
- `GAME_DESIGN_DOCUMENT.md` defines product intent
- `plan.md` defines scope and sequencing
- `RULES_SPEC_V1.md` defines exact playable rules and simulation behavior

This version is intentionally compact and implementation-oriented.
It is for the **single-device, locally persisted, ticking web prototype**.

---

## 1. Prototype Goal
The prototype must answer these questions:
- Is the shared-system gameplay loop fun?
- Does visible ticking create urgency?
- Does hidden opponent intent feel interesting even on one device?
- Is the board readable enough without heavy reports?
- Do the two roles feel different and both fun?

This spec prioritizes clarity and testability over realism.

---

## 2. Match Structure

## Roles
There are two roles:
- **Stabilizer**
- **Saboteur**

## Turn order
- Stabilizer acts first at match start.
- Players alternate turns.
- A player cannot act twice in a row.
- The system continues ticking between turns.

## Match flow
1. A new match starts.
2. The system begins at **50 efficiency**.
3. Stabilizer takes a turn.
4. Stabilizer actions apply immediately.
5. The system ticks every **10 seconds**.
6. Saboteur takes a turn when available.
7. Saboteur actions apply immediately.
8. The system keeps ticking every **10 seconds**.
9. Stabilizer takes the next turn.
10. Repeat until a win condition is reached.

## Win conditions
- Stabilizer wins if **efficiency reaches 100 or higher**.
- Saboteur wins if **efficiency reaches 0 or lower**.

For the first POC, there is **no max turn limit**.

---

## 3. Board Layout
The first prototype uses **4 nodes** in a linear pipeline:

1. Ingredient Hopper
2. Mixing Vat
3. Conveyor Belt
4. Packaging Line

Flow direction is left to right.

### Node responsibilities
- **Ingredient Hopper**: input source
- **Mixing Vat**: transformation node
- **Conveyor Belt**: transport / flow node
- **Packaging Line**: final output node

The board should stay readable on mobile-sized screens.

---

## 4. Core Stats

## 4.1 Efficiency
Efficiency is the main global output number.

- Range: **0–100**
- Visible to both players at all times
- Updated on every tick
- Represents how well the full factory is currently performing

This is the most important visible number in the prototype.

---

## 4.2 Integrity
Each node has integrity.

- Range: **0–100**
- Internal numeric value
- UI shows a visible tier, not necessarily the exact number

### Integrity tiers for UI
- **Green**: 70–100
- **Yellow**: 35–69
- **Red**: 1–34
- **Broken**: 0

Integrity represents how structurally healthy a node is.
It changes more slowly than throughput and is the long-term health layer.

---

## 4.3 Throughput
Each node has throughput behavior.

For V1, every node has:
- `baseThroughput = 1.0`
- `temporaryThroughputModifier = 1.0` by default

Throughput represents how effectively a node is processing flow right now.
It is the short-term flow layer.

Temporary modifiers from actions and statuses affect throughput more quickly than integrity does.

---

## 4.4 Buffer
Each node may optionally hold a buffer.

For V1:
- a node has either **0 or 1** buffer
- a buffer absorbs the next integrity-damaging event affecting that node
- once used, the buffer is removed

Buffers are visible to both players.

---

## 4.5 Hidden faults
A node may contain hidden faults planted by the Saboteur.

For V1:
- a node may hold at most **1 hidden fault of each type**
- hidden faults are invisible unless revealed
- a hidden fault may trigger after a deterministic delay

---

## 5. Visibility Rules

## Always visible to both players
- current efficiency
- board layout
- node names
- node integrity tier
- whether a node has a buffer
- visible statuses
- whose turn it is
- most recent visible efficiency delta

## Hidden
- exact opponent actions chosen
- exact target of opponent actions unless exposed by visible consequence
- untriggered hidden faults
- sabotage history

## Revealed conditionally
- hidden faults become visible if:
  - they trigger
  - Deep Inspection is used on that node

## POC rule
Do not build a detailed report modal as a requirement for V1.
Feedback should come mainly from visible board state and the efficiency delta.

---

## 6. Tick Model

## Tick frequency
For the local-device POC:
- the system ticks every **10 seconds**

This is purely a prototype urgency setting.
It is expected to be much slower in any future real async version.

## Tick behavior overview
Every tick performs these steps in order:
1. advance effect timers and fault timers
2. trigger delayed faults whose timer reached zero
3. calculate node throughput for this tick
4. calculate efficiency from the pipeline
5. apply passive integrity changes from strain/degradation
6. remove expired temporary effects
7. update visible delta and check win conditions

---

## 7. Efficiency Calculation
The prototype should use a simple bottleneck-weighted model.

## 7.1 Effective node output
Each node calculates an `effectiveOutputFactor`:

`effectiveOutputFactor = baseThroughput × temporaryThroughputModifier × integrityFactor × statusFactor`

Where:
- `baseThroughput = 1.0`
- `temporaryThroughputModifier` comes from actions/statuses
- `integrityFactor = max(0, integrity / 100)`
- `statusFactor` defaults to `1.0` and is reduced by visible effects like desync or spill

For V1, `temporaryThroughputModifier` and `statusFactor` can be combined internally if simpler.

## 7.2 Pipeline efficiency
Overall factory efficiency is determined from the 4-node chain.

For V1 use:
- **60% weight on the weakest node’s effective factor**
- **40% weight on the average effective factor across all nodes**

Formula idea:

`systemFactor = 0.6 * min(nodeFactors) + 0.4 * average(nodeFactors)`

Then:

`targetEfficiency = clamp(systemFactor * 100, 0, 100)`

## 7.3 Smoothing
To keep ticking readable and avoid wild jumps:
- do not snap instantly to `targetEfficiency`
- instead move current efficiency toward target by a limited amount each tick

V1 rule:
- each tick, current efficiency moves toward target by up to **8 points**

Example:
- current = 50
- target = 62
- next tick = 58
- next tick = 62

This makes the machine feel like it is running rather than teleporting.

---

## 8. Passive Integrity Changes
Integrity should change slowly and visibly over time.

## Base passive behavior
If a node is under no special pressure:
- integrity does not passively regenerate
- integrity does not passively decay

## Strain-based decay
A node loses integrity on a tick if one of these is true:
- it has a strain-producing status
- it is boosted beyond safe operation
- it is bypassed by Reroute Batch
- it is affected by a triggered fault

### V1 default decay values
- mild strain: **-2 integrity per tick**
- major strain: **-5 integrity per tick**
- triggered fault event: immediate **-12 integrity** plus any ongoing strain effect

## Buffer interaction
If a node would take integrity damage and has a buffer:
- the buffer is consumed
- that damage instance is prevented
- the node remains otherwise unchanged for that damage event

---

## 9. Fault Model

## Design choice for V1
Use **deterministic delayed faults**, not random proc chances.

This keeps the prototype easier to reason about and better for deduction.

## Default hidden fault structure
For V1, a hidden fault includes:
- `type`
- `targetNodeId`
- `ticksUntilTrigger`
- `revealed = false`

## Fault trigger rule
A hidden fault triggers when `ticksUntilTrigger` reaches `0`.

Default delay for V1:
- **2 ticks after placement**

At trigger:
- reveal the fault
- apply its trigger effect immediately
- remove or deactivate it after resolution unless specified otherwise

This gives the Saboteur delayed pressure and gives the Stabilizer a chance to read symptoms or inspect.

---

## 10. Turn Budgets

## Stabilizer
- **4 AP per turn**
- maximum **3 actions per turn**

## Saboteur
- **3 AP per turn**
- maximum **3 actions per turn**

If AP would go below zero, the action is not allowed.

Unused AP is lost at end of turn.

---

## 11. Actions

# 11.1 Stabilizer Actions

## 1. Polish the Gears
- Cost: **1 AP**
- Target: 1 node
- Immediate effect: **+12 integrity** to target node
- Max integrity remains 100
- Visible to both players only through resulting node state

## 2. Speed Boost
- Cost: **2 AP**
- Target: 1 node
- Duration: **2 ticks**
- Immediate effect: target node gets `temporaryThroughputModifier +0.20`
- Side effect: target node gains **mild strain** for duration

## 3. Add Reserve Tank
- Cost: **2 AP**
- Target: 1 node
- Effect: if node has no buffer, add **1 buffer**
- Side effect: target node gets `temporaryThroughputModifier -0.05` while buffer is present
- If buffer already exists, action is invalid

## 4. Reroute Batch
- Cost: **2 AP**
- Target: 1 node
- Duration: **1 tick**
- Effect: target node’s bottleneck impact is reduced for the next tick
- Side effect: target node takes **mild strain** during the reroute tick
- Implementation shortcut allowed: add a temporary positive throughput effect to system calculation while also applying `-2 integrity` to the target node on the next tick

## 5. Deep Inspection
- Cost: **3 AP**
- Target: 1 node
- Immediate effect: reveal all hidden faults on that node
- No direct integrity or efficiency improvement
- Revealed faults remain visible afterward

## 6. Emergency Patch
- Cost: **1 AP**
- Target: 1 node
- Immediate effect:
  - remove one visible mild negative status if present, otherwise
  - restore **+6 integrity**
- Does not remove hidden faults

---

# 11.2 Saboteur Actions

## 1. Sticky Spill
- Cost: **1 AP**
- Target: 1 node
- Duration: **2 ticks**
- Effect: target node gets `temporaryThroughputModifier -0.15`
- Visible consequence appears only through changed state/effectiveness

## 2. Ingredient Swap
- Cost: **2 AP**
- Target: 1 node
- Effect: place a hidden delayed fault on target
- Trigger delay: **2 ticks**
- Trigger effect on activation:
  - immediate **-12 integrity**
  - apply **mild strain** for **1 additional tick**

## 3. Gum the Works
- Cost: **2 AP**
- Target: 2 adjacent nodes
- Duration: **2 ticks**
- Effect:
  - downstream node gets `temporaryThroughputModifier -0.10`
  - upstream node gains **mild strain**
- Visible as general worsening, not explicit action identity

## 4. False Reading
- Cost: **2 AP**
- Target: 1 node
- Duration: **2 ticks**
- Effect:
  - if the node is Yellow or Red, display it one tier healthier in UI
  - does not change the actual internal value
- If Deep Inspection is used on the node, the false reading is removed immediately

## 5. Sugar Rush Spike
- Cost: **2 AP**
- Target: 1 node
- Duration:
  - **tick 1**: `temporaryThroughputModifier +0.15`
  - **tick 2**: immediate **-10 integrity** and `temporaryThroughputModifier -0.10`
- This is a delayed trap disguised as a boost

## 6. Coolant Drain
- Cost: **3 AP**
- Target: 1 node
- Duration: **2 ticks**
- Effect:
  - target node gains **major strain**
  - adjacent nodes gain **mild strain** for the first tick only
- Use on any node in V1 even though the name implies cooling
- Treat the name as thematic flavor, not simulation realism

---

## 12. Status Effects
The implementation may model statuses internally however convenient, but V1 should support these concepts:

- `mildStrain`
- `majorStrain`
- `spill`
- `boost`
- `reroute`
- `falseReading`
- `bufferPenalty`
- `delayedFault`

Visible UI does not need to expose these exact names.

---

## 13. Minimal Visible Feedback
For V1, feedback should be light.

## Always on screen
- current efficiency
- current turn / active role
- node integrity tier
- whether a buffer exists
- obvious visible node statuses if desired

## Minimal summary feedback
Show at least:
- latest visible efficiency delta, e.g. `+6` or `-11`

Optional small text if useful later:
- `Mixing improved`
- `Packaging strained`

Do not require a heavy report modal for the first build.

---

## 14. Starting Match State
When creating a new match:
- efficiency = **50**
- turnNumber = **1**
- activeRole = **Stabilizer**
- most nodes start near healthy but not perfect

### Default starting node values
- Ingredient Hopper: integrity **78**
- Mixing Vat: integrity **74**
- Conveyor Belt: integrity **72**
- Packaging Line: integrity **76**

All nodes start with:
- no buffer
- no visible negative status
- no hidden fault
- `baseThroughput = 1.0`
- `temporaryThroughputModifier = 1.0`

These values may be tuned later.

---

## 15. End of Turn Rules
When a player ends their turn:
- validate AP and action count
- apply all chosen actions immediately
- clear pending turn selections
- switch `activeRole` to the other player
- continue ticking normally

The system does **not** pause between turns.

---

## 16. POC Implementation Priorities
Implementation should focus on these in order:
1. correct ticking simulation
2. correct action/AP handling
3. hidden information not leaking
4. readable visible board state
5. local persistence
6. candy-factory polish

Do not overbuild UI reporting before the board itself feels understandable.

---

## 17. Tuning Knobs
These values should be easy to modify in code:
- tick interval
- AP budgets
- action costs
- action durations
- strain damage
- fault trigger delay
- efficiency smoothing rate
- starting integrity values
- win thresholds

These should live in constants/config rather than being hardcoded deep in logic.

---

## 18. Non-Goals for V1
Do not implement yet:
- remote multiplayer
- notifications
- wall-clock async timers across devices
- elaborate reports
- meta progression
- multiple board types
- advanced AI opponent
- animation-heavy production polish

---

## 19. Bottom Line
V1 is a **single-device, turn-based, continuously ticking factory duel**.

The key experience is:
- one player improves the machine
- the other quietly poisons it
- the system keeps moving
- efficiency visibly rises or falls
- players infer intent from state, not from logs

If that loop works, the concept is worth expanding.
