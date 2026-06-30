import ProgressBar from './ProgressBar'
import { formatCurrency } from '../utils/format'
import styles from './PlayerCard.module.css'

interface PlayerCardProps {
  name: string
  role: string
  turn: number
  salary: number
  cash: number
  bigCircleTarget: number
  passiveIncomeProgress: number
  bigCircleRemaining: number
  passiveIncome: number
  cashFlow: number
  expenses: number
}

export default function PlayerCard({
  name,
  role,
  turn,
  salary,
  cash,
  bigCircleTarget,
  passiveIncomeProgress,
  bigCircleRemaining,
  passiveIncome,
  cashFlow,
  expenses,
}: PlayerCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.leftCol}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{name}</span>
            <span className={styles.sparkleBtn}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 0L6.5 4.5L11 5.5L6.5 6.5L5.5 11L4.5 6.5L0 5.5L4.5 4.5L5.5 0Z" fill="white" />
              </svg>
            </span>
          </div>
          <div className={styles.subtitleRow}>
            <span className={styles.subtitle}>{role}</span>
            <span className={styles.subtitle}>{turn} ход</span>
          </div>
          <div className={styles.salaryRow}>
            <span className={styles.salaryLabel}>Зарплата</span>
            <span className={styles.salaryAmount}>{formatCurrency(salary)}</span>
          </div>
        </div>

        <div className={styles.rightCol}>
          <span className={styles.cashAmount}>{formatCurrency(cash)}</span>
          <span className={styles.cashLabel}>Налички</span>
        </div>
      </div>

      <ProgressBar
        bigCircleTarget={bigCircleTarget}
        passiveIncomeProgress={passiveIncomeProgress}
        bigCircleRemaining={bigCircleRemaining}
      />

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Пассив</span>
          <span className={styles.statValue} style={{ color: '#5856D6' }}>{formatCurrency(passiveIncome)}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statLabel}>Денеж. поток</span>
          <span className={styles.statValue} style={{ color: '#34C759' }}>{formatCurrency(cashFlow)}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statLabel}>Расходы</span>
          <span className={styles.statValue} style={{ color: '#FF3B30' }}>{formatCurrency(expenses)}</span>
        </div>
      </div>
    </div>
  )
}
