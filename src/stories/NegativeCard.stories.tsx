import type { Meta, StoryObj } from '@storybook/react'
import NegativeCard from '../components/cards/NegativeCard'

const meta: Meta<typeof NegativeCard> = {
  title: 'Cards/NegativeCard',
  component: NegativeCard,
}

export default meta
type Story = StoryObj<typeof NegativeCard>

export const Default: Story = {
  args: {
    isOpen: true,
    name: 'Покраска дома',
    description: 'Обойдется вам в',
    amount: 150,
    onClick: () => alert('Принято!'),
    onClose: () => alert('Закрыто'),
  },
}
