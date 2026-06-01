import type { ReactNode } from 'react'
import styles from './RealityCard.module.css'

interface ConditionItem {
  label: string
  value: string
}

interface RealityCardProps {
  name: string
  description: string
  conclusion: string
  conditions: ConditionItem[]
  onClick: () => void
  onClose: () => void
  isOpen: boolean
}

export default function RealityCard({ name, description, conclusion, conditions, onClick, onClose, isOpen }: RealityCardProps): ReactNode {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.scrollArea}>
          <h2 className={styles.title}>{name}</h2>

          <div className={styles.section}>
            <span className={styles.sectionHeading}>Общая история</span>
            <p className={styles.sectionText}>{description}</p>
          </div>

          <div className={styles.separatorWrapper}>
            <hr className={styles.separator} />
          </div>

          <div className={styles.section}>
            <span className={styles.sectionHeading}>Вывод</span>
            <p className={styles.sectionText}>{conclusion}</p>
          </div>

          <div className={styles.separatorWrapper}>
            <hr className={styles.separator} />
          </div>

          <div className={styles.section}>
            <span className={styles.sectionHeading}>Условия сделки</span>
            <div className={styles.conditions}>
              {conditions.map((item, i) => (
                <div className={styles.conditionRow} key={i}>
                  <span className={styles.conditionLabel}>{item.label}</span>
                  <span className={styles.conditionValue}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button className={styles.button} onClick={onClick}>
          Принять
        </button>
      </div>
    </div>
  )
}
