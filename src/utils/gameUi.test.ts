import { describe, expect, it } from 'vitest'
import { buildCellPath, isValidMoneyAmount, sortHistoryByTurn } from './gameUi'

describe('money amount validation', () => {
  it('accepts only whole rubles within the current limit', () => {
    expect(isValidMoneyAmount(1, 5_000)).toBe(true)
    expect(isValidMoneyAmount(5_000, 5_000)).toBe(true)
    expect(isValidMoneyAmount(0, 5_000)).toBe(false)
    expect(isValidMoneyAmount(5_001, 5_000)).toBe(false)
    expect(isValidMoneyAmount(12.5, 5_000)).toBe(false)
  })
})

describe('animated board path', () => {
  it('walks through zero on the small circle', () => {
    expect(buildCellPath(22, 4, 24)).toEqual([23, 0, 1, 2])
  })

  it('walks through zero on the big circle', () => {
    expect(buildCellPath(46, 4, 48)).toEqual([47, 0, 1, 2])
  })
})

describe('server history ordering', () => {
  it('keeps all players and groups newest turns and actions first', () => {
    const entries = [
      { id: 'p1-old', playerId: 'p1', turnNumber: 4, timestamp: '2026-01-01T10:00:00Z' },
      { id: 'p2-new', playerId: 'p2', turnNumber: 5, timestamp: '2026-01-01T10:01:00Z' },
      { id: 'p3-newer', playerId: 'p3', turnNumber: 5, timestamp: '2026-01-01T10:02:00Z' },
    ]

    expect(sortHistoryByTurn(entries).map(entry => entry.id)).toEqual(['p3-newer', 'p2-new', 'p1-old'])
  })
})
