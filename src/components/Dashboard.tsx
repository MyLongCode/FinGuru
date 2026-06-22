import { useState } from 'react'
import styles from './Dashboard.module.css'
import ProgressBar from './ProgressBar'
import DashboardHeader from './DashboardHeader'
import { formatCurrency } from '../utils/format'

export interface DashboardStats {
  cash: number
  salary: number
  expenses: number
  passiveIncome: number
  cashFlow: number
}

export interface DashboardStatus {
  label: string
  description: string
  bgColor: string
}

export interface AssetRow {
  label: string
  values: string[]
}

export interface AssetCategory {
  title: string
  summary: { count: string; totalValue: string }
  itemCount: number
  rows: AssetRow[]
}

export interface DashboardProps {
  playerName: string
  playerRole: string
  moveNumber: number
  stats: DashboardStats
  goalTarget: number
  progressAmount: number
  statuses: DashboardStatus[]
  assetCategories: AssetCategory[]
  icon?: string
}

function MiniCard({ label, amount, amountColor }: { label: string; amount: string; amountColor: string }) {
  return (
    <div className={styles.miniCard}>
      <span className={styles.miniLabel}>{label}</span>
      <span className={styles.miniAmount} style={{ color: amountColor }}>{amount}</span>
    </div>
  )
}

function LargeCard({ label, amount, bgColor }: { label: string; amount: string; bgColor: string }) {
  return (
    <div className={styles.largeCard} style={{ background: bgColor }}>
      <span className={styles.largeLabel}>{label}</span>
      <span className={styles.largeAmount}>{amount}</span>
    </div>
  )
}

function AssetCategoryCard({ category, defaultExpanded }: { category: AssetCategory; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const itemLabels = Array.from({ length: category.itemCount }, (_, i) => `${i + 1}`)

  return (
    <div className={styles.assetCard}>
      <button className={styles.assetHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.assetHeaderRow}>
          <span className={styles.assetTitle}>{category.title}</span>
          <span className={styles.assetCount}>{category.summary.count}</span>
          <span className={styles.assetValue}>{category.summary.totalValue}</span>
        </div>
        <span className={`${styles.assetArrow} ${expanded ? styles.assetArrowUp : ''}`}>▼</span>
      </button>
      {expanded && (
        <div className={styles.assetGrid}>
          <div className={styles.assetGridHeader}>
            <span className={styles.assetGridLabel} />
            {itemLabels.map((label, i) => (
              <span key={i} className={styles.assetGridItem}>{label}</span>
            ))}
          </div>
          {category.rows.map((row, i) => (
            <div key={i} className={styles.assetGridRow}>
              <span className={styles.assetGridLabel}>{row.label}</span>
              {row.values.map((val, j) => (
                <span key={j} className={styles.assetGridValue}>{val}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({
  playerName, playerRole, moveNumber, stats,
  goalTarget, progressAmount, statuses, assetCategories, icon,
}: DashboardProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <DashboardHeader
          playerName={playerName}
          playerRole={playerRole}
          moveNumber={moveNumber}
        />
        <div className={styles.avatar}>
          {icon ? (
            <img src={icon} alt={playerRole} className={styles.avatarIcon} />
          ) : (
            <div className={styles.avatarCircle} />
          )}
          <div className={styles.avatarRing} />
        </div>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.miniCards}>
          <MiniCard label="Наличные" amount={formatCurrency(stats.cash)} amountColor="rgb(0, 0, 0)" />
          <MiniCard label="Зарплата" amount={formatCurrency(stats.salary)} amountColor="rgb(52, 199, 89)" />
          <MiniCard label="Расходы" amount={formatCurrency(stats.expenses)} amountColor="rgb(255, 59, 48)" />
        </div>
        <div className={styles.largeCards}>
          <LargeCard label="Пассивный доход" amount={formatCurrency(stats.passiveIncome)} bgColor="rgb(88, 86, 214)" />
          <LargeCard label="Денежный поток" amount={formatCurrency(stats.cashFlow)} bgColor="rgb(52, 199, 89)" />
        </div>
      </div>

      <ProgressBar goalAmount={goalTarget} progressAmount={progressAmount} />

      <div className={styles.statusSection}>
        {statuses.map((s, i) => (
          <div key={i} className={styles.statusChip} style={{ background: s.bgColor }}>
            <span className={styles.statusLabel}>{s.label}</span>
            <span className={styles.statusDescription}>{s.description}</span>
          </div>
        ))}
      </div>

      <div className={styles.assetsSection}>
        {assetCategories.map((cat, i) => (
          <AssetCategoryCard key={i} category={cat} defaultExpanded={i === 0} />
        ))}
      </div>
    </div>
  )
}
