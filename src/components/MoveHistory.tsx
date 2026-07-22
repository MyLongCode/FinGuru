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
  cardType?: string
  dealType?: string
  cost?: number
  cashFlow?: number
  assetValue?: number
  liabilityValue?: number
  offerPrice?: number
  saleRange?: string
  logic?: string
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
  card?: DealCardData
  /** @deprecated Kept for existing Storybook fixtures. */
  dealCard?: DealCardData
  turnNumber?: number
}

interface MoveHistoryProps {
  title: string
  entries: MoveEntry[]
  onOpenCard?: (card: DealCardData) => void
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

function CardButton({ card, onOpen }: { card: DealCardData; onOpen?: (card: DealCardData) => void }) {
  return (
    <button className={styles.openCardButton} type="button" onClick={() => onOpen?.(card)}>
      <span>{card.title}</span>
      <strong>Открыть карточку</strong>
    </button>
  )
}

function FinancialRows({ rows }: { rows: FinancialRow[] }) {
  if (rows.length === 0) return null

  return (
    <div className={styles.finances}>
      {rows.map((row, index) => (
        <div key={index} className={styles.financeRow}>
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

function HistoryEntry({ entry, onOpenCard }: { entry: MoveEntry; onOpenCard?: (card: DealCardData) => void }) {
  const card = entry.card ?? entry.dealCard

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
      {card && <CardButton card={card} onOpen={onOpenCard} />}
    </article>
  )
}

export default function MoveHistory({ title, entries, onOpenCard }: MoveHistoryProps) {
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
                    onOpenCard={onOpenCard}
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
