import { describe, expect, it } from 'vitest'
import { advanceByElapsedTime, advanceOneTick, applyAction, createMatch, endTurn } from './engine'

describe('simulation and ticking', () => {
  it('limits efficiency movement to 8 points per tick', () => {
    const match = createMatch(0)
    match.nodes[0]!.integrity = 0

    const ticked = advanceOneTick(match)

    expect(ticked.latestEfficiencyDelta).toBe(-8)
    expect(ticked.efficiency).toBe(42)
  })

  it('triggers ingredient swap after 2 ticks', () => {
    const start = endTurn(createMatch(0))
    const planted = applyAction(start, {
      actionId: 'ingredient-swap',
      targets: ['mixing-vat'],
    }).match

    const once = advanceOneTick(planted)
    const nodeAfterOne = once.nodes.find((node) => node.id === 'mixing-vat')!
    expect(nodeAfterOne.integrity).toBe(74)

    const twice = advanceOneTick(once)
    const nodeAfterTwo = twice.nodes.find((node) => node.id === 'mixing-vat')!
    expect(nodeAfterTwo.integrity).toBeLessThan(74)
  })

  it('buffer absorbs the next integrity damage event', () => {
    const match = createMatch(0)
    const withBuffer = applyAction(match, {
      actionId: 'reserve-tank',
      targets: ['conveyor-belt'],
    }).match

    const sabotaged = applyAction(endTurn(withBuffer), {
      actionId: 'ingredient-swap',
      targets: ['conveyor-belt'],
    }).match

    const afterTwoTicks = advanceOneTick(advanceOneTick(sabotaged))
    const node = afterTwoTicks.nodes.find((current) => current.id === 'conveyor-belt')!

    expect(node.integrity).toBe(72)
    expect(node.hasBuffer).toBe(false)
  })

  it('advances deterministic elapsed ticks when resuming from persistence', () => {
    const match = createMatch(0)
    const resumed = advanceByElapsedTime(match, 25_000)

    expect(resumed.tickCount).toBe(2)
    expect(resumed.lastTickAt).toBe(20_000)
  })

  it('replays the same deterministic ticks when resuming with delayed faults pending', () => {
    const saboteurTurn = endTurn(createMatch(0))
    const planted = applyAction(saboteurTurn, {
      actionId: 'ingredient-swap',
      targets: ['mixing-vat'],
    }).match

    const manual = advanceOneTick(advanceOneTick(planted))
    const resumed = advanceByElapsedTime(planted, 20_000)

    expect(resumed).toEqual({
      ...manual,
      lastTickAt: 20_000,
    })
  })

  it('uses reroute batch to reduce a bottleneck penalty for one tick, then applies strain', () => {
    const match = createMatch(0)
    match.nodes[0]!.integrity = 20

    const baseline = advanceOneTick(match)
    const rerouted = advanceOneTick(
      applyAction(match, {
        actionId: 'reroute-batch',
        targets: ['ingredient-hopper'],
      }).match,
    )

    expect(baseline.efficiency).toBe(42)
    expect(rerouted.efficiency).toBe(58)
    expect(rerouted.nodes[0]?.integrity).toBe(18)
  })

  it('models sugar rush spike as a delayed boost-then-crash fault', () => {
    const saboteurTurn = endTurn(createMatch(0))
    const sabotaged = applyAction(saboteurTurn, {
      actionId: 'sugar-rush-spike',
      targets: ['mixing-vat'],
    }).match

    const boosted = advanceOneTick(sabotaged)
    const nodeAfterBoost = boosted.nodes.find((node) => node.id === 'mixing-vat')!
    expect(nodeAfterBoost.integrity).toBe(74)

    const crashed = advanceOneTick(boosted)
    const nodeAfterCrash = crashed.nodes.find((node) => node.id === 'mixing-vat')!
    expect(nodeAfterCrash.integrity).toBe(64)
    expect(nodeAfterCrash.hiddenFaults.map((fault) => fault.type)).toContain('sugarRushSpike')
    expect(nodeAfterCrash.hiddenFaults.every((fault) => fault.revealed)).toBe(true)
  })

  it('detects winners at threshold edges', () => {
    const stabilizerMatch = createMatch(0)
    stabilizerMatch.efficiency = 99
    stabilizerMatch.nodes.forEach((node) => {
      node.integrity = 100
    })

    const stabilizerWon = advanceOneTick(stabilizerMatch)
    expect(stabilizerWon.winner).toBe('Stabilizer')

    const saboteurMatch = createMatch(0)
    saboteurMatch.efficiency = 1
    saboteurMatch.nodes.forEach((node) => {
      node.integrity = 0
    })

    const saboteurWon = advanceOneTick(saboteurMatch)
    expect(saboteurWon.winner).toBe('Saboteur')
  })
})
