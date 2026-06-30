import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Dashboard from '../components/Dashboard'
import GameBoard from '../components/GameBoard'
import MoveHistory from '../components/MoveHistory'
import { icons, roleData } from '../data/roles'
import smallDealImage from '../components/dealSelection/deal-small.svg'
import bigDealImage from '../components/dealSelection/deal-big.svg'
import {
  getSdk,
  getGameState,
  rollDice,
  subscribeDiceRoll,
  subscribeGameStateUpdate,
  subscribeGameError,
  subscribeCellResolved,
  resolveCellAction,
  payLiability,
  getBoard,
  getDeals,
  getAssets,
  takeCredit,
  claimSalary,
  placeAuctionBid,
  passAuction,
  completeAuction,
  type GameState,
  type DecisionOption,
  type FinGuruAuctionState,
  type DiceRollResult,
  type CellResolvedEvent,
} from '../sdk'
import styles from './GamePage.module.css'

const MIN_DICE_ANIMATION_MS = 900

interface EventCardData {
  id: string
  sectorType: string
  sectorLabel: string
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

export default function GamePage() {
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  const { currentPlayerId: contextPlayerId } = useGame()

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') ?? sessionStorage.getItem('roomId') ?? ''
  const sdkPlayerId = params.get('playerId') ?? sessionStorage.getItem('playerId') ?? contextPlayerId ?? ''

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myColor, setMyColor] = useState<string>('#4CAF50')
  const [moveHistory, setMoveHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'small' | 'big'>('small')
  const [rightPanelTab, setRightPanelTab] = useState<'players' | 'history'>('players')
  const [mobileView, setMobileView] = useState<'profile' | 'small' | 'big' | 'players' | 'history'>('profile')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [isResolvingDecision, setIsResolvingDecision] = useState(false)
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ждем состояние игры...')
  const [board, setBoard] = useState<any[] | null>(null)
  const [deals, setDeals] = useState<any[] | null>(null)
  const [assets, setAssets] = useState<any[] | null>(null)
  const [activeEventCard, setActiveEventCard] = useState<EventCardData | null>(null)
  const rollTimeoutRef = useRef<number | null>(null)
  const rollStartedAtRef = useRef<number>(0)
  const decisionTimeoutRef = useRef<number | null>(null)

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

  useEffect(() => {
    if (!roomId) return
    const sdk = getSdk()

    getGameState(sdk, roomId).then(state => {
      if (!state) return
      setGameState(state)
      setStatusMessage(getStatusMessage(state, sdkPlayerId))

      const me = state.players.find(p => p.playerId === sdkPlayerId)
      if (me) setMyColor(me.color)
    })

    Promise.all([getBoard(sdk, roomId), getDeals(sdk, roomId), getAssets(sdk, roomId)])
      .then(([b, d, a]) => {
        if (b) setBoard(b)
        if (d) setDeals(d)
        if (a) setAssets(a)
      })
      .catch(() => {})
  }, [roomId, sdkPlayerId])

  useEffect(() => {
    if (!roomId) return
    const sdk = getSdk()

    const unsubState = subscribeGameStateUpdate(sdk, roomId, (state) => {
      setGameState(state)
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
            pendingAuction: prev.pendingAuction,
            winners: result.winners ?? prev.winners,
            finalResults: result.finalResults ?? prev.finalResults,
            settings: result.settings ?? prev.settings,
          }
        })

        const me = result.players.find(p => p.playerId === sdkPlayerId)
        if (me) setMyColor(me.color)

        const rolledPlayer = result.players.find(p => p.playerId === result.rolledBy)
        const rollDiceValues = result.diceValues?.length
          ? result.diceValues
          : [result.dice1, result.dice2].filter(Boolean)
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

        setIsRolling(false)
      }

      const elapsed = Date.now() - rollStartedAtRef.current
      const remaining = Math.max(0, MIN_DICE_ANIMATION_MS - elapsed)
      if (remaining > 0) {
        rollTimeoutRef.current = window.setTimeout(applyRollResult, remaining)
      } else {
        applyRollResult()
      }
    })

    const unsubCellResolved = subscribeCellResolved(sdk, roomId, (event: CellResolvedEvent) => {
      clearDecisionTimeout()
      setIsResolvingDecision(false)

      if (event.state) {
        setGameState(event.state)
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
    })

    const unsubError = subscribeGameError(sdk, roomId, (message) => {
      clearRollTimeout()
      clearDecisionTimeout()
      setIsRolling(false)
      setIsResolvingDecision(false)
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
  }, [roomId, sdkPlayerId, clearRollTimeout, clearDecisionTimeout])

  useEffect(() => {
    const me = gameState?.players.find(p => p.playerId === sdkPlayerId)
    if (!me) return

    const nextCircle = me.isOnBigCircle ? 'big' : 'small'
    setActiveTab(nextCircle)
    setMobileView(view => (view === 'small' || view === 'big') ? nextCircle : view)
  }, [gameState, sdkPlayerId])

  const handleRollDice = useCallback(() => {
    if (isRolling || !roomId || !sdkPlayerId) return

    clearRollTimeout()
    rollStartedAtRef.current = Date.now()
    setIsRolling(true)
    setStatusMessage('Бросаем кубики...')

    const sdk = getSdk()
    const diceCount = gameState?.settings?.diceCount === 1 ? 1 : 2
    rollDice(sdk, roomId, sdkPlayerId, diceCount)

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
    if (action === 'skip' || option === 'skip') {
      resolveCellAction(sdk, roomId, sdkPlayerId, 'skip', option, quantity, offerPrice)
      return
    }
    if (action === 'chooseDealDeck') {
      resolveCellAction(sdk, roomId, sdkPlayerId, 'chooseDealDeck', option, quantity, offerPrice)
      return
    }
    resolveCellAction(sdk, roomId, sdkPlayerId, action ?? 'buyDeal', option, quantity, offerPrice)
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handlePayLiability = useCallback((liabilityId: string) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    payLiability(getSdk(), roomId, sdkPlayerId, liabilityId)
  }, [roomId, sdkPlayerId, isResolvingDecision])

  const handleTakeCredit = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    takeCredit(getSdk(), roomId, sdkPlayerId)
  }, [roomId, sdkPlayerId, isResolvingDecision])

  const handleClaimSalary = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    claimSalary(getSdk(), roomId, sdkPlayerId)
  }, [roomId, sdkPlayerId, isResolvingDecision])

  const handleAuctionBid = useCallback((bid: number) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)
    placeAuctionBid(getSdk(), roomId, sdkPlayerId, bid)
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handleAuctionPass = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)
    passAuction(getSdk(), roomId, sdkPlayerId)
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handleAuctionComplete = useCallback(() => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)
    completeAuction(getSdk(), roomId, sdkPlayerId)
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  if (!data) return <p>Роль не найдена</p>

  const me = gameState?.players.find(p => p.playerId === sdkPlayerId)
  const serverDreams = gameState?.dreams ?? []
  const myDream = me?.dreamId != null ? serverDreams.find((d: any) => d.id === me.dreamId) ?? null : null

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
    cellIndex: p.position,
    name: p.displayName,
  }))

  const bigSectorPlayers = (gameState?.players ?? [])
    .filter(p => p.isOnBigCircle)
    .map(p => ({
      id: p.playerId,
      color: p.color,
      letter: p.displayName.charAt(0).toUpperCase(),
      cellIndex: p.bigPosition ?? 0,
      name: p.displayName,
    }))

  const bigSectorDreams = (gameState?.players ?? [])
    .filter(p => p.dreamId != null)
    .map(p => {
      const dreamIndex = (p.dreamId! - 1) % 7
      const cellIndex = (dreamIndex * 7) % 48
      return {
        cellIndex,
        playerName: p.displayName,
        color: p.color,
      }
    })

  const isGameOver = gameState?.phase === 'gameOver'
  const gamePlayers = gameState?.players ?? []
  const inspectedPlayerId = selectedPlayerId && gamePlayers.some(player => player.playerId === selectedPlayerId)
    ? selectedPlayerId
    : (gamePlayers.some(player => player.playerId === sdkPlayerId) ? sdkPlayerId : gamePlayers[0]?.playerId)
  const pendingDecision = gameState?.pendingDecision ?? null
  const pendingAuction = gameState?.pendingAuction ?? null
  const publicOfferOption = pendingDecision?.decisionType === 'dealPublicOffer'
    ? pendingDecision.decisionOptions?.find(option => option.action === 'acceptDealOffer')
    : undefined
  const isPublicOfferVisible = pendingDecision?.decisionType === 'dealPublicOffer' && publicOfferOption
  const myPendingDecision = pendingDecision?.playerId === sdkPlayerId || isPublicOfferVisible
    ? pendingDecision
    : null
  const readOnlyPendingDecision = pendingDecision && pendingDecision.playerId !== sdkPlayerId && !isPublicOfferVisible
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
    ? buildPendingDecisionEventCard(readOnlyPendingDecision, activeEventCard, readOnlyPendingPlayer)
    : null
  const readOnlyEventCard = activeEventCard && !myPendingDecision && !readOnlyPendingDecision && !pendingAuction ? activeEventCard : null
  const isChoosingDealDeck = myPendingDecision?.decisionOptions?.some(option => option.action === 'chooseDealDeck') ?? false
  const isDealCardDecision = myPendingDecision?.decisionType === 'dealCard'
    || myPendingDecision?.decisionType === 'dealOffer'
    || myPendingDecision?.decisionType === 'dealPublicOffer'
  const dealCardOption = myPendingDecision?.decisionOptions?.find(option => option.action === 'buyDeal' || option.action === 'acceptDealOffer')
  const isMyTurn = gameState?.phase === 'playing' && gameState.currentPlayerId === sdkPlayerId
  const activePlayer = gameState?.players.find(p => p.playerId === gameState.currentPlayerId)
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
      label: 'Пропуск хода',
      description: skipTurnsRemaining === 1
        ? 'Остался 1 пропуск'
        : `Осталось пропусков: ${skipTurnsRemaining}`,
      bgColor: 'rgba(255, 59, 48, 0.14)',
    }] : []),
    ...(charityDiceTurnsRemaining > 0 ? [{
      label: '3 кубика',
      description: charityDiceTurnsRemaining === 1
        ? 'Остался 1 усиленный бросок'
        : `Осталось бросков: ${charityDiceTurnsRemaining}`,
      bgColor: 'rgba(52, 199, 89, 0.16)',
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
  const lastRollLabel = lastRoll
    ? lastRoll.total > 0
      ? `${(lastRoll.diceValues?.length ? lastRoll.diceValues : [lastRoll.dice1, lastRoll.dice2].filter(Boolean)).join('+')} = ${lastRoll.total} | ${lastRoll.sectorLabel}`
      : lastRoll.sectorLabel
    : undefined
  const rollButtonLabel = isRolling
    ? 'Бросаем...'
    : isGameOver
      ? 'Игра завершена'
      : isMyTurn
        ? activeDiceCount > 2 ? 'Бросить 3 кубика' : activeDiceCount === 1 ? 'Бросить 1 кубик' : 'Бросить кубики'
        : activePlayer
          ? `Ходит ${activePlayer.displayName}`
          : 'Ожидание'

  const handleMobileViewChange = useCallback((view: 'profile' | 'small' | 'big' | 'players' | 'history') => {
    const nextView = view === 'small' || view === 'big' ? visibleCircle : view
    setMobileView(nextView)
    if (nextView === 'small' || nextView === 'big') setActiveTab(visibleCircle)
    if (nextView === 'players' || nextView === 'history') setRightPanelTab(nextView)
  }, [visibleCircle])

  return (
    <div className={`${styles.gamePage} ${styles[`mobileView_${mobileView}`]}`}>
      <div className={styles.dashboardColumn}>
        <Dashboard
          playerName={dashboardPlayer.displayName}
          playerRole={data.name}
          moveNumber={gameState?.turnCount ?? 0}
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
          disabled={isResolvingDecision || gameState?.phase === 'gameOver'}
          accruedSalary={dashboardPlayer.accruedSalary ?? 0}
          salaryPayoutMode={salaryPayoutMode}
          onPayLiability={handlePayLiability}
          onTakeCredit={handleTakeCredit}
          onClaimSalary={handleClaimSalary}
          icon={icons[`/src/assets/roles/${roleName}.svg`]}
        />
      </div>

      <div className={styles.boardColumn}>
        <div className={styles.turnPanel}>
          <span className={styles.turnEyebrow}>
            Круг {gameState?.currentRound ?? 0}
          </span>
          <strong>{statusMessage}</strong>
          {myDream && (
            <span className={styles.turnHint}>
              Мечта: {myDream.title} | {formatMoney(myDream.price)}
            </span>
          )}
        </div>

        <GameBoard
          players={visibleCircle === 'small' ? boardPlayers : []}
          bigSectorPlayers={visibleCircle === 'big' ? bigSectorPlayers : []}
          bigSectorDreams={visibleCircle === 'big' ? bigSectorDreams : []}
          currentPlayerId={isMyTurn ? sdkPlayerId : undefined}
          isRolling={isRolling}
          diceCount={activeDiceCount}
          diceValues={lastRoll?.diceValues ?? []}
          lastRollLabel={lastRollLabel}
          rollButtonLabel={rollButtonLabel}
          activeTab={activeTab}
          visibleCircle={visibleCircle}
          onTabChange={setActiveTab}
          onRollDice={isMyTurn && !isRolling ? handleRollDice : undefined}
          // @ts-ignore
          boardConfig={board}
          // @ts-ignore
          deals={deals}
          // @ts-ignore
          assets={assets}
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
            currentPlayerId={gameState?.currentPlayerId ?? ''}
            selectedPlayerId={inspectedPlayerId ?? ''}
            dreams={gameState?.dreams ?? []}
            onSelectPlayer={setSelectedPlayerId}
          />
        ) : (
          <MoveHistory
            title="История ходов"
            entries={moveHistory}
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

      {readOnlyEventCard && (
        <div className={styles.actionOverlay}>
          <EventCard
            card={readOnlyEventCard}
            onClose={() => setActiveEventCard(null)}
          />
        </div>
      )}

      {readOnlyPendingDecision && (
        <div className={styles.actionOverlay}>
          <div className={`${styles.actionModal} ${styles.dealActionModal}`}>
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
              />
            ) : readOnlyPendingEventCard ? (
              <EventCard card={readOnlyPendingEventCard} hideActions />
            ) : null}
          </div>
        </div>
      )}

      {pendingAuction && (
        <div className={styles.actionOverlay}>
          <AuctionCard
            auction={pendingAuction}
            players={gamePlayers}
            currentPlayerId={sdkPlayerId}
            cash={dashboardPlayer.cash}
            disabled={isResolvingDecision}
            onBid={handleAuctionBid}
            onPass={handleAuctionPass}
            onComplete={handleAuctionComplete}
          />
        </div>
      )}

      {myPendingDecision && (
        <div className={styles.actionOverlay}>
          <div className={`${styles.actionModal} ${isDealCardDecision || isChoosingDealDeck || myPendingDecision ? styles.dealActionModal : ''}`}>
            {isDealCardDecision && dealCardOption ? (
              <DealDecisionCard
                option={dealCardOption}
                cash={dashboardPlayer.cash}
                players={gamePlayers}
                currentPlayerId={sdkPlayerId}
                isOffer={myPendingDecision.decisionType === 'dealOffer' || myPendingDecision.decisionType === 'dealPublicOffer'}
                isPublicOffer={myPendingDecision.decisionType === 'dealPublicOffer'}
                disabled={isResolvingDecision}
                onAccept={(quantity) => handleDecisionAction(dealCardOption.option, dealCardOption.action, quantity)}
                onSell={(offerPrice) => handleDecisionAction(dealCardOption.option, 'sellDeal', undefined, offerPrice)}
                onAuction={() => handleDecisionAction('auction', 'auctionDeal')}
                onSkip={() => handleDecisionAction('skip', 'skip')}
              />
            ) : isChoosingDealDeck ? (
              <DealDeckChoice
                disabled={isResolvingDecision}
                onChoose={(option) => handleDecisionAction(option, 'chooseDealDeck')}
              />
            ) : (
              <EventCard
                card={{
                  id: `decision:${myPendingDecision.playerId}:${myPendingDecision.createdAt ?? ''}`,
                  sectorType: myPendingDecision.sectorType,
                  sectorLabel: myPendingDecision.sectorLabel,
                  title: activeEventCard?.title || getFallbackEventTitle(myPendingDecision.sectorType, myPendingDecision.sectorLabel),
                  description: activeEventCard?.description || 'Событие требует решения. Выберите вариант, чтобы передать ход дальше.',
                  playerName: dashboardPlayer.displayName,
                  playerColor: dashboardPlayer.color,
                  diceLabel: activeEventCard?.diceLabel,
                  cashChange: activeEventCard?.cashChange,
                  newCash: activeEventCard?.newCash,
                }}
                actions={
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
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({
  card,
  actions,
  hideActions = false,
  onClose,
}: {
  card: EventCardData
  actions?: ReactNode
  hideActions?: boolean
  onClose?: () => void
}) {
  const toneClass = styles[`eventCard_${getEventTone(card.sectorType)}`]
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
            Понятно
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

function DealDecisionCard({
  option,
  cash,
  players,
  currentPlayerId,
  isOffer,
  isPublicOffer,
  disabled,
  readOnly = false,
  onAccept,
  onSell,
  onAuction,
  onSkip,
}: {
  option: DecisionOption
  cash: number
  players: any[]
  currentPlayerId: string
  isOffer: boolean
  isPublicOffer: boolean
  disabled: boolean
  readOnly?: boolean
  onAccept?: (quantity?: number) => void
  onSell?: (offerPrice: number) => void
  onAuction?: () => void
  onSkip?: () => void
}) {
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
  const canAcceptOffer = !isOwnPublicOffer
  const cardClass = isBigDeal ? styles.dealDecisionCardBig : styles.dealDecisionCardSmall
  const meta = [option.cardId, option.dealType, option.ticker].filter(Boolean).join(' · ')
  const details = [
    isOffer && offerPrice > 0 ? { label: 'Цена права', value: formatMoney(offerPrice) } : null,
    isStockDeal ? { label: 'Количество', value: `${purchaseQuantity} шт.` } : null,
    isStockDeal ? { label: 'Цена за акцию', value: formatMoney(option.cost) } : null,
    option.assetValue > 0 ? { label: 'Стоимость актива', value: formatMoney(isStockDeal ? purchaseAssetValue : option.assetValue) } : null,
    option.liabilityValue > 0 ? { label: 'Пассив / ипотека', value: formatMoney(option.liabilityValue) } : null,
    option.cashFlow !== 0 ? { label: 'Денежный поток', value: formatDelta(isStockDeal ? purchaseCashFlow : option.cashFlow), accent: option.cashFlow > 0 ? 'positive' : 'negative' } : null,
    option.roi ? { label: 'ROI', value: option.roi } : null,
    option.saleRange ? { label: 'Диапазон продажи', value: option.saleRange } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; accent?: 'positive' | 'negative' }>

  return (
    <div className={`${styles.dealDecisionCard} ${cardClass}`}>
      <div className={styles.dealDecisionMain}>
        <div className={styles.dealDecisionContent}>
          {meta && <span className={styles.dealDecisionMeta}>{meta}</span>}
          <h2 className={styles.dealDecisionTitle}>{option.title}</h2>
          <p className={styles.dealDecisionDescription}>{option.description}</p>
        </div>

        <div className={styles.dealDecisionDetails}>
          <div className={styles.dealDecisionHeader}>
            <span>{isStockDeal ? 'Итого' : 'Взнос'}</span>
            <strong>{formatMoney(totalCost)}</strong>
          </div>
          {details.map(detail => (
            <div className={styles.dealDecisionRow} key={detail.label}>
              <span>{detail.label}</span>
              <strong className={detail.accent === 'negative' ? styles.dealDecisionNegative : detail.accent === 'positive' ? styles.dealDecisionPositive : undefined}>
                {detail.value}
              </strong>
            </div>
          ))}
          {!readOnly && cannotAfford && (
            <div className={styles.dealDecisionWarning}>
              Не хватает {formatMoney(totalCost - cash)}
            </div>
          )}
          {!isOffer && isRealEstate && (
            <div className={styles.dealDecisionNote}>
              Недвижимость может купить только игрок, которому выпала карта.
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
      <div className={styles.dealDecisionActions}>
        {isStockDeal && canAcceptOffer && (
          <div className={styles.stockQuantityControl}>
            <span>
              <b>{purchaseQuantity}</b>
              акций
            </span>
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
        <button className={styles.dealDecisionButton} onClick={() => onAccept?.(isStockDeal ? purchaseQuantity : undefined)} disabled={disabled || cannotAfford || !canAcceptOffer}>
          {isOwnPublicOffer ? 'Ожидаем покупателя' : isOffer ? 'Забрать сделку' : 'Принять'}
        </button>
        {canTrade && (
          <div className={styles.dealTradeControls}>
            <label className={styles.dealSalePrice}>
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
            <button
              className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`}
              onClick={() => onSell?.(salePrice)}
              disabled={disabled}
            >
              Выставить всем
            </button>
            <button
              className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`}
              onClick={() => onAuction?.()}
              disabled={disabled}
            >
              Аукцион
            </button>
          </div>
        )}
        {!isPublicOffer && (
          <button className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`} onClick={() => onSkip?.()} disabled={disabled}>
            {isOffer ? 'Отказаться' : 'Пропустить'}
          </button>
        )}
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
}: {
  auction: FinGuruAuctionState
  players: any[]
  currentPlayerId: string
  cash: number
  disabled: boolean
  onBid: (bid: number) => void
  onPass: () => void
  onComplete: () => void
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

function PlayersPanel({
  players,
  currentPlayerId,
  selectedPlayerId,
  dreams,
  onSelectPlayer,
}: {
  players: any[]
  currentPlayerId: string
  selectedPlayerId: string
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
          const target = Math.max(1, (player.expenses ?? 0) + 1)
          const remaining = Math.max(0, target - financials.passiveIncome)
          const progressPct = Math.min(financials.passiveIncome / target, 1)
          const isSelected = player.playerId === selectedPlayerId
          const isCurrent = player.playerId === currentPlayerId

          return (
            <button
              key={player.playerId}
              type="button"
              className={isSelected ? styles.playerCardActive : styles.playerCard}
              onClick={() => onSelectPlayer(player.playerId)}
            >
              <span className={styles.playerCardHeader}>
                <span className={styles.playerCardIdentity}>
                  <span className={styles.playerNameLine}>
                    <strong style={{ color: player.color }}>{player.displayName || 'Игрок'}</strong>
                    {isCurrent && <em style={{ background: player.color }}>●</em>}
                  </span>
                  <span>{roleData[player.roleId]?.name ?? player.roleId} › {player.isOnBigCircle ? 'Большой круг' : 'Малый круг'}</span>
                  <span>Зарплата <b>{formatMoney(financials.salary)}</b></span>
                </span>
                <span className={styles.playerCash}>
                  <strong>{formatMoney(player.cash ?? 0)}</strong>
                  <span>Налички</span>
                </span>
              </span>

              <span className={styles.playerProgressBlock}>
                <span>До выхода на большой круг</span>
                <span className={styles.playerProgressTrack}>
                  <span style={{ width: `${progressPct * 100}%`, background: player.color }} />
                  <strong>{formatMoney(remaining)}</strong>
                </span>
                {dream && <em>Мечта: {dream.title}</em>}
              </span>

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
): EventCardData {
  const matchingActiveEventCard = activeEventCard
    && activeEventCard.sectorType === decision.sectorType
    && (!player?.displayName || activeEventCard.playerName === player.displayName)
    ? activeEventCard
    : null
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
    title: matchingActiveEventCard?.title || availableOptions[0]?.title || getFallbackEventTitle(decision.sectorType, decision.sectorLabel),
    description: matchingActiveEventCard?.description || optionDescription || 'Событие требует решения другого игрока.',
    playerName: player?.displayName ?? 'Игрок',
    playerColor: player?.color ?? '#7776dc',
    cashChange: matchingActiveEventCard?.cashChange,
    incomeChange: matchingActiveEventCard?.incomeChange,
    expensesChange: matchingActiveEventCard?.expensesChange,
    newCash: matchingActiveEventCard?.newCash,
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

function getEventTone(type: string): 'deal' | 'market' | 'negative' | 'salary' | 'misc' | 'dream' {
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

function getStatusMessage(state: GameState, playerId: string): string {
  if (state.phase === 'gameOver') return 'Игра завершена'
  if (state.phase === 'dreamSelection') return 'Выбор мечт'
  if (state.phase === 'awaitingDecision') {
    if (state.pendingDecision?.decisionType === 'dealPublicOffer') return 'Сделка доступна всем'
    if (state.pendingDecision?.playerId === playerId) return 'Выберите действие'
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
