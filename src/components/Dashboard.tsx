import { useState, type ReactNode } from 'react'
import styles from './Dashboard.module.css'
import ProgressBar from './ProgressBar'
import DashboardHeader from './DashboardHeader'
import { formatCurrency } from '../utils/format'
import type { FinGuruAsset, FinGuruLiability } from '../sdk'

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
  assetCategories?: AssetCategory[]
  assets?: FinGuruAsset[]
  liabilities?: FinGuruLiability[]
  cash?: number
  disabled?: boolean
  icon?: string
  onSellAsset?: (assetId: string) => void
  onPayLiability?: (liabilityId: string) => void
}

function MoneyCard({
  label,
  amount,
  tone,
  large = false,
}: {
  label: string
  amount: number
  tone: 'cash' | 'income' | 'expense' | 'passive' | 'flow'
  large?: boolean
}) {
  return (
    <div className={large ? `${styles.moneyCard} ${styles.moneyCardLarge} ${styles[`moneyCard_${tone}`]}` : styles.moneyCard}>
      <span className={styles.moneyLabel}>{label}</span>
      <strong className={`${styles.moneyAmount} ${styles[`tone_${tone}`]}`}>{formatCurrency(amount)}</strong>
    </div>
  )
}

function Section({
  title,
  children,
  defaultExpanded = true,
}: {
  title: string
  children: ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className={styles.financialSection}>
      <button className={styles.sectionHeader} type="button" onClick={() => setExpanded(!expanded)}>
        <span className={`${styles.sectionArrow} ${expanded ? styles.sectionArrowOpen : ''}`}>⌄</span>
        <span>{title}</span>
      </button>
      {expanded && <div className={styles.sectionBody}>{children}</div>}
    </section>
  )
}

function groupByType<T extends { assetType?: string; liabilityType?: string }>(
  items: T[],
  key: 'assetType' | 'liabilityType',
) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const group = item[key] || 'other'
    acc[group] = [...(acc[group] ?? []), item]
    return acc
  }, {})
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'smallDeal':
      return 'Мелкие сделки'
    case 'bigDeal':
      return 'Крупные сделки'
    case 'creditCard':
      return 'Кредитные карты'
    case 'carLoan':
      return 'Автокредит'
    case 'mortgage':
      return 'Ипотека'
    case 'smallLoan':
      return 'Мелкие кредиты'
    default:
      return 'Прочее'
  }
}

