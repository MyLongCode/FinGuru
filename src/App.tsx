import { useState, useCallback, useEffect } from 'react'
import { GameProvider, useGame } from './context/GameContext'
import { Routes, Route, useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom'
import RoleCardPage from './pages/RoleCardPage'
import RoleDetailsPage from './pages/RoleDetailsPage'
import DreamPage from './pages/DreamPage'
import GamePage from './pages/GamePage'
import { icons, roleData, roleKeys } from './data/roles'
import {
  initSdk,
  getSdk,
  getPlayerInfo,
  getGameState,
  subscribeDreamSelection,
  subscribeGameStateUpdate,
  selectDream,
  getAssets,
  getFinGuruConfig,
  type GameState,
} from './sdk'
import type { DreamItem } from './pages/DreamPage'
import './App.css'

function RoleDetailsPageRoute() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined

  if (!data) return <p>Роль не найдена</p>

  return (
    <RoleDetailsPage
      icon={icons[`/src/assets/roles/${roleName}.svg`] ?? ''}
      roleName={data.name}
      financialData={data.financialData}
      onStartGame={() => navigate(`/role/${roleName}/dreams` + window.location.search)}
    />
  )
}

function mapDreamsFromState(state: GameState, playerId: string): DreamItem[] {
  return (state.dreams as any[]).map((dream) => {
    const takenBy = dream.chosenByPlayerId ?? null
    const status: DreamItem['status'] = takenBy == null ? 'default' : (takenBy === playerId ? 'selected' : 'chosen')
    const player = takenBy ? state.players.find(p => p.playerId === takenBy) : null

    return {
      id: dream.id,
      title: dream.title ?? dream.number ?? `Мечта ${dream.id}`,
      number: dream.number ?? String(dream.id),
      description: dream.description ?? '',
      price: dream.price ?? 0,
      status,
      takenByPlayerId: takenBy ?? undefined,
      playerName: player?.displayName,
      color: player?.color,
      iconKey: dream.iconKey,
    }
  })
}

function mapStandaloneDreams(dreams: GameState['dreams']): DreamItem[] {
  return dreams.map((dream) => ({
    id: dream.id,
    title: dream.title ?? dream.number ?? `Мечта ${dream.id}`,
    number: dream.number ?? String(dream.id),
    description: dream.description ?? '',
    price: dream.price ?? 0,
    status: 'default',
    takenByPlayerId: undefined,
  }))
}

