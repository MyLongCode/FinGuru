import { formatFullCurrency as formatCurrency } from '../utils/format'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  bigCircleTarget: number
  passiveIncomeProgress: number
  bigCircleRemaining: number
  title?: string
}

export default function ProgressBar({
  bigCircleTarget,
  passiveIncomeProgress,
  bigCircleRemaining,
  title = 'До выхода на большой круг нужно',
}: ProgressBarProps) {
  const progressPct = bigCircleTarget > 0 ? Math.min(passiveIncomeProgress / bigCircleTarget, 1) : 1
  const amountLabel = `${formatCurrency(Math.max(0, bigCircleRemaining))} в мес.`

  return (
    <div className={styles.container}>
      <span className={styles.label}>{title}</span>
      <div className={styles.track}>
        <span className={styles.text}>{amountLabel}</span>
        <div className={styles.fill} style={{ width: `${progressPct * 100}%` }} />
        <div className={styles.clip} style={{ clipPath: `inset(0 ${(1 - progressPct) * 100}% 0 0)` }}>
          <span className={styles.clipText}>{amountLabel}</span>
        </div>
      </div>
    </div>
  )
}
