# Game Test Plan

## Purpose
This document defines the automated test strategy for the gameplay domain described in `RULES_SPEC_V1.md` and planned in `plan.md`.

This test plan exists to ensure:
- gameplay rules stay deterministic
- hidden information does not leak
- balancing changes are safer to make
- the web UI is not the source of truth for game logic
- deployment is blocked if gameplay behavior regresses

This test plan applies to the **framework-agnostic game domain**, not just the React UI.

---

## 1. Test Philosophy

The authoritative gameplay behavior should be protected by tests at the domain layer.

That means:
- tests should call pure TypeScript game logic directly
- tests should not need React rendering to validate rules
- tests should verify both exact rule behavior and player-visible state behavior

The hierarchy should be:
1. **unit tests** for small pure functions
2. **integration/domain sequence tests** for multi-step match scenarios
3. optional UI tests later, only after domain coverage is solid

---

## 2. CI Requirement

Gameplay tests are required in CI.

Deployment must not proceed if gameplay tests fail.

Minimum CI expectation:
1. install dependencies
2. run gameplay/unit/integration tests
3. only build/deploy if tests pass

---

## 3. Suggested Test Areas

## A. Match creation
Verify that a newly created match:
- starts at efficiency 50
- starts with Stabilizer as active role
- has the correct 4 nodes in order
- uses the expected default integrity values
- starts with no buffers
- starts with no visible negative effects
- starts with no hidden faults

---

## B. Turn order and AP rules
Verify:
- Stabilizer acts first
- players cannot act twice in a row
- a turn cannot exceed AP budget
- a turn cannot exceed max action count
- invalid actions are rejected cleanly
- unused AP is discarded at end of turn

---

## C. Action application
For each action, verify:
- correct AP cost
- valid target rules
- immediate state changes are correct
- duration-based effects are stored correctly
- invalid duplicate applications are rejected where appropriate

### Stabilizer actions to test
- Polish the Gears
- Speed Boost
- Add Reserve Tank
- Reroute Batch
- Deep Inspection
- Emergency Patch

### Saboteur actions to test
- Sticky Spill
- Ingredient Swap
- Gum the Works
- False Reading
- Sugar Rush Spike
- Coolant Drain

---

## D. Tick progression
Verify that one tick:
- advances timers correctly
- applies delayed fault countdowns correctly
- applies scheduled effects in the correct order
- recalculates node output correctly
- updates efficiency correctly
- applies strain-based integrity loss correctly
- removes expired effects correctly
- updates visible efficiency delta correctly

Also verify that multiple ticks in sequence behave consistently.

---

## E. Efficiency calculation
Verify:
- effective node output factor calculation
- weakest-node weighting behavior
- average-node weighting behavior
- target efficiency calculation
- clamping to 0–100
- smoothing behavior (max movement per tick)

This is one of the most important areas to protect with tests.

---

## F. Integrity and buffer behavior
Verify:
- integrity tier mapping
- integrity never exceeds 100
- integrity never drops below 0
- mild strain damage is applied correctly
- major strain damage is applied correctly
- buffers absorb the next integrity damage event
- buffers are consumed exactly once
- buffer penalties disappear when the buffer is gone

---

## G. Hidden fault behavior
Verify:
- hidden faults are placed correctly
- hidden faults remain hidden before reveal
- tick countdown decreases correctly
- faults trigger exactly when expected
- trigger effects apply once
- triggered faults become visible
- Deep Inspection reveals hidden faults early

Because V1 uses deterministic delayed faults, this area should be especially reliable under test.

---

## H. Hidden information / visibility rules
This is a critical test area.

Verify that derived visible state:
- includes only allowed visible information
- excludes hidden faults before reveal
- excludes exact opponent action history
- excludes secret target information unless surfaced by visible consequence
- correctly applies False Reading to displayed integrity tier
- returns revealed faults after Deep Inspection or trigger

Recommended approach:
- maintain a canonical full match state
- test a pure `getVisibleState(match, viewerRole)` style selector

This is one of the highest-value tests in the whole project.

---

## I. Win conditions
Verify:
- Stabilizer wins at efficiency >= 100
- Saboteur wins at efficiency <= 0
- no winner is declared otherwise
- winner state persists once set unless explicitly reset

---

