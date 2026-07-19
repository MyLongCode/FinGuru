import { describe, expect, it } from 'vitest'
import { formatCurrency, formatFullCurrency } from './format'

describe('currency formatting', () => {
  it('keeps compact formatting outside the financial dashboard', () => {
    expect(formatCurrency(10_500)).toBe('10.5к ₽')
  })

  it('shows the full ruble amount in the financial dashboard', () => {
    expect(formatFullCurrency(10_500)).toBe('10 500 ₽')
    expect(formatFullCurrency(-1_330)).toBe('- 1 330 ₽')
  })
})
