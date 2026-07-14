# Async System Duel — Prototype Game Design Document

## Purpose
This document defines a prototype-first game concept for a short-session, asynchronous, turn-based competitive game. The goal of this proof of concept is to validate whether the core interaction loop is fun before committing to theme, art direction, or large-scale content.

This prototype intentionally avoids strong theming. The focus is on:
- short mobile-friendly sessions
- asynchronous back-and-forth play
- hidden information
- mind games and deduction
- playful system disruption
- avoiding drift into tower defense, base building, real-time multiplayer, or direct action clones

---

## High Concept
Two players contest control over a shared, small-scale system.

- **Player A** attempts to improve, stabilize, and optimize the system so it reaches a target output.
- **Player B** attempts to distort, corrupt, and sabotage the system so output collapses to zero.

Players do **not** directly control units in real time.
Players do **not** act simultaneously.
Players do **not** see the exact actions the other player took.

Instead, the match unfolds as an asynchronous exchange of hidden edits to a live-looking system. Each turn, one player modifies the system, the other responds later, and the simulation resolves in discrete windows.

The game should feel like:
- solving and unsolving the same machine
- trying to out-think the other player
- spotting weak points and false signals
- making small changes that create outsized consequences
- returning to a game because something meaningful changed

---

## Core Fun Pillars

### 1. Small change, big consequence
The heart of the game is making a limited number of edits and watching a larger system react.

Fun comes from:
- creating disproportionate impact with one move
- discovering leverage points
- seeing one hidden choice alter the whole outcome window
- feeling clever rather than merely optimal

This is the most important pillar.

### 2. Hidden information and deduction
Players do not see the exact edits the opponent made. They must infer them from outcome data and system behavior.

Fun comes from:
- reading symptoms and tracing likely causes
- bluffing with misleading changes
- making the opponent misdiagnose the problem
- noticing repeated patterns in the opponent’s play

The game should create “what did they do?” moments often.

### 3. Pressure without real-time play
The game must remain strictly asynchronous, but still create urgency.

Fun comes from:
- receiving a notification that it is your move
- knowing the opponent is waiting on your answer
- winning an exchange if the opponent fails to respond in time
- having several active matches that each need periodic attention

This should feel active and alive without becoming a real-time multiplayer game.

### 4. More than pure repair vs pure damage
The game should avoid becoming a repetitive cycle where one player breaks exactly what the other player just fixed.

Fun comes from:
- deciding what not to address
- making structural improvements instead of local repairs
- introducing faults with side effects instead of single debuffs
- forcing tradeoffs and partial solutions

### 5. Mischief, not just efficiency
This prototype should preserve room for playful, almost exploit-like thinking.

Fun comes from:
- making a move that looks wrong but is secretly strong
- creating delayed failures
- overcommitting pressure in one area to distract from another
- using system rules in surprising but valid ways

The game should reward insight and trickery, not only straightforward arithmetic.

---

## What This Prototype Is Not
To protect the concept from genre drift, the prototype should explicitly avoid becoming any of the following:

### Not tower defense
We are not building lanes, placing defenses, and enduring waves.

### Not base building
Players do not own separate spaces and do not expand persistent empires inside a match.

### Not Angry Birds / projectile destruction
The fun is not in launching physics objects at structures.

### Not real-time multiplayer
There is no live simultaneous control, no demand for both players to be online, and no continuous always-running match simulation.

### Not direct raid/assault gameplay
One player is not invading the other’s location with units.

### Not a large management sim
Matches must stay compact, legible, and fast to parse on mobile.

---

## Prototype Match Structure

### Match duration target
- A full match should usually resolve in **3–8 exchanges**.
- A match should feel meaningful, but should not require days of constant attention.
- Players should be able to have **multiple matches running concurrently**.

### Exchange structure
A match consists of alternating asynchronous exchanges.

1. The current player sees the latest visible state of the system.
2. They spend an action budget on several hidden edits.
3. The opposing player is notified that a response is required.
4. The opposing player has a limited response window.
5. If the response arrives in time, they spend their action budget on hidden edits.
6. The system then resolves for a short simulation window.
7. Both players receive a result summary.
8. The next exchange begins.

### Response timer
- The waiting player cannot take another turn until the other player responds.
- If the responding player fails to answer before the timer expires, they lose the exchange.
- A timeout should generally award strong momentum or an exchange win, not necessarily end the full match instantly.

