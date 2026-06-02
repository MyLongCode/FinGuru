import type { Meta, StoryObj } from '@storybook/react'
import GameBoard from '../components/GameBoard'

const meta: Meta<typeof GameBoard> = {
  title: 'GameBoard',
  component: GameBoard,
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
    currentPlayerId: 'p3',
    activeTab: 'small',
  },
}
