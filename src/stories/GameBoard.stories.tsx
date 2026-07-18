import type { Meta, StoryObj } from '@storybook/react'
import GameBoard from '../components/GameBoard'

const meta: Meta<typeof GameBoard> = {
  title: 'GameBoard',
  component: GameBoard,
  parameters: { layout: 'fullscreen' },
  decorators: [Story => <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}><Story /></div>],
}

export default meta
type Story = StoryObj<typeof GameBoard>

export const Default: Story = {
  args: {
    players: [
      { id: 'p1', color: '#FF3B30', letter: 'К', name: 'Константин', cellIndex: 0 },
      { id: 'p2', color: '#007AFF', letter: 'С', name: 'Сергей', cellIndex: 6 },
      { id: 'p3', color: '#34C759', letter: 'М', name: 'Михаил', cellIndex: 6 },
      { id: 'p4', color: '#AF52DE', letter: 'Р', name: 'Роман', cellIndex: 12 },
      { id: 'p5', color: '#FF9500', letter: 'П', name: 'Пётр', cellIndex: 12 },
      { id: 'p6', color: '#00C7BE', letter: 'Е', name: 'Елена', cellIndex: 12 },
    ],
    bigSectorPlayers: [
      { id: 'o1', color: '#FF3B30', letter: 'A', cellIndex: 0 },
      { id: 'o2', color: '#007AFF', letter: 'B', cellIndex: 12 },
      { id: 'o3', color: '#34C759', letter: 'C', cellIndex: 24 },
      { id: 'o4', color: '#AF52DE', letter: 'D', cellIndex: 36 },
    ],
    bigSectorDreams: [
      { cellIndex: 4, playerName: 'Машина', color: '#FF3B30' },
      { cellIndex: 20, playerName: 'Квартира', color: '#007AFF' },
      { cellIndex: 32, playerName: 'Путешествие', color: '#34C759' },
    ],
    bigTrack: Array.from({ length: 48 }, (_, position) => {
      const samples = [
        { type: 'speedDream', title: 'Ложа на стадионе профессиональной команды', cost: 200000, cashFlow: 9500 },
        { type: 'speedBusiness', title: 'Семейная сеть ресторанов', cost: 300000, cashFlow: 14000 },
        { type: 'speedRisk', title: 'IPO компании программных продуктов', cost: 25000, cashFlow: 0 },
        { type: 'speedIncomeDay', title: 'ДЕНЬ CASHFLOW', cost: 0, cashFlow: 0 },
        { type: 'speedExpense', title: 'Налоговая проверка', cost: 0, cashFlow: 0 },
        { type: 'speedDream', title: 'Круиз по Средиземноморью на частной яхте', cost: 100000, cashFlow: 0 },
      ]
      const sample = samples[position % samples.length]
      return {
        position,
        cardId: `SPD-${String(position + 1).padStart(2, '0')}`,
        description: 'Карточка скоростной дорожки',
        dealType: sample.type,
        logic: '',
        ...sample,
      }
    }),
    currentPlayerId: 'p3',
    activeTab: 'big',
    visibleCircle: 'big',
    rollButtonLabel: '3+4=7 | Ложа на стадионе профессиональной команды',
  },
}
