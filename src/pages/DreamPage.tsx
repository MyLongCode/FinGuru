import { formatCurrency } from '../utils/format'
import { useMemo } from 'react'
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
  iconKey?: string
}

interface DreamPageProps {
  icon: string
  roleName: string
  monthlyCashFlow: number
  dreams: DreamItem[]
  assets?: { key: string; url: string }[]
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

function DreamCard({ item, onSelect, currentPlayerId, iconUrl }: { item: DreamItem; onSelect?: (id: number) => void; currentPlayerId?: string; iconUrl?: string }) {
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
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <p className={styles.cardDescription} style={{ flex: 1 }}>{item.description}</p>
          {iconUrl && (
            <img src={iconUrl} alt={item.title} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
          )}
        </div>
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

export default function DreamPage({ icon, roleName, monthlyCashFlow, dreams, assets, currentPlayerId, onStartGame, onDreamSelect }: DreamPageProps) {
  const hasSelectedDream = dreams.some(d => d.status === 'selected' && d.takenByPlayerId === currentPlayerId)

  const assetsMap = useMemo(() => {
    const map: Record<string, string> = {}
    assets?.forEach(a => {
      if (a?.key && a?.url) map[a.key] = a.url
    })
    return map
  }, [assets])

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
          {dreams.length > 0 ? dreams.map(dream => (
            <DreamCard key={dream.id} item={dream} onSelect={onDreamSelect} currentPlayerId={currentPlayerId} iconUrl={dream.iconKey ? assetsMap[dream.iconKey] : undefined} />
          )) : (
            <div className={styles.emptyDreams}>Загружаем мечты...</div>
          )}
        </div>
      </div>

      {onStartGame && (
        <button
          className={styles.startButton}
          onClick={onStartGame}
          disabled={!hasSelectedDream}
        >
          Начать игру
        </button>
      )}
    </div>
  )
}
