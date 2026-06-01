import type { Meta, StoryObj } from '@storybook/react'
import RealityCard from '../components/cards/RealityCard'

const meta: Meta<typeof RealityCard> = {
  title: 'Cards/RealityCard',
  component: RealityCard,
}

export default meta
type Story = StoryObj<typeof RealityCard>

export const Default: Story = {
  args: {
    isOpen: true,
    name: 'Покупатели пансиона',
    description: 'Переведенный в другой город торговый агент содержал дом 3/2 в идеальном состоянии, поэтому квартплата за это жилье, находящееся в хорошем районе, может быть очень высокой. Купите сами или продайте это право другому игроку. 40% ROI, можно продать за 65 000 ₽ – 135 000 ₽.',
    conclusion: 'Можно продать прибыльный пансион за $250 000 наличными.',
    conditions: [
      { label: 'Цена продажи', value: '250 000 ₽' },
      { label: 'Продать может', value: 'Владелец пансиона' },
      { label: 'После продажи', value: 'Погаситься остаток ипотеки и уменьшиться денежный поток' },
    ],
    onClick: () => alert('Продано!'),
    onClose: () => alert('Закрыто'),
  },
}
