import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import TopBar, { buildTopBarItems, type TopBarProps } from '../components/TopBar'
import { bigSectors } from '../data/gameBoard'

function TopBarWithIndex(args: TopBarProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const items = buildTopBarItems(args.items, args.sectors, args.dreams, args.players)
  const activeItem = items[activeIndex]
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '12px 16px',
          fontFamily: 'Montserrat Alternates, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#1c1c1e',
          background: '#fff',
          borderBottom: '1px solid #e5e5ea',
        }}
      >
        Активный сектор:{' '}
        <span style={{ color: '#5856D6' }}>{activeIndex}</span>
        {activeItem && (
          <span style={{ color: '#8e8e93', fontWeight: 400 }}>
            {' — '}
            {activeItem.title}
          </span>
        )}
      </div>
      <TopBar {...args} onActiveIndexChange={setActiveIndex} />
    </div>
  )
}

const meta: Meta<typeof TopBar> = {
  title: 'Components/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'TopBar — горизонтальная лента карточек событий. Источник элементов по умолчанию — `bigSectors` из `data/gameBoard.ts`. Цвет карточки определяется полем `color` сектора, dream/player накладываются на нужные карточки по индексу сектора и реактивно обновляются.',
      },
    },
  },
  render: (args) => <TopBarWithIndex {...args} />,
}

export default meta
type Story = StoryObj<typeof TopBar>

export const WithoutPlayersAndDreams: Story = {
  args: {
    sectors: bigSectors,
  },
}

export const WithPlayers: Story = {
  args: {
    sectors: bigSectors,
    players: {
      2: { name: 'Анна', color: '#FF9500' },
      8: { name: 'Виктор', color: '#34C759' },
      10: { name: 'Константин' },
    },
  },
}

export const WithPlayersAndDreams: Story = {
  args: {
    sectors: bigSectors,
    dreams: {
      4: { playerName: 'Роман' },
      12: { playerName: 'Виктор', color: '#34C759' },
    },
    players: {
      2: { name: 'Анна', color: '#FF9500' },
      8: { name: 'Виктор', color: '#34C759' },
      10: { name: 'Константин' },
      16: { name: 'Анна', color: '#FF9500' },
    },
  },
}
