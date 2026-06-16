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
