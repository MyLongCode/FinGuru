import { describe, expect, it } from 'vitest'
import { closeCard, normalizeGameState } from './index'

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

  it('normalizes card acknowledgement and history snapshots from server casing', () => {
    const state = normalizeGameState({
      RoomId: 'room-1',
      Settings: {},
      Players: [],
      Dreams: [],
      History: [{
        Id: 'history-1',
        Card: { CardId: 'MEL-26', SectorType: 'deal', SectorLabel: 'Мелкая сделка', Title: 'Обратное дробление', Effect: 'stockSplit', EffectNumerator: 1, EffectDenominator: 2 },
      }],
      PendingCardAcknowledgement: {
        AcknowledgementId: 'ack-1',
        Card: { CardId: 'MEL-26', Title: 'Обратное дробление', CardType: 'other' },
        PrimaryPlayerId: 'player-1',
        RequiredPlayerIds: ['player-1', 'player-2'],
        ClosedPlayerIds: ['player-2'],
        PrimaryActionCompleted: true,
        ExpiresAt: '2026-07-22T12:00:00Z',
      },
    })

    expect(state?.pendingCardAcknowledgement).toMatchObject({
      acknowledgementId: 'ack-1',
      primaryPlayerId: 'player-1',
      requiredPlayerIds: ['player-1', 'player-2'],
      closedPlayerIds: ['player-2'],
      primaryActionCompleted: true,
      card: { cardId: 'MEL-26' },
    })
    expect(state?.history[0].card).toMatchObject({
      cardId: 'MEL-26',
      sectorType: 'deal',
      sectorLabel: 'Мелкая сделка',
      effect: 'stockSplit',
      effectNumerator: 1,
      effectDenominator: 2,
    })
  })

  it('sends the close-card action with the exact acknowledgement identity', () => {
    const calls: unknown[][] = []
    const sdk = {
      sendAction: (...args: unknown[]) => calls.push(args),
    }

    closeCard(sdk as any, 'room-1', 'player-1', 'ack-1')

    expect(calls).toEqual([['finguru.closeCard', {
      roomId: 'room-1',
      playerId: 'player-1',
      acknowledgementId: 'ack-1',
    }]])
  })
})
