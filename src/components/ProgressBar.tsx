import { formatCurrency } from '../utils/format'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  goalAmount: number
  progressAmount: number
}

export default function ProgressBar({ goalAmount, progressAmount }: ProgressBarProps) {
  const remaining = Math.max(0, goalAmount - progressAmount)
  const progressPct = goalAmount > 0 ? Math.min(progressAmount / goalAmount, 1) : 1

  return (
    <div className={styles.container}>
      <span className={styles.label}>До выхода на большой круг нужно</span>
      <div className={styles.track}>
        <span className={styles.text}>{formatCurrency(remaining)} в мес.</span>
        <div className={styles.fill} style={{ width: `${progressPct * 100}%` }} />
        <div className={styles.clip} style={{ clipPath: `inset(0 ${(1 - progressPct) * 100}% 0 0)` }}>
          <span className={styles.clipText}>{formatCurrency(remaining)} в мес.</span>
        </div>
      </div>
    </div>
  )
}
