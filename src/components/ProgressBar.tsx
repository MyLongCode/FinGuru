import { formatCurrency } from '../utils/format'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  bigCircleTarget: number
  passiveIncomeProgress: number
  bigCircleRemaining: number
}

export default function ProgressBar({
  bigCircleTarget,
  passiveIncomeProgress,
  bigCircleRemaining,
}: ProgressBarProps) {
  const progressPct = bigCircleTarget > 0 ? Math.min(passiveIncomeProgress / bigCircleTarget, 1) : 1
  const label = `${formatCurrency(Math.max(0, bigCircleRemaining))} в мес.`

  return (
    <div className={styles.container}>
      <span className={styles.label}>До выхода на большой круг</span>
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
