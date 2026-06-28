import { useState, useEffect, useCallback, useRef } from 'react'
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
  sellAsset,
  payLiability,
  getBoard,
  getDeals,
  getAssets,
  type GameState,
  type DecisionOption,
  type DiceRollResult,
  type CellResolvedEvent,
} from '../sdk'
import styles from './GamePage.module.css'

const MIN_ROLL_ANIMATION_MS = 3000

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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedDiceCount, setSelectedDiceCount] = useState<1 | 2 | 3>(2)
  const [isRolling, setIsRolling] = useState(false)
  const [isResolvingDecision, setIsResolvingDecision] = useState(false)
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ждем состояние игры...')
  const [board, setBoard] = useState<any[] | null>(null)
  const [deals, setDeals] = useState<any[] | null>(null)
  const [assets, setAssets] = useState<any[] | null>(null)
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
            winners: result.winners ?? prev.winners,
            finalResults: result.finalResults ?? prev.finalResults,
          }
        })

        const me = result.players.find(p => p.playerId === sdkPlayerId)
        if (me) setMyColor(me.color)

        const rolledPlayer = result.players.find(p => p.playerId === result.rolledBy)
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
      const remaining = Math.max(0, MIN_ROLL_ANIMATION_MS - elapsed)
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
    if (me?.isOnBigCircle) {
      setActiveTab('big')
    }
  }, [gameState, sdkPlayerId])

  const handleRollDice = useCallback(() => {
    if (isRolling || !roomId || !sdkPlayerId) return

    clearRollTimeout()
    rollStartedAtRef.current = Date.now()
    setIsRolling(true)
    setStatusMessage('Колесо крутится...')

    const sdk = getSdk()
    rollDice(sdk, roomId, sdkPlayerId, selectedDiceCount)

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
  }, [roomId, sdkPlayerId, selectedDiceCount, isRolling, clearRollTimeout])

  const handleDecisionAction = useCallback((option: string, action?: string) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    clearDecisionTimeout()
    setIsResolvingDecision(true)
    decisionTimeoutRef.current = window.setTimeout(() => {
      setIsResolvingDecision(false)
      decisionTimeoutRef.current = null
    }, 8000)

    const sdk = getSdk()
    if (action === 'skip' || option === 'skip') {
      resolveCellAction(sdk, roomId, sdkPlayerId, 'skip', option)
      return
    }
    if (action === 'chooseDealDeck') {
      resolveCellAction(sdk, roomId, sdkPlayerId, 'chooseDealDeck', option)
      return
    }
    resolveCellAction(sdk, roomId, sdkPlayerId, action ?? 'buyDeal', option)
  }, [roomId, sdkPlayerId, isResolvingDecision, clearDecisionTimeout])

  const handleSellAsset = useCallback((assetId: string) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    sellAsset(getSdk(), roomId, sdkPlayerId, assetId)
  }, [roomId, sdkPlayerId, isResolvingDecision])

  const handlePayLiability = useCallback((liabilityId: string) => {
    if (isResolvingDecision || !roomId || !sdkPlayerId) return
    setIsResolvingDecision(true)
    payLiability(getSdk(), roomId, sdkPlayerId, liabilityId)
  }, [roomId, sdkPlayerId, isResolvingDecision])

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
    cash: 0,
    income: data.financialData.income.total,
    expenses: data.financialData.expenses.total,
    position: 0,
    bigPosition: 0,
    isOnBigCircle: false,
    skipNextTurn: false,
    skipTurnsRemaining: 0,
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
  const inspectedPlayer = gamePlayers.find(player => player.playerId === inspectedPlayerId) ?? null
  const myPendingDecision = gameState?.pendingDecision?.playerId === sdkPlayerId
    ? gameState.pendingDecision
    : null
  const isChoosingDealDeck = myPendingDecision?.decisionOptions?.some(option => option.action === 'chooseDealDeck') ?? false
  const isDealCardDecision = myPendingDecision?.decisionType === 'dealCard' || myPendingDecision?.decisionType === 'dealOffer'
  const dealCardOption = myPendingDecision?.decisionOptions?.find(option => option.action === 'buyDeal' || option.action === 'acceptDealOffer')
  const isMyTurn = gameState?.phase === 'playing' && gameState.currentPlayerId === sdkPlayerId
  const activePlayer = gameState?.players.find(p => p.playerId === gameState.currentPlayerId)
  const passiveIncome = (dashboardPlayer.assets ?? [])
    .reduce((sum, asset) => sum + (asset.cashFlow ?? 0), 0)
  const salaryIncome = Math.max(0, dashboardPlayer.income - passiveIncome)
  const cashFlow = salaryIncome + passiveIncome - dashboardPlayer.expenses
  const skipTurnsRemaining = dashboardPlayer.skipTurnsRemaining ?? (dashboardPlayer.skipNextTurn ? 1 : 0)
  const isFinanciallyFree = dashboardPlayer.expenses > 0 && passiveIncome > dashboardPlayer.expenses
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
    ...(myPendingDecision ? [{
      label: 'Нужно решение',
      description: myPendingDecision.sectorLabel || 'Выберите действие',
      bgColor: 'rgba(255, 149, 0, 0.18)',
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
        ? 'Бросить кубик'
        : activePlayer
          ? `Ходит ${activePlayer.displayName}`
          : 'Ожидание'

  return (
    <div className={styles.gamePage}>
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
          goalTarget={dashboardPlayer.expenses}
          progressAmount={passiveIncome}
          statuses={statuses}
          assets={dashboardPlayer.assets ?? []}
          liabilities={dashboardPlayer.liabilities ?? []}
          cash={dashboardPlayer.cash}
          disabled={isResolvingDecision || gameState?.phase === 'gameOver'}
          onSellAsset={handleSellAsset}
          onPayLiability={handlePayLiability}
          icon={icons[`/src/assets/roles/${roleName}.svg`]}
        />
      </div>

      <div className={styles.boardColumn}>
        <div className={styles.turnPanel}>
          <span className={styles.turnEyebrow}>
            Раунд {gameState?.currentRound ?? 0}{gameState?.maxRounds ? ` / ${gameState.maxRounds}` : ''}
          </span>
          <strong>{statusMessage}</strong>
          {myDream && (
            <span className={styles.turnHint}>
              Мечта: {myDream.title} | {formatMoney(myDream.price)}
            </span>
          )}
        </div>

        <GameBoard
          players={boardPlayers}
          bigSectorPlayers={bigSectorPlayers}
          bigSectorDreams={bigSectorDreams}
          currentPlayerId={isMyTurn ? sdkPlayerId : undefined}
          isRolling={isRolling}
          selectedDiceCount={selectedDiceCount}
          diceValues={lastRoll?.diceValues ?? []}
          lastRollLabel={lastRollLabel}
          rollButtonLabel={rollButtonLabel}
          onDiceCountChange={setSelectedDiceCount}
          activeTab={activeTab}
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
            selectedPlayer={inspectedPlayer}
            dreams={gameState?.dreams ?? []}
            turnCount={gameState?.turnCount ?? 0}
            onSelectPlayer={setSelectedPlayerId}
          />
        ) : (
          <MoveHistory
            title="История ходов"
            entries={moveHistory}
          />
        )}
      </div>

      {myPendingDecision && (
        <div className={styles.actionOverlay}>
          <div className={`${styles.actionModal} ${isDealCardDecision || isChoosingDealDeck ? styles.dealActionModal : ''}`}>
            {isDealCardDecision && dealCardOption ? (
              <DealDecisionCard
                option={dealCardOption}
                cash={dashboardPlayer.cash}
                players={gamePlayers}
                currentPlayerId={sdkPlayerId}
                isOffer={myPendingDecision.decisionType === 'dealOffer'}
                disabled={isResolvingDecision}
                onAccept={() => handleDecisionAction(dealCardOption.option, dealCardOption.action)}
                onSellTo={(targetPlayerId) => handleDecisionAction(`sellTo:${targetPlayerId}`, 'sellDeal')}
                onAuction={() => handleDecisionAction('auction', 'auctionDeal')}
                onSkip={() => handleDecisionAction('skip', 'skip')}
              />
            ) : isChoosingDealDeck ? (
              <DealDeckChoice
                disabled={isResolvingDecision}
                onChoose={(option) => handleDecisionAction(option, 'chooseDealDeck')}
              />
            ) : (
              <>
                <span className={styles.actionEyebrow}>{myPendingDecision.sectorLabel}</span>
                <h2>
                  {isChoosingDealDeck
                    ? 'Выберите тип сделки'
                    : myPendingDecision.decisionType === 'deal'
                      ? 'Карта сделки'
                      : 'Выберите действие'}
                </h2>
                <p>
                  {isChoosingDealDeck
                    ? 'Сначала выберите мелкую или крупную сделку. После выбора откроется одна карта из соответствующей колоды.'
                    : myPendingDecision.decisionType === 'deal'
                      ? 'Можно купить открытый актив или сохранить деньги.'
                      : 'Событие требует решения. Выберите вариант и ход перейдёт дальше.'}
                </p>
                <div className={styles.actionGrid}>
                  {(myPendingDecision.decisionOptions ?? [])
                    .filter(option => option.option !== 'skip')
                    .map(option => {
                      const cannotAfford = option.action === 'buyDeal' && option.cost > dashboardPlayer.cash
                      return (
                        <button
                          key={`${option.option}-${option.title}`}
                          onClick={() => handleDecisionAction(option.option, option.action)}
                          disabled={isResolvingDecision || cannotAfford}
                        >
                          <strong>{option.title}</strong>
                          <span>{option.description}</span>
                          {(option.dealType || option.ticker || option.cost > 0 || option.cashFlow !== 0 || option.assetValue > 0 || option.liabilityValue > 0 || option.roi || option.saleRange || option.cashChange !== 0 || option.incomeChange !== 0 || option.expensesChange !== 0) && (
                            <span>
                              {option.cardId ? `${option.cardId} ` : ''}
                              {option.dealType ? `${option.dealType} ` : ''}
                              {option.ticker ? `${option.ticker} ` : ''}
                              {option.cost > 0 ? `Взнос ${formatMoney(option.cost)} ` : ''}
                              {option.assetValue > 0 ? `Актив ${formatMoney(option.assetValue)} ` : ''}
                              {option.liabilityValue > 0 ? `Пассив ${formatMoney(option.liabilityValue)} ` : ''}
                              {option.cashFlow !== 0 ? `Поток ${formatDelta(option.cashFlow)} ` : ''}
                              {option.roi ? `ROI ${option.roi} ` : ''}
                              {option.saleRange ? `Продажа ${option.saleRange} ` : ''}
                              {option.cashChange !== 0 ? `Наличные ${formatDelta(option.cashChange)} ` : ''}
                              {option.incomeChange !== 0 ? `Доход ${formatDelta(option.incomeChange)} ` : ''}
                              {option.expensesChange !== 0 ? `Расходы ${formatDelta(option.expensesChange)}` : ''}
                            </span>
                          )}
                          {cannotAfford && <span>Не хватает {formatMoney(option.cost - dashboardPlayer.cash)}</span>}
                        </button>
                      )
                    })}
                </div>
                <button className={styles.secondaryAction} onClick={() => handleDecisionAction('skip', 'skip')} disabled={isResolvingDecision}>
                  {myPendingDecision.decisionType === 'deal'
                    ? 'Пропустить сделку'
                    : 'Пропустить'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
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
  disabled,
  onAccept,
  onSellTo,
  onAuction,
  onSkip,
}: {
  option: DecisionOption
  cash: number
  players: any[]
  currentPlayerId: string
  isOffer: boolean
  disabled: boolean
  onAccept: () => void
  onSellTo: (targetPlayerId: string) => void
  onAuction: () => void
  onSkip: () => void
}) {
  const tradeTargets = players.filter(player => player.playerId !== currentPlayerId)
  const [selectedTargetId, setSelectedTargetId] = useState(tradeTargets[0]?.playerId ?? '')
  const offerPrice = option.offerPrice ?? 0
  const totalCost = option.cost + (isOffer ? offerPrice : 0)
  const cannotAfford = totalCost > cash
  const isBigDeal = option.cardType === 'bigDeal' || option.option.startsWith('kru-')
  const isRealEstate = option.dealType.toLowerCase().includes('недвиж')
  const canTrade = !isOffer && !isRealEstate && tradeTargets.length > 0
  const cardClass = isBigDeal ? styles.dealDecisionCardBig : styles.dealDecisionCardSmall
  const meta = [option.cardId, option.dealType, option.ticker].filter(Boolean).join(' · ')
  const details = [
    isOffer && offerPrice > 0 ? { label: 'Цена права', value: formatMoney(offerPrice) } : null,
    option.assetValue > 0 ? { label: 'Стоимость актива', value: formatMoney(option.assetValue) } : null,
    option.liabilityValue > 0 ? { label: 'Пассив / ипотека', value: formatMoney(option.liabilityValue) } : null,
    option.cashFlow !== 0 ? { label: 'Денежный поток', value: formatDelta(option.cashFlow), accent: option.cashFlow > 0 ? 'positive' : 'negative' } : null,
    option.roi ? { label: 'ROI', value: option.roi } : null,
    option.saleRange ? { label: 'Диапазон продажи', value: option.saleRange } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; accent?: 'positive' | 'negative' }>

  return (
    <div className={`${styles.dealDecisionCard} ${cardClass}`}>
      <div className={styles.dealDecisionContent}>
        {meta && <span className={styles.dealDecisionMeta}>{meta}</span>}
        <h2 className={styles.dealDecisionTitle}>{option.title}</h2>
        <p className={styles.dealDecisionDescription}>{option.description}</p>
      </div>

      <div className={styles.dealDecisionDetails}>
        <div className={styles.dealDecisionHeader}>
          <span>Взнос</span>
          <strong>{formatMoney(option.cost)}</strong>
        </div>
        {details.map(detail => (
          <div className={styles.dealDecisionRow} key={detail.label}>
            <span>{detail.label}</span>
            <strong className={detail.accent === 'negative' ? styles.dealDecisionNegative : detail.accent === 'positive' ? styles.dealDecisionPositive : undefined}>
              {detail.value}
            </strong>
          </div>
        ))}
        {cannotAfford && (
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

      <div className={styles.dealDecisionSpacer} />

      <div className={styles.dealDecisionActions}>
        <button className={styles.dealDecisionButton} onClick={onAccept} disabled={disabled || cannotAfford}>
          {isOffer ? 'Купить сделку' : 'Принять'}
        </button>
        {canTrade && (
          <div className={styles.dealTradeControls}>
            <select
              className={styles.dealTradeSelect}
              value={selectedTargetId}
              onChange={(event) => setSelectedTargetId(event.target.value)}
              disabled={disabled}
            >
              {tradeTargets.map(player => (
                <option value={player.playerId} key={player.playerId}>
                  {player.displayName || 'Игрок'}
                </option>
              ))}
            </select>
            <button
              className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`}
              onClick={() => selectedTargetId && onSellTo(selectedTargetId)}
              disabled={disabled || !selectedTargetId}
            >
              Продать право
            </button>
            <button
              className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`}
              onClick={onAuction}
              disabled={disabled}
            >
              Аукцион
            </button>
          </div>
        )}
        <button className={`${styles.dealDecisionButton} ${styles.dealDecisionButtonGhost}`} onClick={onSkip} disabled={disabled}>
          {isOffer ? 'Отказаться' : 'Пропустить'}
        </button>
      </div>
    </div>
  )
}

function PlayersPanel({
  players,
  currentPlayerId,
  selectedPlayerId,
  selectedPlayer,
  dreams,
  turnCount,
  onSelectPlayer,
}: {
  players: any[]
  currentPlayerId: string
  selectedPlayerId: string
  selectedPlayer: any | null
  dreams: any[]
  turnCount: number
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

  const selectedDream = selectedPlayer
    ? dreams.find(dream => dream.id === selectedPlayer.dreamId)
    : null
  const selectedFinancials = selectedPlayer ? getPlayerFinancials(selectedPlayer) : null

  return (
    <div className={styles.playersPanel}>
      <div className={styles.playersList}>
        {players.map(player => {
          const financials = getPlayerFinancials(player)
          const isSelected = player.playerId === selectedPlayerId
          const isCurrent = player.playerId === currentPlayerId

          return (
            <button
              key={player.playerId}
              type="button"
              className={isSelected ? styles.playerRowActive : styles.playerRow}
              onClick={() => onSelectPlayer(player.playerId)}
            >
              <span className={styles.playerAvatar} style={{ background: player.color }} />
              <span className={styles.playerMain}>
                <strong>{player.displayName || 'Игрок'}</strong>
                <span>{roleData[player.roleId]?.name ?? player.roleId} · {player.isOnBigCircle ? 'Большой круг' : 'Малый круг'}</span>
              </span>
              <span className={styles.playerMeta}>
                {isCurrent ? 'ходит' : formatMoney(financials.cashFlow)}
              </span>
            </button>
          )
        })}
      </div>

      {selectedPlayer && selectedFinancials && (
        <div className={styles.playerSituation}>
          <div className={styles.playerSituationHeader}>
            <div>
              <span className={styles.panelEyebrow}>Ситуация игрока</span>
              <h3>{selectedPlayer.displayName || 'Игрок'}</h3>
            </div>
            <span className={styles.playerRound}>Ход {turnCount}</span>
          </div>

          <div className={styles.playerDreamBox}>
            <span>Мечта</span>
            <strong>{selectedDream?.title ?? 'Не выбрана'}</strong>
            {selectedDream && <em>{formatMoney(selectedDream.price)}</em>}
          </div>

          <div className={styles.playerStatsGrid}>
            <StatTile label="Наличные" value={formatMoney(selectedPlayer.cash)} tone="cash" />
            <StatTile label="Зарплата" value={formatMoney(selectedFinancials.salary)} tone="salary" />
            <StatTile label="Пассив" value={formatMoney(selectedFinancials.passiveIncome)} tone="passive" />
            <StatTile label="Расходы" value={formatMoney(selectedPlayer.expenses)} tone="expense" />
            <StatTile label="Поток" value={formatMoney(selectedFinancials.cashFlow)} tone="flow" />
            <StatTile label="Активы" value={`${selectedPlayer.assets?.length ?? 0}`} tone="asset" />
          </div>

          <PlayerItemsList
            title="Активы"
            emptyText="Активов пока нет"
            items={selectedPlayer.assets ?? []}
            valueLabel="Доход"
            getValue={item => `+${formatMoney(item.cashFlow ?? 0)}`}
          />

          <PlayerItemsList
            title="Пассивы"
            emptyText="Пассивов пока нет"
            items={selectedPlayer.liabilities ?? []}
            valueLabel="Платёж"
            getValue={item => `-${formatMoney(item.payment ?? 0)}`}
          />
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={styles.statTile}>
      <span>{label}</span>
      <strong className={styles[`statTone_${tone}` as keyof typeof styles]}>{value}</strong>
    </div>
  )
}

function PlayerItemsList({
  title,
  emptyText,
  items,
  valueLabel,
  getValue,
}: {
  title: string
  emptyText: string
  items: any[]
  valueLabel: string
  getValue: (item: any) => string
}) {
  return (
    <div className={styles.playerItemsBlock}>
      <div className={styles.playerItemsHeader}>
        <strong>{title}</strong>
        <span>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        <div className={styles.playerItemsList}>
          {items.map((item, index) => (
            <div key={item.id ?? `${title}-${index}`} className={styles.playerItem}>
              <span>{item.title || title}</span>
              <em>{valueLabel}: {getValue(item)}</em>
            </div>
          ))}
        </div>
      )}
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

function AssetManagementPanel({
  assets,
  liabilities,
  cash,
  disabled,
  onSellAsset,
  onPayLiability,
}: {
  assets: any[]
  liabilities: any[]
  cash: number
  disabled: boolean
  onSellAsset: (assetId: string) => void
  onPayLiability: (liabilityId: string) => void
}) {
  const payableLiabilities = liabilities.filter(item => (item.balance ?? 0) > 0)

  if (assets.length === 0 && payableLiabilities.length === 0) return null

  return (
    <div className={styles.assetPanel}>
      <div className={styles.assetPanelHeader}>
        <strong>Управление</strong>
        <span>Продажа 80% / погашение полностью</span>
      </div>

      {assets.length > 0 && (
        <div className={styles.assetActionGroup}>
          {assets.map(asset => {
            const salePrice = Math.round((asset.cost ?? 0) * 0.8)
            return (
              <button
                key={asset.id}
                className={styles.assetAction}
                disabled={disabled}
                onClick={() => onSellAsset(asset.id)}
              >
                <span>Продать {asset.title || 'актив'}</span>
                <strong>+{formatMoney(salePrice)}</strong>
              </button>
            )
          })}
        </div>
      )}

      {payableLiabilities.length > 0 && (
        <div className={styles.assetActionGroup}>
          {payableLiabilities.map(liability => {
            const canPay = cash >= (liability.balance ?? 0)
            return (
              <button
                key={liability.id}
                className={styles.assetAction}
                disabled={disabled || !canPay}
                onClick={() => onPayLiability(liability.id)}
              >
                <span>Погасить {liability.title || 'кредит'}</span>
                <strong>-{formatMoney(liability.balance ?? 0)}</strong>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
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
    if (state.pendingDecision?.playerId === playerId) return 'Выберите действие'
    const player = state.players.find(p => p.playerId === state.pendingDecision?.playerId)
    return player ? `Решение принимает ${player.displayName}` : 'Ожидание решения'
  }
  if (state.currentPlayerId === playerId) return 'Ваш ход'

  const activePlayer = state.players.find(p => p.playerId === state.currentPlayerId)
  return activePlayer ? `Ходит ${activePlayer.displayName}` : 'Ожидание хода'
}
