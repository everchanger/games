import { describe, expect, it } from 'vitest'
import { createMatch } from './engine'

describe('createMatch', () => {
  it('creates the default 4-node match state', () => {
    const match = createMatch(0)

    expect(match.efficiency).toBe(50)
    expect(match.activeRole).toBe('Stabilizer')
    expect(match.apRemaining).toBe(4)
    expect(match.turnNumber).toBe(1)
    expect(match.nodes.map((node) => node.name)).toEqual([
      'Ingredient Hopper',
      'Mixing Vat',
      'Conveyor Belt',
      'Packaging Line',
    ])
    expect(match.nodes.map((node) => node.integrity)).toEqual([78, 74, 72, 76])
    expect(match.nodes.every((node) => !node.hasBuffer)).toBe(true)
    expect(match.nodes.every((node) => node.hiddenFaults.length === 0)).toBe(true)
  })
})
