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
    const payloadData = msg.payload.data ?? msg.payload.state ?? msg.payload.payload
    return {
      type: msg.payload.type,
      data: payloadData,
      senderId: msg.payload.senderId,
      timestamp: msg.payload.timestamp,
    }
  }

  if (typeof msg.type === 'string' && msg.type.startsWith('finguru.')) {
    return {
      type: msg.type,
      data: msg.data ?? msg.payload?.data ?? msg.payload?.state ?? msg.payload,
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
  bigPosition: number
  isOnBigCircle: boolean
  skipNextTurn: boolean
  skipTurnsRemaining: number
  charityDiceTurnsRemaining: number
  accruedSalary: number
  achievedDreams?: number[]
  achievedDreamsCount?: number
  assets?: FinGuruAsset[]
  liabilities?: FinGuruLiability[]
}

export interface FinGuruGameSettings {
  diceCount: 1 | 2
  salaryPayoutMode: 'automatic' | 'manual'
}

export interface FinGuruAsset {
  id: string
  title: string
  cardId: string
  assetType: string
  cost: number
  cashFlow: number
  quantity: number
}

export interface FinGuruLiability {
  id: string
  title: string
  liabilityType: string
  balance: number
  payment: number
}

export interface PendingDecision {
  playerId: string
  decisionType: string
  sectorType: string
  sectorLabel: string
  options: string[]
  decisionOptions?: DecisionOption[]
  createdAt?: string
}

export interface FinGuruAuctionState {
  auctionId: string
  sellerPlayerId: string
  dealCard: DecisionOption
  startingBid: number
  currentBid: number
  currentBidderPlayerId?: string | null
  participantPlayerIds: string[]
  passedPlayerIds: string[]
  createdAt?: string
  updatedAt?: string
}

export interface DecisionOption {
  option: string
  action: string
  cardId: string
  title: string
  description: string
  cardType: string
  dealType: string
  ticker: string
  targetPlayerId: string
  offeredByPlayerId: string
  cost: number
  cashFlow: number
  assetValue: number
  liabilityValue: number
  offerPrice: number
  cashChange: number
  incomeChange: number
  expensesChange: number
  roi: string
  saleRange: string
  logic: string
  skipNextTurn: boolean
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
  settings: FinGuruGameSettings
  players: PlayerGameState[]
  dreams: DreamState[]
  pendingDecision?: PendingDecision | null
  pendingAuction?: FinGuruAuctionState | null
  currentPlayerId: string
  turnCount: number
}

const DEFAULT_FIN_GURU_DREAMS: DreamState[] = [
  { id: 1, title: '\u041a\u0443\u043f\u0438\u0442\u0435 \u043b\u0435\u0441', number: '\u21161', description: '\u041e\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435 \u0432\u044b\u0440\u0443\u0431\u043a\u0443 \u0432\u0435\u043a\u043e\u0432\u044b\u0445 \u0434\u0435\u0440\u0435\u0432\u044c\u0435\u0432. \u041f\u043e\u0436\u0435\u0440\u0442\u0432\u0443\u0439\u0442\u0435 1000 \u0430\u043a\u0440\u043e\u0432 \u043b\u0435\u0441\u0430 \u0438 \u0441\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043f\u0440\u043e\u0433\u0443\u043b\u043e\u0447\u043d\u044b\u0435 \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u044b, \u0447\u0442\u043e\u0431\u044b \u0432\u0441\u0435 \u043c\u043e\u0433\u043b\u0438 \u043d\u0430\u0441\u043b\u0430\u0436\u0434\u0430\u0442\u044c\u0441\u044f \u043e\u0431\u0449\u0435\u043d\u0438\u0435\u043c \u0441 \u043f\u0440\u0438\u0440\u043e\u0434\u043e\u0439.', price: 250000, chosenByPlayerId: null },
  { id: 3, title: '\u041b\u043e\u0436\u0430 \u043d\u0430 \u0441\u0442\u0430\u0434\u0438\u043e\u043d\u0435 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b', number: '\u21163', description: '\u0410\u0431\u043e\u043d\u0435\u043c\u0435\u043d\u0442 \u0432 \u0447\u0430\u0441\u0442\u043d\u0443\u044e \u043b\u043e\u0436\u0443 \u043d\u0430 \u0441\u0442\u0430\u0434\u0438\u043e\u043d\u0435 \u043d\u0430 12 \u043f\u0435\u0440\u0441\u043e\u043d \u0441 \u0435\u0434\u043e\u0439 \u0438 \u043d\u0430\u043f\u0438\u0442\u043a\u0430\u043c\u0438 \u0432\u0430\u0448\u0435\u0439 \u043b\u044e\u0431\u0438\u043c\u043e\u0439 \u043a\u043e\u043c\u0430\u043d\u0434\u044b.', price: 200000, chosenByPlayerId: null },
  { id: 5, title: '\u0414\u0440\u0435\u0432\u043d\u0438\u0435 \u0433\u043e\u0440\u043e\u0434\u0430 \u0410\u0437\u0438\u0438', number: '\u21165', description: '\u0427\u0430\u0441\u0442\u043d\u044b\u0439 \u0441\u0430\u043c\u043e\u043b\u0451\u0442 \u0434\u043e\u0441\u0442\u0430\u0432\u0438\u0442 \u0432\u0430\u0441 \u0438 \u0434\u0440\u0443\u0437\u0435\u0439 \u0432 \u0441\u0430\u043c\u044b\u0435 \u043e\u0442\u0434\u0430\u043b\u0451\u043d\u043d\u044b\u0435 \u0443\u0433\u043e\u043b\u043a\u0438 \u0410\u0437\u0438\u0438, \u043a\u0443\u0434\u0430 \u0435\u0449\u0451 \u043d\u0435 \u0441\u0442\u0443\u043f\u0430\u043b\u0430 \u043d\u043e\u0433\u0430 \u0442\u0443\u0440\u0438\u0441\u0442\u0430.', price: 150000, chosenByPlayerId: null },
  { id: 8, title: '\u0424\u043e\u043d\u0434\u043e\u0432\u0430\u044f \u0431\u0438\u0440\u0436\u0430 \u0434\u043b\u044f \u0434\u0435\u0442\u0435\u0439', number: '\u21168', description: '\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0448\u043a\u043e\u043b\u0443 \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u0438 \u0438\u043d\u0432\u0435\u0441\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0434\u043b\u044f \u043f\u043e\u0434\u0440\u0430\u0441\u0442\u0430\u044e\u0449\u0438\u0445 \u043a\u0430\u043f\u0438\u0442\u0430\u043b\u0438\u0441\u0442\u043e\u0432, \u0447\u0442\u043e\u0431\u044b \u043e\u0431\u0443\u0447\u0438\u0442\u044c \u0438\u0445 \u043e\u0441\u043d\u043e\u0432\u0430\u043c \u0431\u0438\u0437\u043d\u0435\u0441\u0430. \u0412 \u0448\u043a\u043e\u043b\u0435 \u0434\u043e\u043b\u0436\u043d\u044b \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0434\u0435\u0442\u0438-\u0443\u0447\u0435\u043d\u0438\u043a\u0438.', price: 125000, chosenByPlayerId: null },
  { id: 11, title: '\u0423\u0447\u0430\u0441\u0442\u0438\u0435 \u0432 \u0440\u0435\u0433\u0430\u0442\u0435', number: '\u211611', description: '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435\u0441\u044c \u0432 \u041f\u0435\u0440\u0442 (\u0410\u0432\u0441\u0442\u0440\u0430\u043b\u0438\u044f). \u041f\u0440\u0438\u043c\u0438\u0442\u0435 \u0443\u0447\u0430\u0441\u0442\u0438\u0435 \u0432 \u043e\u0434\u043d\u043e\u0439 \u0438\u0437 \u0441\u0430\u043c\u044b\u0445 \u0431\u044b\u0441\u0442\u0440\u043e\u0445\u043e\u0434\u043d\u044b\u0445 \u0440\u0435\u0433\u0430\u0442 \u0432 \u043c\u0438\u0440\u0435.', price: 150000, chosenByPlayerId: null },
  { id: 14, title: '\u041a\u0438\u043d\u043e\u0444\u0435\u0441\u0442\u0438\u0432\u0430\u043b\u044c \u0432 \u041a\u0430\u043d\u043d\u0430\u0445', number: '\u211614', description: '\u0412\u0435\u0447\u0435\u0440\u0438\u043d\u043a\u0430 \u0441\u043e \u0437\u0432\u0451\u0437\u0434\u0430\u043c\u0438! \u0422\u0443\u0440 \u043f\u043e \u0424\u0440\u0430\u043d\u0446\u0438\u0438 \u043f\u043b\u044e\u0441 \u043d\u0435\u0434\u0435\u043b\u044f \u043e\u0431\u0449\u0435\u043d\u0438\u044f \u0441\u043e \u0437\u043d\u0430\u043c\u0435\u043d\u0438\u0442\u043e\u0441\u0442\u044f\u043c\u0438 \u0432 \u041a\u0430\u043d\u043d\u0430\u0445. \u0412\u0430\u043c \u0434\u0430\u0436\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0438\u043b\u0438 \u0433\u043b\u0430\u0432\u043d\u0443\u044e \u0440\u043e\u043b\u044c.', price: 125000, chosenByPlayerId: null },
  { id: 16, title: '\u041a\u0440\u0443\u0438\u0437 \u043f\u043e \u0421\u0440\u0435\u0434\u0438\u0437\u0435\u043c\u043d\u043e\u043c\u043e\u0440\u044c\u044e \u043d\u0430 \u0447\u0430\u0441\u0442\u043d\u043e\u0439 \u044f\u0445\u0442\u0435', number: '\u211616', description: '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435\u0441\u044c \u043d\u0430 \u043c\u0435\u0441\u044f\u0446 \u0432 \u043a\u0440\u0443\u0438\u0437 \u0441 \u0434\u0440\u0443\u0437\u044c\u044f\u043c\u0438, \u043f\u043e\u0441\u0435\u0442\u0438\u0442\u0435 \u0418\u0442\u0430\u043b\u0438\u044e, \u0424\u0440\u0430\u043d\u0446\u0438\u044e \u0438 \u0413\u0440\u0435\u0446\u0438\u044e.', price: 100000, chosenByPlayerId: null },
  { id: 17, title: '\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u043a\u043e\u043d\u043a\u0443\u0440\u0441 \u043c\u0438\u0440\u0430', number: '\u211617', description: '\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0448\u043a\u043e\u043b\u044b \u043f\u0440\u0435\u0434\u043f\u0440\u0438\u043d\u0438\u043c\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 \u0432 \u0441\u0442\u0440\u0430\u043d\u0430\u0445 \u0442\u0440\u0435\u0442\u044c\u0435\u0433\u043e \u043c\u0438\u0440\u0430. \u041f\u0440\u0435\u043f\u043e\u0434\u0430\u0432\u0430\u0442\u0435\u043b\u0438 \u2014 \u0441\u043e\u0441\u0442\u043e\u044f\u0432\u0448\u0438\u0435\u0441\u044f \u0431\u0438\u0437\u043d\u0435\u0441\u043c\u0435\u043d\u044b, \u0433\u043e\u0442\u043e\u0432\u044b\u0435 \u043f\u0435\u0440\u0435\u0434\u0430\u0442\u044c \u0437\u043d\u0430\u043d\u0438\u044f \u0443\u0447\u0435\u043d\u0438\u043a\u0430\u043c.', price: 20000, chosenByPlayerId: null },
  { id: 19, title: '\u041e\u0441\u0442\u0440\u043e\u0432 \u043c\u0435\u0447\u0442\u044b \u0432 \u044e\u0436\u043d\u043e\u043c \u043c\u043e\u0440\u0435', number: '\u211619', description: '\u0414\u0432\u0443\u0445\u043c\u0435\u0441\u044f\u0447\u043d\u043e\u0435 \u043a\u0443\u043f\u0430\u043d\u0438\u0435 \u0432 \u0440\u043e\u0441\u043a\u043e\u0448\u0438. \u0420\u0430\u0441\u0441\u043b\u0430\u0431\u043b\u044f\u044e\u0449\u0438\u0435 \u0442\u0451\u043f\u043b\u044b\u0435 \u0432\u043e\u0434\u044b, \u0431\u0435\u0437\u043b\u044e\u0434\u043d\u044b\u0435 \u043f\u043b\u044f\u0436\u0438 \u0438 \u0440\u043e\u043c\u0430\u043d\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u043d\u043e\u0447\u0438.', price: 100000, chosenByPlayerId: null },
  { id: 21, title: '\u0414\u0435\u0442\u0441\u043a\u0430\u044f \u0431\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0430', number: '\u211621', description: '\u041f\u0440\u0438\u0441\u0442\u0440\u043e\u0439\u0442\u0435 \u043a \u0433\u043e\u0440\u043e\u0434\u0441\u043a\u043e\u0439 \u0431\u0438\u0431\u043b\u0438\u043e\u0442\u0435\u043a\u0435 \u043d\u043e\u0432\u043e\u0435 \u043a\u0440\u044b\u043b\u043e, \u0433\u0434\u0435 \u0431\u0443\u0434\u0443\u0442 \u0437\u0430\u043d\u0438\u043c\u0430\u0442\u044c\u0441\u044f \u044e\u043d\u044b\u0435 \u043f\u0438\u0441\u0430\u0442\u0435\u043b\u0438 \u0438 \u0445\u0443\u0434\u043e\u0436\u043d\u0438\u043a\u0438.', price: 175000, chosenByPlayerId: null },
  { id: 23, title: '\u0413\u043e\u043b\u044c\u0444 \u0432\u043e\u043a\u0440\u0443\u0433 \u0441\u0432\u0435\u0442\u0430', number: '\u211623', description: '\u0411\u0435\u0440\u0438\u0442\u0435 \u0442\u0440\u043e\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439 \u0438 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435\u0441\u044c \u0432 \u043a\u0440\u0443\u0433\u043e\u0441\u0432\u0435\u0442\u043d\u043e\u0435 \u0442\u0443\u0440\u043d\u0435 \u043f\u043e 50 \u043b\u0443\u0447\u0448\u0438\u043c \u043f\u043e\u043b\u044f\u043c \u0434\u043b\u044f \u0433\u043e\u043b\u044c\u0444\u0430. \u041f\u0435\u0440\u0432\u044b\u0439 \u043a\u043b\u0430\u0441\u0441, \u043f\u044f\u0442\u0438\u0437\u0432\u0451\u0437\u0434\u043e\u0447\u043d\u044b\u0439 \u043e\u0442\u0435\u043b\u044c.', price: 150000, chosenByPlayerId: null },
  { id: 25, title: '\u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0432 \u043a\u0440\u0443\u0433 \u00ab\u0440\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0439\u00bb \u043f\u0443\u0431\u043b\u0438\u043a\u0438', number: '\u211625', description: '\u0410\u0440\u0435\u043d\u0434\u0443\u0439\u0442\u0435 \u043d\u0430 \u0433\u043e\u0434 \u0447\u0430\u0441\u0442\u043d\u044b\u0439 \u0440\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u0441\u0430\u043c\u043e\u043b\u0451\u0442, \u043a\u043e\u0442\u043e\u0440\u044b\u0439 \u0432 \u043b\u044e\u0431\u043e\u0439 \u043c\u043e\u043c\u0435\u043d\u0442 \u0443\u043c\u0447\u0438\u0442 \u0432\u0430\u0441 \u043a\u0443\u0434\u0430 \u0434\u0443\u0448\u0430 \u043f\u043e\u0436\u0435\u043b\u0430\u0435\u0442.', price: 250000, chosenByPlayerId: null },
  { id: 27, title: '\u0421\u043f\u0430\u0441\u0435\u043d\u0438\u0435 \u043c\u043e\u0440\u0441\u043a\u0438\u0445 \u0436\u0438\u0432\u043e\u0442\u043d\u044b\u0445', number: '\u211627', description: '\u0421\u0442\u0430\u043d\u044c\u0442\u0435 \u0441\u043f\u043e\u043d\u0441\u043e\u0440\u043e\u043c \u0438 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u043c \u043c\u0435\u0441\u044f\u0447\u043d\u043e\u0439 \u0438\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u0441\u043a\u043e\u0439 \u044d\u043a\u0441\u043f\u0435\u0434\u0438\u0446\u0438\u0438 \u043f\u043e \u0441\u043f\u0430\u0441\u0435\u043d\u0438\u044e \u0438\u0441\u0447\u0435\u0437\u0430\u044e\u0449\u0438\u0445 \u0432\u0438\u0434\u043e\u0432 \u043c\u043e\u0440\u0441\u043a\u0438\u0445 \u0436\u0438\u0432\u043e\u0442\u043d\u044b\u0445.', price: 125000, chosenByPlayerId: null },
  { id: 29, title: '7 \u0447\u0443\u0434\u0435\u0441 \u0441\u0432\u0435\u0442\u0430', number: '\u211629', description: '\u041f\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u0435 \u043d\u0430 \u0441\u0430\u043c\u043e\u043b\u0451\u0442\u0435, \u043f\u0430\u0440\u043e\u0445\u043e\u0434\u0435, \u0432\u0435\u043b\u043e\u0441\u0438\u043f\u0435\u0434\u0435, \u0432\u0435\u0440\u0431\u043b\u044e\u0434\u0435, \u043a\u0430\u043d\u043e\u044d \u0438 \u043b\u0438\u043c\u0443\u0437\u0438\u043d\u0435, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c 7 \u0447\u0443\u0434\u0435\u0441 \u0441\u0432\u0435\u0442\u0430. \u0412\u044b\u0441\u0448\u0438\u0439 \u043a\u043b\u0430\u0441\u0441!', price: 200000, chosenByPlayerId: null },
  { id: 31, title: '\u041d\u0430\u0443\u0447\u043d\u044b\u0439 \u0446\u0435\u043d\u0442\u0440 \u0440\u0430\u043a\u0430 \u0438 \u0421\u041f\u0418\u0414\u0430', number: '\u211631', description: '\u0412\u0430\u0448\u0438 \u0434\u0435\u043d\u044c\u0433\u0438 \u043f\u043e\u0437\u0432\u043e\u043b\u044f\u0442 \u0441\u043e\u0431\u0440\u0430\u0442\u044c \u0432 \u043e\u0434\u043d\u043e\u043c \u0446\u0435\u043d\u0442\u0440\u0435 \u0432\u0435\u0434\u0443\u0449\u0438\u0445 \u0438\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 \u0438 \u0432\u0440\u0430\u0447\u0435\u0439, \u043f\u043e\u0441\u0432\u044f\u0442\u0438\u0432\u0448\u0438\u0445 \u0441\u0435\u0431\u044f \u0438\u0441\u043a\u043e\u0440\u0435\u043d\u0435\u043d\u0438\u044e \u044d\u0442\u0438\u0445 \u0434\u0432\u0443\u0445 \u0431\u043e\u043b\u0435\u0437\u043d\u0435\u0439.', price: 225000, chosenByPlayerId: null },
  { id: 32, title: '\u0423\u0436\u0438\u043d \u0441 \u043f\u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442\u043e\u043c', number: '\u211632', description: '\u0417\u0430\u043a\u0430\u0436\u0438\u0442\u0435 \u0441\u0442\u043e\u043b\u0438\u043a \u0434\u043b\u044f \u0434\u0435\u0441\u044f\u0442\u0438 \u0434\u0440\u0443\u0437\u0435\u0439 \u043d\u0430 \u0442\u043e\u0440\u0436\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u043c \u0443\u0436\u0438\u043d\u0435 \u0441 \u043f\u0440\u0435\u0437\u0438\u0434\u0435\u043d\u0442\u043e\u043c \u0438 \u0432\u044b\u0441\u043e\u043a\u043e\u043f\u043e\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u043d\u044b\u043c\u0438 \u043e\u0441\u043e\u0431\u0430\u043c\u0438 \u0441\u043e \u0432\u0441\u0435\u0433\u043e \u043c\u0438\u0440\u0430.', price: 100000, chosenByPlayerId: null },
  { id: 35, title: '\u041f\u0440\u044b\u0436\u043a\u0438 \u043d\u0430 \u043b\u044b\u0436\u0430\u0445 \u0441 \u0432\u0435\u0440\u0442\u043e\u043b\u0451\u0442\u0430', number: '\u211635', description: '\u0426\u0435\u043b\u044b\u0439 \u0441\u0435\u0437\u043e\u043d \u043f\u0440\u044b\u0436\u043a\u043e\u0432 \u043d\u0430 \u043b\u044b\u0436\u0430\u0445 \u0432 \u0428\u0432\u0435\u0439\u0446\u0430\u0440\u0441\u043a\u0438\u0445 \u0410\u043b\u044c\u043f\u0430\u0445, \u0438\u0433\u0440\u0430 \u0432 \u0437\u043d\u0430\u043c\u0435\u043d\u0438\u0442\u044b\u0445 \u043a\u0430\u0437\u0438\u043d\u043e \u043d\u043e\u0447\u044c\u044e, \u0430\u043f\u0430\u0440\u0442\u0430\u043c\u0435\u043d\u0442\u044b \u0432 \u0441\u0440\u0435\u0434\u043d\u0435\u0432\u0435\u043a\u043e\u0432\u043e\u043c \u0437\u0430\u043c\u043a\u0435.', price: 150000, chosenByPlayerId: null },
  { id: 37, title: '\u0414\u0430\u0440 \u0446\u0435\u0440\u043a\u0432\u0438', number: '\u211637', description: '\u0412\u0430\u0448\u0430 \u0440\u0435\u043b\u0438\u0433\u0438\u043e\u0437\u043d\u0430\u044f \u043e\u0431\u0449\u0438\u043d\u0430 \u0441\u0442\u0440\u0435\u043c\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u0440\u0430\u0437\u0440\u0430\u0441\u0442\u0430\u0435\u0442\u0441\u044f. \u0421\u0440\u043e\u0447\u043d\u043e \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u044b \u043d\u043e\u0432\u044b\u0435 \u0445\u0440\u0430\u043c\u044b. \u0412\u044b \u0436\u0435\u0440\u0442\u0432\u0443\u0435\u0442\u0435\u2026', price: 175000, chosenByPlayerId: null },
  { id: 39, title: '\u0411\u0430\u043b\u043b\u043e\u0442\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044c \u0432 \u043c\u044d\u0440\u044b', number: '\u211639', description: '\u041b\u044e\u0434\u0438 \u043f\u043e\u0432\u0435\u0440\u0438\u043b\u0438 \u0432 \u0432\u0430\u0448\u0443 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u0443\u044e \u043c\u0443\u0434\u0440\u043e\u0441\u0442\u044c \u0438 \u0443\u0433\u043e\u0432\u043e\u0440\u0438\u043b\u0438 \u0431\u0430\u043b\u043b\u043e\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043f\u043e\u0441\u0442 \u043c\u044d\u0440\u0430. \u0412\u044b \u0441\u043e\u0433\u043b\u0430\u0441\u0438\u043b\u0438\u0441\u044c \u0438 \u0432\u044b\u0438\u0433\u0440\u0430\u043b\u0438 \u0432\u044b\u0431\u043e\u0440\u044b.', price: 125000, chosenByPlayerId: null },
  { id: 42, title: '\u0427\u0430\u0441\u0442\u043d\u0430\u044f \u0440\u044b\u0431\u0430\u043b\u043a\u0430', number: '\u211642', description: '\u041b\u043e\u0432\u0438\u0442\u0435 \u0440\u044b\u0431\u0443 \u043f\u0440\u044f\u043c\u043e \u0443 \u0433\u043e\u0440\u043d\u043e\u0433\u043e \u043e\u0437\u0435\u0440\u0430. (\u0421\u0443\u043c\u043c\u0430 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044f \u0447\u0430\u0441\u0442\u0438\u0447\u043d\u043e \u043d\u0430 \u0441\u0442\u044b\u043a\u0435 \u043a\u0430\u0434\u0440\u043e\u0432 \u2014 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c.)', price: 25000, chosenByPlayerId: null },
  { id: 43, title: '\u041f\u0430\u0440\u043a / \u0441\u043a\u043b\u0430\u0434', number: '\u211643', description: '\u0421\u043d\u0435\u0441\u0438\u0442\u0435 \u0437\u0430\u0431\u043e\u0440 \u0432\u043e\u043a\u0440\u0443\u0433 \u0441\u0442\u0430\u0440\u043e\u0433\u043e \u0441\u043a\u043b\u0430\u0434\u0430 \u0438 \u043f\u043e\u0441\u0442\u0440\u043e\u0439\u0442\u0435 \u043d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043a \u043e\u0442\u0434\u044b\u0445\u0430, \u0447\u0442\u043e\u0431\u044b \u043e\u0431\u0435\u0441\u043f\u0435\u0447\u0438\u0442\u044c \u0447\u0438\u0441\u0442\u044b\u0439 \u0432\u043e\u0437\u0434\u0443\u0445 \u0438 \u043f\u043e\u0440\u044f\u0434\u043e\u043a \u0432 \u043f\u0430\u0440\u043a\u0435.', price: 225000, chosenByPlayerId: null },
  { id: 45, title: '\u041c\u0438\u043d\u0438-\u0444\u0435\u0440\u043c\u0430 \u0432 \u0433\u043e\u0440\u043e\u0434\u0435', number: '\u211645', description: '\u041f\u043e\u0441\u0442\u0440\u043e\u0439\u0442\u0435 \u043d\u0430\u0441\u0442\u043e\u044f\u0449\u0435\u0435 \u044d\u043a\u043e\u043b\u043e\u0433\u0438\u0447\u0435\u0441\u043a\u0438 \u0447\u0438\u0441\u0442\u043e\u0435 \u0445\u043e\u0437\u044f\u0439\u0441\u0442\u0432\u043e, \u0447\u0442\u043e\u0431\u044b \u0443\u0447\u0438\u0442\u044c \u0434\u0435\u0442\u0435\u0439 \u043e \u0436\u0438\u0432\u043e\u0442\u043d\u044b\u0445 \u0438 \u0440\u0430\u0441\u0442\u0435\u043d\u0438\u044f\u0445.', price: 150000, chosenByPlayerId: null },
  { id: 47, title: '\u0424\u043e\u0442\u043e\u043e\u0445\u043e\u0442\u0430 \u0432 \u0410\u0444\u0440\u0438\u043a\u0435', number: '\u211647', description: '\u0412\u043e\u0437\u044c\u043c\u0438\u0442\u0435 \u0448\u0435\u0441\u0442\u0435\u0440\u044b\u0445 \u0434\u0440\u0443\u0437\u0435\u0439 \u043d\u0430 \u0441\u0430\u0444\u0430\u0440\u0438 \u0444\u043e\u0442\u043e\u0433\u0440\u0430\u0444\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u044d\u043a\u0437\u043e\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0436\u0438\u0432\u043e\u0442\u043d\u044b\u0445. \u041f\u044f\u0442\u0438\u0437\u0432\u0451\u0437\u0434\u043e\u0447\u043d\u044b\u0439 \u043a\u043e\u043c\u0444\u043e\u0440\u0442 \u0432 \u043f\u0430\u043b\u0430\u0442\u043a\u0435.', price: 100000, chosenByPlayerId: null },
]

function getDefaultFinGuruDreams(): DreamState[] {
  return DEFAULT_FIN_GURU_DREAMS.map(dream => ({ ...dream }))
}

function isLegacyFinGuruDreamCatalog(dreams: DreamState[]): boolean {
  return dreams.length < DEFAULT_FIN_GURU_DREAMS.length || dreams.some(dream => dream.title === 'Tesla Model 3')
}

export async function getFinGuruConfig(): Promise<{ dreams: DreamState[] }> {
  try {
    const response = await fetch('/api/finguru/config')
    if (!response.ok) return { dreams: getDefaultFinGuruDreams() }
    const data = await response.json()
    const dreams = (data.dreams ?? data.Dreams ?? []).map((dream: any) => ({
      id: dream.id ?? dream.Id,
      title: dream.title ?? dream.Title ?? '',
      number: dream.number ?? dream.Number ?? String(dream.id ?? dream.Id ?? ''),
      description: dream.description ?? dream.Description ?? '',
      price: dream.price ?? dream.Price ?? 0,
      chosenByPlayerId: null,
    }))

    return { dreams: dreams.length > 0 && !isLegacyFinGuruDreamCatalog(dreams) ? dreams : getDefaultFinGuruDreams() }
  } catch {
    return { dreams: getDefaultFinGuruDreams() }
  }
}

function normalizePlayerGameState(player: any): PlayerGameState {
  return {
    playerId: player.playerId ?? player.PlayerId,
    displayName: player.displayName ?? player.DisplayName ?? '',
    roleId: player.roleId ?? player.RoleId ?? '',
    color: player.color ?? player.Color ?? '',
    dreamId: player.dreamId ?? player.DreamId ?? null,
    cash: player.cash ?? player.Cash ?? 0,
    income: player.income ?? player.Income ?? 0,
    expenses: player.expenses ?? player.Expenses ?? 0,
    position: player.position ?? player.Position ?? 0,
    bigPosition: player.bigPosition ?? player.BigPosition ?? 0,
    isOnBigCircle: player.isOnBigCircle ?? player.IsOnBigCircle ?? false,
    skipNextTurn: player.skipNextTurn ?? player.SkipNextTurn ?? false,
    skipTurnsRemaining: player.skipTurnsRemaining ?? player.SkipTurnsRemaining ?? 0,
    charityDiceTurnsRemaining: player.charityDiceTurnsRemaining ?? player.CharityDiceTurnsRemaining ?? 0,
    accruedSalary: player.accruedSalary ?? player.AccruedSalary ?? 0,
    achievedDreams: player.achievedDreams ?? player.AchievedDreams,
    achievedDreamsCount: player.achievedDreamsCount ?? player.AchievedDreamsCount,
    assets: (player.assets ?? player.Assets ?? []).map((asset: any) => ({
      id: asset.id ?? asset.Id ?? '',
      title: asset.title ?? asset.Title ?? '',
      cardId: asset.cardId ?? asset.CardId ?? '',
      assetType: asset.assetType ?? asset.AssetType ?? '',
      cost: asset.cost ?? asset.Cost ?? 0,
      cashFlow: asset.cashFlow ?? asset.CashFlow ?? 0,
      quantity: asset.quantity ?? asset.Quantity ?? 1,
    })),
    liabilities: (player.liabilities ?? player.Liabilities ?? []).map((liability: any) => ({
      id: liability.id ?? liability.Id ?? '',
      title: liability.title ?? liability.Title ?? '',
      liabilityType: liability.liabilityType ?? liability.LiabilityType ?? '',
      balance: liability.balance ?? liability.Balance ?? 0,
      payment: liability.payment ?? liability.Payment ?? 0,
    })),
  }
}

function normalizePendingDecision(pending: any): PendingDecision | null {
  if (!pending) return null
  const decisionOptions = pending.decisionOptions ?? pending.DecisionOptions ?? []
  return {
    playerId: pending.playerId ?? pending.PlayerId ?? '',
    decisionType: pending.decisionType ?? pending.DecisionType ?? '',
    sectorType: pending.sectorType ?? pending.SectorType ?? '',
    sectorLabel: pending.sectorLabel ?? pending.SectorLabel ?? '',
    options: pending.options ?? pending.Options ?? [],
    decisionOptions: decisionOptions.map((option: any) => ({
      option: option.option ?? option.Option ?? '',
      action: option.action ?? option.Action ?? '',
      cardId: option.cardId ?? option.CardId ?? '',
      title: option.title ?? option.Title ?? '',
      description: option.description ?? option.Description ?? '',
      cardType: option.cardType ?? option.CardType ?? '',
      dealType: option.dealType ?? option.DealType ?? '',
      ticker: option.ticker ?? option.Ticker ?? '',
      targetPlayerId: option.targetPlayerId ?? option.TargetPlayerId ?? '',
      offeredByPlayerId: option.offeredByPlayerId ?? option.OfferedByPlayerId ?? '',
      cost: option.cost ?? option.Cost ?? 0,
      cashFlow: option.cashFlow ?? option.CashFlow ?? 0,
      assetValue: option.assetValue ?? option.AssetValue ?? 0,
      liabilityValue: option.liabilityValue ?? option.LiabilityValue ?? 0,
      offerPrice: option.offerPrice ?? option.OfferPrice ?? 0,
      cashChange: option.cashChange ?? option.CashChange ?? 0,
      incomeChange: option.incomeChange ?? option.IncomeChange ?? 0,
      expensesChange: option.expensesChange ?? option.ExpensesChange ?? 0,
      roi: option.roi ?? option.Roi ?? '',
      saleRange: option.saleRange ?? option.SaleRange ?? '',
      logic: option.logic ?? option.Logic ?? '',
      skipNextTurn: option.skipNextTurn ?? option.SkipNextTurn ?? false,
    })),
    createdAt: pending.createdAt ?? pending.CreatedAt,
  }
}

function normalizeDecisionOption(option: any): DecisionOption {
  return {
    option: option.option ?? option.Option ?? '',
    action: option.action ?? option.Action ?? '',
    cardId: option.cardId ?? option.CardId ?? '',
    title: option.title ?? option.Title ?? '',
    description: option.description ?? option.Description ?? '',
    cardType: option.cardType ?? option.CardType ?? '',
    dealType: option.dealType ?? option.DealType ?? '',
    ticker: option.ticker ?? option.Ticker ?? '',
    targetPlayerId: option.targetPlayerId ?? option.TargetPlayerId ?? '',
    offeredByPlayerId: option.offeredByPlayerId ?? option.OfferedByPlayerId ?? '',
    cost: option.cost ?? option.Cost ?? 0,
    cashFlow: option.cashFlow ?? option.CashFlow ?? 0,
    assetValue: option.assetValue ?? option.AssetValue ?? 0,
    liabilityValue: option.liabilityValue ?? option.LiabilityValue ?? 0,
    offerPrice: option.offerPrice ?? option.OfferPrice ?? 0,
    cashChange: option.cashChange ?? option.CashChange ?? 0,
    incomeChange: option.incomeChange ?? option.IncomeChange ?? 0,
    expensesChange: option.expensesChange ?? option.ExpensesChange ?? 0,
    roi: option.roi ?? option.Roi ?? '',
    saleRange: option.saleRange ?? option.SaleRange ?? '',
    logic: option.logic ?? option.Logic ?? '',
    skipNextTurn: option.skipNextTurn ?? option.SkipNextTurn ?? false,
  }
}

function normalizePendingAuction(auction: any): FinGuruAuctionState | null {
  if (!auction) return null

  return {
    auctionId: auction.auctionId ?? auction.AuctionId ?? '',
    sellerPlayerId: auction.sellerPlayerId ?? auction.SellerPlayerId ?? '',
    dealCard: normalizeDecisionOption(auction.dealCard ?? auction.DealCard ?? {}),
    startingBid: auction.startingBid ?? auction.StartingBid ?? 0,
    currentBid: auction.currentBid ?? auction.CurrentBid ?? 0,
    currentBidderPlayerId: auction.currentBidderPlayerId ?? auction.CurrentBidderPlayerId ?? null,
    participantPlayerIds: auction.participantPlayerIds ?? auction.ParticipantPlayerIds ?? [],
    passedPlayerIds: auction.passedPlayerIds ?? auction.PassedPlayerIds ?? [],
    createdAt: auction.createdAt ?? auction.CreatedAt,
    updatedAt: auction.updatedAt ?? auction.UpdatedAt,
  }
}

function normalizeGameSettings(settings: any): FinGuruGameSettings {
  const diceCount = Number(settings?.diceCount ?? settings?.DiceCount ?? 2)
  const salaryPayoutMode = settings?.salaryPayoutMode ?? settings?.SalaryPayoutMode

  return {
    diceCount: diceCount === 1 ? 1 : 2,
    salaryPayoutMode: salaryPayoutMode === 'manual' ? 'manual' : 'automatic',
  }
}

function normalizeGameState(data: any): GameState | null {
  if (!data) return null

  const players = data.players ?? data.Players ?? []
  const dreams = data.dreams ?? data.Dreams ?? []
  const pending = data.pendingDecision ?? data.PendingDecision ?? null
  const pendingAuction = data.pendingAuction ?? data.PendingAuction ?? null

  return {
    roomId: data.roomId ?? data.RoomId ?? '',
    phase: data.phase ?? data.Phase ?? '',
    currentRound: data.currentRound ?? data.CurrentRound ?? 0,
    maxRounds: data.maxRounds ?? data.MaxRounds,
    winner: data.winner ?? data.Winner ?? null,
    winners: data.winners ?? data.Winners,
    finalResults: data.finalResults ?? data.FinalResults,
    settings: normalizeGameSettings(data.settings ?? data.Settings),
    players: players.map(normalizePlayerGameState),
    dreams: dreams.map((dream: any) => ({
      id: dream.id ?? dream.Id,
      title: dream.title ?? dream.Title ?? '',
      number: dream.number ?? dream.Number ?? String(dream.id ?? dream.Id ?? ''),
      description: dream.description ?? dream.Description ?? '',
      price: dream.price ?? dream.Price ?? 0,
      chosenByPlayerId: dream.chosenByPlayerId ?? dream.ChosenByPlayerId ?? null,
    })),
    pendingDecision: normalizePendingDecision(pending),
    pendingAuction: normalizePendingAuction(pendingAuction),
    currentPlayerId: data.currentPlayerId ?? data.CurrentPlayerId ?? '',
    turnCount: data.turnCount ?? data.TurnCount ?? 0,
  }
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
        resolve(normalizeGameState(msg.data));
      } else if (msg.type === 'finguru.gameState' && msg.data == null) {
        window.clearTimeout(timeout)
        sdk.onReceiveMessage(() => {});
        resolve(null)
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
  diceValues: number[]
  total: number
  newPosition: number
  sectorType: string
  sectorLabel: string
  cashChange: number
  newCash: number
  nextPlayerId: string
  currentPlayerId?: string
  isRoundPassed: boolean
  currentRound: number
  turnCount?: number
  pendingDecision?: PendingDecision | null
  requiresDecision?: boolean
  eventTitle?: string
  eventMessage?: string
  phase?: string
  winners?: string[]
  finalResults?: any[]
  settings?: FinGuruGameSettings
  players: PlayerGameState[]
}

function normalizeDiceRoll(data: any): DiceRollResult {
  return {
    rolledBy: data.rolledBy ?? data.RolledBy ?? '',
    dice1: data.dice1 ?? data.Dice1 ?? 0,
    dice2: data.dice2 ?? data.Dice2 ?? 0,
    diceValues: data.diceValues ?? data.DiceValues ?? [data.dice1 ?? data.Dice1 ?? 0, data.dice2 ?? data.Dice2 ?? 0].filter(Boolean),
    total: data.total ?? data.Total ?? 0,
    newPosition: data.newPosition ?? data.NewPosition ?? 0,
    sectorType: data.sectorType ?? data.SectorType ?? '',
    sectorLabel: data.sectorLabel ?? data.SectorLabel ?? '',
    cashChange: data.cashChange ?? data.CashChange ?? 0,
    newCash: data.newCash ?? data.NewCash ?? 0,
    nextPlayerId: data.nextPlayerId ?? data.NextPlayerId ?? '',
    currentPlayerId: data.currentPlayerId ?? data.CurrentPlayerId,
    isRoundPassed: data.isRoundPassed ?? data.IsRoundPassed ?? false,
    currentRound: data.currentRound ?? data.CurrentRound ?? 0,
    turnCount: data.turnCount ?? data.TurnCount,
    pendingDecision: normalizePendingDecision(data.pendingDecision ?? data.PendingDecision),
    requiresDecision: data.requiresDecision ?? data.RequiresDecision ?? false,
    eventTitle: data.eventTitle ?? data.EventTitle ?? '',
    eventMessage: data.eventMessage ?? data.EventMessage ?? '',
    phase: data.phase ?? data.Phase,
    winners: data.winners ?? data.Winners,
    finalResults: data.finalResults ?? data.FinalResults,
    settings: normalizeGameSettings(data.settings ?? data.Settings),
    players: (data.players ?? data.Players ?? []).map(normalizePlayerGameState),
  }
}
export function rollDice(sdk: AlgoGamesSDK, roomId: string, playerId: string, diceCount = 2): void {
  sdk.sendAction('finguru.rollDice', { roomId, playerId, diceCount });
}

export function subscribeDiceRoll(
  sdk: AlgoGamesSDK,
  roomId: string,
  onUpdate: (result: DiceRollResult) => void
): () => void {
  const unsubscribe = sdk.onReceiveMessage((msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.diceRolled' && msg.data?.roomId === roomId) {
      onUpdate(normalizeDiceRoll(msg.data));
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

    const state = normalizeGameState(msg.data)
    if (stateEvents.has(msg.type) && state?.roomId === roomId) {
      onUpdate(state);
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

export interface CellResolvedResult {
  playerId: string
  action: string
  option: string
  title: string
  message: string
  success: boolean
  cashChange: number
  incomeChange: number
  expensesChange: number
  newCash: number
  newIncome: number
  newExpenses: number
}

export interface CellResolvedEvent {
  roomId: string
  result: CellResolvedResult
  state: GameState | null
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
  actionName: string,
  option?: string | null,
  quantity?: number,
  offerPrice?: number,
): void {
  sdk.sendAction('finguru.resolveCellAction', { roomId, playerId, actionName, option, quantity, offerPrice });
}

export function sellAsset(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
  assetId: string,
): void {
  sdk.sendAction('finguru.sellAsset', { roomId, playerId, assetId })
}

export function payLiability(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
  liabilityId: string,
): void {
  sdk.sendAction('finguru.payLiability', { roomId, playerId, liabilityId })
}

export function takeCredit(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
): void {
  sdk.sendAction('finguru.takeCredit', { roomId, playerId })
}

export function claimSalary(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
): void {
  sdk.sendAction('finguru.claimSalary', { roomId, playerId })
}

export function placeAuctionBid(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
  bid: number,
): void {
  sdk.sendAction('finguru.placeAuctionBid', { roomId, playerId, bid })
}

export function passAuction(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
): void {
  sdk.sendAction('finguru.passAuction', { roomId, playerId })
}

export function completeAuction(
  sdk: AlgoGamesSDK,
  roomId: string,
  playerId: string,
): void {
  sdk.sendAction('finguru.completeAuction', { roomId, playerId })
}

export function subscribeCellResolved(
  sdk: AlgoGamesSDK,
  roomId: string,
  onEvent: (event: CellResolvedEvent) => void,
): () => void {
  const unsubscribe = sdk.onReceiveMessage((msg: { type: string; data: any }) => {
    if (msg.type === 'finguru.cellResolved' && (msg.data?.roomId ?? msg.data?.RoomId) === roomId) {
      const raw = msg.data.result ?? msg.data.Result ?? {}
      onEvent({
        roomId: msg.data.roomId ?? msg.data.RoomId,
        result: {
          playerId: raw.playerId ?? raw.PlayerId ?? '',
          action: raw.action ?? raw.Action ?? '',
          option: raw.option ?? raw.Option ?? '',
          title: raw.title ?? raw.Title ?? '',
          message: raw.message ?? raw.Message ?? '',
          success: raw.success ?? raw.Success ?? false,
          cashChange: raw.cashChange ?? raw.CashChange ?? 0,
          incomeChange: raw.incomeChange ?? raw.IncomeChange ?? 0,
          expensesChange: raw.expensesChange ?? raw.ExpensesChange ?? 0,
          newCash: raw.newCash ?? raw.NewCash ?? 0,
          newIncome: raw.newIncome ?? raw.NewIncome ?? 0,
          newExpenses: raw.newExpenses ?? raw.NewExpenses ?? 0,
        },
        state: normalizeGameState(msg.data.state ?? msg.data.State),
      })
    }
  })
  return typeof unsubscribe === 'function' ? unsubscribe : () => {}
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
