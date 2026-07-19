import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import TopBar, { buildTopBarItems, type TopBarProps, type TopBarSpinRequest } from '../components/TopBar'
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

function RoulettePreview(args: TopBarProps) {
  const [spinRequest, setSpinRequest] = useState<TopBarSpinRequest | null>(null)
  const [targetIndex, setTargetIndex] = useState(0)
  const [completedIndex, setCompletedIndex] = useState<number | null>(null)

  const spin = () => {
    const nextTarget = (targetIndex + 11) % 48
    setTargetIndex(nextTarget)
    setCompletedIndex(null)
    setSpinRequest({ id: `storybook-${Date.now()}`, targetIndex: nextTarget, durationMs: 1400 })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f2f7' }}>
      <button
        type="button"
        onClick={spin}
        style={{ margin: 12, padding: '10px 16px', border: 0, borderRadius: 20, background: '#5856d6', color: '#fff' }}
      >
        Запустить рулетку
      </button>
      <span style={{ fontFamily: 'Montserrat Alternates, sans-serif', fontSize: 13 }}>
        {completedIndex == null ? 'Готово к ходу' : `Остановка: ${completedIndex}`}
      </span>
      <TopBar
        {...args}
        spinRequest={spinRequest}
        onSpinComplete={() => setCompletedIndex(targetIndex)}
      />
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

export const Roulette: Story = {
  render: args => <RoulettePreview {...args} />,
  args: {
    initialIndex: 47,
    items: Array.from({ length: 48 }, (_, index) => ({
      variant: index % 4 === 0 ? 'pink' : index % 4 === 1 ? 'green' : index % 4 === 2 ? 'orange' : 'purple',
      title: index % 3 === 0 ? 'Ложа на стадионе профессиональной команды' : `Карточка большого круга ${index + 1}`,
      label: 'Стоимость · поток',
      value: '300 000 ₽ · +14 000 ₽/мес.',
    })),
  },
}
