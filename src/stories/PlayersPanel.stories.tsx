import type { Meta, StoryObj } from '@storybook/react'
import { PlayersPanel } from '../pages/GamePage'
import styles from '../pages/GamePage.module.css'

const meta: Meta<typeof PlayersPanel> = {
  title: 'PlayersPanel',
  component: PlayersPanel,
  parameters: { layout: 'fullscreen' },
  decorators: [Story => (
    <aside className={styles.historyColumn} style={{ width: 300, height: 940, boxSizing: 'border-box' }}>
      <nav className={styles.sideTabs} aria-label="Правая панель">
        <button className={styles.sideTabActive} type="button">Игроки</button>
        <button className={styles.sideTab} type="button">История ходов</button>
      </nav>
      <Story />
    </aside>
  )],
}

export default meta
type Story = StoryObj<typeof PlayersPanel>

const players = [
  { playerId: 'p1', displayName: 'Константин', roleId: 'teacher', color: '#af52de', cash: 250000, income: 264000, expenses: 0, isOnBigCircle: true, bigCircleStartingCashFlow: 250000, bigPosition: 44, dreamId: 1, assets: [{ cashFlow: 2500 }] },
  { playerId: 'p2', displayName: 'Константин', roleId: 'teacher', color: '#007aff', cash: 4500, income: 7700, expenses: 3312, isOnBigCircle: false, assets: [{ cashFlow: 500 }] },
  { playerId: 'p3', displayName: 'Константин', roleId: 'teacher', color: '#ff2d55', cash: 4500, income: 7700, expenses: 3312, isOnBigCircle: false, assets: [{ cashFlow: 500 }] },
  { playerId: 'p4', displayName: 'Константин', roleId: 'teacher', color: '#30b0c7', cash: 4500, income: 7700, expenses: 3312, isOnBigCircle: false, assets: [{ cashFlow: 500 }] },
  { playerId: 'p5', displayName: 'Константин', roleId: 'teacher', color: '#5856d6', cash: 4500, income: 7700, expenses: 3312, isOnBigCircle: false, assets: [{ cashFlow: 500 }] },
]

export const Default: Story = {
  args: {
    players,
    currentPlayerId: 'p1',
    selectedPlayerId: 'p1',
    roundNumber: 7,
    dreams: [{ id: 1, title: 'Купите лес' }],
    onSelectPlayer: () => undefined,
  },
}
