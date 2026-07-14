# Implementation Plan

## Goal
Build a tight first playable web POC for the async two-player candy-factory duel described in `GAME_DESIGN_DOCUMENT.md`, using the deep research recommendations as the implementation baseline.

This plan is intentionally narrower than the full GDD.
The purpose is to validate:
- the hidden-information loop
- the feel of alternating async turns
- whether builder vs saboteur is fun in practice
- whether the board is readable on web/mobile-sized screens

We are **not** building full async infrastructure, notifications, matchmaking, progression, or production-ready backend yet.

---

## Core POC Decision Summary

### Chosen direction
- **Web application**
- **2D board**
- **candy-factory presentation** with bright, playful visuals
- **strict turn-based async structure**, but for now testable locally or in a lightweight shared-state setup
- **theme-light mechanics-first implementation**

### Explicitly out of scope for this first slice
- notifications
- response timers enforcement
- live real-time gameplay
- deep persistence architecture
- multiple board types
- progression/meta systems
- social systems
- advanced animation polish

---

## Product Slice We Should Build First

A single playable match should support:
1. viewing the current shared factory board
2. seeing current batch rate and node status
3. taking a turn as Stabilizer or Saboteur
4. spending an action budget on 1–3 actions
5. hiding exact opponent actions
6. resolving the system after both sides have acted
7. showing a readable Batch Report
8. continuing until:
   - Stabilizer reaches target output
   - Saboteur collapses output to zero

That is the smallest complete loop worth testing.

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
- resolution simulation
- victory checks
- batch report generation

Suggested files:
- `src/game/types.ts`
- `src/game/constants.ts`
- `src/game/actions.ts`
- `src/game/simulation.ts`
- `src/game/reports.ts`
- `src/game/match.ts`

This layer should know nothing about React.

---

## 2. UI Layer
Main screens/components:
- match list / test harness
- match board view
- action selection panel
- pending turn summary
- resolution / batch report modal
- role switch / local test controls

Suggested components:
- `FactoryBoard`
- `FactoryNodeCard`
- `BatchRateGauge`
- `ActionPanel`
- `TurnBudgetBar`
- `BatchReportModal`
- `MatchSummaryCard`

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

## Board Structure to Implement

## Initial board
Use **4 main nodes first**, not 5.
Defer the side node until the loop is proven fun.

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
- last resolution report

---

## Action Set to Implement

Implement **6 actions per role** for the first POC.
That is enough variety without overloading the first build.

## Stabilizer actions
1. **Polish the Gears** — cost 1
   - restore integrity to one node

2. **Speed Boost** — cost 2
   - increase throughput on one node this resolution
   - add strain risk next exchange

3. **Add Reserve Tank** — cost 2
   - adds one buffer to a node
   - slight throughput penalty while installed

4. **Reroute Batch** — cost 2
   - bypass one troubled node for one resolution
   - side effect: bypassed node passively degrades

5. **Deep Inspection** — cost 3
   - reveals hidden faults on one node

6. **Emergency Patch** — cost 1
   - removes or softens one visible problem quickly

## Saboteur actions
1. **Sticky Spill** — cost 1
   - immediate throughput penalty on one node

2. **Ingredient Swap** — cost 2
   - plant hidden fault with trigger chance in later resolution

3. **Gum the Works** — cost 2
   - add desync between adjacent nodes

4. **False Reading** — cost 2
   - hide or misreport one node’s visible symptoms

5. **Sugar Rush Spike** — cost 2
   - temporary throughput boost now, degradation later

6. **Coolant Drain** — cost 3
   - structural disruption action affecting multiple connected nodes

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
- whether a node was active or problematic last resolution

### Hidden
- exact opponent actions chosen
- exact target of opponent actions unless exposed by consequences
- untriggered hidden faults
- planted sabotage history

### Conditionally revealed
- hidden faults become visible if:
  - they trigger during resolution
  - player uses Deep Inspection

### UI rule
Never show a raw move log like:
- “Player B used Ingredient Swap on Mixing Vat”

Always convert opponent actions into:
- symptoms
- state changes
- report lines

---

## Result / Batch Report Model

After both players complete their turns for an exchange, generate:

### 1. Short resolution animation
Minimal for first pass:
- animate flow through nodes
- flash stressed nodes
- show output rising/falling

Keep this simple in v1.
It can be mostly UI transitions, not full rich animation.

### 2. Batch Report modal
Show:
- shift/exchange number
- current batch rate and delta
- 2–4 symptom lines
- integrity changes by node
- triggered hidden faults if any
- button to continue

