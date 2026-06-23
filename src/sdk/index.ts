// If `algogames-sdk` package is not available in dev, provide a lightweight
// fallback mock so the FinGuru iframe can load and post actions to parent.
// In production the real `algogames-sdk` should be used instead.

export type TurnStrategy = any
export type TurnState = any

let sdk: any = null;

class MockAlgoGamesSDK {
  private origin: string
  private handlers: ((msg: any) => void)[] = []

  constructor(origin: string) {
    this.origin = origin
    window.addEventListener('message', (e) => {
      try {
        const msg = e.data
        const normalized = normalizeIncomingMessage(msg)
        if (normalized?.type) {
          this.handlers.forEach(h => h(normalized))
        }
      } catch {}
    })
  }

  async init() {
    try {
      window.parent.postMessage({ type: 'sdk.ready', payload: {} }, this.origin || '*')
    } catch {}
  }

  sendAction(type: string, payload?: any) {
    try {
      window.parent.postMessage({
        type: 'game.action',
        payload: { action: type, ...payload }
      }, this.origin || '*')
    } catch {}
  }

  onReceiveMessage(handler: (msg: any) => void) {
    this.handlers.push(handler)
    return () => { this.handlers = this.handlers.filter(h => h !== handler) }
  }
}

function normalizeIncomingMessage(msg: any): any | null {
  if (!msg?.type) return null

  if ((msg.type === 'game.message' || msg.type === 'game.broadcast') && msg.payload) {
    return {
      type: msg.payload.type,
      data: msg.payload.data,
      senderId: msg.payload.senderId,
      timestamp: msg.payload.timestamp,
    }
  }

  if (typeof msg.type === 'string' && msg.type.startsWith('finguru.')) {
    return {
      type: msg.type,
      data: msg.data ?? msg.payload,
      senderId: msg.senderId,
      timestamp: msg.timestamp,
    }
  }

  return msg
}

function tryCreateRealSdk(origin: string): any | null {
  try {
    // dynamic import may fail in dev if package missing
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('algogames-sdk')
    const AG = mod?.AlgoGamesSDK ?? mod?.default ?? mod
    return new AG(origin)
  } catch {
    return null
  }
}

function getParentOrigin(): string {
  if (typeof window === 'undefined') return '*'
  try {
    if (window.parent !== window) {
      return window.parent.location.origin
    }
  } catch {
    return '*'
  }
  return '*'
}

export function getSdk(): AlgoGamesSDK {
  if (!sdk) {
    const origin = getParentOrigin()
    const real = tryCreateRealSdk(origin)
    sdk = real ?? new MockAlgoGamesSDK(origin)
  }
  return sdk as any
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

export interface PlayerGameState {
  playerId: string
  displayName: string
  roleId: string
  color: string
  dreamId: number | null
  cash: number
  income: number
  expenses: number
  position: number
  skipNextTurn: boolean
  achievedDreams?: number[]
  achievedDreamsCount?: number
}

export interface DreamState {
  id: number
  title: string
  number: string
  description: string
  price: number
  chosenByPlayerId: string | null
}

export interface GameState {
  roomId: string
  phase: string
  currentRound: number
  maxRounds?: number
  winner: string | null
  winners?: string[]
  finalResults?: any[]
  players: PlayerGameState[]
  dreams: DreamState[]
  currentPlayerId: string
  turnCount: number
}

export function getGameState(sdk: AlgoGamesSDK, roomId: string): Promise<GameState | null> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve(null)
    }, 3000)

    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.gameState' && msg.data?.roomId === roomId) {
        window.clearTimeout(timeout)
        sdk.onReceiveMessage(() => {});
        resolve(msg.data as GameState);
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getGameState', { roomId });
  });
}

export interface DiceRollResult {
  rolledBy: string
  dice1: number
  dice2: number
  total: number
  newPosition: number
  sectorType: string
  sectorLabel: string
  cashChange: number
  newCash: number
  nextPlayerId: string
  isRoundPassed: boolean
  currentRound: number
  phase?: string
  winners?: string[]
  finalResults?: any[]
  players: PlayerGameState[]
}

export function rollDice(sdk: AlgoGamesSDK, roomId: string, playerId: string): void {
  sdk.sendAction('finguru.rollDice', { roomId, playerId });
}

export function subscribeDiceRoll(
  sdk: AlgoGamesSDK,
  roomId: string,
  onUpdate: (result: DiceRollResult) => void
): () => void {
  const unsubscribe = sdk.onReceiveMessage((msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.diceRolled' && msg.data?.roomId === roomId) {
      onUpdate(msg.data as DiceRollResult);
    }
  });
  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
}

