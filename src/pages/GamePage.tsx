import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Dashboard from '../components/Dashboard'
import GameBoard from '../components/GameBoard'
import type { TopBarSpinRequest } from '../components/TopBar'
import MoveHistory from '../components/MoveHistory'
import type { DealCardData } from '../components/MoveHistory'
import { roleData } from '../data/roles'
import smallDealImage from '../components/dealSelection/deal-small.svg'
import bigDealImage from '../components/dealSelection/deal-big.svg'
import {
  getSdk,
  getGameState,
  rollDice,
  restartGame,
  subscribeDiceRoll,
  subscribeGameStateUpdate,
  subscribeGameError,
  subscribeCellResolved,
  resolveCellAction,
  payLiability,
  takeCredit,
  claimSalary,
  closeCard,
  createFinGuruOperationId,
  placeAuctionBid,
  passAuction,
  completeAuction,
  type GameState,
  type DecisionOption,
  type FinGuruAuctionState,
  type DiceRollResult,
  type CellResolvedEvent,
  type FinGuruHistoryEntry,
  type FinGuruLiability,
  type FinGuruCardSnapshot,
  type PendingCardAcknowledgement,
} from '../sdk'
import {
  buildCellPath,
  canPlayerRoll,
  formatRollResult,
  getBankCreditProjection,
  getBigCircleDreamCell,
  getForwardTrackDistance,
  isValidMoneyAmount,
  resolveCurrentPlayerId,
  sanitizeMoneyInput,
  sortHistoryByTurn,
  getSpeedTrackTone,
} from '../utils/gameUi'
import sparkleIcon from '../assets/dashboard/sparkle.svg'
import styles from './GamePage.module.css'

const MIN_DICE_ANIMATION_MS = 900
const VICTORY_CASH_FLOW_TARGET = 50_000

interface EventCardData {
  id: string
  sectorType: string
  sectorLabel: string
  dealType?: string
  title: string
  description: string
  playerName: string
  playerColor: string
  diceLabel?: string
  cashChange?: number
  newCash?: number
  incomeChange?: number
  expensesChange?: number
}

interface PendingRollVisual {
  id: string
  movementDone: boolean
  rouletteDone: boolean
  apply: () => void
}

