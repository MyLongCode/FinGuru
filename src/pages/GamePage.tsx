import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Dashboard from '../components/Dashboard'
import GameBoard from '../components/GameBoard'
import MoveHistory from '../components/MoveHistory'
import { icons, roleData, roleNames } from '../data/roles'
import { dreams as defaultDreams } from '../data/dreams'
import {
  getSdk,
  getGameState,
  rollDice,
  subscribeDiceRoll,
  type GameState,
  type DiceRollResult,
  type PlayerGameState,
} from '../sdk'
import styles from './GamePage.module.css'

export default function GamePage() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  const { players: contextPlayers, currentPlayerId: contextPlayerId } = useGame()

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') ?? ''
  const sdkPlayerId = params.get('playerId') ?? contextPlayerId ?? ''

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myColor, setMyColor] = useState<string>('#4CAF50')
  const [moveHistory, setMoveHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'small' | 'big'>('small')
  const [isRolling, setIsRolling] = useState(false)

  useEffect(() => {
    if (!roomId) return
    const sdk = getSdk()
    getGameState(sdk, roomId).then(state => {
      if (state) {
        setGameState(state)
        const me = state.players.find(p => p.playerId === sdkPlayerId)
        if (me) setMyColor(me.color)
      }
    })
  }, [roomId, sdkPlayerId])

  useEffect(() => {
    if (!roomId) return
    const sdk = getSdk()
    const unsub = subscribeDiceRoll(sdk, roomId, (result: DiceRollResult) => {
      setGameState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          players: result.players,
          currentRound: result.currentRound,
          currentPlayerId: result.nextPlayerId,
        }
      })

      const me = result.players.find(p => p.playerId === sdkPlayerId)
      if (me) setMyColor(me.color)

      const rolledPlayer = result.players.find(p => p.playerId === result.rolledBy)
      setMoveHistory(prev => [
        {
          playerName: rolledPlayer?.displayName ?? result.rolledBy,
          playerColor: rolledPlayer?.color ?? '#999',
          moveLabel: `Ход ${result.total}`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          transactionType: result.sectorLabel,
          transactionTypeColor: getSectorColor(result.sectorType),
          action: result.cashChange >= 0 ? `+${result.cashChange}` : `${result.cashChange}`,
          actionColor: result.cashChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
          finances: [
            {
              label: 'Наличные',
              change: result.cashChange >= 0 ? `+${result.cashChange}` : `${result.cashChange}`,
              changeColor: result.cashChange >= 0 ? 'rgb(52, 199, 89)' : 'rgb(255, 59, 48)',
              result: `${result.newCash}`,
              resultColor: 'rgb(0, 0, 0)',
            },
          ],
        },
        ...prev,
      ])

      setIsRolling(false)
    })
    return unsub
  }, [roomId, sdkPlayerId])

  const handleRollDice = useCallback(() => {
    if (isRolling) return
    setIsRolling(true)
    const sdk = getSdk()
    rollDice(sdk, roomId, sdkPlayerId)
  }, [roomId, sdkPlayerId, isRolling])

  if (!data) return <p>Роль не найдена</p>

  const me = gameState?.players.find(p => p.playerId === sdkPlayerId)
  const myDream = me?.dreamId != null ? defaultDreams.find(d => d.id === me.dreamId) : null

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

  const myPos = me?.position ?? 0
  const bigSectorPlayers = boardPlayers.map(p => ({
    ...p,
    cellIndex: ((p.cellIndex ?? 0) * 2) % 48,
  }))

  const isMyTurn = gameState?.currentPlayerId === sdkPlayerId

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
          statuses={[]}
          assetCategories={[]}
          icon={icons[`/src/assets/roles/${roleName}.svg`]}
        />
      </div>

      <div className={styles.boardColumn}>
        <GameBoard
          players={boardPlayers}
          bigSectorPlayers={bigSectorPlayers}
          bigSectorDreams={[]}
          currentPlayerId={isMyTurn ? sdkPlayerId : undefined}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRollDice={isMyTurn ? handleRollDice : undefined}
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
    default: return 'rgb(60, 60, 67)'
  }
}
