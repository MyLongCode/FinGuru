import { AlgoGamesSDK } from 'algogames-sdk';

export { AlgoGamesSDK };
export type { TurnStrategy, TurnState } from 'algogames-sdk';

let sdk: AlgoGamesSDK | null = null;

export function getSdk(): AlgoGamesSDK {
  if (!sdk) {
    sdk = new AlgoGamesSDK();
  }
  return sdk;
}

export async function initSdk(): Promise<AlgoGamesSDK> {
  const s = getSdk();
  await s.init();
  return s;
}

export async function initFinGuruGame(sdk: AlgoGamesSDK, roomId: string): Promise<void> {
  sdk.sendAction('finguru.initialize', { roomId });
}

export async function getPlayerRole(sdk: AlgoGamesSDK, roomId: string, playerId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.roleAssigned' && msg.data?.roomId === roomId) {
        sdk.onReceiveMessage(() => {});
        resolve(msg.data.roleId);
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getRole', { roomId, playerId });
  });
}

export async function getPlayerInfo(sdk: AlgoGamesSDK, roomId: string, playerId: string): Promise<{ roleId: string | null; color: string | null }> {
  return new Promise((resolve) => {
    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.roleAssigned' && msg.data?.roomId === roomId) {
        sdk.onReceiveMessage(() => {});
        resolve({ roleId: msg.data.roleId ?? null, color: msg.data.color ?? null });
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getRole', { roomId, playerId });
  });
}

export interface DreamServerState {
  id: number
  chosenByPlayerId: string | null
}

export interface DreamSelectionUpdate {
  dreamId: number
  selectedBy: string
  dreams: DreamServerState[]
  playerColors: Record<string, string>
  playerNames: Record<string, string>
}

export function subscribeDreamSelection(
  sdk: AlgoGamesSDK,
  roomId: string,
  _playerId: string,
  onUpdate: (update: DreamSelectionUpdate) => void
): () => void {
  const handler = (msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.dreamSelected' && msg.data?.roomId === roomId) {
      onUpdate({
        dreamId: msg.data.dreamId,
        selectedBy: msg.data.selectedBy,
        dreams: msg.data.dreams,
        playerColors: msg.data.playerColors ?? {},
        playerNames: msg.data.playerNames ?? {},
      });
    }
  };
  sdk.onReceiveMessage(handler);
  return () => sdk.onReceiveMessage(() => {});
}