function DreamPageRoute() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  const { currentPlayerId } = useGame()
  const [dreams, setDreams] = useState<DreamItem[]>(() => [])
  const [assets, setAssets] = useState<{ key: string; url: string }[]>(() => [])
  const [myColor, setMyColor] = useState<string | undefined>(undefined)

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') ?? sessionStorage.getItem('roomId') ?? ''
  const sdkPlayerId = params.get('playerId') ?? sessionStorage.getItem('playerId') ?? currentPlayerId ?? ''

  const applyGameState = useCallback((state: GameState) => {
    if (state.dreams?.length) {
      setDreams(mapDreamsFromState(state, sdkPlayerId))
    }

    if (state.phase === 'playing' || state.phase === 'gameOver') {
      const me = state.players.find(p => p.playerId === sdkPlayerId)
      if (me?.roleId) {
        navigate(`/role/${me.roleId}/game` + window.location.search, { replace: true })
      }
    }
  }, [navigate, sdkPlayerId])

  useEffect(() => {
    getFinGuruConfig().then(config => {
      if (config?.dreams?.length) {
        setDreams(prev => prev.length > 0 ? prev : mapStandaloneDreams(config.dreams))
      }
    }).catch(() => {})

    if (!roomId) return
    const sdk = getSdk()

    sdkPlayerId ? getPlayerInfo(sdk, roomId, sdkPlayerId).then(info => {
      if (info.color) setMyColor(info.color)
    }) : Promise.resolve({ roleId: null, color: null })

    getGameState(sdk, roomId).then(state => {
      if (state) applyGameState(state)
    }).catch(() => {})


    getAssets(sdk, roomId).then(a => {
      if (a) setAssets(a)
    }).catch(() => {})

    const unsubState = subscribeGameStateUpdate(sdk, roomId, applyGameState)

    const unsubDreams = subscribeDreamSelection(sdk, roomId, sdkPlayerId, (update) => {
      setDreams(prev => prev.map(dream => {
        const serverDream = update.dreams.find(item => item.id === dream.id)
        const takenBy = serverDream?.chosenByPlayerId ?? null
        const status: DreamItem['status'] = takenBy == null ? 'default' : (takenBy === sdkPlayerId ? 'selected' : 'chosen')

        return {
          ...dream,
          status,
          takenByPlayerId: takenBy ?? undefined,
          color: takenBy ? update.playerColors[takenBy] : undefined,
          playerName: takenBy ? (update.playerNames[takenBy] ?? 'Игрок') : undefined,
        }
      }))
    })

    return () => {
      unsubState()
      unsubDreams()
    }
  }, [roomId, sdkPlayerId, applyGameState])

  const handleDreamSelect = useCallback((dreamId: number) => {
    if (!roomId || !sdkPlayerId) return
    setDreams(prev => prev.map(dream => ({
      ...dream,
      status: dream.id === dreamId ? 'selected' : (dream.takenByPlayerId ? dream.status : 'default'),
      takenByPlayerId: dream.id === dreamId ? sdkPlayerId : (dream.takenByPlayerId === sdkPlayerId ? undefined : dream.takenByPlayerId),
      color: dream.id === dreamId ? myColor : (dream.takenByPlayerId === sdkPlayerId ? undefined : dream.color),
      playerName: dream.id === dreamId ? undefined : (dream.takenByPlayerId === sdkPlayerId ? undefined : dream.playerName),
    })))
    const sdk = getSdk()
    selectDream(sdk, roomId, sdkPlayerId, dreamId)
  }, [roomId, sdkPlayerId, myColor])

  if (!data) return <p>Роль не найдена</p>

  return (
    <DreamPage
      icon={icons[`/src/assets/roles/${roleName}.svg`] ?? ''}
      roleName={data.name}
      monthlyCashFlow={data.financialData.monthlyCashFlow}
      dreams={dreams}
      assets={assets}
      currentPlayerId={sdkPlayerId}
      onDreamSelect={handleDreamSelect}
      onStartGame={() => navigate(`/role/${roleName}/game` + window.location.search)}
    />
  )
}

function RandomRoleRedirect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? sessionStorage.getItem('roomId') ?? ''
  const sdkPlayerId = searchParams.get('playerId') ?? sessionStorage.getItem('playerId') ?? ''
  const isSpectator = searchParams.get('spectator') === 'true'
  const [randomRole] = useState(() => roleKeys[Math.floor(Math.random() * roleKeys.length)])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!roomId || !sdkPlayerId) {
      setChecking(false)
      return
    }

    const sdk = getSdk()
    const timeout = setTimeout(() => setChecking(false), 2000)

    getGameState(sdk, roomId).then(state => {
      clearTimeout(timeout)
      if (state?.phase === 'playing' || state?.phase === 'gameOver') {
        const me = isSpectator ? state.players[0] : state.players.find(p => p.playerId === sdkPlayerId)
        if (me?.roleId) {
          navigate(`/role/${me.roleId}/game` + window.location.search, { replace: true })
          return
        }
      }
      setChecking(false)
    }).catch(() => {
      clearTimeout(timeout)
      setChecking(false)
    })
  }, [navigate, roomId, sdkPlayerId, isSpectator])

  if (checking) return null
  return <Navigate to={`/role/${randomRole}`} replace />
}

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    initSdk().catch((error) => {
      console.error('Failed to initialize SDK', error)
    })
  }, [])

  return (
    <GameProvider>
      <Routes>
        <Route path="/role/:roleName" element={
          <RoleCardPage onTimeout={(roleName) => navigate(`/role/${roleName}/details` + window.location.search)} />
        } />
        <Route path="/role/:roleName/details" element={<RoleDetailsPageRoute />} />
        <Route path="/role/:roleName/dreams" element={<DreamPageRoute />} />
        <Route path="/role/:roleName/game" element={<GamePage />} />
        <Route path="*" element={<RandomRoleRedirect />} />
      </Routes>
    </GameProvider>
  )
}

export default App


