// src/components/layout/TopBar.tsx
import React from 'react'
import styles from './TopBar.module.css'

interface Props {
  doctorName?: string
  badge?: React.ReactNode
  onMenuClick?: () => void
}

const TopBar: React.FC<Props> = ({ doctorName = 'Dr. Dilshari', badge, onMenuClick }) => (
  <header className={styles.topbar}>
    <button
      className={styles.menuBtn}
      title="Open menu"
      aria-label="Open navigation menu"
      onClick={onMenuClick}
      type="button"
    >
      ☰
    </button>
    <div className={styles.logo}>
      <span className={styles.logoMedi}>Medi</span>
      <span className={styles.logoLink}>Link</span>
    </div>
    {badge ? <div className={styles.badgeWrap}>{badge}</div> : null}
    <div className={styles.spacer} />
    <button className={styles.iconBtn} title="Notifications">🔔</button>
    <div className={styles.userRow}>
      <div className={styles.avatar}>D</div>
      <span className={styles.doctorName}>{doctorName}</span>
    </div>
  </header>
)

export default TopBar