export function subscribeGameStateUpdate(
  sdk: AlgoGamesSDK,
  roomId: string,
  onUpdate: (state: GameState) => void
): () => void {
  const unsubscribe = sdk.onReceiveMessage((msg: { type: string; data: any }) => {
    const stateEvents = new Set([
      'finguru.gameState',
      'finguru.gameStarted',
      'finguru.stateUpdate',
      'finguru.roundProcessed',
      'finguru.gameOver',
    ])

    if (stateEvents.has(msg.type) && msg.data?.roomId === roomId) {
      onUpdate(msg.data as GameState);
    }
  });
  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
}

// --- Additional SDK helpers for board, deals, assets, cell events and logs ---

export interface BoardCell {
  id: number
  position: number
  cellType: string
  title: string
  description?: string
  value?: number
  iconKey?: string | null
}

export interface DealItem {
  id: number
  dealType: string
  title: string
  description?: string
  cost: number
  cashflowPerTurn?: number
  iconKey?: string | null
}

export interface AssetItem {
  key: string
  url: string
}

export interface CellEvent {
  playerId: string
  cellType: string
  deal?: DealItem
  availableActions?: string[]
  roomId?: string
}

export interface GameLogEntry {
  entryId: string
  playerId?: string
  playerName?: string
  playerColor?: string
  eventType: string
  message: string
  amount?: number
  timestamp?: number
}

export function getBoard(sdk: AlgoGamesSDK, roomId: string): Promise<BoardCell[] | null> {
  return new Promise((resolve) => {
    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.board' && msg.data?.roomId === roomId) {
        sdk.onReceiveMessage(() => {});
        resolve(msg.data.board as BoardCell[]);
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getBoard', { roomId });
  });
}

export function getDeals(sdk: AlgoGamesSDK, roomId: string): Promise<DealItem[] | null> {
  return new Promise((resolve) => {
    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.deals' && msg.data?.roomId === roomId) {
        sdk.onReceiveMessage(() => {});
        resolve(msg.data.deals as DealItem[]);
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getDeals', { roomId });
  });
}

export function getAssets(sdk: AlgoGamesSDK, roomId: string): Promise<AssetItem[] | null> {
  return new Promise((resolve) => {
    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.assets' && msg.data?.roomId === roomId) {
        sdk.onReceiveMessage(() => {});
        resolve(msg.data.assets as AssetItem[]);
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getAssets', { roomId });
  });
}

export function selectDream(sdk: AlgoGamesSDK, roomId: string, playerId: string, dreamId: number): void {
  sdk.sendAction('finguru.selectDream', { roomId, playerId, dreamId });
}

export function resolveCellAction(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
  action: string,
  dealId?: number | null,
): void {
  sdk.sendAction('finguru.resolveCellAction', { roomId, playerId, action, dealId });
}

export function subscribeCellEvent(
  sdk: AlgoGamesSDK,
  roomId: string,
  onEvent: (event: CellEvent) => void,
): () => void {
  const handler = (msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.cellEvent' && msg.data?.roomId === roomId) {
      onEvent(msg.data as CellEvent);
    }
  };
  sdk.onReceiveMessage(handler);
  return () => sdk.onReceiveMessage(() => {});
}

export function getGameLog(sdk: AlgoGamesSDK, roomId: string): Promise<GameLogEntry[] | null> {
  return new Promise((resolve) => {
    const handler = (msg: { type: string; data: any }) => {
      if (msg.type === 'finguru.gameLog' && msg.data?.roomId === roomId && Array.isArray(msg.data.entries)) {
        sdk.onReceiveMessage(() => {});
        resolve(msg.data.entries as GameLogEntry[]);
      }
    };
    sdk.onReceiveMessage(handler);
    sdk.sendAction('finguru.getGameLog', { roomId });
  });
}

export function subscribeGameLog(
  sdk: AlgoGamesSDK,
  roomId: string,
  onEntry: (entry: GameLogEntry) => void,
): () => void {
  const handler = (msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.gameLog' && msg.data?.roomId === roomId && msg.data.entry) {
      onEntry(msg.data.entry as GameLogEntry);
    }
  };
  sdk.onReceiveMessage(handler);
  return () => sdk.onReceiveMessage(() => {});
}

export function subscribeGameOver(
  sdk: AlgoGamesSDK,
  roomId: string,
  onOver: (data: any) => void,
): () => void {
  const handler = (msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.gameOver' && msg.data?.roomId === roomId) {
      onOver(msg.data);
    }
  };
  sdk.onReceiveMessage(handler);
  return () => sdk.onReceiveMessage(() => {});
}

export function subscribeGameError(
  sdk: AlgoGamesSDK,
  roomId: string,
  onError: (message: string) => void,
): () => void {
  const unsubscribe = sdk.onReceiveMessage((msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.gameError' && msg.data?.roomId === roomId) {
      onError(msg.data.message ?? 'Не удалось выполнить действие')
    }
  })
  return typeof unsubscribe === 'function' ? unsubscribe : () => {}
}
