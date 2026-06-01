import { useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import RoleCardPage from './pages/RoleCardPage'
import RoleDetailsPage, { type RoleFinancialData } from './pages/RoleDetailsPage'
import NegativeCard from './components/cards/NegativeCard'
import BigDealCard from './components/cards/BigDealCard'
import SmallDealCard from './components/cards/SmallDealCard'
import RealityCard from './components/cards/RealityCard'
import DealSelectionModal from './components/dealSelection/DealSelectionModal'
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
  const [showNegative, setShowNegative] = useState(false)
  const [showBigDeal, setShowBigDeal] = useState(false)
  const [showSmallDeal, setShowSmallDeal] = useState(false)
  const [showStock, setShowStock] = useState(false)
  const [showReality, setShowReality] = useState(false)
  const [showDealSelection, setShowDealSelection] = useState(false)

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
            <button className="counter" onClick={() => setShowNegative(true)}>
              NegativeCard
            </button>
            <button className="counter" onClick={() => setShowBigDeal(true)}>
              BigDealCard
            </button>
            <button className="counter" onClick={() => setShowSmallDeal(true)}>
              SmallDealCard
            </button>
            <button className="counter" onClick={() => setShowStock(true)}>
              Акции
            </button>
            <button className="counter" onClick={() => setShowReality(true)}>
              RealityCard
            </button>
            <button className="counter" onClick={() => setShowDealSelection(true)}>
              Выбор сделки
            </button>
            <button className="counter" onClick={() => navigate(`/role/${selectedRole}`)}>
              Выбрать роль
            </button>
            <button className="counter" onClick={() => navigate(`/role/${selectedRole}/details`)}>
              Сведения о роли
            </button>
          </section>

          <NegativeCard
            isOpen={showNegative}
            onClose={() => setShowNegative(false)}
            name="Покраска дома"
            description="Обойдется вам в"
            amount={150}
            onClick={() => {
              alert('Принято!')
              setShowNegative(false)
            }}
          />

          <BigDealCard
            isOpen={showBigDeal}
            onClose={() => setShowBigDeal(false)}
            name="Многоквартирные дома на продажу"
            description="Продаются 2 дома, общее число квартир — 24. Владелец управлял ими с помощью проживающего тут же помощника. Причина продажи — отход от дел."
            amount={575000}
            details={[
              { name: 'Ипотека', amount: 500000, negative: true },
              { name: 'Первый взнос', amount: 75000, negative: true },
              { name: 'Денежный поток', amount: 3400, negative: false },
            ]}
            onClick={() => {
              alert('Принято!')
              setShowBigDeal(false)
            }}
          />

          <SmallDealCard
            isOpen={showSmallDeal}
            onClose={() => setShowSmallDeal(false)}
            name="Квартира на продажу — 2 спальни / 1 ванная"
            description="Квартиру 2/1 в хорошем состоянии продает владелец, собирающийся жениться. Требует ремонта. Не самый лучший район."
            amount={50000}
            details={[
              { name: 'Ипотека', amount: 45000, negative: true },
              { name: 'Первый взнос', amount: 5000, negative: true },
              { name: 'Денежный поток', amount: 100, negative: false },
            ]}
            onClick={() => {
              alert('Принято!')
              setShowSmallDeal(false)
            }}
          />

          <SmallDealCard
            isOpen={showStock}
            onClose={() => setShowStock(false)}
            name="Акции Apple"
            description="Технологическая компания, производитель iPhone, iPad и Mac."
            amount="+ 5.2%"
            headerLabel="AAPL"
            rightAlign
            details={[
              { name: 'Количество', amount: '50 шт', negative: false },
              { name: 'Цена покупки', amount: 185000, negative: true },
              { name: 'Текущая цена', amount: 195000, negative: false },
              { name: 'Доходность', amount: '5.4%', negative: false },
            ]}
            onClick={() => {
              alert('Принято!')
              setShowStock(false)
            }}
          />

          <RealityCard
            isOpen={showReality}
            onClose={() => setShowReality(false)}
            name="Покупатели пансиона"
            description="Переведенный в другой город торговый агент содержал дом 3/2 в идеальном состоянии, поэтому квартплата за это жилье, находящееся в хорошем районе, может быть очень высокой. Купите сами или продайте это право другому игроку. 40% ROI, можно продать за 65 000 ₽ – 135 000 ₽."
            conclusion="Можно продать прибыльный пансион за $250 000 наличными."
            conditions={[
              { label: 'Цена продажи', value: '250 000 ₽' },
              { label: 'Продать может', value: 'Владелец пансиона' },
              { label: 'После продажи', value: 'Погаситься остаток ипотеки и уменьшиться денежный поток' },
            ]}
            onClick={() => {
              alert('Принято!')
              setShowReality(false)
            }}
          />

          <DealSelectionModal
            isOpen={showDealSelection}
            onClose={() => setShowDealSelection(false)}
            onSelect={(type) => {
              alert(`Выбрана: ${type === 'small' ? 'Мелкая сделка' : 'Крупная сделка'}`)
              setShowDealSelection(false)
            }}
          />
        </>
      } />
    </Routes>
  )
}

export default App
