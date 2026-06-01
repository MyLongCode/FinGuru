import { type ReactNode } from 'react'
import styles from './RoleDetailsPage.module.css'

export interface FinancialItem {
  name: string
  amount: number
}

export interface RoleFinancialData {
  income: {
    items: FinancialItem[]
    total: number
  }
  expenses: {
    items: FinancialItem[]
    total: number
  }
  assets: FinancialItem[]
  liabilities: FinancialItem[]
  monthlyCashFlow: number
}

interface RoleDetailsPageProps {
  icon: string
  roleName: string
  financialData: RoleFinancialData
  onStartGame: () => void
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

type SectionColor = 'green' | 'red'

const dotColors: Record<SectionColor, string> = {
  green: '#34C759',
  red: '#FF3B30',
}

const amountColors: Record<SectionColor, string> = {
  green: '#34C759',
  red: '#FF3B30',
}

function TotalCell({ label, amount, color }: { label: string; amount: number; color: SectionColor }) {
  const c = amountColors[color]
  return (
    <div className={styles.totalCell}>
      <span className={styles.totalLabel}>{label}</span>
      <span className={styles.totalAmount} style={{ color: c }}>{formatCurrency(amount)}</span>
    </div>
  )
}

export default function RoleDetailsPage({ icon, roleName, financialData, onStartGame }: RoleDetailsPageProps) {
  const { income, expenses, assets, liabilities, monthlyCashFlow } = financialData

  interface SectionDef {
    label: string
    items: FinancialItem[]
    total?: number
    color: SectionColor
    totalLabel?: string
  }

  const sections: SectionDef[] = [
    { label: 'Доходы', items: income.items, total: income.total, color: 'green', totalLabel: 'общий доход' },
    { label: 'Расходы', items: expenses.items, total: expenses.total, color: 'red', totalLabel: 'общий расход' },
    { label: 'Активы', items: assets, color: 'green' },
    { label: 'Пассивы', items: liabilities, color: 'red' },
  ]

  let rowIndex = 1
  const gridRows: ReactNode[] = []

  for (const section of sections) {
    const count = section.items.length
    const startRow = rowIndex
    const endRow = rowIndex + count - 1

    gridRows.push(
      <div
        key={`label-${section.label}`}
        className={styles.sectionLabel}
        style={{ gridRow: `${startRow} / ${endRow + 1}`, color: dotColors[section.color] }}
      >
        <span className={styles.dot} style={{ background: dotColors[section.color] }} />
        {section.label}
      </div>
    )

    section.items.forEach((item, idx) => {
      const row = startRow + idx
      const isLast = idx === count - 1
      gridRows.push(
        <div
          key={`item-${section.label}-${idx}`}
          className={isLast && section.total != null ? styles.itemRowLast : styles.itemRow}
          style={{ gridRow: row }}
        >
          <span className={styles.itemName}>{item.name}</span>
          <span className={styles.itemAmount} style={{ color: amountColors[section.color] }}>
            {formatCurrency(item.amount)}
          </span>
        </div>
      )
    })

    if (section.total != null && section.totalLabel) {
      gridRows.push(
        <div
          key={`total-${section.label}`}
          className={styles.totalCell}
          style={{ gridRow: `${endRow}` }}
        >
          <span className={styles.totalLabel}>{section.totalLabel}</span>
          <span className={styles.totalAmount} style={{ color: amountColors[section.color] }}>
            {formatCurrency(section.total)}
          </span>
        </div>
      )
    }

    rowIndex = endRow + 1

    if (section !== sections[sections.length - 1]) {
      gridRows.push(
        <div key={`spacer-${section.label}`} className={styles.sectionSpacer} style={{ gridRow: rowIndex }} />
      )
      rowIndex += 1
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <img className={styles.icon} src={icon} alt={roleName} />
        <h1 className={styles.roleTitle}>{roleName}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.table}>
          {gridRows}
        </div>

        <div className={styles.cashFlowSection}>
          <p className={styles.cashFlowLabel}>Месячный денежный поток</p>
          <p className={styles.cashFlowAmount}>{formatCurrency(monthlyCashFlow)}</p>
        </div>

        <button className={styles.startButton} onClick={onStartGame}>
          Начать игру
        </button>
      </div>
    </div>
  )
}
