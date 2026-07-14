import { describe, expect, it } from 'vitest'
import { applyAction, createMatch, endTurn } from './engine'

describe('action and turn rules', () => {
  it('enforces turn role and AP limits', () => {
    const match = createMatch(0)

    const saboteurAction = applyAction(match, {
      actionId: 'sticky-spill',
      targets: ['mixing-vat'],
    })
    expect(saboteurAction.ok).toBe(false)

    const first = applyAction(match, {
      actionId: 'speed-boost',
      targets: ['mixing-vat'],
    })
    expect(first.ok).toBe(true)

    const second = applyAction(first.match, {
      actionId: 'speed-boost',
      targets: ['conveyor-belt'],
    })
    expect(second.ok).toBe(true)

    const third = applyAction(second.match, {
      actionId: 'polish-gears',
      targets: ['mixing-vat'],
    })
    expect(third.ok).toBe(false)
    expect(third.reason).toContain('Not enough action points')
  })

  it('rejects invalid reserve tank duplicate and enforces adjacent gum target', () => {
    const initial = createMatch(0)

    const firstTank = applyAction(initial, {
      actionId: 'reserve-tank',
      targets: ['ingredient-hopper'],
    })
    expect(firstTank.ok).toBe(true)

    const duplicateTank = applyAction(firstTank.match, {
      actionId: 'reserve-tank',
      targets: ['ingredient-hopper'],
    })
    expect(duplicateTank.ok).toBe(false)

    const saboteurTurn = endTurn(firstTank.match)
    const gum = applyAction(saboteurTurn, {
      actionId: 'gum-works',
      targets: ['ingredient-hopper', 'packaging-line'],
    })

    expect(gum.ok).toBe(false)
    expect(gum.reason).toContain('adjacent')
  })
})
