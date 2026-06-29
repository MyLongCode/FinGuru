import { formatCurrency } from '../utils/format'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  goalAmount: number
  progressAmount: number
}

export default function ProgressBar({ goalAmount, progressAmount }: ProgressBarProps) {
  const remaining = Math.max(0, goalAmount - progressAmount)
  const progressPct = goalAmount > 0 ? Math.min(progressAmount / goalAmount, 1) : 1
  const label = `${formatCurrency(remaining)} в мес.`

  return (
    <div className={styles.container}>
      <span className={styles.label}>До победы нужно</span>
      <div className={styles.track}>
        <span className={styles.text}>{label}</span>
        <div className={styles.fill} style={{ width: `${progressPct * 100}%` }} />
        <div className={styles.clip} style={{ clipPath: `inset(0 ${(1 - progressPct) * 100}% 0 0)` }}>
          <span className={styles.clipText}>{label}</span>
        </div>
      </div>
    </div>
  )
}