### Symptom design requirement
Symptoms must describe **effect categories**, not action names.
Examples:
- flow reduced
- timing misalignment
- irregular rotation
- buffer depleted
- integrity at risk
- fault activated
- unknown issue detected

Build these from a strict enum / rules table, not ad hoc strings.

---

## Match Flow to Implement

## Simplified first POC flow
1. Create a new match
2. Match starts at about **50% batch rate**
3. Stabilizer acts first
4. Stabilizer spends AP and ends turn
5. Saboteur sees updated visible state, but not exact stabilizer actions
6. Saboteur spends AP and ends turn
7. System resolves
8. Batch Report is shown
9. Victory check runs
10. If no winner, next exchange begins with Stabilizer again or alternating initiative depending on configuration

### Recommendation for v1
For the first implementation, use:
- **Stabilizer always first in each exchange pair**
- one full exchange = Stabilizer turn + Saboteur turn + resolution

That will be easier to reason about than more advanced initiative systems.

---

## Simulation Rules

Keep the simulation deterministic where possible.
If randomness is used for hidden fault triggers, keep it small, visible in architecture, and easy to tune.

Suggested first-pass simulation steps:
1. apply temporary action effects
2. apply hidden fault trigger checks
3. calculate node strain and integrity changes
4. propagate throughput through the pipeline
5. calculate resulting batch rate
6. produce symptom summary
7. clear expired temporary effects
8. save report

### Recommendation
Prefer:
- mostly deterministic formulas
- very small amount of randomness only for hidden fault triggers

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
- latest batch report access

## Screen 3: Batch report modal
Should appear after resolution.

---

## Development Phases

## Phase 1 — Scaffold and deploy
- set up Vite + React + TypeScript
- set up linting/formatting if desired, but keep light
- set up GitHub Actions build/deploy to GitHub Pages
- create README with run/build/deploy instructions

### Deliverable
A deployed shell app reachable on GitHub Pages.

---

## Phase 2 — Game domain model
- implement board/node/match types
- implement initial constants
- implement action definitions and costs
- implement turn budget validation
- implement hidden-action storage structure
- implement basic victory conditions

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

### Deliverable
Can play turns manually in-browser, even before full resolution polish.

---

## Phase 4 — Resolution and reports
- implement resolution pipeline
- generate integrity changes
- generate batch rate change
- generate symptom reports
- show report modal
- hide exact opponent actions

### Deliverable
First full playable match loop.

---

## Phase 5 — Test harness and iteration tools
- add reset match
- add seed/debug info if useful
- add quick role switch for local testing
- add configurable AP values and maybe a debug panel

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
- lastReport

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

### BatchReport
- exchangeNumber
- batchRateBefore
- batchRateAfter
- outputDelta
- symptomLines[]
- integrityChanges[]
- triggeredEvents[]

---

## GitHub Pages Deployment Plan

Use a GitHub Actions workflow that:
- installs dependencies
- builds the static app
- publishes the build output to GitHub Pages

Requirements:
- set proper base path for repo deployment if needed
- document Pages setup in README
- ensure the app works as a pure static site

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
- resolution updates board correctly
- victory conditions trigger correctly

## Design checks
- can a new player understand the board quickly?
- do symptoms feel informative but not too explicit?
- do turns feel meaningful with 2–3 actions?
- does the saboteur feel clever?
- does the stabilizer feel empowered rather than chore-bound?
- do matches feel short and replayable?

---

## Open Implementation Questions

These should stay configurable while building:
- should hidden faults use chance or deterministic delayed triggers?
- should initiative alternate after each resolution, or stay fixed?
- should the stabilizer always begin?
- how much detail should the report expose?
- is 4-node board enough, or do we need the side node quickly?
- is 4 AP vs 3 AP better than 3 vs 3?

---

## Recommended Immediate Next Steps

1. Scaffold the web app and GitHub Pages deployment.
2. Implement the pure game domain layer.
3. Build the 4-node board UI.
4. Implement the 6+6 action sets.
5. Implement one full exchange + report flow.
6. Playtest locally before considering any backend.

---

## Bottom Line
The right first implementation is a **small, static-deployable, locally persisted, single-board playable prototype**.

It should prove:
- the board is readable
- the hidden-action loop is interesting
- the action economy creates choices
- the candy-factory wrapper helps clarity and charm

Only after that should we decide whether to add real async backend support like Firebase.