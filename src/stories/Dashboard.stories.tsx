import type { Meta, StoryObj } from '@storybook/react'
import Dashboard from '../components/Dashboard'

const meta: Meta<typeof Dashboard> = {
  title: 'Dashboard',
  component: Dashboard,
}

export default meta
type Story = StoryObj<typeof Dashboard>

export const Teacher: Story = {
  args: {
    playerName: 'Константин',
    playerRole: 'Учитель',
    moveNumber: 1,
    stats: {
      cash: 1330,
      salary: 7500,
      expenses: 10500,
      passiveIncome: 500,
      cashFlow: 720,
    },
    bigCircleTarget: 10401,
    passiveIncomeProgress: 3000,
    bigCircleRemaining: 7401,
    statuses: [
      { label: 'Увольнение', description: '3 хода пропускаешь', bgColor: 'rgb(74, 74, 74)' },
      { label: 'Ребенок x1', description: '720 ₽/мес', bgColor: 'rgb(234, 66, 189)' },
      { label: 'Выбор кубика', description: '3 хода', bgColor: 'rgb(50, 173, 230)' },
    ],
    assetCategories: [
      {
        title: 'Акции / 3 комп.',
        summary: { count: '130 шт.', totalValue: '7 000 ₽' },
        itemCount: 3,
        rows: [
          { label: 'Первый взнос', values: ['1 000 000', '20 000', '4 000'] },
          { label: 'Ипотека', values: ['200 000', '200 000', '200 000'] },
        ],
      },
      {
        title: 'Недвижимость / 3 шт.',
        summary: { count: '11 284 ₽', totalValue: '3 000 ₽' },
        itemCount: 3,
        rows: [
          { label: 'Первый взнос', values: ['500 000', '300 000', '150 000'] },
          { label: 'Ипотека', values: ['400 000', '250 000', '100 000'] },
        ],
      },
    ],
  },
}

export const Engineer: Story = {
  args: {
    playerName: 'Дмитрий',
    playerRole: 'Инженер',
    moveNumber: 3,
    stats: {
      cash: 4200,
      salary: 9500,
      expenses: 8200,
      passiveIncome: 1200,
      cashFlow: 2500,
    },
    bigCircleTarget: 15001,
    passiveIncomeProgress: 3000,
    bigCircleRemaining: 12001,
    statuses: [
      { label: 'Увольнение', description: '2 хода пропускаешь', bgColor: 'rgb(74, 74, 74)' },
      { label: 'Выбор кубика', description: '1 ход', bgColor: 'rgb(50, 173, 230)' },
    ],
    assetCategories: [
      {
        title: 'Акции / 5 комп.',
        summary: { count: '250 шт.', totalValue: '15 000 ₽' },
        itemCount: 5,
        rows: [
          { label: 'Первый взнос', values: ['3 000', '5 000', '2 000', '8 000', '4 000'] },
          { label: 'Ипотека', values: ['0', '0', '0', '0', '0'] },
        ],
      },
    ],
  },
}
