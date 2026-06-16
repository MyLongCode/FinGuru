import { useState, useCallback } from 'react'
import { GameProvider } from './context/GameContext'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import RoleCardPage from './pages/RoleCardPage'
import RoleDetailsPage from './pages/RoleDetailsPage'
import DreamPage from './pages/DreamPage'
import { icons, roleData, roleKeys } from './data/roles'
import { dreams as defaultDreams } from './data/dreams'
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
  const [dreams, setDreams] = useState<DreamItem[]>(() =>
    defaultDreams.map(d => ({ ...d, status: 'default' as const }))
  )

  const handleDreamSelect = useCallback((dreamId: number) => {
    setDreams(prev => prev.map(d => {
      if (d.id === dreamId) {
        const newStatus: DreamItem['status'] = d.status === 'selected' ? 'default' : 'selected'
        return { ...d, status: newStatus }
      }
      return d
    }))
  }, [])

  if (!data) return <p>Роль не найдена</p>
  return <DreamPage
    icon={icons[`/src/assets/roles/${roleName}.svg`] ?? ''}
    roleName={data.name}
    monthlyCashFlow={data.financialData.monthlyCashFlow}
    dreams={dreams}
    onDreamSelect={handleDreamSelect}
    onStartGame={() => navigate('/')}
  />
}

function RandomRoleRedirect() {
  const [role] = useState(() => roleKeys[Math.floor(Math.random() * roleKeys.length)])
  return <Navigate to={`/role/${role}`} replace />
}

function App() {
  const navigate = useNavigate()

  return (
    <GameProvider>
      <Routes>
      <Route path="/role/:roleName" element={
        <RoleCardPage onTimeout={(roleName) => navigate(`/role/${roleName}/details`)} />
      } />
      <Route path="/role/:roleName/details" element={<RoleDetailsPageRoute />} />
      <Route path="/role/:roleName/dreams" element={<DreamPageRoute />} />
      <Route path="*" element={<RandomRoleRedirect />} />
      </Routes>
    </GameProvider>
  )
}

export default App
