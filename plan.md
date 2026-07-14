# Implementation Plan

## Goal
Build a tight first playable web POC for the async two-player candy-factory duel described in `GAME_DESIGN_DOCUMENT.md`, using the deep research recommendations as the implementation baseline and `RULES_SPEC_V1.md` as the implementation source of truth for game rules.

This plan is intentionally narrower than the full GDD.
The purpose is to validate:
- the hidden-information loop
- the feel of alternating async turns
- whether builder vs saboteur is fun in practice
- whether the board is readable on web/mobile-sized screens
- whether visible ticking creates urgency even in a single-device prototype

We are **not** building full async infrastructure, notifications, matchmaking, progression, or production-ready backend yet.

---

## Core POC Decision Summary

### Chosen direction
- **Web application**
- **2D board**
- **candy-factory presentation** with bright, playful visuals
- **strict turn-based structure with continuous ticking between turns**
- **single-device / single-browser-session testability first**
- **theme-light mechanics-first implementation**
- **visible state over heavy reporting**

### Explicitly out of scope for this first slice
- notifications
- response timers enforcement
- live real-time multiplayer
- deep persistence architecture
- multiple board types
- progression/meta systems
- social systems
- advanced animation polish
- rich diagnostic reporting UI

---

## Rules Source of Truth

Implementation should follow:
- `GAME_DESIGN_DOCUMENT.md` for product intent and design goals
- `plan.md` for implementation sequencing and scope
- `RULES_SPEC_V1.md` for exact POC rules and simulation behavior

If there is ambiguity between documents during implementation, `RULES_SPEC_V1.md` should win for game logic decisions in the first prototype.

---

## Product Slice We Should Build First

A single playable match should support:
1. viewing the current shared factory board
2. seeing current batch rate and node state
3. taking a turn as Stabilizer or Saboteur on one device
4. spending an action budget on 1–3 actions
5. hiding exact opponent actions
6. ticking the system forward continuously in the POC at a fixed interval
7. showing efficiency changes primarily through the live board state
8. continuing until:
   - Stabilizer reaches target output
   - Saboteur collapses output to zero

That is the smallest complete loop worth testing.

---

## Architecture Principle: Game Logic Must Be Framework-Agnostic

The core game logic must **not** live inside React components, hooks, or UI-only state code.

All gameplay rules, simulation, actions, ticking, victory checks, hidden information handling, and match transitions must live in a pure TypeScript domain layer.

React should be treated as a rendering and input layer only.

### Why this is required
- gameplay must be deterministic and testable
- rules should be reusable outside the UI
- simulation bugs should be caught by automated tests before deployment
- future migration to another client/runtime should not require rewriting game rules

### Required rule
UI components may:
- render game state
- gather player input
- dispatch domain commands
- subscribe to state updates

UI components may **not**:
- contain authoritative gameplay formulas
- mutate canonical game state directly
- implement hidden information rules ad hoc
- contain one-off action resolution logic

---

## Required Project Structure

Recommended separation:
- `src/game/` → pure gameplay domain
- `src/data/` → persistence adapters
- `src/ui/` or `src/components/` → React presentation
- `src/app/` → wiring, screens, orchestration
- `src/test/` and/or colocated `*.test.ts` → automated tests

The domain layer should be usable from tests without rendering React at all.

---

## Recommended Technical Approach

### Frontend
Use a modern static-site-friendly stack suitable for GitHub Pages.

Recommended:
- **React + TypeScript + Vite**

Why:
- fast iteration
- strong local dev experience
- easy static build output
- simple GitHub Pages deployment
- good fit for stateful UI and simulation visualization

### Styling
Recommended:
- plain CSS modules or a lightweight utility approach

Avoid overengineering styling at this stage.
The UI should prioritize legibility over framework complexity.

### State management
Recommended:
- local React state + a small domain model layer
- optionally a lightweight store like Zustand only if the UI starts getting noisy

The simulation and rules should live outside components in pure TypeScript modules.
That keeps the game logic testable and portable.

### Persistence
For the first playable slice:
- **start with local persistence only**
- use `localStorage` for saved matches and current turn state

Why:
- fastest path to validating the loop
- no backend dependency blocking playtests
- lets us test the game in GitHub Pages immediately

