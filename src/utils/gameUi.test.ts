import { describe, expect, it } from 'vitest'
import {
  buildCellPath,
  formatRollResult,
  getBankCreditProjection,
  getBigCircleDreamCell,
  getForwardTrackDistance,
  getSpeedTrackTone,
  getTwoLineSpeedTrackTitle,
  isValidMoneyAmount,
  sortHistoryByTurn,
} from './gameUi'

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

  it('calculates the forward distance to a dream through zero', () => {
    expect(getForwardTrackDistance(46, 3, 48)).toBe(5)
    expect(getForwardTrackDistance(3, 3, 48)).toBe(0)
  })

  it('uses the same dream position mapping as the big circle', () => {
    expect(getBigCircleDreamCell(1)).toBe(0)
    expect(getBigCircleDreamCell(3)).toBe(2)
    expect(getBigCircleDreamCell(8)).toBe(7)
    expect(getBigCircleDreamCell(47)).toBe(46)
  })
})

describe('safe bank credit projection', () => {
  it('allows zero cash flow and rejects the next ruble', () => {
    const atLimit = getBankCreditProjection(1_000, 900, [], 1_000)
    const overLimit = getBankCreditProjection(1_000, 900, [], 1_001)

    expect(atLimit.maximum).toBe(1_000)
    expect(atLimit.combinedPayment).toBe(100)
    expect(atLimit.projectedCashFlow).toBe(0)
    expect(overLimit.projectedCashFlow).toBe(-1)
  })

  it('replaces multiple legacy bank payments and preserves rounding', () => {
    const liabilities = [
      { liabilityType: 'bankLoan', balance: 600, payment: 100 },
      { liabilityType: 'bankLoan', balance: 700, payment: 100 },
      { liabilityType: 'mortgage', balance: 50_000, payment: 500 },
    ]
    const projection = getBankCreditProjection(1_000, 1_050, liabilities, 200)

    expect(projection.maximum).toBe(200)
    expect(projection.combinedPayment).toBe(150)
    expect(projection.projectedCashFlow).toBe(0)
  })
})

describe('roll result label', () => {
  it('uses the event title in the exact compact format', () => {
    expect(formatRollResult([3, 4], 7, 'Семейная сеть ресторанов', 'Бизнес'))
      .toBe('3+4=7 | Семейная сеть ресторанов')
  })

  it('falls back to the sector label', () => {
    expect(formatRollResult([6], 6, '', 'ДЕНЬ CASHFLOW')).toBe('6=6 | ДЕНЬ CASHFLOW')
  })
})

describe('speed track presentation', () => {
  it('maps workbook card types to the four visual tones', () => {
    expect(getSpeedTrackTone('speedDream')).toBe('pink')
    expect(getSpeedTrackTone('speedRisk')).toBe('green')
    expect(getSpeedTrackTone('speedIncomeDay')).toBe('orange')
    expect(getSpeedTrackTone('speedExpense')).toBe('purple')
  })

  it('creates a compact two-line segment title', () => {
    const lines = getTwoLineSpeedTrackTitle('Ложа на стадионе профессиональной команды')
    expect(lines).toHaveLength(2)
    expect(lines.join(' ').length).toBeLessThanOrEqual(25)
    expect(lines.join(' ')).toContain('…')
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
