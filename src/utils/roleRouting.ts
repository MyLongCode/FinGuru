import type { GameState } from '../sdk'

export type RoleRouteStage = 'card' | 'details' | 'dreams' | 'game'

export function getAuthoritativeRolePath(
  state: GameState,
  playerId: string,
  isSpectator: boolean,
  requestedStage: RoleRouteStage,
): string | null {
  const player = isSpectator
    ? state.players[0]
    : state.players.find(item => item.playerId === playerId)
  if (!player?.roleId) return null

  const stage = state.phase === 'playing' || state.phase === 'gameOver' || isSpectator
    ? 'game'
    : requestedStage
  const suffix = stage === 'card' ? '' : `/${stage}`
  return `/role/${player.roleId}${suffix}`
}
