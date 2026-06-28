import styles from './DashboardHeader.module.css'

interface DashboardHeaderProps {
  playerName: string
  playerRole: string
  moveNumber: number
}

export default function DashboardHeader({ playerName, playerRole, moveNumber }: DashboardHeaderProps) {
  return (
    <div className={styles.info}>
      <div className={styles.playerNameRow}>
        <h1 className={styles.playerName}>{playerName}</h1>
        <div className={styles.sparkle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 0L9.8 5.5L15 8L9.8 10.5L8 16L6.2 10.5L1 8L6.2 5.5L8 0Z" fill="white" />
          </svg>
        </div>
      </div>
      <div className={styles.playerMeta}>
        <span className={styles.playerRole}>{playerRole}</span>
        <span className={styles.separator}>, </span>
        <span className={styles.moveNumber}>Ход {moveNumber}</span>
      </div>
    </div>
  )
}
