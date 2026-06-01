import { useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import RoleCardPage from './pages/RoleCardPage'
import RoleDetailsPage from './pages/RoleDetailsPage'
import { icons, roleNames, roleData, roleKeys } from './data/roles'
import './App.css'

type RoleKey = (typeof roleKeys)[number]

function RoleDetailsPageRoute() {
  const navigate = useNavigate()
  const { roleName } = useParams<{ roleName: string }>()
  const data = roleName ? roleData[roleName] : undefined
  if (!data) return <p>Роль не найдена</p>
  return <RoleDetailsPage
    icon={icons[`/src/assets/roles/${roleName}.svg`] ?? ''}
    roleName={data.name}
    financialData={data.financialData}
    onStartGame={() => navigate('/')}
  />
}

function App() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<RoleKey>('policeOfficer')

  return (
    <Routes>
      <Route path="/role/:roleName" element={<RoleCardPage onTimeout={() => navigate('/')} />} />
      <Route path="/role/:roleName/details" element={<RoleDetailsPageRoute />} />
      <Route path="*" element={
        <>
          <section id="center">
            <h1>FinGuru</h1>
            <select
              className="roleSelect"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleKey)}
            >
              {roleKeys.map((k) => (
                <option key={k} value={k}>{roleNames[k]}</option>
              ))}
            </select>
            <button className="counter" onClick={() => navigate(`/role/${selectedRole}`)}>
              Выбрать роль
            </button>
            <button className="counter" onClick={() => navigate(`/role/${selectedRole}/details`)}>
              Сведения о роли
            </button>
          </section>
          <footer className="footer">
            <a href="/guru/story" target="_blank" rel="noopener noreferrer">
              Storybook
            </a>
          </footer>
        </>
      } />
    </Routes>
  )
}

export default App