export default function GamePage() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  const { currentPlayerId: contextPlayerId } = useGame()

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') ?? sessionStorage.getItem('roomId') ?? ''
  const sdkPlayerId = params.get('playerId') ?? sessionStorage.getItem('playerId') ?? contextPlayerId ?? ''
  const isSpectator = params.get('spectator') === 'true'
  const isHost = params.get('isHost') === 'true'

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myColor, setMyColor] = useState<string>('#4CAF50')
  const [moveHistory, setMoveHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'small' | 'big'>('small')
  const [rightPanelTab, setRightPanelTab] = useState<'players' | 'history'>('players')
  const [mobileView, setMobileView] = useState<'profile' | 'small' | 'big' | 'players' | 'history'>('profile')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [isResolvingDecision, setIsResolvingDecision] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null)
  const [turnRoll, setTurnRoll] = useState<{ label: string; turnCount: number; awaitsDecision: boolean } | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ждем состояние игры...')
  const [activeEventCard, setActiveEventCard] = useState<EventCardData | null>(null)
  const [historyCard, setHistoryCard] = useState<DealCardData | null>(null)
  const [isClosingCard, setIsClosingCard] = useState(false)
  const [collapsedDecisionKey, setCollapsedDecisionKey] = useState<string | null>(null)
  const [amountDialog, setAmountDialog] = useState<{
    kind: 'credit' | 'repayment'
    title: string
    max: number
    liabilityId?: string
  } | null>(null)
  const [displayPositions, setDisplayPositions] = useState<Record<string, { position: number; bigPosition: number }>>({})
  const [topBarSpinRequest, setTopBarSpinRequest] = useState<TopBarSpinRequest | null>(null)
  const pendingDecisionIdentity = gameState?.pendingDecision
    ? `${gameState.pendingDecision.decisionType}:${gameState.pendingDecision.createdAt ?? ''}:${gameState.pendingDecision.decisionOptions?.[0]?.cardId ?? ''}`
    : null
  const rollTimeoutRef = useRef<number | null>(null)
  const rollStartedAtRef = useRef<number>(0)
  const decisionTimeoutRef = useRef<number | null>(null)
  const displayPositionsRef = useRef(displayPositions)
  const visualRollPlayerRef = useRef<string | null>(null)
  const pendingRollVisualRef = useRef<PendingRollVisual | null>(null)

  const applyDisplayPositions = useCallback((positions: Record<string, { position: number; bigPosition: number }>) => {
    displayPositionsRef.current = positions
    setDisplayPositions(positions)
  }, [])

  const clearRollTimeout = useCallback(() => {
    if (rollTimeoutRef.current == null) return
    window.clearTimeout(rollTimeoutRef.current)
    rollTimeoutRef.current = null
  }, [])

  const clearDecisionTimeout = useCallback(() => {
    if (decisionTimeoutRef.current == null) return
    window.clearTimeout(decisionTimeoutRef.current)
    decisionTimeoutRef.current = null
  }, [])

  const completePendingRollVisual = useCallback((pending: PendingRollVisual) => {
    if (pendingRollVisualRef.current !== pending || !pending.movementDone || !pending.rouletteDone) return
    pendingRollVisualRef.current = null
    visualRollPlayerRef.current = null
    setTopBarSpinRequest(current => current?.id === pending.id ? null : current)
    pending.apply()
  }, [])

  const handleTopBarSpinComplete = useCallback((requestId: string) => {
    const pending = pendingRollVisualRef.current
    if (!pending || pending.id !== requestId) return
    pending.rouletteDone = true
    completePendingRollVisual(pending)
  }, [completePendingRollVisual])

  useEffect(() => {
    if (!roomId) return
    const sdk = getSdk()

    getGameState(sdk, roomId).then(state => {
      if (!state) return
      setGameState(state)
      applyDisplayPositions(getPlayerPositions(state.players))
      setMoveHistory(mapServerHistory(state.history))
      setStatusMessage(getStatusMessage(state, sdkPlayerId))

      const me = state.players.find(p => p.playerId === sdkPlayerId)
      if (me) setMyColor(me.color)
    })

  }, [roomId, sdkPlayerId, applyDisplayPositions])

  useEffect(() => {
    if (!roomId) return
    const sdk = getSdk()

    const unsubState = subscribeGameStateUpdate(sdk, roomId, (state) => {
      setTurnRoll(current => current?.awaitsDecision && state.turnCount > current.turnCount ? null : current)
      setGameState(state)
      const nextPositions = getPlayerPositions(state.players)
      const visualPlayerId = visualRollPlayerRef.current
      const visualPosition = visualPlayerId ? displayPositionsRef.current[visualPlayerId] : undefined
      if (visualPlayerId && visualPosition) nextPositions[visualPlayerId] = visualPosition
      applyDisplayPositions(nextPositions)
      setMoveHistory(mapServerHistory(state.history))
      setStatusMessage(getStatusMessage(state, sdkPlayerId))

      const me = state.players.find(p => p.playerId === sdkPlayerId)
      if (me) setMyColor(me.color)

      if (state.phase !== 'awaitingDecision' || state.pendingDecision?.playerId !== sdkPlayerId) {
        clearDecisionTimeout()
        setIsResolvingDecision(false)
      }

      if (state.phase === 'gameOver') {
        setMoveHistory(prev => {
          const key = `gameOver:${state.currentRound}:${state.turnCount}`
          if (prev[0]?.key === key) return prev

          return [
            {
              key,
              playerName: 'Финансовый гуру',
              playerColor: 'rgb(175, 82, 222)',
              moveLabel: 'Финал',
              time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
              transactionType: 'Игра завершена',
              transactionTypeColor: 'rgb(175, 82, 222)',
              action: 'Итоги',
              actionColor: 'rgb(52, 199, 89)',
              finances: [],
            },
            ...prev,
          ]
        })
      }
    })

    const unsubDice = subscribeDiceRoll(sdk, roomId, (result: DiceRollResult) => {
      clearRollTimeout()
      const previousPending = pendingRollVisualRef.current
      if (previousPending) {
        pendingRollVisualRef.current = null
        visualRollPlayerRef.current = null
        previousPending.apply()
      }
      setIsRolling(true)
      const rollDiceValues = result.diceValues?.length
        ? result.diceValues
        : [result.dice1, result.dice2].filter(Boolean)
      setTurnRoll({
        label: formatRollResult(rollDiceValues, result.total, result.eventTitle, result.sectorLabel),
        turnCount: result.turnCount ?? 0,
        awaitsDecision: Boolean(result.requiresDecision),
      })
      const applyRollResult = () => {
        rollTimeoutRef.current = null
        setLastRoll(result)
        setGameState(prev => {
          if (!prev) return prev
          return {
            ...prev,
            players: result.players,
            currentRound: result.currentRound,
            currentPlayerId: result.currentPlayerId ?? result.nextPlayerId,
            turnCount: result.turnCount ?? prev.turnCount,
            phase: result.phase ?? prev.phase,
            pendingDecision: result.pendingDecision ?? prev.pendingDecision,
            pendingCardAcknowledgement: result.pendingCardAcknowledgement ?? prev.pendingCardAcknowledgement,
            pendingAuction: prev.pendingAuction,
            winners: result.winners ?? prev.winners,
            finalResults: result.finalResults ?? prev.finalResults,
            settings: result.settings ?? prev.settings,
            history: result.history ?? prev.history,
          }
        })
        applyDisplayPositions(getPlayerPositions(result.players))

        const me = result.players.find(p => p.playerId === sdkPlayerId)
        if (me) setMyColor(me.color)

        const rolledPlayer = result.players.find(p => p.playerId === result.rolledBy)
        setActiveEventCard({
          id: `roll:${Date.now()}:${result.rolledBy}`,
          sectorType: result.sectorType,
          sectorLabel: result.sectorLabel,
          title: result.eventTitle || getFallbackEventTitle(result.sectorType, result.sectorLabel),
          description: result.eventMessage || getFallbackEventMessage(result),
          playerName: rolledPlayer?.displayName ?? result.rolledBy,
          playerColor: rolledPlayer?.color ?? '#7776dc',
          diceLabel: rollDiceValues.length ? `${rollDiceValues.join(' + ')} = ${result.total}` : undefined,
          cashChange: result.cashChange,
          newCash: result.newCash,
        })
        const nextPlayerId = result.currentPlayerId ?? result.nextPlayerId
        const nextPlayer = result.players.find(p => p.playerId === nextPlayerId)
        setStatusMessage(result.phase === 'gameOver'
          ? 'Игра завершена'
          : result.phase === 'awaitingDecision'
            ? result.rolledBy === sdkPlayerId
              ? 'Выберите действие'
              : `Решение принимает ${rolledPlayer?.displayName ?? 'игрок'}`
          : nextPlayerId === sdkPlayerId
            ? 'Ваш ход'
            : `Ходит ${nextPlayer?.displayName ?? 'следующий игрок'}`)

        setMoveHistory(prev => [
          {
            key: `dice:${Date.now()}:${result.rolledBy}`,
            playerName: rolledPlayer?.displayName ?? result.rolledBy,
            playerColor: rolledPlayer?.color ?? '#999',
            moveLabel: result.total > 0 ? `Ход ${result.total}` : 'Пропуск хода',
            time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            transactionType: result.eventTitle || result.sectorLabel,
            transactionTypeColor: getSectorColor(result.sectorType),
            action: result.eventMessage || formatDelta(result.cashChange),
            actionColor: result.cashChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
            finances: [
              {
                label: 'Наличные',
                change: formatDelta(result.cashChange),
                changeColor: result.cashChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
                result: formatMoney(result.newCash),
                resultColor: 'rgb(0, 0, 0)',
              },
            ],
          },
          ...prev,
        ])
        setMoveHistory(mapServerHistory(result.history))

        setIsRolling(false)
        rollStartedAtRef.current = 0
        if (!result.requiresDecision) setTurnRoll(null)
      }

      const animateMovement = () => {
        const movedPlayer = result.players.find(player => player.playerId === result.rolledBy)
        const currentDisplayPosition = displayPositionsRef.current[result.rolledBy]
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const trackSize = movedPlayer?.isOnBigCircle ? 48 : 24
        const finalCell = movedPlayer
          ? movedPlayer.isOnBigCircle ? movedPlayer.bigPosition : movedPlayer.position
          : 0
        const displayedCell = movedPlayer && currentDisplayPosition
          ? movedPlayer.isOnBigCircle ? currentDisplayPosition.bigPosition : currentDisplayPosition.position
          : finalCell
        const startCell = result.total > 0 && displayedCell === finalCell
          ? ((finalCell - result.total) % trackSize + trackSize) % trackSize
          : displayedCell
        const previous = movedPlayer && currentDisplayPosition
          ? {
              position: movedPlayer.isOnBigCircle ? currentDisplayPosition.position : startCell,
              bigPosition: movedPlayer.isOnBigCircle ? startCell : currentDisplayPosition.bigPosition,
            }
          : currentDisplayPosition
        const needsRoulette = Boolean(movedPlayer?.isOnBigCircle && result.total > 0)
        const visualId = `${result.rolledBy}:${result.turnCount ?? Date.now()}:${movedPlayer?.bigPosition ?? 0}`
        const pending: PendingRollVisual = {
          id: visualId,
          movementDone: false,
          rouletteDone: !needsRoulette,
          apply: applyRollResult,
        }
        pendingRollVisualRef.current = pending
        visualRollPlayerRef.current = result.rolledBy

        if (movedPlayer && previous) {
          applyDisplayPositions({
            ...displayPositionsRef.current,
            [result.rolledBy]: previous,
          })
        }

        if (needsRoulette && movedPlayer) {
          setTopBarSpinRequest({
            id: visualId,
            targetIndex: movedPlayer.bigPosition,
            durationMs: 1800,
          })
        }

        const markMovementDone = () => {
          pending.movementDone = true
          completePendingRollVisual(pending)
        }

        if (!movedPlayer || !previous || result.total <= 0 || reduceMotion) {
          markMovementDone()
          return
        }

        const path = buildCellPath(startCell, result.total, trackSize)
        let step = 0
        const moveOneCell = () => {
          const nextCell = path[step]
          step++
          const nextPositions = {
            ...displayPositionsRef.current,
            [result.rolledBy]: {
              position: movedPlayer.isOnBigCircle ? previous.position : nextCell,
              bigPosition: movedPlayer.isOnBigCircle ? nextCell : previous.bigPosition,
            },
          }
          applyDisplayPositions(nextPositions)
          if (step >= result.total) {
            rollTimeoutRef.current = null
            markMovementDone()
            return
          }
          rollTimeoutRef.current = window.setTimeout(moveOneCell, 140)
        }
        moveOneCell()
      }

      const elapsed = rollStartedAtRef.current > 0 ? Date.now() - rollStartedAtRef.current : 0
      const remaining = Math.max(0, MIN_DICE_ANIMATION_MS - elapsed)
      if (remaining > 0) {
        rollTimeoutRef.current = window.setTimeout(animateMovement, remaining)
      } else {
        animateMovement()
      }
    })

    const unsubCellResolved = subscribeCellResolved(sdk, roomId, (event: CellResolvedEvent) => {
      clearDecisionTimeout()
      setIsResolvingDecision(false)

      if (event.state) {
        setTurnRoll(current => current?.awaitsDecision && event.state!.turnCount > current.turnCount ? null : current)
        setGameState(event.state)
        setMoveHistory(mapServerHistory(event.state.history))
        setStatusMessage(getStatusMessage(event.state, sdkPlayerId))
        const me = event.state.players.find(p => p.playerId === sdkPlayerId)
        if (me) setMyColor(me.color)
      }

      const result = event.result
      if (result.action === 'choosedealdeck') return

      const player = event.state?.players.find(p => p.playerId === result.playerId)
      if (result.title || result.message) {
        setActiveEventCard({
          id: `cell:${Date.now()}:${result.playerId}`,
          sectorType: result.success ? 'deal' : 'negative',
          sectorLabel: result.success ? 'Действие выполнено' : 'Действие не выполнено',
          title: result.title || (result.success ? 'Действие выполнено' : 'Действие не выполнено'),
          description: result.message,
          playerName: player?.displayName ?? result.playerId,
          playerColor: player?.color ?? '#34C759',
          cashChange: result.cashChange,
          incomeChange: result.incomeChange,
          expensesChange: result.expensesChange,
          newCash: result.newCash,
        })
      }
      setMoveHistory(prev => [
        {
          key: `cell:${Date.now()}:${result.playerId}`,
          playerName: player?.displayName ?? result.playerId,
          playerColor: player?.color ?? '#34C759',
          moveLabel: result.title || 'Действие',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          transactionType: result.success ? 'Выполнено' : 'Не выполнено',
          transactionTypeColor: result.success ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
          action: result.message,
          actionColor: result.success ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
          finances: [
            {
              label: 'Наличные',
              change: formatDelta(result.cashChange),
              changeColor: result.cashChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
              result: formatMoney(result.newCash),
              resultColor: 'rgb(0, 0, 0)',
            },
            {
              label: 'Доход',
              change: formatDelta(result.incomeChange),
              changeColor: result.incomeChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
              result: formatMoney(result.newIncome),
              resultColor: 'rgb(0, 0, 0)',
            },
          ],
        },
        ...prev,
      ])
      if (event.state) setMoveHistory(mapServerHistory(event.state.history))
    })

    const unsubError = subscribeGameError(sdk, roomId, (message) => {
      clearRollTimeout()
      clearDecisionTimeout()
      setIsRolling(false)
      setIsResolvingDecision(false)
      setIsClosingCard(false)
      setStatusMessage(message)
    })

    return () => {
      unsubState()
      unsubDice()
      unsubCellResolved()
      unsubError()
      clearRollTimeout()
      clearDecisionTimeout()
    }
  }, [roomId, sdkPlayerId, clearRollTimeout, clearDecisionTimeout, applyDisplayPositions, completePendingRollVisual])

  useEffect(() => {
    const me = gameState?.players.find(p => p.playerId === sdkPlayerId)
    if (!me) return

    if (!isSpectator && me.roleId && me.roleId !== roleName) {
      navigate(`/role/${me.roleId}/game` + window.location.search, { replace: true })
      return
    }

    const nextCircle = me.isOnBigCircle ? 'big' : 'small'
    setActiveTab(nextCircle)
    setMobileView(view => (view === 'small' || view === 'big') ? nextCircle : view)
  }, [gameState, isSpectator, navigate, roleName, sdkPlayerId])

  const handleRollDice = useCallback(() => {
    if (isRolling || !roomId || !sdkPlayerId) return

    clearRollTimeout()
    rollStartedAtRef.current = Date.now()
    setIsRolling(true)
    setStatusMessage('Бросаем кубики...')

    const sdk = getSdk()
    const diceCount = gameState?.settings?.diceCount === 1 ? 1 : 2
    rollDice(sdk, roomId, sdkPlayerId, diceCount, createFinGuruOperationId('roll'))

    rollTimeoutRef.current = window.setTimeout(() => {
      setIsRolling(false)
      setStatusMessage('Сервер не ответил на бросок. Обновляем состояние...')
      getGameState(sdk, roomId).then(state => {
        if (!state) return
        setGameState(state)
        setStatusMessage(getStatusMessage(state, sdkPlayerId))
      }).catch(() => {
        setStatusMessage('Не удалось выполнить бросок. Попробуйте еще раз.')
      }).finally(() => {
        rollTimeoutRef.current = null
      })
    }, 10000)
  }, [roomId, sdkPlayerId, isRolling, clearRollTimeout, gameState?.settings?.diceCount])

  const handleDecisionAction = useCallback((option: string, action?: string, quantity?: number, offerPrice?: number) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)

    const sdk = getSdk()
    const operationId = createFinGuruOperationId('cell')
    if (action === 'skip' || option === 'skip') {
      resolveCellAction(sdk, roomId, sdkPlayerId, 'skip', option, quantity, offerPrice, operationId)
      return
    }
    if (action === 'chooseDealDeck') {
      resolveCellAction(sdk, roomId, sdkPlayerId, 'chooseDealDeck', option, quantity, offerPrice, operationId)
      return
    }
    resolveCellAction(sdk, roomId, sdkPlayerId, action ?? 'buyDeal', option, quantity, offerPrice, operationId)
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handlePayLiability = useCallback((liabilityId: string) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    const player = gameState?.players.find(item => item.playerId === sdkPlayerId)
    const liability = player?.liabilities?.find(item => item.id === liabilityId)
    if (liability?.liabilityType === 'bankLoan') {
      setAmountDialog({
        kind: 'repayment',
        title: `Погасить кредит «${liability.title}»`,
        max: Math.min(player?.cash ?? 0, liability.balance),
        liabilityId,
      })
      return
    }
    setIsResolvingDecision(true)
    payLiability(getSdk(), roomId, sdkPlayerId, liabilityId, liability?.balance ?? 0, createFinGuruOperationId('liability'))
  }, [roomId, sdkPlayerId, isResolvingDecision, gameState])

  const handleTakeCredit = useCallback((amount: number) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    takeCredit(getSdk(), roomId, sdkPlayerId, amount, createFinGuruOperationId('credit'))
  }, [roomId, sdkPlayerId, isResolvingDecision])

  const handleRequestCredit = useCallback(() => {
    if (isResolvingDecision || !gameState) return
    const player = gameState.players.find(item => item.playerId === sdkPlayerId)
    if (!player) return
    const maximum = getBankCreditProjection(player.income, player.expenses, player.liabilities ?? []).maximum
    if (maximum <= 0) return
    setAmountDialog({ kind: 'credit', title: 'Взять кредит', max: maximum })
  }, [gameState, sdkPlayerId, isResolvingDecision])

  const handleAmountConfirm = useCallback((amount: number) => {
    if (!amountDialog) return
    const dialog = amountDialog
    setAmountDialog(null)
    if (dialog.kind === 'credit') {
      handleTakeCredit(amount)
      return
    }
    if (!dialog.liabilityId || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    payLiability(getSdk(), roomId, sdkPlayerId, dialog.liabilityId, amount, createFinGuruOperationId('liability'))
  }, [amountDialog, handleTakeCredit, roomId, sdkPlayerId])

  const handleClaimSalary = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    claimSalary(getSdk(), roomId, sdkPlayerId, createFinGuruOperationId('salary'))
  }, [roomId, sdkPlayerId, isResolvingDecision])

  const handleCloseCard = useCallback((acknowledgementId: string) => {
    if (isSpectator || isClosingCard || !roomId || !sdkPlayerId) return
    setIsClosingCard(true)
    closeCard(getSdk(), roomId, sdkPlayerId, acknowledgementId)
  }, [isClosingCard, isSpectator, roomId, sdkPlayerId])

  const handleAuctionBid = useCallback((bid: number) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)
    placeAuctionBid(getSdk(), roomId, sdkPlayerId, bid, createFinGuruOperationId('auction-bid'))
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handleAuctionPass = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)
    passAuction(getSdk(), roomId, sdkPlayerId, createFinGuruOperationId('auction-pass'))
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handleAuctionComplete = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)
    completeAuction(getSdk(), roomId, sdkPlayerId, createFinGuruOperationId('auction-complete'))
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  useEffect(() => {
    const handleReplay = (event: MessageEvent) => {
      if (event.data?.type === 'gameStarted' && gameState?.phase === 'gameOver') {
        window.location.reload()
      }
    }

    window.addEventListener('message', handleReplay)
    return () => window.removeEventListener('message', handleReplay)
  }, [gameState?.phase])

  useEffect(() => {
    setCollapsedDecisionKey(null)
  }, [pendingDecisionIdentity])

  useEffect(() => {
    const acknowledgement = gameState?.pendingCardAcknowledgement
    if (!acknowledgement || acknowledgement.closedPlayerIds.includes(sdkPlayerId)) {
      setIsClosingCard(false)
    }
  }, [gameState?.pendingCardAcknowledgement, sdkPlayerId])

  if (!data) return <p>Роль не найдена</p>

  const gamePlayers = gameState?.players ?? []
  const inspectedPlayerId = selectedPlayerId && gamePlayers.some(player => player.playerId === selectedPlayerId)
    ? selectedPlayerId
    : (isSpectator ? gamePlayers[0]?.playerId : (gamePlayers.some(player => player.playerId === sdkPlayerId) ? sdkPlayerId : gamePlayers[0]?.playerId))
  const me = gamePlayers.find(p => p.playerId === (isSpectator ? inspectedPlayerId : sdkPlayerId))

  const dashboardPlayer = me ?? {
    playerId: sdkPlayerId,
    displayName: data.name,
    roleId: roleName ?? '',
    color: myColor,
    dreamId: null,
    cash: getStartingCapital(data.financialData.assets),
    income: data.financialData.income.total,
    expenses: data.financialData.expenses.total,
    position: 0,
    bigPosition: 0,
    isOnBigCircle: false,
    skipNextTurn: false,
    skipTurnsRemaining: 0,
    charityDiceTurnsRemaining: 0,
    accruedSalary: 0,
  }

  const boardPlayers = (gameState?.players ?? [])
    .filter(p => !p.isOnBigCircle)
    .map(p => ({
    id: p.playerId,
    color: p.color,
    letter: p.displayName.charAt(0).toUpperCase(),
    cellIndex: displayPositions[p.playerId]?.position ?? p.position,
    name: p.displayName,
  }))

  const bigSectorPlayers = (gameState?.players ?? [])
    .filter(p => p.isOnBigCircle)
    .map(p => ({
      id: p.playerId,
      color: p.color,
      letter: p.displayName.charAt(0).toUpperCase(),
      cellIndex: displayPositions[p.playerId]?.bigPosition ?? p.bigPosition ?? 0,
      name: p.displayName,
    }))

  const bigSectorDreams = (gameState?.players ?? [])
    .filter(p => p.dreamId != null)
    .map(p => {
      return {
        cellIndex: getBigCircleDreamCell(p.dreamId!),
        playerName: p.displayName,
        color: p.color,
      }
    })

  const isGameOver = gameState?.phase === 'gameOver'

  const handleReturnToRoom = () => {
    window.parent.postMessage({
      type: 'room.returnToLobby',
      payload: { roomId },
    }, '*')
  }

  const handlePlayAgain = () => {
    if (!isHost || isRestarting) return
    setIsRestarting(true)
    restartGame(getSdk(), roomId)
  }
  const pendingDecision = gameState?.pendingDecision ?? null
  const pendingAuction = gameState?.pendingAuction ?? null
  const pendingCardAcknowledgement = gameState?.pendingCardAcknowledgement ?? null
  const acknowledgementCard = pendingCardAcknowledgement
    ? cardSnapshotToEventCard(pendingCardAcknowledgement.card, gamePlayers, pendingCardAcknowledgement.primaryPlayerId)
    : null
  const auctionDecisionKey = pendingAuction ? `auction:${pendingAuction.auctionId}` : null
  const publicOfferOption = pendingDecision?.decisionType === 'dealPublicOffer'
    ? pendingDecision.decisionOptions?.find(option => option.action === 'acceptDealOffer')
    : undefined
  const isPublicOfferVisible = pendingDecision?.decisionType === 'dealPublicOffer' && publicOfferOption
  const sharedDecisionOptions = pendingDecision?.playerDecisionOptions?.[sdkPlayerId] ?? []
  const isSharedParticipant = Boolean(pendingDecision && Object.prototype.hasOwnProperty.call(pendingDecision.playerDecisionOptions ?? {}, sdkPlayerId))
  const sharedDecisionCompleted = pendingDecision?.completedPlayerIds?.includes(sdkPlayerId) ?? false
  const hasDeclinedPublicOffer = pendingDecision?.decisionType === 'dealPublicOffer'
    && (pendingDecision.declinedPlayerIds ?? []).includes(sdkPlayerId)
  const canMakePrimaryDecision = Boolean(
    pendingDecision
      && (pendingDecision.playerId === sdkPlayerId || isPublicOfferVisible)
      && !pendingDecision.primaryDecisionCompleted,
  )
  const myPendingDecision = !isSpectator && !hasDeclinedPublicOffer && (pendingDecision?.playerId === sdkPlayerId || isPublicOfferVisible || isSharedParticipant)
    ? pendingDecision
    : null
  const readOnlyPendingDecision = pendingDecision && !myPendingDecision && pendingDecision.playerId !== sdkPlayerId && !isPublicOfferVisible
    ? pendingDecision
    : null
  const readOnlyPendingPlayer = readOnlyPendingDecision
    ? gamePlayers.find(player => player.playerId === readOnlyPendingDecision.playerId)
    : undefined
  const readOnlyDecisionOption = readOnlyPendingDecision?.decisionOptions?.find(option => option.action === 'buyDeal' || option.action === 'acceptDealOffer')
  const isReadOnlyDealCard = Boolean(readOnlyDecisionOption && (
    readOnlyPendingDecision?.decisionType === 'dealCard'
    || readOnlyPendingDecision?.decisionType === 'dealOffer'
  ))
  const readOnlyPendingEventCard = readOnlyPendingDecision && !isReadOnlyDealCard
    ? buildPendingDecisionEventCard(readOnlyPendingDecision, activeEventCard, readOnlyPendingPlayer, acknowledgementCard)
    : null
  const readOnlyEventCard = activeEventCard
    && !myPendingDecision
    && !readOnlyPendingDecision
    && !pendingAuction
    && !pendingCardAcknowledgement
    ? activeEventCard
    : null
  const activeEventDecisionKey = readOnlyEventCard ? `event:${readOnlyEventCard.id}` : null
  const isChoosingDealDeck = myPendingDecision?.decisionOptions?.some(option => option.action === 'chooseDealDeck') ?? false
  const isDealCardDecision = myPendingDecision?.decisionType === 'dealCard'
    || myPendingDecision?.decisionType === 'dealOffer'
    || myPendingDecision?.decisionType === 'dealPublicOffer'
  const dealCardOption = myPendingDecision?.decisionOptions?.find(option => option.action === 'buyDeal' || option.action === 'acceptDealOffer')
  const decisionKey = pendingDecisionIdentity
  const isDecisionCollapsed = Boolean(decisionKey && collapsedDecisionKey === decisionKey)
  const isAuctionCollapsed = Boolean(auctionDecisionKey && collapsedDecisionKey === auctionDecisionKey)
  const isEventCollapsed = Boolean(activeEventDecisionKey && collapsedDecisionKey === activeEventDecisionKey)
  const resolvedCurrentPlayerId = resolveCurrentPlayerId(
    gameState?.currentPlayerId,
    gamePlayers.map(player => player.playerId),
  )
  const isMyTurn = canPlayerRoll(
    gameState?.phase,
    resolvedCurrentPlayerId,
    sdkPlayerId,
    isSpectator,
    dashboardPlayer.skipNextTurn,
  )
    && (dashboardPlayer.skipTurnsRemaining ?? 0) <= 0
  const activePlayer = gameState?.players.find(p => p.playerId === resolvedCurrentPlayerId)
  const activePlayerIndex = activePlayer
    ? gamePlayers.findIndex(player => player.playerId === activePlayer.playerId)
    : -1
  const nextPlayer = activePlayerIndex >= 0 && gamePlayers.length > 1
    ? gamePlayers[(activePlayerIndex + 1) % gamePlayers.length]
    : undefined
  const passiveIncome = (dashboardPlayer.assets ?? [])
    .reduce((sum, asset) => sum + (asset.cashFlow ?? 0), 0)
  const salaryIncome = Math.max(0, dashboardPlayer.income - passiveIncome)
  const cashFlow = salaryIncome + passiveIncome - dashboardPlayer.expenses
  const skipTurnsRemaining = dashboardPlayer.skipTurnsRemaining ?? (dashboardPlayer.skipNextTurn ? 1 : 0)
  const charityDiceTurnsRemaining = dashboardPlayer.charityDiceTurnsRemaining ?? 0
  const configuredDiceCount = gameState?.settings?.diceCount === 1 ? 1 : 2
  const salaryPayoutMode = gameState?.settings?.salaryPayoutMode ?? 'automatic'
  const activeDiceCount = charityDiceTurnsRemaining > 0 ? 3 : configuredDiceCount
  const isFinanciallyFree = dashboardPlayer.expenses > 0 && passiveIncome > dashboardPlayer.expenses
  const bigCircleTarget = Math.max(1, dashboardPlayer.expenses + 1)
  const bigCircleRemaining = Math.max(0, bigCircleTarget - passiveIncome)
  const creditProjection = getBankCreditProjection(
    dashboardPlayer.income,
    dashboardPlayer.expenses,
    dashboardPlayer.liabilities ?? [],
    0,
  )
  const availableCredit = creditProjection.maximum
  const maximumCreditProjection = getBankCreditProjection(
    dashboardPlayer.income,
    dashboardPlayer.expenses,
    dashboardPlayer.liabilities ?? [],
    availableCredit,
  )
  const creditPayment = maximumCreditProjection.combinedPayment
  const projectedCreditCashFlow = maximumCreditProjection.projectedCashFlow
  const visibleCircle = dashboardPlayer.isOnBigCircle ? 'big' : 'small'
  const statuses = [
    ...(isFinanciallyFree ? [{
      label: dashboardPlayer.isOnBigCircle ? 'Большой круг' : 'Финансовая свобода',
      description: dashboardPlayer.isOnBigCircle
        ? 'Игрок вышел на большой круг'
        : 'Пассивный доход больше расходов',
      bgColor: 'rgb(52, 199, 89)',
    }] : []),
    ...(skipTurnsRemaining > 0 ? [{
      label: 'Увольнение',
      description: `${skipTurnsRemaining} ${getTurnWord(skipTurnsRemaining)} пропускаешь`,
      bgColor: 'rgb(74, 74, 74)',
    }] : []),
    ...(charityDiceTurnsRemaining > 0 ? [{
      label: 'Выбор кубика',
      description: `${charityDiceTurnsRemaining} ${getTurnWord(charityDiceTurnsRemaining)}`,
      bgColor: 'rgb(50, 173, 230)',
    }] : []),
    ...(myPendingDecision ? [{
      label: 'Нужно решение',
      description: myPendingDecision.sectorLabel || 'Выберите действие',
      bgColor: 'rgba(255, 149, 0, 0.18)',
    }] : []),
    ...(pendingAuction ? [{
      label: 'Аукцион',
      description: pendingAuction.dealCard.title || 'Идут ставки',
      bgColor: 'rgba(88, 86, 214, 0.16)',
    }] : []),
  ]
  const rollButtonLabel = turnRoll?.label
    ?? (isRolling
      ? 'Бросаем...'
    : isGameOver
      ? 'Игра завершена'
      : isMyTurn
        ? activeDiceCount > 2 ? 'Бросить 3 кубика' : activeDiceCount === 1 ? 'Бросить 1 кубик' : 'Бросить кубики'
        : activePlayer
          ? `Ходит ${activePlayer.displayName}`
          : 'Ожидание')
  const hasClosedAcknowledgement = pendingCardAcknowledgement?.closedPlayerIds.includes(sdkPlayerId) ?? false

  const handleMobileViewChange = (view: 'profile' | 'small' | 'big' | 'players' | 'history') => {
    const nextView = view === 'small' || view === 'big' ? visibleCircle : view
    setMobileView(nextView)
    if (nextView === 'small' || nextView === 'big') setActiveTab(visibleCircle)
    if (nextView === 'players' || nextView === 'history') setRightPanelTab(nextView)
  }

  return (
    <div className={`${styles.gamePage} ${styles[`mobileView_${mobileView}`]} ${isMyTurn ? styles.hasMobileRoll : ''}`}>
      {isSpectator && <div className={styles.spectatorBanner}>Режим наблюдателя · выберите игрока справа для просмотра</div>}
      {isGameOver && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverModal}>
            <h2>Игра завершена</h2>
            <p>Вернитесь в комнату или начните новую партию.</p>
            {isRestarting ? (
              <div className={styles.gameOverLoading}>Запускаем новую игру...</div>
            ) : (
              <div className={styles.gameOverActions}>
                {isHost && !isSpectator && (
                  <button type="button" className={styles.playAgainButton} onClick={handlePlayAgain}>
                    Играть снова
                  </button>
                )}
                <button type="button" className={styles.returnRoomButton} onClick={handleReturnToRoom}>
                  Выйти в комнату
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className={styles.dashboardColumn}>
        <Dashboard
          playerName={dashboardPlayer.displayName}
          playerRole={roleData[dashboardPlayer.roleId]?.name ?? data.name}
          moveNumber={(gameState?.turnCount ?? 0) + 1}
          stats={{
            cash: dashboardPlayer.cash,
            salary: salaryIncome,
            expenses: dashboardPlayer.expenses,
            passiveIncome,
            cashFlow,
          }}
          bigCircleTarget={bigCircleTarget}
          passiveIncomeProgress={passiveIncome}
          bigCircleRemaining={bigCircleRemaining}
          assetsOnly={dashboardPlayer.isOnBigCircle}
          statuses={statuses}
          assets={dashboardPlayer.assets ?? []}
          liabilities={dashboardPlayer.liabilities ?? []}
          cash={dashboardPlayer.cash}
          disabled={isSpectator || isResolvingDecision || gameState?.phase === 'gameOver'}
          accruedSalary={dashboardPlayer.accruedSalary ?? 0}
          salaryPayoutMode={salaryPayoutMode}
          onPayLiability={handlePayLiability}
          onTakeCredit={handleRequestCredit}
          onClaimSalary={handleClaimSalary}
        />
      </div>

      <div className={styles.boardColumn}>
        <div className={styles.turnPanel} aria-label={statusMessage}>
          <div className={styles.turnPlayerColumn}>
            <span className={styles.turnPlayerLabel}>Ход игрока</span>
            <strong
              className={styles.turnPlayerName}
              style={{ color: activePlayer?.color || 'rgb(255, 149, 0)' }}
            >
              {activePlayer?.displayName ?? 'Ждём игру'}
            </strong>
          </div>
          <div className={styles.turnPlayerColumn}>
            <span className={styles.turnPlayerLabel}>Следующий игрок</span>
            <strong
              className={styles.turnPlayerName}
              style={{ color: nextPlayer?.color || 'rgb(0, 122, 255)' }}
            >
              {nextPlayer?.displayName ?? '—'}
            </strong>
          </div>
          <span className={styles.visuallyHidden} aria-live="polite">{statusMessage}</span>
        </div>

        <GameBoard
          players={visibleCircle === 'small' ? boardPlayers : []}
          bigSectorPlayers={visibleCircle === 'big' ? bigSectorPlayers : []}
          bigSectorDreams={visibleCircle === 'big' ? bigSectorDreams : []}
          currentPlayerId={resolvedCurrentPlayerId || undefined}
          isRolling={isRolling}
          diceCount={activeDiceCount}
          diceValues={lastRoll?.diceValues ?? []}
          rollButtonLabel={rollButtonLabel}
          bigTrack={gameState?.bigTrack ?? []}
          activeTab={activeTab}
          visibleCircle={visibleCircle}
          spinRequest={topBarSpinRequest}
          onTabChange={setActiveTab}
          onRollDice={isMyTurn && !isRolling ? handleRollDice : undefined}
          onSpinComplete={handleTopBarSpinComplete}
        />
      </div>

      <div className={styles.historyColumn}>
        <div className={styles.sideTabs} role="tablist" aria-label="Правая панель">
          <button
            className={rightPanelTab === 'players' ? styles.sideTabActive : styles.sideTab}
            onClick={() => setRightPanelTab('players')}
            type="button"
          >
            Игроки
          </button>
          <button
            className={rightPanelTab === 'history' ? styles.sideTabActive : styles.sideTab}
            onClick={() => setRightPanelTab('history')}
            type="button"
          >
            История ходов
          </button>
        </div>

        {rightPanelTab === 'players' ? (
          <PlayersPanel
            players={gamePlayers}
            currentPlayerId={resolvedCurrentPlayerId}
            selectedPlayerId={inspectedPlayerId ?? ''}
            roundNumber={gameState?.currentRound ?? 0}
            dreams={gameState?.dreams ?? []}
            onSelectPlayer={setSelectedPlayerId}
          />
        ) : (
          <MoveHistory
            title="История ходов"
            entries={moveHistory}
            onOpenCard={setHistoryCard}
          />
        )}
      </div>

      <nav className={styles.mobileTabBar} aria-label="Разделы игры">
        <button
          className={mobileView === 'profile' ? styles.mobileTabActive : styles.mobileTab}
          type="button"
          onClick={() => handleMobileViewChange('profile')}
        >
          <span className={styles.mobileTabIconProfile} />
          <em>Профиль</em>
        </button>
        {visibleCircle === 'big' ? (
          <button
            className={mobileView === 'big' ? styles.mobileTabActive : styles.mobileTab}
            type="button"
            onClick={() => handleMobileViewChange('big')}
          >
            <span className={styles.mobileTabIconCircle} />
            <em>Бол. круг</em>
          </button>
        ) : (
          <button
            className={mobileView === 'small' ? styles.mobileTabActive : styles.mobileTab}
            type="button"
            onClick={() => handleMobileViewChange('small')}
          >
            <span className={styles.mobileTabIconCircleSmall} />
            <em>Мал. круг</em>
          </button>
        )}
        <button
          className={mobileView === 'players' ? styles.mobileTabActive : styles.mobileTab}
          type="button"
          onClick={() => handleMobileViewChange('players')}
        >
          <span className={styles.mobileTabIconPlayers} />
          <em>Игроки</em>
        </button>
        <button
          className={mobileView === 'history' ? styles.mobileTabActive : styles.mobileTab}
          type="button"
          onClick={() => handleMobileViewChange('history')}
        >
          <span className={styles.mobileTabIconHistory} />
          <em>История</em>
        </button>
      </nav>

      {isMyTurn && (
        <div className={styles.mobileRollCta}>
          <button type="button" onClick={handleRollDice} disabled={isRolling}>
            {rollButtonLabel}
          </button>
        </div>
      )}

      {historyCard && (
        <div className={`${styles.actionOverlay} ${styles.historyCardOverlay}`}>
          <EventCard
            card={historyCardToEventCard(historyCard)}
            onClose={() => setHistoryCard(null)}
            closeLabel="Закрыть"
          />
        </div>
      )}

      {acknowledgementCard && gameState?.phase === 'awaitingCardClose' && !hasClosedAcknowledgement && !historyCard && (
        <div className={styles.actionOverlay}>
          <EventCard
            card={acknowledgementCard}
            actions={(
              <CardAcknowledgementControls
                acknowledgement={pendingCardAcknowledgement!}
                currentPlayerId={sdkPlayerId}
                disabled={isClosingCard || isSpectator}
                onClose={handleCloseCard}
              />
            )}
          />
        </div>
      )}

      {((isDecisionCollapsed && pendingDecision) || (isAuctionCollapsed && pendingAuction) || (isEventCollapsed && readOnlyEventCard)) && (
        <button
          type="button"
          className={styles.restoreDecisionButton}
          onClick={() => setCollapsedDecisionKey(null)}
        >
          {isSharedParticipant && !sharedDecisionCompleted ? 'Требуется действие · ' : ''}Показать карточку
        </button>
      )}

      {readOnlyEventCard && !isEventCollapsed && (
        <div className={styles.actionOverlay}>
          <EventCard
            card={readOnlyEventCard}
            onClose={() => setActiveEventCard(null)}
            onMinimize={() => setCollapsedDecisionKey(activeEventDecisionKey)}
          />
        </div>
      )}

      {readOnlyPendingDecision && !isDecisionCollapsed && (
        <div className={styles.actionOverlay}>
          <div key={decisionKey ?? undefined} className={`${styles.actionModal} ${styles.dealActionModal}`}>
            {isReadOnlyDealCard && readOnlyDecisionOption ? (
              <DealDecisionCard
                option={readOnlyDecisionOption}
                cash={dashboardPlayer.cash}
                players={gamePlayers}
                currentPlayerId={sdkPlayerId}
                isOffer={readOnlyPendingDecision.decisionType === 'dealOffer'}
                isPublicOffer={false}
                disabled
                readOnly
                currentCashFlow={cashFlow}
                onMinimize={() => setCollapsedDecisionKey(decisionKey)}
              />
            ) : readOnlyPendingEventCard ? (
              <EventCard card={readOnlyPendingEventCard} hideActions onMinimize={() => setCollapsedDecisionKey(decisionKey)} />
            ) : null}
          </div>
        </div>
      )}

      {pendingAuction && !isAuctionCollapsed && (
        <div className={styles.actionOverlay}>
          <AuctionCard
            auction={pendingAuction}
            players={gamePlayers}
            currentPlayerId={sdkPlayerId}
            cash={dashboardPlayer.cash}
            disabled={isSpectator || isResolvingDecision}
            onBid={handleAuctionBid}
            onPass={handleAuctionPass}
            onComplete={handleAuctionComplete}
            onMinimize={() => setCollapsedDecisionKey(auctionDecisionKey)}
          />
        </div>
      )}

      {myPendingDecision && !isDecisionCollapsed && (
        <div className={styles.actionOverlay}>
          <div key={decisionKey ?? undefined} className={`${styles.actionModal} ${isDealCardDecision || isChoosingDealDeck || myPendingDecision ? styles.dealActionModal : ''}`}>
            {myPendingDecision.expiresAt && <DecisionProgress decision={myPendingDecision} />}
            {isDealCardDecision && dealCardOption ? (
              <DealDecisionCard
                option={dealCardOption}
                cash={dashboardPlayer.cash}
                players={gamePlayers}
                currentPlayerId={sdkPlayerId}
                isOffer={myPendingDecision.decisionType === 'dealOffer' || myPendingDecision.decisionType === 'dealPublicOffer'}
                isPublicOffer={myPendingDecision.decisionType === 'dealPublicOffer'}
                disabled={isResolvingDecision}
                currentCashFlow={cashFlow}
                availableCredit={availableCredit}
                creditPayment={creditPayment}
                projectedCreditCashFlow={projectedCreditCashFlow}
                onAccept={(quantity) => handleDecisionAction(dealCardOption.option, dealCardOption.action, quantity)}
                onSell={(offerPrice) => handleDecisionAction(dealCardOption.option, 'sellDeal', undefined, offerPrice)}
                onAuction={() => handleDecisionAction('auction', 'auctionDeal')}
                onSkip={() => handleDecisionAction('skip', 'skip')}
                onTakeCredit={handleRequestCredit}
                canMakePrimaryDecision={canMakePrimaryDecision}
                sharedSaleOptions={sharedDecisionOptions}
                sharedSaleCompleted={sharedDecisionCompleted}
                onSellSharedAsset={(saleOption, quantity) => handleDecisionAction(saleOption.option, saleOption.action, quantity)}
                onCompleteSharedDecision={isSharedParticipant
                  ? () => handleDecisionAction('complete', 'completeSharedDecision')
                  : undefined}
                onMinimize={() => setCollapsedDecisionKey(decisionKey)}
                canDeclineOffer={(myPendingDecision.eligiblePlayerIds ?? []).includes(sdkPlayerId)}
              />
            ) : isChoosingDealDeck ? (
              <DealDeckChoice
                disabled={isResolvingDecision}
                onChoose={(option) => handleDecisionAction(option, 'chooseDealDeck')}
              />
            ) : (
              <EventCard
                card={buildPendingDecisionEventCard(
                  myPendingDecision,
                  activeEventCard,
                  dashboardPlayer,
                  acknowledgementCard,
                )}
                onMinimize={() => setCollapsedDecisionKey(decisionKey)}
                actions={myPendingDecision.decisionType === 'marketCard' && isSharedParticipant ? (
                  <>
                    <SharedSaleActions
                      options={sharedDecisionOptions}
                      completed={sharedDecisionCompleted}
                      disabled={isResolvingDecision}
                      onSell={(saleOption, quantity) => handleDecisionAction(saleOption.option, saleOption.action, quantity)}
                      onComplete={() => handleDecisionAction('complete', 'completeSharedDecision')}
                    />
                    {canMakePrimaryDecision && (
                      <button className={styles.eventSecondaryButton} onClick={() => handleDecisionAction('skip', 'skip')} disabled={isResolvingDecision}>
                        Пропустить рынок
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.eventActionGrid}>
                      {(myPendingDecision.decisionOptions ?? [])
                        .filter(option => option.option !== 'skip')
                        .map(option => {
                          const cannotAfford = option.action === 'buyDeal' && option.cost > dashboardPlayer.cash
                          return (
                            <button
                              key={`${option.option}-${option.title}`}
                              className={styles.eventActionButton}
                              onClick={() => handleDecisionAction(option.option, option.action)}
                              disabled={isResolvingDecision || cannotAfford}
                            >
                              <strong>{option.title}</strong>
                              <span>{option.description}</span>
                              {cannotAfford && <em>Не хватает {formatMoney(option.cost - dashboardPlayer.cash)}</em>}
                            </button>
                          )
                        })}
                    </div>
                    <button className={styles.eventSecondaryButton} onClick={() => handleDecisionAction('skip', 'skip')} disabled={isResolvingDecision}>
                      {myPendingDecision.decisionType === 'deal' ? 'Пропустить сделку' : 'Пропустить'}
                    </button>
                  </>
                )}
              />
            )}
          </div>
        </div>
      )}
      {pendingCardAcknowledgement && (gameState?.phase !== 'awaitingCardClose' || hasClosedAcknowledgement) && !historyCard && (
        <div className={styles.floatingAcknowledgement}>
          <CardAcknowledgementControls
            acknowledgement={pendingCardAcknowledgement}
            currentPlayerId={sdkPlayerId}
            disabled={isClosingCard || isSpectator}
            onClose={handleCloseCard}
          />
        </div>
      )}
      {amountDialog && (
        <MoneyAmountDialog
          title={amountDialog.title}
          max={amountDialog.max}
          paymentPreview={amountDialog.kind === 'credit'}
          creditContext={amountDialog.kind === 'credit' ? {
            income: dashboardPlayer.income,
            expenses: dashboardPlayer.expenses,
            liabilities: dashboardPlayer.liabilities ?? [],
          } : undefined}
          onCancel={() => setAmountDialog(null)}
          onConfirm={handleAmountConfirm}
        />
      )}
    </div>
  )
}

function MoneyAmountDialog({
  title,
  max,
  paymentPreview,
  creditContext,
  onCancel,
  onConfirm,
}: {
  title: string
  max: number
  paymentPreview: boolean
  creditContext?: { income: number; expenses: number; liabilities: FinGuruLiability[] }
  onCancel: () => void
  onConfirm: (amount: number) => void
}) {
  const [amountInput, setAmountInput] = useState(() => String(Math.max(1, max)))
  const amount = /^\d+$/.test(amountInput) ? Number(amountInput) : Number.NaN
  const validAmount = isValidMoneyAmount(amount, max)
  const preview = creditContext && validAmount
    ? getBankCreditProjection(creditContext.income, creditContext.expenses, creditContext.liabilities, amount)
    : null

  return (
    <div className={styles.amountDialogOverlay} role="presentation">
      <section className={styles.amountDialog} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p>Доступно до {formatMoney(max)}</p>
        <label>
          <span>Сумма</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amountInput}
            autoFocus
            onFocus={event => event.currentTarget.select()}
            onChange={event => {
              setAmountInput(sanitizeMoneyInput(event.target.value))
            }}
          />
        </label>
        <button type="button" className={styles.amountMaxButton} onClick={() => setAmountInput(String(max))}>Вся сумма</button>
        {paymentPreview && validAmount && (
          <p className={styles.amountPreview}>
            Ежемесячный платёж: <strong>{formatMoney(preview?.combinedPayment ?? Math.ceil(amount * 0.1))}</strong>
            <br />
            Денежный поток после кредита: <strong>{formatMoney(preview?.projectedCashFlow ?? 0)}</strong>
          </p>
        )}
        <div className={styles.amountDialogActions}>
          <button type="button" onClick={onCancel}>Отмена</button>
          <button type="button" disabled={!validAmount} onClick={() => onConfirm(amount)}>Подтвердить</button>
        </div>
      </section>
    </div>
  )
}

function CardAcknowledgementControls({
  acknowledgement,
  currentPlayerId,
  disabled,
  onClose,
}: {
  acknowledgement: PendingCardAcknowledgement
  currentPlayerId: string
  disabled: boolean
  onClose: (acknowledgementId: string) => void
}) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!acknowledgement.expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [acknowledgement.expiresAt])

  const required = acknowledgement.requiredPlayerIds.length
  const completed = acknowledgement.closedPlayerIds.filter(playerId => acknowledgement.requiredPlayerIds.includes(playerId)).length
  const isRequired = acknowledgement.requiredPlayerIds.includes(currentPlayerId)
  const isClosed = acknowledgement.closedPlayerIds.includes(currentPlayerId)
  const waitsForAction = currentPlayerId === acknowledgement.primaryPlayerId && !acknowledgement.primaryActionCompleted
  const expiresAt = acknowledgement.expiresAt ? new Date(acknowledgement.expiresAt).getTime() : null
  const seconds = expiresAt == null ? null : Math.max(0, Math.ceil((expiresAt - now) / 1000))

  return (
    <div className={styles.cardAcknowledgement} role="status">
      <div className={styles.cardAcknowledgementStatus}>
        <span>Закрыли: {Math.min(completed, required)} из {required}</span>
        {seconds != null && <strong>{seconds} сек.</strong>}
      </div>
      <button
        type="button"
        onClick={() => onClose(acknowledgement.acknowledgementId)}
        disabled={disabled || !isRequired || isClosed || waitsForAction}
      >
        {isClosed
          ? 'Карточка закрыта'
          : waitsForAction
            ? 'Сначала завершите действие'
            : 'Закрыть карточку'}
      </button>
    </div>
  )
}

