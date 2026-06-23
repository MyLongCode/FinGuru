import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Dashboard from '../components/Dashboard'
import GameBoard from '../components/GameBoard'
import MoveHistory from '../components/MoveHistory'
import { icons, roleData } from '../data/roles'
import {
  getSdk,
  getGameState,
  rollDice,
  subscribeDiceRoll,
  subscribeGameStateUpdate,
  subscribeGameError,
  getBoard,
  getDeals,
  getAssets,
  type GameState,
  type DiceRollResult,
} from '../sdk'
import styles from './GamePage.module.css'

export default function GamePage() {
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  const { currentPlayerId: contextPlayerId } = useGame()

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') ?? ''
  const sdkPlayerId = params.get('playerId') ?? contextPlayerId ?? ''

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myColor, setMyColor] = useState<string>('#4CAF50')
  const [moveHistory, setMoveHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'small' | 'big'>('small')
  const [isRolling, setIsRolling] = useState(false)
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ждем состояние игры...')
  const [board, setBoard] = useState<any[] | null>(null)
  const [deals, setDeals] = useState<any[] | null>(null)
  const [assets, setAssets] = useState<any[] | null>(null)

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
      setLastRoll(result)
      setGameState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          players: result.players,
          currentRound: result.currentRound,
          currentPlayerId: result.nextPlayerId,
          phase: result.phase ?? prev.phase,
          winners: result.winners ?? prev.winners,
          finalResults: result.finalResults ?? prev.finalResults,
        }
      })

      const me = result.players.find(p => p.playerId === sdkPlayerId)
      if (me) setMyColor(me.color)

      const rolledPlayer = result.players.find(p => p.playerId === result.rolledBy)
      const nextPlayer = result.players.find(p => p.playerId === result.nextPlayerId)
      setStatusMessage(result.phase === 'gameOver'
        ? 'Игра завершена'
        : result.nextPlayerId === sdkPlayerId
          ? 'Ваш ход'
          : `Ходит ${nextPlayer?.displayName ?? 'следующий игрок'}`)

      setMoveHistory(prev => [
        {
          key: `dice:${Date.now()}:${result.rolledBy}`,
          playerName: rolledPlayer?.displayName ?? result.rolledBy,
          playerColor: rolledPlayer?.color ?? '#999',
          moveLabel: result.total > 0 ? `Ход ${result.total}` : 'Пропуск хода',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          transactionType: result.sectorLabel,
          transactionTypeColor: getSectorColor(result.sectorType),
          action: formatDelta(result.cashChange),
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
    })

    const unsubError = subscribeGameError(sdk, roomId, (message) => {
      setIsRolling(false)
      setStatusMessage(message)
    })

    return () => {
      unsubState()
      unsubDice()
      unsubError()
    }
  }, [roomId, sdkPlayerId])

  const handleRollDice = useCallback(() => {
    if (isRolling || !roomId || !sdkPlayerId) return

    setIsRolling(true)
    setStatusMessage('Колесо крутится...')

    const sdk = getSdk()
    rollDice(sdk, roomId, sdkPlayerId)
  }, [roomId, sdkPlayerId, isRolling])

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
    skipNextTurn: false,
  }

  const boardPlayers = (gameState?.players ?? []).map(p => ({
    id: p.playerId,
    color: p.color,
    letter: p.displayName.charAt(0).toUpperCase(),
    cellIndex: p.position,
    name: p.displayName,
  }))

  const bigSectorPlayers = boardPlayers.map(p => ({
    ...p,
    cellIndex: ((p.cellIndex ?? 0) * 2) % 48,
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
  const isMyTurn = gameState?.phase === 'playing' && gameState.currentPlayerId === sdkPlayerId
  const activePlayer = gameState?.players.find(p => p.playerId === gameState.currentPlayerId)
  const lastRollLabel = lastRoll
    ? lastRoll.total > 0
      ? `${lastRoll.dice1}+${lastRoll.dice2} = ${lastRoll.total} | ${lastRoll.sectorLabel}`
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
            salary: dashboardPlayer.income,
            expenses: dashboardPlayer.expenses,
            passiveIncome: 0,
            cashFlow: dashboardPlayer.income - dashboardPlayer.expenses,
          }}
          goalTarget={myDream?.price ?? 0}
          progressAmount={dashboardPlayer.cash}
          statuses={dashboardPlayer.skipNextTurn ? ['Пропуск следующего хода'] : []}
          assetCategories={[]}
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
          lastRollLabel={lastRollLabel}
          rollButtonLabel={rollButtonLabel}
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
        <MoveHistory
          title="История ходов"
          entries={moveHistory}
        />
      </div>
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
  if (state.currentPlayerId === playerId) return 'Ваш ход'

  const activePlayer = state.players.find(p => p.playerId === state.currentPlayerId)
  return activePlayer ? `Ходит ${activePlayer.displayName}` : 'Ожидание хода'
}