Initial tuning target:
- response timer: **2–6 hours**

This should be configurable during playtesting.

---

## Victory Conditions
The shared system has a measurable performance level.

### Builder-side victory
The stabilizing player wins when the system reaches its target performance threshold.

### Breaker-side victory
The sabotaging player wins when the system’s performance collapses to zero.

### Match continuation
If neither end state is reached after a resolution step, the match continues.

This is important because it allows:
- longer back-and-forth if both players are active
- recovery arcs
- layered sabotage and layered counterplay
- momentum swings without instant binary endings

---

## Core Turn Economy
One action per turn is too shallow for this design. It encourages obvious undo loops.

The prototype should instead use an **action budget**.

### Prototype action budget goals
Each turn, a player can generally perform:
- **2–3 medium actions**, or
- **1 major + 1 minor action**, depending on costs

This supports:
- combos
- feints
- setup + payoff
- prioritization
- partial answers

### Asymmetry
Asymmetrical budgets should be considered early.

Example direction:
- stabilizer gets more frequent, lower-impact actions
- saboteur gets fewer, higher-leverage actions

This asymmetry supports the intended fantasy of:
- one side improving resilience
- one side finding pressure points

This should be tested, not assumed.

---

## Player Roles

### Role A: Stabilizer / Optimizer
This player’s broad goal is to push the system upward toward its target.

Primary pleasures:
- improving output
- patching weak points
- building resilience
- making the system less exploitable
- inferring what hidden disruptions were introduced
- choosing which issues can be safely ignored

This role should feel like:
- making smart tradeoffs
- staying one step ahead
- building robustness rather than only applying bandages

### Role B: Distorter / Saboteur
This player’s broad goal is to drag the system downward toward failure.

Primary pleasures:
- spotting leverage points
- creating subtle or delayed faults
- making problems look accidental
- creating issues that are hard to diagnose cleanly
- forcing inefficient repairs
- pushing the opponent toward bad responses

This role should feel like:
- being clever, not merely destructive
- creating system behavior that is wrong in interesting ways
- exploiting assumptions

---

## Hidden Information Model
This is a defining feature of the prototype.

### What players should see
Players should see:
- the visible system layout/state
- current performance level
- recent output change
- where failures or delays occurred
- enough symptoms to make informed guesses

### What players should not see
Players should not immediately see:
- the exact edits the opponent made
- the exact tiles/nodes/parts targeted, unless revealed by consequences
- a full move log of hidden actions

### Why this matters
If actions are fully visible, the game risks becoming a straightforward optimization puzzle.

If actions are too hidden, the game risks becoming arbitrary and frustrating.

The right balance is:
- visible consequences
- partially legible causes
- room for deduction and misdirection

---

## System Design Principles
The shared system should be small, active, and readable.

### Requirements
The prototype system should:
- fit comfortably on a mobile screen in 2D
- have a few distinct parts or stages
- produce measurable output over a short resolution window
- support bottlenecks, buffers, strain, and recovery
- create symptoms that players can read

### The system should not require theme to be understood
At prototype stage, think in terms of abstract functions:
- input
- transport
- transformation
- output
- delay
- failure
- redundancy
- overload

The exact fiction can come later.

---

## Action Categories
These are not final abilities. They are design lanes for the prototype.

### Stabilizer action categories
Actions should generally do one or more of the following:
- increase throughput
- add redundancy
- patch a fault-prone area
- reduce future failure chance
- add a buffer or reserve
- improve timing alignment
- reroute around trouble
- reveal hidden issues
- harden a key segment

### Saboteur action categories
Actions should generally do one or more of the following:
- reduce throughput
- create delays
- increase strain
- introduce hidden failure chance
- disable or weaken support
- create waste or leakage
- desynchronize stages
- force local overload
- conceal the real source of trouble

### Important note
These should **not** map to one-to-one opposites whenever possible.

The most fun interactions come from overlap and side effects, not perfect counters.

For example:
- a throughput boost might worsen strain
- a protective patch might reduce flexibility elsewhere
- a sabotage action might create a hidden issue rather than immediate visible damage

This is one of the main ways we avoid repetitive undo gameplay.

---

## Resolution Window
After both players have submitted their edits, the system resolves for a short simulated window.