### Future-ready persistence note
If we later need real async multi-user play, the best next step is likely:
- **Firebase / Firestore**

Why:
- fast to stand up
- web-first
- easy auth path later
- realtime capabilities if needed, even if we do not use them now
- works well for match documents, turn records, and lightweight event history

But do **not** add this yet unless the POC absolutely needs shared remote state.

---

## Core Architecture

## 1. Game Domain Layer
Create pure TypeScript modules for:
- board structure
- node state
- action definitions
- turn budget validation
- hidden info handling
- ticking simulation
- victory checks
- minimal efficiency delta summary
- match state transitions

Suggested files:
- `src/game/types.ts`
- `src/game/constants.ts`
- `src/game/actions.ts`
- `src/game/simulation.ts`
- `src/game/match.ts`
- `src/game/seed.ts`
- `src/game/reducer.ts`
- `src/game/selectors.ts`

This layer should know nothing about React.

### Suggested domain API shape
The UI should call pure functions such as:
- `createMatch()`
- `applyTurn(match, turnInput)`
- `advanceTick(match)`
- `getVisibleState(match, viewerRole)`
- `checkWinner(match)`

The exact names can vary, but the architecture principle should remain.

---

## 2. UI Layer
Main screens/components:
- match list / test harness
- match board view
- action selection panel
- pending turn summary
- live efficiency panel
- minimal change summary UI
- role switch / local test controls

Suggested components:
- `FactoryBoard`
- `FactoryNodeCard`
- `BatchRateGauge`
- `ActionPanel`
- `TurnBudgetBar`
- `EfficiencyDeltaPanel`
- `MatchSummaryCard`

These should consume derived visible state from the domain layer rather than re-deriving rules locally.

---

## 3. Persistence Layer
Abstract persistence behind a minimal interface so we can swap local storage for Firestore later.

Suggested interface:
- load matches
- save match
- create match
- update turn state

Suggested file:
- `src/data/matchRepository.ts`

Implement first with:
- `localStorageMatchRepository`

---

## Testing Strategy Requirement

The project must include an automated test suite for the gameplay domain before deployment.

### Minimum requirement
Tests should run in CI and verify:
- action cost validation
- turn order enforcement
- tick progression
- efficiency calculation
- hidden information visibility rules
- fault trigger timing
- win condition detection
- selected core actions behaving as specified

### Test types
At minimum include:
1. **unit tests** for pure functions
2. **integration-style domain tests** for short match sequences

Optional later:
- component tests
- end-to-end browser tests

### CI requirement
The GitHub Actions pipeline should fail if gameplay tests fail.
Deployment should depend on passing tests.

---

## Board Structure to Implement

## Initial board
Use **4 main nodes first**.

Initial pipeline:
1. Ingredient Hopper
2. Mixing Vat
3. Conveyor Belt
4. Packaging Line

Why 4 first:
- easier to read on mobile/web
- lower implementation complexity
- enough room for bottlenecks and symptom logic
- reduces risk of screen overload in the POC

### Node state per node
Each node should track:
- `integrity` (0–100, internal numeric)
- `visibleIntegrityTier` (green/yellow/red for UI)
- `throughputModifier`
- `buffer` (0 or 1 for now)
- `hiddenFaults` (list, but capped small)
- `statusEffects` (desync, reduced flow, false reading, etc.)

### Global match state
Track:
- current role turn
- turn number
- batch rate (0–100)
- target batch rate (100)
- winner if any
- pending hidden actions for current exchange
- last visible efficiency delta
- simulation seed/state
- timestamp of last tick

---

## Action Set to Implement

Implement **6 actions per role** for the first POC.
That is enough variety without overloading the first build.
The exact effects should follow `RULES_SPEC_V1.md`.

## Stabilizer actions
1. **Polish the Gears** — cost 1
2. **Speed Boost** — cost 2
3. **Add Reserve Tank** — cost 2
4. **Reroute Batch** — cost 2
5. **Deep Inspection** — cost 3
6. **Emergency Patch** — cost 1

