// src/components/layout/TopBar.tsx
import React, { useState, useRef, useEffect } from 'react'
import styles from './TopBar.module.css'

interface Props {
  doctorName?: string
  badge?: React.ReactNode
  onMenuClick?: () => void
  onLogout?: () => void
}

const TopBar: React.FC<Props> = ({
  doctorName = 'Dr. Dilshari',
  badge,
  onMenuClick,
  onLogout,
}) => {
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Outside click — dropdown close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Avatar initial — name ලෙන් ගන්නවා
  const initial = doctorName ? doctorName[0].toUpperCase() : 'D'

  return (
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

      {/* ── User dropdown ── */}
      <div className={styles.userRow} ref={dropRef}>
        <div
          className={styles.avatar}
          onClick={() => setDropOpen(v => !v)}
          title="Account"
        >
          {initial}
        </div>
        <span
          className={styles.doctorName}
          onClick={() => setDropOpen(v => !v)}
        >
          {doctorName}
        </span>

        {/* Dropdown */}
        {dropOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropHeader}>
              <div className={styles.dropAvatar}>{initial}</div>
              <div>
                <div className={styles.dropName}>{doctorName}</div>
                <div className={styles.dropRole}>
                  {doctorName.toLowerCase().startsWith('dr') ? 'Doctor' : 'Patient'}
                </div>
              </div>
            </div>
            <div className={styles.dropDivider} />
            <button
              className={styles.dropItem}
              onClick={() => { setDropOpen(false) }}
            >
              👤 Profile
            </button>
            <button
              className={styles.dropItem}
              onClick={() => { setDropOpen(false) }}
            >
              ⚙️ Settings
            </button>
            <div className={styles.dropDivider} />
            <button
              className={`${styles.dropItem} ${styles.dropItemLogout}`}
              onClick={() => {
                setDropOpen(false)
                onLogout?.()
              }}
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default TopBar