### Resolution goals
The window should be long enough to show:
- whether output rose or fell
- where stress accumulated
- whether hidden problems surfaced
- whether a local issue cascaded

But it should be short enough that:
- players can parse the result quickly
- the simulation does not feel like passive waiting
- outcomes remain attributable to recent choices

Initial target:
- a visually readable resolution sequence of **5–15 seconds**

This may later be skippable after the first watch.

---

## Why This Could Be Fun Repeatedly
For the concept to survive past novelty, the fun cannot rely only on hidden information.

It must also create repeatable reasons to come back:
- new system states generate new deduction problems
- action budgets create different plan shapes
- asymmetry lets players enjoy different mental roles
- time pressure makes a single move feel consequential
- multiple active matches create a lightweight habit loop
- delayed failures and hidden faults create story-worthy outcomes

Players should want to share moments like:
- “I thought they hit the obvious weak point, but they poisoned the backup instead.”
- “I ignored the visible problem and fixed the real one.”
- “They used a weak move and it caused a full collapse two exchanges later.”

Those are the kinds of stories this design should produce.

---

## UX and Session Flow Goals

### Open app
Player should quickly see:
- which matches need attention
- which side they are on in each match
- how much time remains to respond
- which matches are near victory or collapse

### Take turn
A turn should ideally take:
- **under 1 minute** for a fast, confident player
- **1–3 minutes** for a thoughtful player

### Return value
A player returning after a notification should get:
- immediate understanding of whether things improved or worsened
- enough visible evidence to start deducing what happened
- a meaningful new decision, not only cleanup chores

---

## Prototype Scope Recommendations
For a first playable proof of concept, keep scope very small.

### Recommended prototype scope
Build only:
- one abstract system board
- two player roles
- asynchronous exchange flow
- hidden action submission
- a small action set per role
- a simple resolution simulation
- target-up / collapse-down win states
- response timer handling

### Explicitly defer
Do not include yet:
- strong theme
- deep progression
- cosmetics
- social guild layers
- many system variants
- monetization
- matchmaking complexity
- advanced onboarding

The prototype question is simple:

**Is it fun to improve a hidden system while someone else secretly tries to make it fail?**

---

## Prototype Success Criteria
The prototype is promising if playtests show:
- players understand the state quickly
- players feel clever when making moves
- players are curious about what the opponent did
- hidden information creates intrigue, not confusion
- multiple actions per turn create planning depth
- outcomes feel attributable and fair enough
- players want to check back after notifications
- both roles feel fun, not only the saboteur

### Red flags
Rework is needed if testers report:
- “I’m just undoing what they did.”
- “I can’t tell why I lost output.”
- “The best move is always obvious.”
- “This feels like tower defense / base defense.”
- “This feels too much like maintenance work.”
- “The sabotage is random.”
- “If I miss a response window the game feels pointless.”

---

## Open Questions for Playtesting
These are the main unknowns the prototype should answer.

1. Is the hidden-information layer exciting or frustrating?
2. Do multiple actions per turn create depth or overload?
3. Should initiative alternate, or should one role always begin?
4. What response timer creates urgency without annoyance?
5. How much information should the result screen reveal?
6. How asymmetric should action budgets be?
7. Is target-vs-zero the right win model, or should there be round scoring first?
8. How many concurrent matches feel engaging rather than stressful?
9. Does the stabilizer role feel as expressive and fun as the saboteur role?
10. Can this remain readable and compelling without heavy theme support?

---

## Suggested Next Design Steps
1. Define the abstract system board structure.
2. Define 6–10 prototype actions per role.
3. Define the action budget economy.
4. Define exactly what information is hidden and what is shown.
5. Mock the result screen and symptom reporting.
6. Prototype one full match loop.
7. Playtest for legibility, deduction quality, and repeat fun.

---

## Working Summary
This proof of concept is a short-session asynchronous two-player game about hidden edits to a shared system.

One player improves and stabilizes.
One player distorts and sabotages.
Both act in alternating turns with small action budgets.
Each exchange resolves in a short simulation window.
The system trends either toward target performance or total collapse.

The design’s core promise is not theme, spectacle, or real-time action.
It is the pleasure of:
- making small smart changes
- reading hidden intent from visible outcomes
- forcing difficult tradeoffs
- creating surprising chains of consequence
- returning to a match because the state has meaningfully changed
