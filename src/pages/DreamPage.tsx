import { formatCurrency } from '../utils/format'
import styles from './DreamPage.module.css'

export type DreamCardStatus = 'default' | 'selected' | 'chosen' | 'hover'

export interface DreamItem {
  id: number
  title: string
  number: string
  description: string
  price: number
  playerName?: string
  color?: string
  status?: DreamCardStatus
  takenByPlayerId?: string
}

interface DreamPageProps {
  icon: string
  roleName: string
  monthlyCashFlow: number
  dreams: DreamItem[]
  currentPlayerId?: string
  onStartGame?: () => void
  onDreamSelect?: (dreamId: number) => void
}

const cardBgColors: Record<DreamCardStatus, string> = {
  default: '#ffffff',
  selected: '#ff9500',
  chosen: '#af52de',
  hover: 'rgba(120, 120, 128, 0.08)',
}

const cardBorderColors: Record<DreamCardStatus, string | undefined> = {
  default: '#d1d1d6',
  selected: undefined,
  chosen: undefined,
  hover: '#d1d1d6',
}

function DreamCard({ item, onSelect, currentPlayerId }: { item: DreamItem; onSelect?: (id: number) => void; currentPlayerId?: string }) {
  const isTakenByOther = !!item.takenByPlayerId && item.takenByPlayerId !== currentPlayerId
  const computedStatus: DreamCardStatus = isTakenByOther ? 'chosen' : (item.status ?? 'default')
  const isHighlighted = computedStatus === 'selected' || computedStatus === 'chosen'
  const bg = isHighlighted && item.color ? item.color : cardBgColors[computedStatus]
  const borderColor = cardBorderColors[computedStatus]

  const statusClass = computedStatus !== 'default' ? styles[`card${computedStatus.charAt(0).toUpperCase()}${computedStatus.slice(1)}` as keyof typeof styles] : undefined

  return (
    <div
      className={[styles.card, statusClass].filter(Boolean).join(' ')}
      style={{
        background: bg,
        borderColor: borderColor ?? 'transparent',
        cursor: isTakenByOther ? 'not-allowed' : 'pointer',
      }}
      onClick={() => !isTakenByOther && onSelect?.(item.id)}
    >
      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{item.title}</span>
          <span className={styles.cardNumber}>{item.number}</span>
        </div>
        <p className={styles.cardDescription}>{item.description}</p>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardPrice}>{formatCurrency(item.price)}</span>
        {item.playerName && (
          <span className={styles.cardPlayer}>{item.playerName}</span>
        )}
      </div>
    </div>
  )
}

export default function DreamPage({ icon, roleName, monthlyCashFlow, dreams, currentPlayerId, onStartGame, onDreamSelect }: DreamPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          {icon && <img className={styles.icon} src={icon} alt={roleName} />}
          <h1 className={styles.roleTitle}>{roleName}</h1>
        </div>
        <span className={styles.cashFlow}>Месячный поток {formatCurrency(monthlyCashFlow)}</span>
      </div>

      <div className={styles.dreamSection}>
        <div className={styles.dreamHeader}>
          <h2 className={styles.dreamTitle}>Выберите мечту</h2>
          <p className={styles.dreamDescription}>
            Чем меньше номер мечты, тем она ближе к старту. Меньший номер расчитываешь на удачу, с большим успеваеш накопить
          </p>
        </div>

        <div className={styles.dreamGrid}>
          {dreams.map(dream => (
            <DreamCard key={dream.id} item={dream} onSelect={onDreamSelect} currentPlayerId={currentPlayerId} />
          ))}
        </div>
      </div>

      {onStartGame && (
        <button className={styles.startButton} onClick={onStartGame}>
          Начать игру
        </button>
      )}
    </div>
  )
}