function AssetsTable({
  assets,
  disabled,
  onSellAsset,
}: {
  assets: FinGuruAsset[]
  disabled: boolean
  onSellAsset?: (assetId: string) => void
}) {
  if (assets.length === 0) {
    return <p className={styles.emptyText}>Активов пока нет</p>
  }

  const grouped = groupByType(assets, 'assetType')

  return (
    <div className={styles.groupStack}>
      {Object.entries(grouped).map(([type, group]) => {
        const passive = group.reduce((sum, asset) => sum + asset.cashFlow, 0)
        const value = group.reduce((sum, asset) => sum + asset.cost, 0)

        return (
          <div key={type} className={styles.tableGroup}>
            <div className={styles.groupSummary}>
              <span>{getTypeLabel(type)}</span>
              <strong className={styles.tone_passive}>{formatCurrency(passive)}</strong>
              <strong className={styles.tone_income}>{formatCurrency(value)}</strong>
            </div>
            <div className={styles.financeTable}>
              <span className={styles.tableHead}>Актив</span>
              <span className={styles.tableHead}>Пассив. доход ₽</span>
              <span className={styles.tableHead}>Актив ₽</span>
              <span className={styles.tableHead}>Кол-во</span>
              <span className={styles.tableHead} />
              {group.map(asset => {
                const salePrice = Math.round(asset.cost * 0.8)
                return (
                  <div key={asset.id || asset.title} className={styles.tableRow}>
                    <span>{asset.title || 'Актив'}</span>
                    <strong className={styles.tone_passive}>{formatCurrency(asset.cashFlow)}</strong>
                    <strong className={styles.tone_income}>{formatCurrency(asset.cost)}</strong>
                    <span>{asset.quantity || 1}</span>
                    {onSellAsset ? (
                      <button
                        className={styles.rowAction}
                        type="button"
                        disabled={disabled || !asset.id}
                        title={`Продать за ${formatCurrency(salePrice)}`}
                        onClick={() => onSellAsset(asset.id)}
                      >
                        Продать
                      </button>
                    ) : <span />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LiabilitiesTable({
  liabilities,
  cash,
  disabled,
  onPayLiability,
}: {
  liabilities: FinGuruLiability[]
  cash: number
  disabled: boolean
  onPayLiability?: (liabilityId: string) => void
}) {
  if (liabilities.length === 0) {
    return <p className={styles.emptyText}>Пассивов пока нет</p>
  }

  const grouped = groupByType(liabilities, 'liabilityType')

  return (
    <div className={styles.groupStack}>
      {Object.entries(grouped).map(([type, group]) => {
        const payment = group.reduce((sum, liability) => sum + liability.payment, 0)
        const balance = group.reduce((sum, liability) => sum + liability.balance, 0)

        return (
          <div key={type} className={styles.tableGroup}>
            <div className={styles.groupSummary}>
              <span>{getTypeLabel(type)}</span>
              <strong className={styles.tone_expense}>{formatCurrency(payment)}</strong>
              <strong className={styles.tone_expense}>{formatCurrency(balance)}</strong>
            </div>
            <div className={styles.financeTableLiability}>
              <span className={styles.tableHead}>Статья</span>
              <span className={styles.tableHead}>Расход в мес. ₽</span>
              <span className={styles.tableHead}>Долг ₽</span>
              <span className={styles.tableHead} />
              {group.map(liability => {
                const canPay = cash >= liability.balance
                return (
                  <div key={liability.id || liability.title} className={styles.tableRowLiability}>
                    <span>{liability.title || 'Пассив'}</span>
                    <strong className={styles.tone_expense}>{formatCurrency(liability.payment)}</strong>
                    <strong className={styles.tone_expense}>{formatCurrency(liability.balance)}</strong>
                    {onPayLiability ? (
                      <button
                        className={styles.rowAction}
                        type="button"
                        disabled={disabled || !canPay || !liability.id || liability.balance <= 0}
                        title={canPay ? 'Погасить долг' : 'Не хватает наличных'}
                        onClick={() => onPayLiability(liability.id)}
                      >
                        Погасить
                      </button>
                    ) : <span />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard({
  playerName,
  playerRole,
  moveNumber,
  stats,
  goalTarget,
  progressAmount,
  statuses,
  assets = [],
  liabilities = [],
  cash = stats.cash,
  disabled = false,
  icon,
  onSellAsset,
  onPayLiability,
}: DashboardProps) {
  const totalIncome = stats.salary + stats.passiveIncome
  const liabilitiesPayment = liabilities.reduce((sum, liability) => sum + liability.payment, 0)
  const totalDebt = liabilities.reduce((sum, liability) => sum + liability.balance, 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <DashboardHeader
          playerName={playerName}
          playerRole={playerRole}
          moveNumber={moveNumber}
        />
        {icon ? (
          <img className={styles.avatarIcon} src={icon} alt="" />
        ) : (
          <div className={styles.avatar}>
            <div className={styles.avatarCircle} />
            <div className={styles.avatarRing} />
          </div>
        )}
      </div>

      <div className={styles.statsSection}>
        <div className={styles.miniCards}>
          <MoneyCard label="Наличные" amount={stats.cash} tone="cash" />
          <MoneyCard label="Зарплата" amount={stats.salary} tone="income" />
          <MoneyCard label="Расходы" amount={stats.expenses} tone="expense" />
        </div>
        <div className={styles.largeCards}>
          <MoneyCard label="Пассивный доход" amount={stats.passiveIncome} tone="passive" large />
          <MoneyCard label="Денежный поток" amount={stats.cashFlow} tone="flow" large />
        </div>
      </div>

      <ProgressBar goalAmount={goalTarget} progressAmount={progressAmount} />

      {statuses.length > 0 && (
        <div className={styles.statusSection}>
          {statuses.map((status, index) => (
            <div key={`${status.label}-${index}`} className={styles.statusChip} style={{ background: status.bgColor }}>
              <span className={styles.statusLabel}>{status.label}</span>
              <span className={styles.statusDescription}>{status.description}</span>
            </div>
          ))}
        </div>
      )}

      <Section title="Доходы и активы" defaultExpanded>
        <div className={styles.totalStrip}>
          <span>
            Общий доход
            <strong className={styles.tone_income}>{formatCurrency(totalIncome)}</strong>
          </span>
          <span>
            Пассив. доход
            <strong className={styles.tone_passive}>{formatCurrency(stats.passiveIncome)}</strong>
          </span>
          <span>
            Денеж. поток
            <strong className={styles.tone_flow}>{formatCurrency(stats.cashFlow)}</strong>
          </span>
        </div>
        <div className={styles.baseLine}>
          <span>Зарплата</span>
          <strong className={styles.tone_income}>{formatCurrency(stats.salary)}</strong>
        </div>
        <AssetsTable assets={assets} disabled={disabled} onSellAsset={onSellAsset} />
      </Section>

      <Section title="Расходы и пассивы" defaultExpanded>
        <div className={styles.totalStrip}>
          <span>
            Общие расходы
            <strong className={styles.tone_expense}>{formatCurrency(stats.expenses)}</strong>
          </span>
          <span>
            Платежи
            <strong className={styles.tone_expense}>{formatCurrency(liabilitiesPayment)}</strong>
          </span>
          <span>
            Долги
            <strong className={styles.tone_expense}>{formatCurrency(totalDebt)}</strong>
          </span>
        </div>
        <LiabilitiesTable
          liabilities={liabilities}
          cash={cash}
          disabled={disabled}
          onPayLiability={onPayLiability}
        />
      </Section>
    </div>
  )
}
