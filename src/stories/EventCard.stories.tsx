import type { Meta, StoryObj } from '@storybook/react-vite'
import { EventCard, SharedSaleActions } from '../pages/GamePage'
import styles from '../pages/GamePage.module.css'

const meta = {
  title: 'EventCard',
  component: EventCard,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className={styles.actionOverlay}>
        <div className={`${styles.cardOverlayStack} ${styles.cardOverlayStackWithAcknowledgement}`}>
          <div className={styles.cardAcknowledgement}>
            <div className={styles.cardAcknowledgementStatus}>
              <span>Закрыли: 0 из 2</span>
              <strong>25 сек.</strong>
            </div>
            <button type="button">Закрыть карточку</button>
          </div>
          <div className={`${styles.actionModal} ${styles.dealActionModal}`}>
            <Story />
          </div>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof EventCard>

export default meta
type Story = StoryObj<typeof meta>

export const MarketWithoutSuitableAssets: Story = {
  args: {
    card: {
      id: 'market-card-layout',
      sectorType: 'market',
      sectorLabel: 'Покупатель дома с 3 спальнями и 2 ванными',
      playerName: 'Евтеев Платон',
      playerColor: '#ffcc00',
      title: 'Покупатель дома с 3 спальнями и 2 ванными',
      description: 'Покупатель готов приобрести подходящий объект недвижимости.',
    },
    onMinimize: () => undefined,
    actions: (
      <SharedSaleActions
        options={[]}
        completed={false}
        disabled={false}
        onSell={() => undefined}
        onComplete={() => undefined}
      />
    ),
  },
}
