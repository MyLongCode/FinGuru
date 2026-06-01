import type { ReactNode } from 'react'
import styles from './NegativeCard.module.css'

interface NegativeCardProps {
  name: string
  description: string
  amount: number
  onClick: () => void
  onClose: () => void
  isOpen: boolean
}

export default function NegativeCard({ name, description, amount, onClick, onClose, isOpen }: NegativeCardProps): ReactNode {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <h2 className={styles.title}>{name}</h2>
          <p className={styles.description}>{description}</p>
          <div className={styles.priceContainer}>
            <p className={styles.price}>– {amount} ₽</p>
          </div>
        </div>
        <button className={styles.button} onClick={onClick}>
          Принять
        </button>
      </div>
    </div>
  )
}
