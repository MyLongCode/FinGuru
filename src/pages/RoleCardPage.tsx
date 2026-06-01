import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { icons, roleNames } from '../data/roles'
import styles from './RoleCardPage.module.css'

interface RoleCardPageProps {
  onTimeout?: () => void
}

export default function RoleCardPage({ onTimeout }: RoleCardPageProps) {
  const { roleName } = useParams<{ roleName: string }>()
  const displayName = roleName ? roleNames[roleName] : null
  const iconSrc = roleName ? icons[`/src/assets/roles/${roleName}.svg`] : undefined

  useEffect(() => {
    if (!roleName || !displayName || !iconSrc) return
    const timer = setTimeout(() => onTimeout?.(), 2500)
    return () => clearTimeout(timer)
  }, [roleName, displayName, iconSrc, onTimeout])

  if (!roleName || !displayName || !iconSrc) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>Роль не найдена</p>
        <Link to="/" className={styles.backLink}>Назад</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <p className={styles.label}>Ваша роль</p>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <img
            className={styles.icon}
            src={iconSrc}
            alt={displayName}
          />
        </div>
        <h1 className={styles.title}>{displayName}</h1>
      </div>
    </div>
  )
}