## Saboteur actions
1. **Sticky Spill** — cost 1
2. **Ingredient Swap** — cost 2
3. **Gum the Works** — cost 2
4. **False Reading** — cost 2
5. **Sugar Rush Spike** — cost 2
6. **Coolant Drain** — cost 3

### Important implementation rule
Do **not** implement these as direct mirror counters.
Their value comes from side effects, delayed consequences, and imperfect information.

---

## Action Economy

Start with:
- **Stabilizer: 4 AP**
- **Saboteur: 3 AP**
- **max 3 actions per turn**

However, make this configurable in code so we can easily test:
- 3 vs 3
- 4 vs 3
- 4 vs 4

Suggested config:
- `src/game/constants.ts`

This will likely be one of the earliest balancing knobs.

---

## Hidden Information Rules to Implement

This is one of the most important parts of the POC.

### Always visible
- board layout
- node names/icons
- integrity tier color per node
- whether a node has a buffer
- current batch rate
- current turn / active player
- visible status effects
- latest efficiency delta once the opposing player has taken their turn / state has advanced

### Hidden
- exact opponent actions chosen
- exact target of opponent actions unless exposed by visible consequences
- untriggered hidden faults
- planted sabotage history

### Conditionally revealed
- hidden faults become visible if:
  - they trigger during ticking
  - player uses Deep Inspection

### UI rule
Never show a raw move log like:
- “Player B used Ingredient Swap on Mixing Vat”

Favor visible state and light summaries over explicit reports.

---

## Minimal Reporting / Feedback Model

For the POC, keep reporting light.
Do **not** build a large report modal as a requirement for v1.

Primary feedback should come from:
- current batch rate
- last visible efficiency delta
- node integrity tier changes
- visible status effects on nodes
- triggered fault visibility if surfaced

### Minimal summary
A compact summary is enough, for example:
- `Efficiency +6`
- `Efficiency -11`

Optional lightweight support text later:
- `Mixing improved`
- `Conveyor strained`

But the first POC should rely mainly on the visible state of the board.

---

## Match Flow to Implement

## Simplified first POC flow
1. Create a new match
2. Match starts at **50% batch rate**
3. Stabilizer acts first
4. Stabilizer spends AP and ends turn
5. Stabilizer actions apply immediately
6. System begins ticking every **10 seconds** in the local-device POC
7. Saboteur sees current visible state, not exact stabilizer actions
8. Saboteur spends AP and ends turn
9. Saboteur actions apply immediately
10. System continues ticking every **10 seconds**
11. Stabilizer sees current visible state, not exact saboteur actions
12. Repeat until batch rate reaches 100 or 0

### Important POC note
For the prototype, the system should feel alive through deterministic ticking, even though the game remains turn-based.

---

## Simulation Rules

Follow `RULES_SPEC_V1.md`.

At a high level:
1. apply immediate action effects
2. on each tick, update node temporary modifiers
3. check deterministic hidden fault triggers
4. calculate node effective throughput from:
   - base throughput
   - temporary modifiers
   - integrity factor
5. calculate overall batch rate from the pipeline bottleneck-weighted result
6. update visible board state
7. check victory conditions

### Recommendation
Prefer:
- deterministic rules
- seeded pseudo-random support only if needed later
- condition or delay based fault triggering first

Too much randomness will destroy deduction quality.

---

## Screen / UX Plan

## Screen 1: Match list / test harness
Purpose:
- create new local test match
- resume existing matches
- optionally choose which side to play for local testing

Needed because we are not building full multiplayer infra yet.

## Screen 2: Match board
Should show:
- batch rate gauge
- node row / pipeline
- action budget
- available actions
- selected targets
- end turn button
- latest efficiency delta

This is the most important screen in the POC.

## Screen 3: Optional lightweight summary area
Not a heavy modal by default.
Could simply show:
- latest efficiency change
- any surfaced visible issue states

---

## Development Phases

## Phase 1 — Scaffold and deploy
- set up Vite + React + TypeScript
- set up linting/formatting if desired, but keep light
- set up GitHub Actions build/deploy to GitHub Pages
- create README with run/build/deploy instructions
- set up test runner and CI test step immediately

### Deliverable
A deployed shell app reachable on GitHub Pages with tests wired into CI.

---