## J. Persistence / elapsed time behavior
Because the local-device POC ticks every 10 seconds, test the logic that resumes a saved match.

Verify:
- elapsed wall-clock time converts into whole elapsed ticks correctly
- zero elapsed ticks changes nothing
- multiple elapsed ticks advance deterministically
- reloading the same saved state after the same elapsed time gives the same result
- resumed visible state matches expected simulation outcome

This is a likely bug hotspot and should be covered early.

---

## 4. Recommended Test Structure

Suggested file layout:
- `src/game/createMatch.test.ts`
- `src/game/actions.test.ts`
- `src/game/simulation.test.ts`
- `src/game/visibility.test.ts`
- `src/game/persistence.test.ts`
- `src/game/winConditions.test.ts`

Alternative: colocate tests next to modules if preferred.

The important requirement is that gameplay tests are easy to find and run.

---

## 5. Minimum Must-Have Tests Before First Deployment

Before the first playable deployment, these tests should exist and pass:

1. creates a valid default match
2. enforces turn order
3. enforces AP budget and action count
4. applies at least one Stabilizer action correctly
5. applies at least one Saboteur action correctly
6. advances one tick correctly
7. triggers Ingredient Swap after 2 ticks
8. buffer absorbs the next integrity damage event
9. False Reading changes visible tier only, not actual integrity
10. hidden faults are invisible until triggered or inspected
11. efficiency smoothing limits per-tick change
12. winner is detected at 0 and 100
13. elapsed-time resume advances the correct number of ticks

These are the minimum safety net.

---

## 6. Suggested First Integration Scenarios

## Scenario 1: Stabilizer recovery path
- create match
- apply Speed Boost to a weak node
- tick forward twice
- verify efficiency rises gradually
- verify strain costs integrity

## Scenario 2: Delayed sabotage trigger
- create match
- apply Ingredient Swap
- tick once: fault hidden, no trigger
- tick twice: fault triggers
- verify integrity loss and reveal

## Scenario 3: Buffer protection
- create match
- add Reserve Tank to a node
- apply sabotage that would damage it
- tick until damage applies
- verify buffer is consumed and integrity damage is prevented once

## Scenario 4: False Reading deception
- degrade a node internally
- apply False Reading
- verify canonical integrity remains low
- verify visible state shows healthier tier
- Deep Inspection removes deception

## Scenario 5: Endgame finish
- set efficiency near threshold
- apply beneficial or harmful action
- tick forward
- verify correct winner is set

---

## 7. Rules Cleanup Checklist for V1

These are the remaining rules clarifications that should be respected during implementation.
They do not require redesign, only disciplined interpretation.

### 1. Canonical state vs visible state
Must be explicitly separated in code.

Implementation expectation:
- one full internal match state
- one derived player-visible state

### 2. Tick resume rule
On load/resume:
- compute elapsed milliseconds since `lastTickAt`
- convert to elapsed ticks using 10-second intervals
- advance exactly that many ticks deterministically
- update `lastTickAt`

### 3. Reroute Batch rule
Use the simpler V1 interpretation:
- for 1 tick, target node contributes only 50% of its usual bottleneck penalty
- target node then takes mild strain / integrity loss as specified

### 4. False Reading rule
False Reading affects:
- displayed integrity tier only

False Reading does **not** affect:
- actual integrity
- actual throughput
- hidden fault timers

### 5. Coolant Drain rule
Treat this as a generic themed strain action.
Its implementation meaning is:
- target node gets major strain
- adjacent nodes get mild strain for the first tick only

Do not over-model physical realism.

### 6. Minimal effect vocabulary
For V1, keep effect handling internally close to:
- throughput up
- throughput down
- mild strain
- major strain
- false reading
- hidden delayed fault
- buffer present

Avoid creating a sprawling status framework too early.

---

## 8. Non-Goals for the Test Plan
Not required before first deployment:
- exhaustive UI interaction tests
- performance benchmarking
- multiplayer/backend tests
- AI opponent tests
- visual regression tests

These can come later.

---

## 9. Bottom Line
The game should ship its first playable POC only when:
- the domain layer is independent of React
- hidden information is verified by tests
- ticking simulation is deterministic and covered
- core actions are tested
- deployment is gated by passing gameplay tests

The tests are not just a safety net.
They are part of the game design process.