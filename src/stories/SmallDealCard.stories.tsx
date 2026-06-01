import type { Meta, StoryObj } from '@storybook/react'
import SmallDealCard from '../components/cards/SmallDealCard'

const meta: Meta<typeof SmallDealCard> = {
  title: 'Cards/SmallDealCard',
  component: SmallDealCard,
}

export default meta
type Story = StoryObj<typeof SmallDealCard>

export const RealEstate: Story = {
  args: {
    isOpen: true,
    name: 'Квартира на продажу — 2 спальни / 1 ванная',
    description: 'Квартиру 2/1 в хорошем состоянии продает владелец, собирающийся жениться. Требует ремонта. Не самый лучший район.',
    amount: 50000,
    details: [
      { name: 'Ипотека', amount: 45000, negative: true },
      { name: 'Первый взнос', amount: 5000, negative: true },
      { name: 'Денежный поток', amount: 100, negative: false },
    ],
    onClick: () => alert('Куплено!'),
    onClose: () => alert('Закрыто'),
  },
}

export const Stocks: Story = {
  args: {
    isOpen: true,
    name: 'Акции Apple',
    description: 'Технологическая компания, производитель iPhone, iPad и Mac.',
    amount: '+ 5.2%',
    headerLabel: 'AAPL',
    rightAlign: true,
    details: [
      { name: 'Количество', amount: '50 шт', negative: false },
      { name: 'Цена покупки', amount: 185000, negative: true },
      { name: 'Текущая цена', amount: 195000, negative: false },
      { name: 'Доходность', amount: '5.4%', negative: false },
    ],
    onClick: () => alert('Куплено!'),
    onClose: () => alert('Закрыто'),
  },
}
