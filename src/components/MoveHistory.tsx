import { useState } from 'react'
import styles from './MoveHistory.module.css'

export interface FinancialRow {
  label: string
  change: string
  changeColor: string
  result: string
  resultColor: string
}

export interface DealCardData {
  title: string
  description: string
  price: string
}

export interface MoveEntry {
  key?: string
  playerName: string
  playerColor: string
  moveLabel: string
  time: string
  transactionType: string
  transactionTypeColor: string
  action: string
  actionColor: string
  finances: FinancialRow[]
  dealCard?: DealCardData
  turnNumber?: number
}

interface MoveHistoryProps {
  title: string
  entries: MoveEntry[]
}

interface MoveGroup {
  label: string
  entries: MoveEntry[]
}

function isGenericTitle(title: string) {
  return title.trim().toLocaleLowerCase('ru-RU') === 'история ходов'
}

function formatRoundTitle(label: string) {
  const trimmed = label.trim()
  if (!trimmed) return 'ХОД'

  const prefixedMove = trimmed.match(/^ход\s+(.+)$/i)
  const normalized = prefixedMove ? `${prefixedMove[1]} ход` : trimmed
  return normalized.toLocaleUpperCase('ru-RU')
}

function buildGroups(title: string, entries: MoveEntry[]): MoveGroup[] {
  if (entries.length === 0) return []

  if (!isGenericTitle(title)) {
    return [{ label: formatRoundTitle(title), entries }]
  }

  return entries.reduce<MoveGroup[]>((groups, entry) => {
    const label = entry.turnNumber ? `ХОД №${entry.turnNumber}` : formatRoundTitle(entry.moveLabel || title)
    const lastGroup = groups[groups.length - 1]

    if (lastGroup?.label === label) {
      lastGroup.entries.push(entry)
      return groups
    }

    groups.push({ label, entries: [entry] })
    return groups
  }, [])
}

function DealCard({ card }: { card: DealCardData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={styles.dealCard}>
      <button
        className={styles.dealHeader}
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={styles.dealHeaderText}>
          <span className={styles.dealTitle}>{card.title}</span>
        </div>
        <span className={`${styles.dealArrow} ${expanded ? styles.dealArrowUp : ''}`}>⌄</span>
      </button>
      {expanded && (
        <div className={styles.dealDetails}>
          {card.price && (
            <div className={styles.dealPriceRow}>
              <span className={styles.dealPriceLabel}>Цена</span>
              <span className={styles.dealPriceValue}>{card.price}</span>
            </div>
          )}
          {card.description && <p className={styles.dealDescription}>{card.description}</p>}
        </div>
      )}
    </div>
  )
}

function FinancialRows({ rows }: { rows: FinancialRow[] }) {
  if (rows.length === 0) return null

  return (
    <div className={styles.finances}>
      {rows.map((row, i) => (
        <div key={i} className={styles.financeRow}>
          <span className={styles.financeLabel}>{row.label}</span>
          <div className={styles.financeValues}>
            <span className={styles.financeChange} style={{ color: row.changeColor }}>
              {row.change}
            </span>
            <span className={styles.financeEquals}>=</span>
            <span className={styles.financeResult} style={{ color: row.resultColor }}>
              {row.result}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryEntry({ entry }: { entry: MoveEntry }) {
  return (
    <article className={styles.entry}>
      <div className={styles.playerRow}>
        <div className={styles.playerInfo}>
          <span className={styles.playerName} style={{ color: entry.playerColor }}>
            {entry.playerName}
          </span>
          <div className={styles.moveMeta}>
            <span className={styles.moveLabel}>{entry.moveLabel}</span>
            <span className={styles.moveTime}>{entry.time}</span>
          </div>
        </div>
      </div>

      <div className={styles.transactionHeader}>
        <span className={styles.transactionType} style={{ color: entry.transactionTypeColor }}>
          {entry.transactionType}
        </span>
        <span className={styles.transactionAction} style={{ color: entry.actionColor }}>
          {entry.action}
        </span>
      </div>

      <FinancialRows rows={entry.finances} />

      {entry.dealCard && <DealCard card={entry.dealCard} />}
    </article>
  )
}

export default function MoveHistory({ title, entries }: MoveHistoryProps) {
  const groups = buildGroups(title, entries)

  return (
    <div className={styles.container}>
      {groups.length > 0 ? (
        <div className={styles.list}>
          {groups.map((group, groupIndex) => (
            <section key={`${group.label}-${groupIndex}`} className={styles.roundGroup}>
              <h2 className={styles.roundTitle}>{group.label}</h2>
              <div className={styles.entries}>
                {group.entries.map((entry, entryIndex) => (
                  <HistoryEntry
                    key={entry.key ?? `${group.label}-${entry.playerName}-${entry.time}-${entryIndex}`}
                    entry={entry}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2 className={styles.roundTitle}>{title}</h2>
          <p>История появится после первого хода.</p>
        </div>
      )}
    </div>
  )
}
