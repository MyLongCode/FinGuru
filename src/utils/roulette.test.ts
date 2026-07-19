import { describe, expect, it } from 'vitest'
import { createRoulettePlan, getRouletteTravelCards, normalizeCarouselIndex } from './roulette'

describe('top bar roulette', () => {
  it('normalizes indexes into the carousel range', () => {
    expect(normalizeCarouselIndex(48, 48)).toBe(0)
    expect(normalizeCarouselIndex(-1, 48)).toBe(47)
  })

  it('adds a complete lap to a regular forward transition', () => {
    expect(getRouletteTravelCards(5, 9, 48)).toBe(52)
  })

  it('wraps through 47 to 0 after a complete lap', () => {
    expect(getRouletteTravelCards(47, 0, 48)).toBe(49)
  })

  it('still makes one complete lap when the target is unchanged', () => {
    expect(getRouletteTravelCards(12, 12, 48)).toBe(48)
  })

  it('centers immediately without travel in reduced-motion mode', () => {
    expect(createRoulettePlan(47, 48, 48, true)).toEqual({
      targetIndex: 0,
      travelCards: 0,
    })
  })
})
