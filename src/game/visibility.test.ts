import { describe, expect, it } from 'vitest'
import { advanceOneTick, applyAction, createMatch, endTurn } from './engine'
import { getVisibleState } from './visibility'

describe('visibility and hidden info', () => {
  it('keeps hidden faults invisible until inspected or triggered', () => {
    const saboteurTurn = endTurn(createMatch(0))
    const sabotaged = applyAction(saboteurTurn, {
      actionId: 'ingredient-swap',
      targets: ['packaging-line'],
    }).match

    const beforeReveal = getVisibleState(sabotaged, 'Stabilizer')
    expect(beforeReveal.nodes.find((node) => node.id === 'packaging-line')?.revealedFaults).toEqual([])

    const stabilizerTurn = endTurn(sabotaged)
    const inspected = applyAction(stabilizerTurn, {
      actionId: 'deep-inspection',
      targets: ['packaging-line'],
    }).match

    const afterInspection = getVisibleState(inspected, 'Stabilizer')
    expect(afterInspection.nodes.find((node) => node.id === 'packaging-line')?.revealedFaults).toEqual(['Ingredient Swap'])

    const triggered = advanceOneTick(advanceOneTick(sabotaged))
    const afterTrigger = getVisibleState(triggered, 'Stabilizer')
    expect(afterTrigger.nodes.find((node) => node.id === 'packaging-line')?.revealedFaults).toEqual(['Ingredient Swap'])
  })

  it('keeps sugar rush spike hidden until its crash becomes visible', () => {
    const saboteurTurn = endTurn(createMatch(0))
    const sabotaged = applyAction(saboteurTurn, {
      actionId: 'sugar-rush-spike',
      targets: ['mixing-vat'],
    }).match

    const afterBoostTick = advanceOneTick(sabotaged)
    const boostView = getVisibleState(afterBoostTick, 'Stabilizer')
    expect(boostView.nodes.find((node) => node.id === 'mixing-vat')?.revealedFaults).toEqual([])

    const afterCrashTick = advanceOneTick(afterBoostTick)
    const crashView = getVisibleState(afterCrashTick, 'Stabilizer')
    expect(crashView.nodes.find((node) => node.id === 'mixing-vat')?.revealedFaults).toEqual(['Sugar Rush Spike'])
  })

  it('applies false reading only to visible integrity tier', () => {
    const match = endTurn(createMatch(0))
    const targetedNode = match.nodes.find((node) => node.id === 'ingredient-hopper')!
    targetedNode.integrity = 20

    const withFalseReading = applyAction(match, {
      actionId: 'false-reading',
      targets: ['ingredient-hopper'],
    }).match

    const activeFalseReading = advanceOneTick(withFalseReading)
    const stabilizerView = getVisibleState(activeFalseReading, 'Stabilizer')
    const saboteurView = getVisibleState(activeFalseReading, 'Saboteur')

    expect(stabilizerView.nodes.find((node) => node.id === 'ingredient-hopper')?.integrityTier).toBe('yellow')
    expect(saboteurView.nodes.find((node) => node.id === 'ingredient-hopper')?.integrityTier).toBe('red')
    expect(activeFalseReading.nodes.find((node) => node.id === 'ingredient-hopper')?.integrity).toBe(20)
  })
})