function DecisionProgress({ decision }: { decision: NonNullable<GameState['pendingDecision']> }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const expiresAt = decision.expiresAt ? new Date(decision.expiresAt).getTime() : now
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  const total = decision.decisionType === 'dealPublicOffer'
    ? decision.eligiblePlayerIds.length
    : Object.keys(decision.playerDecisionOptions ?? {}).length
  const completed = decision.decisionType === 'dealPublicOffer'
    ? decision.declinedPlayerIds.length
    : decision.completedPlayerIds.length

  return (
    <div className={styles.decisionProgress} role="status">
      <span>Ответили: {Math.min(completed, total)} из {total}</span>
      <strong>{seconds} сек.</strong>
    </div>
  )
}

function EventCard({
  card,
  actions,
  hideActions = false,
  onClose,
  onMinimize,
  closeLabel = 'Понятно',
}: {
  card: EventCardData
  actions?: ReactNode
  hideActions?: boolean
  onClose?: () => void
  onMinimize?: () => void
  closeLabel?: string
}) {
  const toneClass = styles[`eventCard_${getEventTone(card.sectorType, card.dealType)}`]
  const details = [
    card.cashChange !== undefined && card.cashChange !== 0
      ? {
          label: 'Наличные',
          value: formatDelta(card.cashChange),
          tone: card.cashChange > 0 ? 'positive' : 'negative',
        }
      : null,
    card.incomeChange !== undefined && card.incomeChange !== 0
      ? {
          label: 'Доход',
          value: formatDelta(card.incomeChange),
          tone: card.incomeChange > 0 ? 'positive' : 'negative',
        }
      : null,
    card.expensesChange !== undefined && card.expensesChange !== 0
      ? {
          label: 'Расходы',
          value: formatDelta(card.expensesChange),
          tone: card.expensesChange > 0 ? 'negative' : 'positive',
        }
      : null,
    card.newCash !== undefined ? { label: 'Наличные после', value: formatMoney(card.newCash) } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; tone?: 'positive' | 'negative' }>

  return (
    <article className={`${styles.eventCard} ${toneClass}`}>
      {onMinimize && (
        <button className={styles.cardMinimizeButton} type="button" onClick={onMinimize}>Скрыть карточку</button>
      )}
      <div className={styles.eventCardMain}>
        <div className={styles.eventCardHeader}>
          <span>{card.sectorLabel || getFallbackEventTitle(card.sectorType, '')}</span>
        </div>

        <div className={styles.eventCardBody}>
          <span className={styles.eventCardPlayer} style={{ color: card.playerColor }}>
            {card.playerName}
          </span>
          <h2>{card.title}</h2>
          <p>{card.description}</p>
        </div>

        {details.length > 0 && (
          <div className={styles.eventCardDetails}>
            {details.map(detail => (
              <div className={styles.eventCardDetail} key={detail.label}>
                <span>{detail.label}</span>
                <strong className={detail.tone === 'positive' ? styles.eventCardPositive : detail.tone === 'negative' ? styles.eventCardNegative : undefined}>
                  {detail.value}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {hideActions ? null : actions ? (
        <div className={styles.eventCardActions}>{actions}</div>
      ) : (
        <div className={styles.eventCardActions}>
          <button className={styles.eventCardClose} type="button" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      )}
    </article>
  )
}

function DealDeckChoice({
  disabled,
  onChoose,
}: {
  disabled: boolean
  onChoose: (option: 'small' | 'big') => void
}) {
  return (
    <section className={styles.dealDeckChoice} aria-label="Выбор сделки">
      <article className={`${styles.dealDeckCard} ${styles.dealDeckCardSmall}`}>
        <div className={styles.dealDeckImageArea}>
          <img className={styles.dealDeckImageSmall} src={smallDealImage} alt="" />
        </div>
        <div className={styles.dealDeckText}>
          <h2>Мелкая сделка</h2>
          <p>Нужно мало денег, но и пассивный доход меньше</p>
        </div>
        <button
          className={styles.dealDeckButton}
          type="button"
          disabled={disabled}
          onClick={() => onChoose('small')}
        >
          Выбрать
        </button>
      </article>

      <article className={`${styles.dealDeckCard} ${styles.dealDeckCardBig}`}>
        <div className={styles.dealDeckImageArea}>
          <img className={styles.dealDeckImageBig} src={bigDealImage} alt="" />
        </div>
        <div className={styles.dealDeckText}>
          <h2>Крупная сделка</h2>
          <p>Нужно много денег (от 6 000 ₽), но пассивный доход высокий</p>
        </div>
        <button
          className={styles.dealDeckButton}
          type="button"
          disabled={disabled}
          onClick={() => onChoose('big')}
        >
          Выбрать
        </button>
      </article>
    </section>
  )
}

function SharedSaleActions({
  options,
  completed,
  disabled,
  onSell,
  onComplete,
}: {
  options: DecisionOption[]
  completed: boolean
  disabled: boolean
  onSell: (option: DecisionOption, quantity: number) => void
  onComplete: () => void
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [hasSold, setHasSold] = useState(false)

  if (completed) {
    return <div className={styles.sharedSaleWaiting}>Ваш ответ принят. Ждём остальных игроков.</div>
  }

  return (
    <section className={styles.sharedSaleSection}>
      <h3>Продать свои активы</h3>
      {options.length > 0 ? (
        <div className={styles.sharedSaleList}>
          {options.map(option => {
            const maximum = Math.max(1, option.availableQuantity || 1)
            const selectedQuantity = Math.max(1, Math.min(maximum, quantities[option.option] ?? maximum))
            const saleTotal = option.salePerUnit
              ? option.saleUnitPrice * selectedQuantity
              : option.offerPrice
            return (
              <article className={styles.sharedSaleItem} key={option.option}>
                <strong>{option.title.replace(/^Продать\s+/i, '')}</strong>
                <span>Куплено: {formatMoney(option.purchaseUnitPrice)}{maximum > 1 ? ' за шт.' : ''}</span>
                <span>Продажа: {formatMoney(option.salePerUnit ? option.saleUnitPrice : option.offerPrice)}{option.salePerUnit ? ' за шт.' : ''}</span>
                {option.salePerUnit && maximum > 1 && (
                  <label className={styles.sharedSaleQuantity}>
                    <span>Количество</span>
                    <input
                      type="number"
                      min={1}
                      max={maximum}
                      value={selectedQuantity}
                      disabled={disabled}
                      onChange={(event) => {
                        const value = Math.floor(Number(event.target.value))
                        if (!Number.isFinite(value)) return
                        setQuantities(current => ({ ...current, [option.option]: Math.max(1, Math.min(maximum, value)) }))
                      }}
                    />
                  </label>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setHasSold(true)
                    onSell(option, selectedQuantity)
                  }}
                >
                  Продать за {formatMoney(saleTotal)}
                </button>
              </article>
            )
          })}
        </div>
      ) : (
        <p className={styles.sharedSaleEmpty}>Подходящих активов больше нет.</p>
      )}
      <button className={styles.sharedSaleComplete} type="button" disabled={disabled} onClick={onComplete}>
        {hasSold ? 'Готово' : 'Пропустить'}
      </button>
    </section>
  )
}

function DealDecisionCard({
  option,
  cash,
  players,
  currentPlayerId,
  isOffer,
  isPublicOffer,
  disabled,
  readOnly = false,
  currentCashFlow = 0,
  availableCredit = 0,
  creditPayment = 0,
  projectedCreditCashFlow = 0,
  onAccept,
  onSell,
  onAuction,
  onSkip,
  onTakeCredit,
  sharedSaleOptions = [],
  sharedSaleCompleted = false,
  canMakePrimaryDecision = true,
  onSellSharedAsset,
  onCompleteSharedDecision,
  onMinimize,
  canDeclineOffer = false,
}: {
  option: DecisionOption
  cash: number
  players: any[]
  currentPlayerId: string
  isOffer: boolean
  isPublicOffer: boolean
  disabled: boolean
  readOnly?: boolean
  currentCashFlow?: number
  availableCredit?: number
  creditPayment?: number
  projectedCreditCashFlow?: number
  onAccept?: (quantity?: number) => void
  onSell?: (offerPrice: number) => void
  onAuction?: () => void
  onSkip?: () => void
  onTakeCredit?: () => void
  sharedSaleOptions?: DecisionOption[]
  sharedSaleCompleted?: boolean
  canMakePrimaryDecision?: boolean
  onSellSharedAsset?: (option: DecisionOption, quantity: number) => void
  onCompleteSharedDecision?: () => void
  onMinimize?: () => void
  canDeclineOffer?: boolean
}) {
  const [activePanel, setActivePanel] = useState<'card' | 'actions'>('card')
  const offerPrice = option.offerPrice ?? 0
  const isStockDeal = isStockOption(option)
  const isOwnPublicOffer = isPublicOffer && option.offeredByPlayerId === currentPlayerId
  const stockBudget = Math.max(0, cash - (isOffer ? offerPrice : 0))
  const maxStockQuantity = isStockDeal && option.cost > 0 ? Math.max(1, Math.floor(stockBudget / option.cost)) : 1
  const [stockQuantity, setStockQuantity] = useState(1)
  const [salePrice, setSalePrice] = useState(Math.max(100, offerPrice || Math.round(Math.max(option.cost, option.assetValue) * 0.1)))
  const purchaseQuantity = isStockDeal ? Math.min(stockQuantity, maxStockQuantity) : 1
  const purchaseCost = option.cost * purchaseQuantity
  const purchaseCashFlow = option.cashFlow * purchaseQuantity
  const purchaseAssetValue = option.assetValue * purchaseQuantity
  const totalCost = purchaseCost + (isOffer ? offerPrice : 0)
  const cannotAfford = totalCost > cash
  const isBigDeal = option.cardType === 'bigDeal' || option.option.startsWith('kru-')
  const isRealEstate = option.dealType.toLowerCase().includes('недвиж')
  const canTrade = !isOffer && !isRealEstate && players.some(player => player.playerId !== currentPlayerId)
  const canAcceptOffer = !isOwnPublicOffer && canMakePrimaryDecision
  const cardClass = isBigDeal ? styles.dealDecisionCardBig : styles.dealDecisionCardSmall
  const isActionsPanel = !readOnly && activePanel === 'actions'
  const dealTitle = isBigDeal ? 'Крупная сделка' : 'Мелкая сделка'
  const priceLabel = isStockDeal ? 'Итого' : 'Цена'
  const displayPrice = isStockDeal ? purchaseCost : Math.max(option.assetValue, option.cost)
  const afterPurchaseCash = cash - totalCost
  const afterPurchaseCashFlow = currentCashFlow + purchaseCashFlow
  const interestedBuyers = players
    .filter(player => player.playerId !== currentPlayerId)
    .slice(0, 3)
  const buyLabel = isOwnPublicOffer
    ? 'Ожидаем покупателя'
    : isOffer
      ? `Забрать за ${formatMoney(totalCost)}`
      : `Купить за ${formatMoney(totalCost)}`
  const cardDetails = [
    isOffer && offerPrice > 0 ? { label: 'Цена права', value: formatMoney(offerPrice) } : null,
    option.liabilityValue > 0 ? { label: 'Ипотека', value: formatMoney(option.liabilityValue) } : null,
    option.cost > 0 ? { label: isStockDeal ? 'Цена за акцию' : option.liabilityValue > 0 ? 'Первый взнос' : 'Взнос', value: formatMoney(isStockDeal ? option.cost : option.cost) } : null,
    isStockDeal ? { label: 'Количество', value: `${purchaseQuantity} шт.` } : null,
    option.cashFlow !== 0 ? { label: 'Денежный поток', value: formatDelta(isStockDeal ? purchaseCashFlow : option.cashFlow), accent: option.cashFlow > 0 ? 'positive' : 'negative' } : null,
    option.roi ? { label: 'ROI', value: option.roi } : null,
    option.saleRange ? { label: 'Диапазон продажи', value: option.saleRange } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; accent?: 'positive' | 'negative' }>

  return (
    <div className={`${styles.dealDecisionCard} ${isActionsPanel ? styles.dealDecisionCardActionView : cardClass}`}>
      {onMinimize && (
        <button className={styles.cardMinimizeButton} type="button" onClick={onMinimize}>Скрыть карточку</button>
      )}
      {isActionsPanel ? (
        <div className={styles.dealActionPanel}>
          <h2 className={styles.dealActionTitle}>{dealTitle}</h2>

          {canMakePrimaryDecision && <section className={styles.dealActionSection}>
            <h3>После покупки</h3>
            <div className={styles.dealActionRows}>
              <div className={styles.dealActionRow}>
                <span>Баланс</span>
                <strong>{formatMoney(cash)} → {formatMoney(afterPurchaseCash)}</strong>
              </div>
              <div className={styles.dealActionRow}>
                <span>Денежный поток</span>
                <strong>{formatMoney(currentCashFlow)} → {formatMoney(afterPurchaseCashFlow)}</strong>
              </div>
            </div>

            {isStockDeal && canAcceptOffer && (
              <div className={styles.dealActionQuantity}>
                <span>{purchaseQuantity} акций</span>
                <div>
                  <button
                    type="button"
                    onClick={() => setStockQuantity(value => Math.max(1, value - 1))}
                    disabled={disabled || purchaseQuantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxStockQuantity}
                    value={purchaseQuantity}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      if (!Number.isFinite(nextValue)) return
                      setStockQuantity(Math.max(1, Math.min(maxStockQuantity, Math.floor(nextValue))))
                    }}
                    disabled={disabled}
                    aria-label="Количество акций"
                  />
                  <button
                    type="button"
                    onClick={() => setStockQuantity(value => Math.min(maxStockQuantity, value + 1))}
                    disabled={disabled || purchaseQuantity >= maxStockQuantity}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              className={`${styles.dealActionButton} ${styles.dealActionButtonBuy}`}
              type="button"
              onClick={() => onAccept?.(isStockDeal ? purchaseQuantity : undefined)}
              disabled={disabled || cannotAfford || !canAcceptOffer}
            >
              {buyLabel}
            </button>
            {cannotAfford && canAcceptOffer && (
              <p className={styles.dealActionWarning}>Не хватает {formatMoney(totalCost - cash)}</p>
            )}
          </section>}

          {onCompleteSharedDecision && (
            <SharedSaleActions
              options={sharedSaleOptions}
              completed={sharedSaleCompleted}
              disabled={disabled}
              onSell={(saleOption, quantity) => onSellSharedAsset?.(saleOption, quantity)}
              onComplete={onCompleteSharedDecision}
            />
          )}

          {canMakePrimaryDecision && availableCredit > 0 && (
            <section className={styles.dealActionSection}>
              <h3>Доступен кредит {formatMoney(availableCredit)}</h3>
              <p className={styles.dealCreditHint}>
                Платёж по кредиту: <strong>{formatMoney(creditPayment)}</strong> · Денежный поток после кредита: <strong>{formatMoney(projectedCreditCashFlow)}</strong>
              </p>
              <button
                className={`${styles.dealActionButton} ${styles.dealActionButtonCredit}`}
                type="button"
                onClick={() => onTakeCredit?.()}
                disabled={disabled || !onTakeCredit}
              >
                Взять кредит
              </button>
            </section>
          )}

          {canMakePrimaryDecision && canTrade && (
            <>
              <div className={styles.dealActionDivider} />
              <section className={styles.dealOffersSection}>
                <div className={styles.dealOffersHeader}>
                  <span>Желающие эту карту</span>
                  <span>Наличные</span>
                </div>
                <div className={styles.dealOffersList}>
                  {interestedBuyers.length > 0 ? interestedBuyers.map(player => (
                    <div className={styles.dealOfferRow} key={player.playerId}>
                      <span>{player.displayName || 'Игрок'}</span>
                      <strong>{formatMoney(player.cash ?? 0)}</strong>
                    </div>
                  )) : (
                    <div className={styles.dealOfferRow}>
                      <span>Нет игроков</span>
                      <strong>-</strong>
                    </div>
                  )}
                </div>

                <label className={styles.dealSalePriceInline}>
                  <span>Цена права</span>
                  <input
                    type="number"
                    min={0}
                    value={salePrice}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      if (!Number.isFinite(nextValue)) return
                      setSalePrice(Math.max(0, Math.floor(nextValue)))
                    }}
                    disabled={disabled}
                  />
                </label>

                <div className={styles.dealOfferActions}>
                  <button
                    type="button"
                    onClick={() => onSell?.(salePrice)}
                    disabled={disabled}
                  >
                    Выставить цену
                  </button>
                  <button
                    type="button"
                    onClick={() => onAuction?.()}
                    disabled={disabled}
                  >
                    Сделать торги
                  </button>
                </div>
              </section>
            </>
          )}

          {!isPublicOffer && canMakePrimaryDecision && (
            <button
              className={`${styles.dealActionButton} ${styles.dealActionButtonSkip}`}
              type="button"
              onClick={() => onSkip?.()}
              disabled={disabled}
            >
              Пропустить
            </button>
          )}
          {isPublicOffer && canDeclineOffer && (
            <button
              className={`${styles.dealActionButton} ${styles.dealActionButtonSkip}`}
              type="button"
              onClick={() => onSkip?.()}
              disabled={disabled}
            >
              Отказаться
            </button>
          )}
        </div>
      ) : (
        <div className={styles.dealDecisionMain}>
          <h2 className={styles.dealDecisionTitle}>{option.title}</h2>

          <div className={styles.dealDecisionBody}>
            <div className={styles.dealDecisionContent}>
              <p className={styles.dealDecisionDescription}>{option.description}</p>
            </div>

            <div className={styles.dealDecisionDetails}>
              <div className={styles.dealDecisionHeader}>
                <span>{priceLabel}</span>
                <strong>{formatMoney(displayPrice)}</strong>
              </div>
              {cardDetails.map(detail => (
                <div className={styles.dealDecisionRow} key={detail.label}>
                  <span>{detail.label}</span>
                  <strong className={detail.accent === 'negative' ? styles.dealDecisionNegative : detail.accent === 'positive' ? styles.dealDecisionPositive : undefined}>
                    {detail.value}
                  </strong>
                </div>
              ))}
              {!isOffer && isRealEstate && (
                <div className={styles.dealDecisionNote}>
                  Недвижимость может купить только игрок, которому выпала карта.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className={styles.dealDecisionSegmentedWrap}>
          <div className={`${styles.dealDecisionSegmented} ${isActionsPanel ? styles.dealDecisionSegmentedLight : ''}`}>
            <button
              type="button"
              className={!isActionsPanel ? styles.dealDecisionSegmentActive : undefined}
              onClick={() => setActivePanel('card')}
            >
              Карточка
            </button>
            <button
              type="button"
              className={isActionsPanel ? styles.dealDecisionSegmentActive : undefined}
              onClick={() => setActivePanel('actions')}
            >
              Действия
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AuctionCard({
  auction,
  players,
  currentPlayerId,
  cash,
  disabled,
  onBid,
  onPass,
  onComplete,
  onMinimize,
}: {
  auction: FinGuruAuctionState
  players: any[]
  currentPlayerId: string
  cash: number
  disabled: boolean
  onBid: (bid: number) => void
  onPass: () => void
  onComplete: () => void
  onMinimize?: () => void
}) {
  const deal = auction.dealCard
  const seller = players.find(player => player.playerId === auction.sellerPlayerId)
  const leader = players.find(player => player.playerId === auction.currentBidderPlayerId)
  const isSeller = currentPlayerId === auction.sellerPlayerId
  const isParticipant = auction.participantPlayerIds.includes(currentPlayerId)
  const hasPassed = auction.passedPlayerIds.includes(currentPlayerId)
  const isLeader = auction.currentBidderPlayerId === currentPlayerId
  const minimumBid = auction.currentBidderPlayerId ? auction.currentBid + 1 : auction.startingBid
  const purchaseCost = Math.max(0, deal.cost)
  const [bidValue, setBidValue] = useState(minimumBid)
  const normalizedBid = Math.max(minimumBid, Math.floor(Number.isFinite(bidValue) ? bidValue : minimumBid))
  const totalRequired = purchaseCost + normalizedBid
  const cannotAfford = totalRequired > cash
  const canAct = isParticipant && !isSeller && !hasPassed
  const canBid = canAct && !cannotAfford
  const canPass = canAct && !isLeader
  const activeParticipantIds = auction.participantPlayerIds.filter(playerId => playerId !== auction.currentBidderPlayerId)
  const readyToComplete = activeParticipantIds.every(playerId => auction.passedPlayerIds.includes(playerId))
  const meta = [deal.cardId, deal.dealType, deal.ticker].filter(Boolean).join(' · ')
  const details = [
    purchaseCost > 0 ? { label: 'Цена сделки', value: formatMoney(purchaseCost) } : null,
    { label: 'Стартовая ставка', value: formatMoney(auction.startingBid) },
    { label: 'Текущая ставка', value: formatMoney(auction.currentBid) },
    deal.cashFlow !== 0 ? { label: 'Денежный поток', value: formatDelta(deal.cashFlow), accent: deal.cashFlow > 0 ? 'positive' : 'negative' } : null,
    deal.assetValue > 0 ? { label: 'Стоимость актива', value: formatMoney(deal.assetValue) } : null,
    deal.liabilityValue > 0 ? { label: 'Пассив / ипотека', value: formatMoney(deal.liabilityValue) } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; accent?: 'positive' | 'negative' }>

  useEffect(() => {
    setBidValue(value => Math.max(minimumBid, value))
  }, [minimumBid])

  return (
    <div className={`${styles.dealDecisionCard} ${styles.auctionCard}`}>
      {onMinimize && (
        <button className={styles.cardMinimizeButton} type="button" onClick={onMinimize}>Скрыть карточку</button>
      )}
      <div className={styles.dealDecisionMain}>
        <div className={styles.dealDecisionContent}>
          <span className={styles.dealDecisionMeta}>Аукцион{meta ? ` · ${meta}` : ''}</span>
          <h2 className={styles.dealDecisionTitle}>{deal.title || 'Сделка на аукционе'}</h2>
          <p className={styles.dealDecisionDescription}>
            {deal.description || 'Игроки делают ставки за право купить эту сделку.'}
          </p>
        </div>

        <div className={styles.auctionSummary}>
          <div>
            <span>Продавец</span>
            <strong>{seller?.displayName ?? 'Игрок'}</strong>
          </div>
          <div>
            <span>Лидер</span>
            <strong>{leader?.displayName ?? 'Ставок ещё нет'}</strong>
          </div>
        </div>

        <div className={styles.dealDecisionDetails}>
          {details.map(detail => (
            <div className={styles.dealDecisionRow} key={detail.label}>
              <span>{detail.label}</span>
              <strong className={detail.accent === 'negative' ? styles.dealDecisionNegative : detail.accent === 'positive' ? styles.dealDecisionPositive : undefined}>
                {detail.value}
              </strong>
            </div>
          ))}
          {cannotAfford && canAct && (
            <div className={styles.dealDecisionWarning}>
              Нужно {formatMoney(totalRequired)}: {formatMoney(purchaseCost)} за сделку и {formatMoney(normalizedBid)} ставка.
            </div>
          )}
        </div>

        <div className={styles.auctionParticipants}>
          {auction.participantPlayerIds.map(playerId => {
            const player = players.find(item => item.playerId === playerId)
            const status = playerId === auction.currentBidderPlayerId
              ? 'Лидер'
              : auction.passedPlayerIds.includes(playerId)
                ? 'Пас'
                : 'Участвует'

            return (
              <span key={playerId} className={playerId === auction.currentBidderPlayerId ? styles.auctionLeader : undefined}>
                {player?.displayName ?? 'Игрок'} · {status}
              </span>
            )
          })}
        </div>
      </div>

      <div className={styles.dealDecisionActions}>
        {canAct ? (
          <>
            <label className={styles.auctionBidInput}>
              <span>Ваша ставка</span>
              <input
                type="number"
                min={minimumBid}
                value={bidValue}
                onChange={(event) => {
                  const nextValue = Number(event.target.value)
                  if (!Number.isFinite(nextValue)) return
                  setBidValue(Math.max(0, Math.floor(nextValue)))
                }}
                disabled={disabled}
              />
            </label>
            <button className={styles.dealDecisionButton} onClick={() => onBid(normalizedBid)} disabled={disabled || !canBid}>
              Поставить {formatMoney(normalizedBid)}
            </button>
            <button className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`} onClick={onPass} disabled={disabled || !canPass}>
              {isLeader ? 'Ожидаем пас остальных' : 'Пас'}
            </button>
          </>
        ) : (
          <div className={styles.auctionWaiting}>
            {isSeller
              ? 'Вы выставили сделку. Ждём ставки или пас участников.'
              : hasPassed
                ? 'Вы спасовали в этом аукционе.'
                : 'Вы наблюдаете за аукционом.'}
          </div>
        )}
        {(isSeller || isLeader) && (
          <button className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`} onClick={onComplete} disabled={disabled || !readyToComplete}>
            Завершить аукцион
          </button>
        )}
      </div>
    </div>
  )
}

export function PlayersPanel({
  players,
  currentPlayerId,
  selectedPlayerId,
  roundNumber,
  dreams,
  onSelectPlayer,
}: {
  players: any[]
  currentPlayerId: string
  selectedPlayerId: string
  roundNumber: number
  dreams: any[]
  onSelectPlayer: (playerId: string) => void
}) {
  if (players.length === 0) {
    return (
      <div className={styles.playersEmpty}>
        <strong>Игроки появятся после старта</strong>
        <span>Ждём состояние комнаты</span>
      </div>
    )
  }

  return (
    <div className={styles.playersPanel}>
      <div className={styles.playersList}>
        {players.map(player => {
          const financials = getPlayerFinancials(player)
          const dream = dreams.find(item => item.id === player.dreamId)
          const fallbackStartingCashFlow = financials.passiveIncome * 100
          const bigCircleStartingCashFlow = Math.max(
            0,
            player.bigCircleStartingCashFlow || fallbackStartingCashFlow,
          )
          const bigCircleCurrentCashFlow = Math.max(
            bigCircleStartingCashFlow,
            player.income ?? bigCircleStartingCashFlow,
          )
          const bigCircleCashFlowGrowth = Math.max(
            0,
            bigCircleCurrentCashFlow - bigCircleStartingCashFlow,
          )
          const target = player.isOnBigCircle
            ? VICTORY_CASH_FLOW_TARGET
            : Math.max(1, (player.expenses ?? 0) + 1)
          const progressValue = player.isOnBigCircle
            ? bigCircleCashFlowGrowth
            : financials.passiveIncome
          const remaining = Math.max(0, target - progressValue)
          const progressPct = Math.min(progressValue / target, 1)
          const dreamTurnsRemaining = player.isOnBigCircle && dream
            ? getForwardTrackDistance(player.bigPosition ?? 0, getBigCircleDreamCell(Number(dream.id)), 48)
            : null
          const isSelected = player.playerId === selectedPlayerId
          const isCurrent = player.playerId === currentPlayerId

          return (
            <button
              key={player.playerId}
              type="button"
              className={isCurrent ? styles.playerCardActive : styles.playerCard}
              aria-pressed={isSelected}
              onClick={() => onSelectPlayer(player.playerId)}
            >
              {isCurrent && <span className={styles.currentPlayerLabel}>Сейчас ходит</span>}
              <span className={styles.playerCardBody}>
                <span className={styles.playerCardHeader}>
                  <span className={styles.playerCardIdentity}>
                    <span className={styles.playerNameLine}>
                      <strong style={{ color: player.color }}>{player.displayName || 'Игрок'}</strong>
                      <em className={styles.playerColorMark} style={{ background: player.color }}>
                        <img src={sparkleIcon} alt="" />
                      </em>
                    </span>
                    <span className={styles.playerRoleLine}>
                      <span>{roleData[player.roleId]?.name ?? player.roleId}</span>
                      <span>{roundNumber} ход</span>
                    </span>
                    <span className={styles.playerSalary}>
                      {player.isOnBigCircle ? 'Текущий поток' : 'Зарплата'}
                      <b>{formatMoney(player.isOnBigCircle ? bigCircleCurrentCashFlow : financials.salary)}</b>
                    </span>
                  </span>
                  <span className={styles.playerCash}>
                    <strong>{formatMoney(player.cash ?? 0)}</strong>
                    <span>Налички</span>
                  </span>
                </span>

                <span className={styles.playerFinancials}>
                  <span className={styles.playerProgressBlock}>
                    <span>{player.isOnBigCircle ? 'До победы вам осталось' : 'До выхода на большой круг'}</span>
                    <span className={styles.playerProgressTrack}>
                      <span className={styles.playerProgressFill} style={{ width: `${progressPct * 100}%` }} />
                      <strong className={styles.playerProgressValue}>{formatMoney(remaining)}</strong>
                      <strong
                        className={styles.playerProgressValueFilled}
                        style={{ clipPath: `inset(0 ${100 - progressPct * 100}% 0 0)` }}
                      >
                        {formatMoney(remaining)}
                      </strong>
                    </span>
                  </span>

                  {dream && (
                    <span className={styles.playerDreamDetails}>
                      <span>Мечта: {dream.title}</span>
                      {dreamTurnsRemaining != null && (
                        <strong>До мечты: {dreamTurnsRemaining} {getTurnWord(dreamTurnsRemaining)}</strong>
                      )}
                    </span>
                  )}

                  {player.isOnBigCircle ? (
                    <span className={`${styles.playerMiniStats} ${styles.playerMiniStatsBig}`}>
                      <span className={styles.playerStatStart}>
                        <small>Нач. поток</small>
                        <b>{formatMoney(bigCircleStartingCashFlow)}</b>
                      </span>
                      <span className={styles.playerStatGrowth}>
                        <small>Прирост</small>
                        <b>{formatDelta(bigCircleCashFlowGrowth)}</b>
                      </span>
                      <span className={styles.playerStatCurrent}>
                        <small>Тек. поток</small>
                        <b>{formatMoney(bigCircleCurrentCashFlow)}</b>
                      </span>
                    </span>
                  ) : (
                    <span className={styles.playerMiniStats}>
                      <span>
                        <small>Пассив</small>
                        <b>{formatMoney(financials.passiveIncome)}</b>
                      </span>
                      <span>
                        <small>Денеж. поток</small>
                        <b>{formatMoney(financials.cashFlow)}</b>
                      </span>
                      <span>
                        <small>Расходы</small>
                        <b>{formatDelta(-(player.expenses ?? 0))}</b>
                      </span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getPlayerFinancials(player: any) {
  const passiveIncome = (player.assets ?? [])
    .reduce((sum: number, asset: any) => sum + (asset.cashFlow ?? 0), 0)
  const salary = Math.max(0, (player.income ?? 0) - passiveIncome)

  return {
    salary,
    passiveIncome,
    cashFlow: salary + passiveIncome - (player.expenses ?? 0),
  }
}

function buildPendingDecisionEventCard(
  decision: NonNullable<GameState['pendingDecision']>,
  activeEventCard: EventCardData | null,
  player?: any,
  snapshotEventCard?: EventCardData | null,
): EventCardData {
  const matchingActiveEventCard = activeEventCard
    && activeEventCard.sectorType === decision.sectorType
    && (!player?.displayName || activeEventCard.playerName === player.displayName)
    ? activeEventCard
    : null
  const sourceEventCard = matchingActiveEventCard ?? snapshotEventCard
  const availableOptions = (decision.decisionOptions ?? [])
    .filter(option => option.option !== 'skip')
  const optionDescription = availableOptions
    .map(option => [option.title, option.description].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('\n\n')

  return {
    id: `pending:${decision.playerId}:${decision.createdAt ?? ''}`,
    sectorType: decision.sectorType,
    sectorLabel: decision.sectorLabel,
    title: sourceEventCard?.title || availableOptions[0]?.title || getFallbackEventTitle(decision.sectorType, decision.sectorLabel),
    description: sourceEventCard?.description || optionDescription || 'Событие требует решения другого игрока.',
    playerName: player?.displayName ?? 'Игрок',
    playerColor: player?.color ?? '#7776dc',
    diceLabel: sourceEventCard?.diceLabel,
    cashChange: sourceEventCard?.cashChange,
    incomeChange: sourceEventCard?.incomeChange,
    expensesChange: sourceEventCard?.expensesChange,
    newCash: sourceEventCard?.newCash,
  }
}

function getStartingCapital(assets: Array<{ name: string; amount: number }>): number {
  const capital = assets.find(item => {
    const name = item.name.toLowerCase()
    return name.includes('сбереж') || name.includes('старт')
  })

  return capital?.amount ?? 0
}

function buildAssetCategories(assets: any[], liabilities: any[]) {
  const categories = []

  if (assets.length > 0) {
    categories.push({
      title: 'Активы',
      summary: {
        count: `${assets.length}`,
        totalValue: formatMoney(assets.reduce((sum, item) => sum + (item.cost ?? 0), 0)),
      },
      itemCount: assets.length,
      rows: [
        { label: 'Название', values: assets.map(item => item.title ?? 'Актив') },
        { label: 'Стоимость', values: assets.map(item => formatMoney(item.cost ?? 0)) },
        { label: 'Доход', values: assets.map(item => formatMoney(item.cashFlow ?? 0)) },
      ],
    })
  }

  if (liabilities.length > 0) {
    categories.push({
      title: 'Пассивы',
      summary: {
        count: `${liabilities.length}`,
        totalValue: formatMoney(liabilities.reduce((sum, item) => sum + (item.payment ?? 0), 0)),
      },
      itemCount: liabilities.length,
      rows: [
        { label: 'Название', values: liabilities.map(item => item.title ?? 'Пассив') },
        { label: 'Платёж', values: liabilities.map(item => formatMoney(item.payment ?? 0)) },
        { label: 'Баланс', values: liabilities.map(item => formatMoney(item.balance ?? 0)) },
      ],
    })
  }

  return categories
}

function getEventTone(type: string, dealType = ''): 'deal' | 'market' | 'negative' | 'salary' | 'expense' | 'misc' | 'dream' {
  const normalizedType = type.toLowerCase()
  if (normalizedType.startsWith('speed')) {
    switch (getSpeedTrackTone(type, dealType)) {
      case 'green': return 'deal'
      case 'purple': return 'expense'
      case 'pink': return 'dream'
      case 'orange': return 'salary'
    }
  }
  if (normalizedType.includes('deal')) return 'deal'
  if (normalizedType.includes('market')) return 'market'
  if (normalizedType.includes('expense')) return 'expense'
  if (normalizedType.includes('dream')) return 'dream'

  switch (type) {
    case 'deal':
      return 'deal'
    case 'market':
    case 'shop':
      return 'market'
    case 'negative':
    case 'skip':
      return 'negative'
    case 'salary':
    case 'payday':
      return 'salary'
    case 'dream':
      return 'dream'
    case 'child':
    case 'charity':
    case 'other':
    default:
      return 'misc'
  }
}

function getEventCardBackground(type: string, dealType = ''): string {
  return {
    deal: 'linear-gradient(225deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 100%), #4b9100',
    market: 'linear-gradient(225deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%), #007aff',
    negative: 'linear-gradient(225deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 100%), #3a3a3c',
    salary: 'linear-gradient(225deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%), #ff9500',
    expense: 'linear-gradient(225deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%), #8e44ad',
    misc: 'linear-gradient(225deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%), #af52de',
    dream: 'linear-gradient(225deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 100%), #ff2dc8',
  }[getEventTone(type, dealType)]
}

function cardSnapshotToEventCard(
  card: FinGuruCardSnapshot,
  players: GameState['players'],
  primaryPlayerId: string,
): EventCardData {
  const player = players.find(item => item.playerId === primaryPlayerId)
  const details = [
    card.cost > 0 ? `Цена: ${formatMoney(card.cost)}` : '',
    card.cashFlow !== 0 ? `Денежный поток: ${formatDelta(card.cashFlow)}` : '',
    card.assetValue > 0 ? `Стоимость актива: ${formatMoney(card.assetValue)}` : '',
    card.liabilityValue > 0 ? `Обязательство: ${formatMoney(card.liabilityValue)}` : '',
    card.saleRange ? `Продажа: ${card.saleRange}` : '',
  ].filter(Boolean)

  return {
    id: `ack:${card.cardId}`,
    sectorType: card.cardType || card.dealType || 'other',
    sectorLabel: getFallbackEventTitle(card.cardType || card.dealType || 'other', card.dealType),
    dealType: card.dealType,
    title: card.title || 'Карточка',
    description: [card.description, ...details].filter(Boolean).join('\n\n'),
    playerName: player?.displayName ?? 'Игрок',
    playerColor: player?.color ?? '#7776dc',
  }
}

function historyCardToEventCard(card: DealCardData): EventCardData {
  const sectorType = card.sectorType || card.cardType || card.dealType || 'other'
  return {
    id: `history:${card.title}`,
    sectorType,
    sectorLabel: card.sectorLabel || getFallbackEventTitle(sectorType, card.dealType ?? ''),
    dealType: card.dealType,
    title: card.title || 'Карточка',
    description: [card.description, card.price ? `Цена: ${card.price}` : ''].filter(Boolean).join('\n\n'),
    playerName: 'История хода',
    playerColor: '#7776dc',
  }
}

function isStockOption(option: DecisionOption): boolean {
  return option.dealType.toLowerCase().includes('акци')
}

function getFallbackEventTitle(type: string, label: string): string {
  if (label) return label

  switch (type) {
    case 'salary':
    case 'payday':
      return 'Зарплата'
    case 'deal':
      return 'Сделка'
    case 'market':
    case 'shop':
      return 'Рынок'
    case 'negative':
      return 'Неприятность'
    case 'child':
      return 'Ребёнок'
    case 'charity':
      return 'Благотворительность'
    case 'dream':
      return 'Мечта'
    case 'skip':
      return 'Пропуск хода'
    case 'other':
    default:
      return 'Всякая всячина'
  }
}

function getFallbackEventMessage(result: DiceRollResult): string {
  if (result.total <= 0) return 'Игрок пропускает ход.'
  if ((result.cashChange ?? 0) !== 0) return `Изменение наличных: ${formatDelta(result.cashChange ?? 0)}.`
  if (result.requiresDecision || result.pendingDecision) return 'Событие требует решения. Выберите вариант действия.'
  return 'Игрок перемещается на выпавшее поле и применяет событие карточки.'
}

function getSectorColor(type: string): string {
  switch (type) {
    case 'salary': return 'rgb(255, 151, 5)'
    case 'deal': return 'rgb(52, 199, 89)'
    case 'shop': return 'rgb(7, 124, 255)'
    case 'negative': return 'rgb(96, 96, 96)'
    case 'child': return 'rgb(255, 54, 200)'
    case 'charity': return 'rgb(255, 53, 92)'
    case 'other': return 'rgb(255, 53, 92)'
    case 'skip': return 'rgb(142, 142, 147)'
    default: return 'rgb(60, 60, 67)'
  }
}

function formatMoney(value: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function formatDelta(value: number): string {
  if (value > 0) return `+${formatMoney(value)}`
  if (value < 0) return `-${formatMoney(Math.abs(value))}`
  return '0 ₽'
}

function mapServerHistory(entries: FinGuruHistoryEntry[] = []) {
  return sortHistoryByTurn(entries)
    .map(entry => ({
    key: entry.id,
    turnNumber: entry.turnNumber,
    playerName: entry.playerName || entry.playerId,
    playerColor: entry.playerColor || '#999',
    moveLabel: entry.title || 'Действие',
    time: new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    transactionType: entry.title || getFallbackEventTitle(entry.eventType, ''),
    transactionTypeColor: getSectorColor(entry.eventType),
    action: entry.message,
    actionColor: entry.eventType === 'skip' ? 'rgb(255, 59, 48)' : 'rgb(52, 199, 89)',
    card: entry.card ? {
      title: entry.card.title || 'Карточка',
      description: entry.card.description,
      price: formatHistoryCardPrice(entry.card),
      sectorType: entry.card.sectorType,
      sectorLabel: entry.card.sectorLabel,
      background: getEventCardBackground(
        entry.card.sectorType || entry.card.cardType || entry.card.dealType || 'other',
        entry.card.dealType,
      ),
      cardType: entry.card.cardType,
      dealType: entry.card.dealType,
      cost: entry.card.cost,
      cashFlow: entry.card.cashFlow,
      assetValue: entry.card.assetValue,
      liabilityValue: entry.card.liabilityValue,
      offerPrice: entry.card.offerPrice,
      saleRange: entry.card.saleRange,
      logic: entry.card.logic,
    } : undefined,
    finances: [
      entry.cashChange !== 0 ? {
        label: 'Наличные',
        change: formatDelta(entry.cashChange),
        changeColor: entry.cashChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
        result: formatMoney(entry.newCash),
        resultColor: 'rgb(0, 0, 0)',
      } : null,
      entry.incomeChange !== 0 ? {
        label: 'Доход',
        change: formatDelta(entry.incomeChange),
        changeColor: entry.incomeChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
        result: formatMoney(entry.newIncome),
        resultColor: 'rgb(0, 0, 0)',
      } : null,
      entry.expensesChange !== 0 ? {
        label: 'Расходы',
        change: formatDelta(entry.expensesChange),
        changeColor: entry.expensesChange <= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
        result: formatMoney(entry.newExpenses),
        resultColor: 'rgb(0, 0, 0)',
      } : null,
    ].filter(Boolean),
    }))
}

function formatHistoryCardPrice(card: FinGuruCardSnapshot): string {
  const price = card.offerPrice || card.cost || card.assetValue
  return price > 0 ? formatMoney(price) : ''
}

function getPlayerPositions(players: GameState['players']) {
  return Object.fromEntries(players.map(player => [
    player.playerId,
    { position: player.position, bigPosition: player.bigPosition ?? 0 },
  ]))
}

function getStatusMessage(state: GameState, playerId: string): string {
  if (state.phase === 'gameOver') return 'Игра завершена'
  if (state.phase === 'dreamSelection') return 'Выбор мечт'
  if (state.phase === 'awaitingCardClose') {
    const acknowledgement = state.pendingCardAcknowledgement
    if (acknowledgement?.closedPlayerIds.includes(playerId)) return 'Карточка закрыта, ждём остальных'
    return 'Закройте карточку'
  }
  if (state.phase === 'awaitingDecision') {
    if (state.pendingDecision?.decisionType === 'dealPublicOffer') {
      if (state.pendingDecision.declinedPlayerIds.includes(playerId)) return 'Вы отказались, ждём остальных'
      return 'Сделка доступна всем'
    }
    const hasSharedDecision = Object.prototype.hasOwnProperty.call(state.pendingDecision?.playerDecisionOptions ?? {}, playerId)
    const sharedCompleted = state.pendingDecision?.completedPlayerIds?.includes(playerId)
    if (hasSharedDecision && !sharedCompleted) return 'Продайте активы или нажмите «Готово»'
    if (state.pendingDecision?.playerId === playerId && !state.pendingDecision.primaryDecisionCompleted) return 'Выберите действие'
    if (hasSharedDecision && sharedCompleted) return 'Ваш ответ принят, ждём остальных'
    const player = state.players.find(p => p.playerId === state.pendingDecision?.playerId)
    return player ? `Решение принимает ${player.displayName}` : 'Ожидание решения'
  }
  if (state.phase === 'awaitingAuction') {
    const auction = state.pendingAuction
    if (!auction) return 'Идёт аукцион'
    if (auction.sellerPlayerId === playerId) return 'Ваша сделка на аукционе'
    if (auction.currentBidderPlayerId === playerId) return 'Вы лидируете в аукционе'
    if (auction.participantPlayerIds.includes(playerId) && !auction.passedPlayerIds.includes(playerId)) return 'Сделайте ставку или пас'
    return 'Идёт аукцион'
  }
  if (state.currentPlayerId === playerId) return 'Ваш ход'

  const activePlayer = state.players.find(p => p.playerId === state.currentPlayerId)
  return activePlayer ? `Ходит ${activePlayer.displayName}` : 'Ожидание хода'
}

function getTurnWord(count: number): string {
  const absolute = Math.abs(count) % 100
  const remainder = absolute % 10
  if (absolute > 10 && absolute < 20) return 'ходов'
  if (remainder === 1) return 'ход'
  if (remainder >= 2 && remainder <= 4) return 'хода'
  return 'ходов'
}