## Phase 2 — Game domain model
- implement board/node/match types
- implement initial constants
- implement action definitions and costs
- implement turn budget validation
- implement hidden-action storage structure
- implement ticking simulation
- implement basic victory conditions
- add tests for core domain functions as they are created

### Deliverable
Game rules exist in TypeScript and can be tested without UI.

---

## Phase 3 — Basic playable board
- render 4-node board
- render batch rate gauge
- render role-aware action panel
- allow selecting actions and valid targets
- allow ending turn
- persist match locally
- show visible state changes and efficiency delta

### Deliverable
Can play turns manually in-browser while the system keeps ticking.

---

## Phase 4 — Hidden info and feedback refinement
- ensure exact opponent actions are hidden
- surface only visible state and minimal deltas
- reveal hidden faults only when surfaced or inspected
- verify the board alone is enough to understand what matters
- add domain integration tests for representative turn sequences

### Deliverable
First full playable hidden-information loop.

---

## Phase 5 — Test harness and iteration tools
- add reset match
- add seed/debug info in console if useful
- add quick role switch for local testing
- add configurable AP values and maybe a debug panel later if needed

### Deliverable
Easy balancing and playtest iteration.

---

## Phase 6 — Candy polish pass
- brighten visual language
- add candy-factory labels/icons
- improve motion/feedback
- keep it light and readable

### Deliverable
Pleasant theme wrapper without expanding mechanics.

---

## Data Model Sketch

Suggested main entities:

### Match
- id
- createdAt
- turnNumber
- activeRole
- batchRate
- targetRate
- winner
- nodes[]
- pendingTurnActions
- lastVisibleEfficiencyDelta
- lastTickAt
- seedState

### Node
- id
- type
- integrity
- throughputModifier
- bufferCount
- hiddenFaults[]
- visibleStatuses[]
- hiddenStatuses[]

### ActionSelection
- role
- actionId
- targetNodeId
- optionalSecondaryTargetId
- cost

### EfficiencySummary
- batchRateBefore
- batchRateAfter
- delta
- surfacedEvents[]

---

## GitHub Pages Deployment Plan

Use a GitHub Actions workflow that:
- installs dependencies
- runs gameplay tests
- builds the static app
- publishes the build output to GitHub Pages

Requirements:
- set proper base path for repo deployment if needed
- document Pages setup in README
- ensure the app works as a pure static site
- do not deploy if tests fail

This is another reason to avoid backend dependency in v1.

---

## Testing Priorities

We are not just testing correctness.
We are testing feel.

## Functional checks
- can create and persist a match
- can take turns as both roles
- action costs enforced correctly
- hidden info not leaked in UI
- ticking updates board correctly every 10 seconds
- victory conditions trigger correctly

## Design checks
- can a new player understand the board quickly?
- does visible state provide enough information without a heavy report?
- do turns feel meaningful with 2–3 actions?
- does the saboteur feel clever?
- does the stabilizer feel empowered rather than chore-bound?
- does ticking create urgency even on one device?
- do matches feel short and replayable?

---

## Open Implementation Questions

These should stay configurable while building:
- should hidden faults remain purely delay-based or become condition-based later?
- should initiative ever alternate in later versions?
- when should efficiency delta be shown and for how long?
- is 4-node board enough, or do we need the side node quickly?
- is 4 AP vs 3 AP better than 3 vs 3?

---

## Recommended Immediate Next Steps

1. Implement `RULES_SPEC_V1.md`.
2. Scaffold the web app and GitHub Pages deployment.
3. Set up the domain-layer test suite and CI gating.
4. Implement the pure game domain layer.
5. Build the 4-node board UI.
6. Implement the 6+6 action sets.
7. Implement ticking and visible-state feedback.
8. Playtest locally before considering any backend.

---

## Bottom Line
The right first implementation is a **small, static-deployable, locally persisted, single-board, single-device playable prototype with visible ticking**.

It should prove:
- the board is readable
- the hidden-action loop is interesting
- the action economy creates choices
- the candy-factory wrapper helps clarity and charm
- visible ticking creates urgency without requiring real multiplayer

And it must do so with a **framework-agnostic gameplay domain** protected by an **automated test suite that runs before deployment**.

Only after that should we decide whether to add real async backend support like Firebase.
