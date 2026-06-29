import { type ReactNode, useState } from 'react'
import styles from './MoveHistory.module.css'

export interface FinancialRow {
  label: string
  change: string
  changeColor: string
  result: string
  resultColor: string
}

export interface DealCardData {
  title: string
  description: string
  price: string
}

export interface MoveEntry {
  playerName: string
  playerColor: string
  moveLabel: string
  time: string
  transactionType: string
  transactionTypeColor: string
  action: string
  actionColor: string
  finances: FinancialRow[]
  dealCard?: DealCardData
}

interface MoveHistoryProps {
  title: string
  entries: MoveEntry[]
}

function DealCard({ card }: { card: DealCardData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={styles.dealCard}>
      <button className={styles.dealHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.dealHeaderText}>
          <span className={styles.dealTitle}>{card.title}</span>
          <div className={styles.dealPriceRow}>
            <span className={styles.dealPriceLabel}>Цена</span>
            <span className={styles.dealPriceValue}>{card.price}</span>
          </div>
        </div>
        <span className={`${styles.dealArrow} ${expanded ? styles.dealArrowUp : ''}`}>⌄</span>
      </button>
      {expanded && (
        <p className={styles.dealDescription}>{card.description}</p>
      )}
    </div>
  )
}

function FinancialRows({ rows }: { rows: FinancialRow[] }) {
  return (
    <div className={styles.finances}>
      {rows.map((row, i) => (
        <div key={i} className={styles.financeRow}>
          <span className={styles.financeLabel}>{row.label}</span>
          <div className={styles.financeValues}>
            <span className={styles.financeChange} style={{ color: row.changeColor }}>
              {row.change}
            </span>
            <span className={styles.financeEquals}>=</span>
            <span className={styles.financeResult} style={{ color: row.resultColor }}>
              {row.result}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MoveHistory({ title, entries }: MoveHistoryProps) {
  const items: ReactNode[] = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    items.push(
      <div key={`entry-${i}`} className={styles.entry}>
        <div className={styles.playerRow}>
          <div className={styles.playerInfo}>
            <span className={styles.playerName} style={{ color: entry.playerColor }}>
              {entry.playerName}
            </span>
            <div className={styles.moveMeta}>
              <span className={styles.moveLabel}>{entry.moveLabel}</span>
              <span className={styles.moveTime}>{entry.time}</span>
            </div>
          </div>
        </div>

        <div className={styles.transactionHeader}>
          <span className={styles.transactionType} style={{ color: entry.transactionTypeColor }}>
            {entry.transactionType}
          </span>
          <span className={styles.transactionAction} style={{ color: entry.actionColor }}>
            {entry.action}
          </span>
        </div>

        <FinancialRows rows={entry.finances} />

        {entry.dealCard && <DealCard card={entry.dealCard} />}
      </div>
    )

    if (i < entries.length - 1) {
      items.push(<div key={`divider-${i}`} className={styles.divider} />)
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.list}>
        {items}
      </div>
    </div>
  )
}
