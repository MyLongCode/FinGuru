import { describe, expect, it } from 'vitest'
import type { GameState } from '../sdk'
import { getAuthoritativeRolePath } from './roleRouting'

function state(phase: string): GameState {
  return {
    roomId: 'room-1',
    phase,
    currentRound: 1,
    winner: null,
    settings: { diceCount: 2, salaryPayoutMode: 'automatic' },
    players: [{
      playerId: 'player-1', displayName: 'Игрок', roleId: 'doctor', color: '#fff', dreamId: null,
      cash: 0, income: 0, expenses: 0, position: 0, bigPosition: 0, isOnBigCircle: false,
      skipNextTurn: false, skipTurnsRemaining: 0, charityDiceTurnsRemaining: 0, accruedSalary: 0,
    }],
    dreams: [],
    bigTrack: [],
    currentPlayerId: 'player-1',
    turnCount: 0,
    history: [],
  }
}

describe('authoritative role routing', () => {
  it('keeps the requested onboarding stage but replaces a stale role', () => {
    expect(getAuthoritativeRolePath(state('dreamSelection'), 'player-1', false, 'details'))
      .toBe('/role/doctor/details')
  })

  it('always returns the game route for a running game', () => {
    expect(getAuthoritativeRolePath(state('playing'), 'player-1', false, 'card'))
      .toBe('/role/doctor/game')
  })
})
