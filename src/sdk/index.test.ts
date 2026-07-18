import { describe, expect, it } from 'vitest'
import { normalizeGameState } from './index'

describe('FinGuru game state normalization', () => {
  it('normalizes all speed-track fields and preserves server order', () => {
    const state = normalizeGameState({
      RoomId: 'room-1',
      Settings: { DiceCount: 2, SalaryPayoutMode: 'automatic' },
      Players: [],
      Dreams: [],
      BigTrack: [
        { Position: 0, CardId: 'SPD-01', Type: 'speedDream', Title: 'Купите лес', Description: 'Описание', Cost: 250000, CashFlow: 14000, DealType: 'Мечта (розовая)', Logic: 'dream' },
        { position: 1, cardId: 'SPD-02', type: 'speedBusiness', title: 'Семейная сеть ресторанов', description: 'Описание', cost: 300000, cashFlow: 14000, dealType: 'Бизнес (зелёная)', logic: '' },
      ],
      History: [],
    })

    expect(state?.bigTrack).toHaveLength(2)
    expect(state?.bigTrack.map(cell => cell.cardId)).toEqual(['SPD-01', 'SPD-02'])
    expect(state?.bigTrack[0]).toMatchObject({
      position: 0,
      title: 'Купите лес',
      cost: 250000,
      cashFlow: 14000,
    })
  })

  it('normalizes missing speed-track data as an empty array', () => {
    const state = normalizeGameState({ Settings: {}, Players: [], Dreams: [], History: [] })
    expect(state?.bigTrack).toEqual([])
  })
})
