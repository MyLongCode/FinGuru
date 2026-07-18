import { useMemo, useState, type ReactNode } from 'react'
import styles from './Dashboard.module.css'
import ProgressBar from './ProgressBar'
import DashboardHeader from './DashboardHeader'
import { formatCurrency } from '../utils/format'
import { getBankCreditProjection } from '../utils/gameUi'
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

type MoneyTone = 'cash' | 'income' | 'expense' | 'passive' | 'flow'

function MoneyCard({
  label,
  amount,
  tone,
  large = false,
}: {
  label: string
  amount: number
  tone: MoneyTone
  large?: boolean
}) {
  return (
    <div className={`${styles.moneyCard} ${large ? styles.moneyCardLarge : ''} ${large ? styles[`moneyCard_${tone}`] : ''}`}>
      <span className={styles.moneyLabel}>{label}</span>
      <strong className={`${styles.moneyAmount} ${styles[`tone_${tone}`]}`}>{formatCurrency(amount)}</strong>
    </div>
  )
}

function Section({
  title,
  children,
  summary,
  defaultExpanded = true,
}: {
  title: string
  children: ReactNode
  summary?: ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <section className={styles.financialSection}>
      <button className={styles.sectionHeader} type="button" onClick={() => setExpanded(!expanded)}>
        <span>{title}</span>
        <span className={`${styles.sectionArrow} ${expanded ? styles.sectionArrowOpen : ''}`}>⌄</span>
      </button>
      {summary}
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

function getAssetKind(asset: FinGuruAsset) {
  const text = `${asset.title} ${asset.assetType}`.toLocaleLowerCase('ru-RU')
  if (text.includes('акци') || text.includes('привилег')) return 'stock'
  if (text.includes('недвиж') || text.includes('дом') || text.includes('квартира') || text.includes('плекс')) return 'realEstate'
  if (text.includes('бизнес') || text.includes('предприят') || text.includes('партн')) return 'business'
  return asset.assetType || 'asset'
}

function getAssetGroupTitle(kind: string, count: number) {
  switch (kind) {
    case 'stock':
      return `Акции / ${count} комп.`
    case 'realEstate':
      return `Недвижимость / ${count} шт.`
    case 'business':
      return `Предприятий / ${count} шт.`
    case 'smallDeal':
      return `Мелкие сделки / ${count} шт.`
    case 'bigDeal':
      return `Крупные сделки / ${count} шт.`
    default:
      return `Активы / ${count} шт.`
  }
}

function getLiabilityGroupTitle(type: string, count: number) {
  switch (type) {
    case 'mortgage':
      return `Ипотека / ${count} шт.`
    case 'educationLoan':
      return `Кредиты на образование / ${count} шт.`
    case 'carLoan':
      return `Автокредит / ${count} шт.`
    case 'creditCard':
      return `Кредитные карты / ${count} шт.`
    case 'smallLoan':
      return `Мелкие кредиты / ${count} шт.`
    case 'bankLoan':
      return `Кредиты / ${count} шт.`
    case 'smallDeal':
    case 'bigDeal':
      return `Пассивы / ${count} шт.`
    default:
      return `Пассивы / ${count} шт.`
  }
}

function shortAssetTitle(asset: FinGuruAsset) {
  const title = asset.title || 'Актив'
  const stockMatch = title.match(/(?:компания|акции)\s+([A-ZА-Я0-9]+[A-ZА-Я0-9 -]*)/i)
  if (stockMatch?.[1]) return stockMatch[1].replace(/Drug|Power/gi, '').trim()
  return title.replace(/^Акции\s+—\s+/i, '').replace(/ на продажу$/i, '')
}

function AssetGroupTable({ group, kind }: { group: FinGuruAsset[]; kind: string }) {
  const isStock = kind === 'stock'

  return (
    <div className={isStock ? styles.assetTableStock : styles.assetTable}>
      {isStock ? (
        <>
          <span className={styles.tableHead}>Акция</span>
          <span className={styles.tableHead}>Цена</span>
          <span className={styles.tableHead}>Кол-во</span>
          <span className={styles.tableHead}>Сумма</span>
          {group.map(asset => (
            <div key={asset.id || asset.title} className={styles.tableRow}>
              <span>{shortAssetTitle(asset)}</span>
              <strong>{formatCurrency(Math.max(0, asset.cost / Math.max(1, asset.quantity)))}</strong>
              <span>{asset.quantity || 1}</span>
              <strong className={styles.tone_income}>{formatCurrency(asset.cost)}</strong>
            </div>
          ))}
        </>
      ) : (
        <>
          <span className={styles.tableHead}>Недвижимость</span>
          <span className={styles.tableHead}>Пассив. доход ₽</span>
          <span className={styles.tableHead}>Актив ₽</span>
          <span className={styles.tableHead}>Кол-во</span>
          {group.map(asset => (
            <div key={asset.id || asset.title} className={styles.tableRow}>
              <span>{shortAssetTitle(asset)}</span>
              <strong className={styles.tone_passive}>{formatCurrency(asset.cashFlow)}</strong>
              <strong>{formatCurrency(asset.cost)}</strong>
              <span>{asset.quantity || 1}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function AssetsTable({ assets }: { assets: FinGuruAsset[] }) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  if (assets.length === 0) {
    return <p className={styles.emptyText}>Активов пока нет</p>
  }

  const grouped = assets.reduce<Record<string, FinGuruAsset[]>>((acc, asset) => {
    const kind = getAssetKind(asset)
    acc[kind] = [...(acc[kind] ?? []), asset]
    return acc
  }, {})

  return (
    <div className={styles.groupStack}>
      {Object.entries(grouped).map(([kind, group]) => {
        const passive = group.reduce((sum, asset) => sum + asset.cashFlow, 0)
        const value = group.reduce((sum, asset) => sum + asset.cost, 0)
        const expanded = !collapsedGroups[kind]

        return (
          <div key={kind} className={styles.tableGroup}>
            <button
              type="button"
              className={styles.groupHeader}
              aria-expanded={expanded}
              onClick={() => setCollapsedGroups(current => ({ ...current, [kind]: !current[kind] }))}
            >
              <span className={`${styles.groupChevron} ${expanded ? styles.groupChevronOpen : ''}`}>⌄</span>
              <span className={styles.groupSummary}>
                <span>{getAssetGroupTitle(kind, group.length)}</span>
                <strong className={styles.tone_passive}>{formatCurrency(passive)}</strong>
                <strong className={styles.tone_income}>{formatCurrency(value)}</strong>
              </span>
            </button>
            {expanded && <AssetGroupTable group={group} kind={kind} />}
          </div>
        )
      })}
    </div>
  )
}

function IncomeRows({
  salary,
  assets,
}: {
  salary: number
  assets: FinGuruAsset[]
}) {
  const incomeAssets = assets.filter(asset => asset.cashFlow !== 0)

  return (
    <div className={styles.incomeList}>
      <div className={styles.plainRow}>
        <span>Зарплата</span>
        <strong className={styles.tone_income}>{formatCurrency(salary)}</strong>
      </div>
      {incomeAssets.length > 0 && <AssetsTable assets={incomeAssets} />}
    </div>
  )
}

function ExpenseRows({
  baseExpenses,
}: {
  baseExpenses: number
}) {
  return (
    <div className={styles.expenseList}>
      <div className={styles.plainRow}>
        <span>Налоги</span>
        <strong className={styles.tone_expense}>{formatCurrency(0)}</strong>
      </div>
      <div className={styles.plainRow}>
        <span>Постоянные расходы</span>
        <strong className={styles.tone_expense}>{formatCurrency(baseExpenses)}</strong>
      </div>
      <div className={styles.plainRow}>
        <span>Дети x0</span>
        <strong className={styles.tone_expense}>{formatCurrency(0)}</strong>
      </div>
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
  const grouped = groupByType(liabilities, 'liabilityType')

  return (
    <div className={styles.groupStack}>
      {liabilities.length === 0 && <p className={styles.emptyText}>Пассивов пока нет</p>}
      {Object.entries(grouped).map(([type, group]) => {
        const payment = group.reduce((sum, liability) => sum + liability.payment, 0)
        const balance = group.reduce((sum, liability) => sum + liability.balance, 0)

        return (
          <div key={type} className={styles.tableGroup}>
            <div className={styles.groupHeader}>
              <span className={styles.groupChevron}>⌄</span>
              <div className={styles.groupSummary}>
                <span>{getLiabilityGroupTitle(type, group.length)}</span>
                <strong>{formatCurrency(balance)}</strong>
                <strong className={styles.tone_expense}>{formatCurrency(payment)}</strong>
              </div>
            </div>
            <div className={styles.liabilityTable}>
              <span className={styles.tableHead}>Статья</span>
              <span className={styles.tableHead}>Расход в мес. ₽</span>
              <span className={styles.tableHead}>Долг ₽</span>
              <span className={styles.tableHead} />
              {group.map(liability => {
                const canPay = liability.liabilityType === 'bankLoan'
                  ? cash > 0
                  : cash >= liability.balance
                return (
                  <div key={liability.id || liability.title} className={styles.tableRowLiability}>
                    <span>{liability.title || 'Пассив'}</span>
                    <strong className={styles.tone_expense}>{formatCurrency(liability.payment)}</strong>
                    <strong>{formatCurrency(liability.balance)}</strong>
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

function CreditInfo({
  availableCredit,
  creditPayment,
  disabled,
  onTakeCredit,
}: {
  availableCredit: number
  creditPayment: number
  disabled: boolean
  onTakeCredit?: () => void
}) {
  return (
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
  )
}

function SummaryStrip({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: MoneyTone }>
}) {
  return (
    <div className={styles.totalStrip}>
      {items.map(item => (
        <span key={item.label}>
          {item.label}
          <strong className={item.tone ? styles[`tone_${item.tone}`] : undefined}>{item.value}</strong>
        </span>
      ))}
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
  const liabilitiesPayment = liabilities.reduce((sum, liability) => sum + liability.payment, 0)
  const totalDebt = liabilities.reduce((sum, liability) => sum + liability.balance, 0)
  const assetValue = assets.reduce((sum, asset) => sum + asset.cost, 0)
  const assetQuantity = assets.reduce((sum, asset) => sum + Math.max(1, asset.quantity || 1), 0)
  const totalIncome = stats.salary + stats.passiveIncome
  const baseExpenses = Math.max(0, stats.expenses - liabilitiesPayment)
  const creditProjection = getBankCreditProjection(totalIncome, stats.expenses, liabilities, 0)
  const availableCredit = creditProjection.maximum
  const creditPayment = availableCredit > 0
    ? getBankCreditProjection(totalIncome, stats.expenses, liabilities, availableCredit).combinedPayment
    : creditProjection.combinedPayment
  const canClaimSalary = salaryPayoutMode === 'manual' && accruedSalary > 0 && Boolean(onClaimSalary)
  const skipStatus = statuses.find(status => status.label === 'Пропуск хода')
  const statusItems = useMemo(() => statuses.filter(status => status.label !== 'Пропуск хода').slice(0, 3), [statuses])

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

      {skipStatus && (
        <div className={styles.skipAlert} role="status">
          <strong>{skipStatus.label}</strong>
          <span>{skipStatus.description}</span>
        </div>
      )}

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

      {!assetsOnly && statusItems.length > 0 && (
        <div className={styles.statusSection}>
          {statusItems.map((status, index) => (
            <div key={`${status.label}-${index}`} className={styles.statusChip} style={{ background: status.bgColor }}>
              <span className={styles.statusLabel}>{status.label}</span>
              <span className={styles.statusDescription}>{status.description}</span>
            </div>
          ))}
        </div>
      )}

      <Section
        title="Активы"
        defaultExpanded
        summary={<SummaryStrip
          items={[
            { label: 'Пассив. доход', value: formatCurrency(stats.passiveIncome), tone: 'passive' },
            { label: 'Стоимость', value: formatCurrency(assetValue), tone: 'income' },
            { label: 'Количество', value: `${assetQuantity} шт.` },
          ]}
        />}
      >
        <AssetsTable assets={assets} />
      </Section>

      {!assetsOnly && (
        <Section
          title="Доходы"
          defaultExpanded
          summary={<SummaryStrip
            items={[
              { label: 'Общий доход', value: formatCurrency(totalIncome), tone: 'income' },
              { label: 'Пассив. доход', value: formatCurrency(stats.passiveIncome), tone: 'passive' },
              { label: 'Денеж. поток', value: formatCurrency(stats.cashFlow), tone: 'flow' },
            ]}
          />}
        >
          <IncomeRows salary={stats.salary} assets={assets} />
        </Section>
      )}

      {!assetsOnly && (
        <Section title="Расходы и пассивы" defaultExpanded>
          <SummaryStrip
            items={[
              { label: 'Общие расходы', value: formatCurrency(stats.expenses) },
              { label: 'Снижаем. расходы', value: formatCurrency(liabilitiesPayment), tone: 'expense' },
              { label: 'Пассивы', value: formatCurrency(totalDebt) },
            ]}
          />
          <ExpenseRows baseExpenses={baseExpenses} />
          <LiabilitiesTable
            liabilities={liabilities}
            cash={cash}
            disabled={disabled}
            onPayLiability={onPayLiability}
          />
          <CreditInfo
            availableCredit={availableCredit}
            creditPayment={creditPayment}
            disabled={disabled}
            onTakeCredit={onTakeCredit}
          />
        </Section>
      )}
    </div>
  )
}
