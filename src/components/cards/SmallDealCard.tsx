import type { ReactNode } from 'react'
import styles from './SmallDealCard.module.css'

interface Detail {
  name: string
  amount: number | string
  negative: boolean
}

interface SmallDealCardProps {
  name: string
  description: string
  amount: number | string
  details: Detail[]
  onClick: () => void
  onClose: () => void
  isOpen: boolean
  headerLabel?: string
  rightAlign?: boolean
}

function formatAmount(value: number | string): string {
  if (typeof value === 'string') return value
  return `${value.toLocaleString('ru-RU')} ₽`
}

function formatDetail(value: number | string, negative: boolean): string {
  const prefix = negative ? '– ' : '+ '
  if (typeof value === 'string') return `${prefix}${value}`
  return `${prefix}${value.toLocaleString('ru-RU')} ₽`
}

export default function SmallDealCard({ name, description, amount, details, onClick, onClose, isOpen, headerLabel = 'Цена', rightAlign = false }: SmallDealCardProps): ReactNode {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <h2 className={styles.title}>{name}</h2>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.details}>
          <div className={`${styles.header}${rightAlign ? ` ${styles.headerRight}` : ''}`}>
            {headerLabel && <span className={styles.headerLabel}>{headerLabel}</span>}
            <span className={styles.headerAmount}>{formatAmount(amount)}</span>
          </div>
          {details.map((detail, i) => (
            <div className={styles.detailRow} key={i}>
              <span className={styles.detailLabel}>{detail.name}</span>
              <span className={styles.detailValue}>{formatDetail(detail.amount, detail.negative)}</span>
            </div>
          ))}
        </div>

        <div className={styles.spacer} />

        <button className={styles.button} onClick={onClick}>
          Принять
        </button>
      </div>
    </div>
  )
}
