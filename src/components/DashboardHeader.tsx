import styles from './DashboardHeader.module.css'
import sparkleIcon from '../assets/dashboard/sparkle.svg'
import roleSeparator from '../assets/dashboard/role-separator.svg'

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
        <div className={styles.sparkle} aria-hidden="true">
          <img src={sparkleIcon} alt="" />
        </div>
      </div>
      <div className={styles.playerMeta}>
        <span className={styles.playerRole}>{playerRole}</span>
        <span className={styles.separator} aria-hidden="true">
          <img src={roleSeparator} alt="" />
        </span>
        <span className={styles.moveNumber}>Ход {moveNumber}</span>
      </div>
    </div>
  )
}
