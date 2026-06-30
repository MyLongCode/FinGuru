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
  bigCircleTarget: number
  passiveIncomeProgress: number
  bigCircleRemaining: number
  statuses: DashboardStatus[]
  assetCategories?: AssetCategory[]
  assets?: FinGuruAsset[]
  liabilities?: FinGuruLiability[]
  cash?: number
  disabled?: boolean
  assetsOnly?: boolean
  accruedSalary?: number
  salaryPayoutMode?: 'automatic' | 'manual'
  icon?: string
  onPayLiability?: (liabilityId: string) => void
  onTakeCredit?: () => void
  onClaimSalary?: () => void
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
    case 'bankLoan':
      return 'Кредиты'
    default:
      return 'Прочее'
  }
}

function AssetsTable({
  assets,
}: {
  assets: FinGuruAsset[]
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
              {group.map(asset => (
                  <div key={asset.id || asset.title} className={styles.tableRow}>
                    <span>{asset.title || 'Актив'}</span>
                    <strong className={styles.tone_passive}>{formatCurrency(asset.cashFlow)}</strong>
                    <strong className={styles.tone_income}>{formatCurrency(asset.cost)}</strong>
                    <span>{asset.quantity || 1}</span>
                  </div>
              ))}
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
  availableCredit,
  creditPayment,
  onTakeCredit,
}: {
  liabilities: FinGuruLiability[]
  cash: number
  disabled: boolean
  onPayLiability?: (liabilityId: string) => void
  availableCredit: number
  creditPayment: number
  onTakeCredit?: () => void
}) {
  const grouped = groupByType(liabilities, 'liabilityType')

  return (
    <div className={styles.groupStack}>
      {liabilities.length === 0 && <p className={styles.emptyText}>Пассивов пока нет</p>}
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
      <div className={styles.creditInfo}>
        <div>
          <span>Доступен кредит</span>
          <strong>
            {formatCurrency(availableCredit)}
            {' '}
            <em>({formatCurrency(creditPayment)})</em>
          </strong>
        </div>
        <button
          className={styles.creditButton}
          type="button"
          disabled={disabled || availableCredit <= 0 || !onTakeCredit}
          onClick={onTakeCredit}
        >
          Взять кредит
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({
  playerName,
  playerRole,
  moveNumber,
  stats,
  bigCircleTarget,
  passiveIncomeProgress,
  bigCircleRemaining,
  statuses,
  assets = [],
  liabilities = [],
  cash = stats.cash,
  disabled = false,
  assetsOnly = false,
  accruedSalary = 0,
  salaryPayoutMode = 'automatic',
  icon,
  onPayLiability,
  onTakeCredit,
  onClaimSalary,
}: DashboardProps) {
  const totalIncome = stats.salary + stats.passiveIncome
  const liabilitiesPayment = liabilities.reduce((sum, liability) => sum + liability.payment, 0)
  const totalDebt = liabilities.reduce((sum, liability) => sum + liability.balance, 0)
  const availableCredit = Math.max(0, stats.cashFlow * 10)
  const creditPayment = availableCredit > 0 ? Math.ceil(availableCredit * 0.1) : 0
  const canClaimSalary = salaryPayoutMode === 'manual' && accruedSalary > 0 && Boolean(onClaimSalary)

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

      {!assetsOnly && (
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
          {salaryPayoutMode === 'manual' && (
            <button
              className={styles.salaryClaimButton}
              type="button"
              disabled={disabled || !canClaimSalary}
              onClick={onClaimSalary}
            >
              Получить зарплату {formatCurrency(accruedSalary)}
            </button>
          )}
        </div>
      )}

      {!assetsOnly && (
        <ProgressBar
          bigCircleTarget={bigCircleTarget}
          passiveIncomeProgress={passiveIncomeProgress}
          bigCircleRemaining={bigCircleRemaining}
        />
      )}

      {!assetsOnly && statuses.length > 0 && (
        <div className={styles.statusSection}>
          {statuses.map((status, index) => (
            <div key={`${status.label}-${index}`} className={styles.statusChip} style={{ background: status.bgColor }}>
              <span className={styles.statusLabel}>{status.label}</span>
              <span className={styles.statusDescription}>{status.description}</span>
            </div>
          ))}
        </div>
      )}

      <Section title="Активы" defaultExpanded>
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
        {!assetsOnly && (
          <div className={styles.baseLine}>
            <span>Зарплата</span>
            <strong className={styles.tone_income}>{formatCurrency(stats.salary)}</strong>
          </div>
        )}
        <AssetsTable assets={assets} />
      </Section>

      {!assetsOnly && <Section title="Расходы" defaultExpanded>
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
          availableCredit={availableCredit}
          creditPayment={creditPayment}
          onTakeCredit={onTakeCredit}
        />
      </Section>}
    </div>
  )
}
