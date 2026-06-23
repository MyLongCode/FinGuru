import { useState, useCallback, useEffect } from 'react'
import { GameProvider, useGame } from './context/GameContext'
import { Routes, Route, useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom'
import RoleCardPage from './pages/RoleCardPage'
import RoleDetailsPage from './pages/RoleDetailsPage'
import DreamPage from './pages/DreamPage'
import GamePage from './pages/GamePage'
import { icons, roleData, roleKeys, roleNames } from './data/roles'
import { initSdk, getSdk, getPlayerInfo, getGameState, subscribeDreamSelection, subscribeGameStateUpdate, selectDream, getAssets, type GameState } from './sdk'
import type { DreamItem } from './pages/DreamPage'
import './App.css'

function RoleDetailsPageRoute() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  if (!data) return <p>Роль не найдена</p>
  return <RoleDetailsPage
    icon={icons[`/src/assets/roles/${roleName}.svg`] ?? ''}
    roleName={data.name}
    financialData={data.financialData}
    onStartGame={() => navigate(`/role/${roleName}/dreams`)}
  />
}

function DreamPageRoute() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  const { players, currentPlayerId } = useGame()
  const [dreams, setDreams] = useState<DreamItem[]>(() => [])
  const [assets, setAssets] = useState<{ key: string; url: string }[]>(() => [])
  const [myColor, setMyColor] = useState<string | undefined>(undefined)

  const currentPlayer = players.find(p => p.id === currentPlayerId)

  const params = new URLSearchParams(window.location.search)
  const roomId = params.get('roomId') ?? ''
  const sdkPlayerId = params.get('playerId') ?? currentPlayerId ?? ''

  useEffect(() => {
    if (!roomId || !sdkPlayerId) return
    const sdk = getSdk()
    getPlayerInfo(sdk, roomId, sdkPlayerId).then(info => {
      if (info.color) setMyColor(info.color)
    })

    // initial fetch of game state -> dreams and assets
    getGameState(sdk, roomId).then(state => {
      if (!state?.dreams) return
      // map server dreams to DreamItem shape
      setDreams((state.dreams as any[]).map((sd) => {
        const takenBy = sd.chosenByPlayerId ?? null
        const status: DreamItem['status'] = takenBy == null ? 'default' : (takenBy === sdkPlayerId ? 'selected' : 'chosen')
        return {
          id: sd.id,
          title: sd.title ?? sd.number ?? `Мечта ${sd.id}`,
          number: sd.number ?? String(sd.id),
          description: sd.description ?? '',
          price: sd.price ?? sd.price ?? 0,
          status,
          takenByPlayerId: takenBy ?? undefined,
          playerName: takenBy ? (state.players.find(p => p.playerId === takenBy)?.displayName ?? 'Игрок') : undefined,
          color: takenBy ? (state.players.find(p => p.playerId === takenBy)?.color) : undefined,
        }
      }))
    }).catch(() => {})

    getAssets(sdk, roomId).then(a => {
      if (!a) return
      setAssets(a)
    }).catch(() => {})

    const applyDreamsFromState = (state: GameState) => {
      if (!state?.dreams) return
      setDreams((state.dreams as any[]).map((sd) => {
        const takenBy = sd.chosenByPlayerId ?? null
        const status: DreamItem['status'] = takenBy == null ? 'default' : (takenBy === sdkPlayerId ? 'selected' : 'chosen')
        return {
          id: sd.id,
          title: sd.title ?? sd.number ?? `Мечта ${sd.id}`,
          number: sd.number ?? String(sd.id),
          description: sd.description ?? '',
          price: sd.price ?? 0,
          status,
          takenByPlayerId: takenBy ?? undefined,
          playerName: takenBy ? (state.players.find(p => p.playerId === takenBy)?.displayName ?? 'Игрок') : undefined,
          color: takenBy ? (state.players.find(p => p.playerId === takenBy)?.color) : undefined,
        }
      }))
    }

    const unsubState = subscribeGameStateUpdate(sdk, roomId, (state) => {
      applyDreamsFromState(state)
      if (state.phase === 'playing') {
        const me = state.players.find(p => p.playerId === sdkPlayerId)
        if (me?.dreamId != null) {
          navigate(`/role/${me.roleId}/game` + window.location.search, { replace: true })
        }
      }
    })

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
          playerName: takenBy ? (update.playerNames[takenBy] ?? 'РРіСЂРѕРє') : undefined,
        }
      }))
    })

    return () => {
      unsubState()
      unsubDreams()
    }
  }, [roomId, sdkPlayerId, navigate])

  const handleDreamSelect = useCallback((dreamId: number) => {
    if (!roomId || !sdkPlayerId) return
    const sdk = getSdk()
    selectDream(sdk, roomId, sdkPlayerId, dreamId)
  }, [roomId, sdkPlayerId])

  if (!data) return <p>Роль не найдена</p>
  return <DreamPage
    icon={icons[`/src/assets/roles/${roleName}.svg`] ?? ''}
    roleName={data.name}
    monthlyCashFlow={data.financialData.monthlyCashFlow}
    dreams={dreams}
    assets={assets}
    currentPlayerId={sdkPlayerId}
    onDreamSelect={handleDreamSelect}
    onStartGame={() => navigate(`/role/${roleName}/game` + window.location.search)}
  />
}

function RandomRoleRedirect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? ''
  const sdkPlayerId = searchParams.get('playerId') ?? ''
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
      if (state?.phase === 'playing') {
        const me = state.players.find(p => p.playerId === sdkPlayerId)
        if (me?.dreamId != null) {
          navigate(`/role/${me.roleId}/game` + window.location.search, { replace: true })
          return
        }
      }
      setChecking(false)
    }).catch(() => {
      clearTimeout(timeout)
      setChecking(false)
    })
  }, [])

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
        <RoleCardPage onTimeout={(roleName) => navigate(`/role/${roleName}/details`)} />
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
