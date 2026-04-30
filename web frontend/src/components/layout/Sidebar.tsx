// src/components/layout/Sidebar.tsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

interface Props {
  activePath?: string
  isOpen?: boolean
  onClose?: () => void
}

const NAV_ITEMS = [
  { icon: '🏠', label: 'Dashboard',  path: '/dashboard'  },
  { icon: '📅', label: 'Schedule',   path: '/schedule'   },
  { icon: '👤', label: 'Patient',    path: '/patients'   },
  { icon: '🎥', label: 'Video Call', path: '/video-call' },
  { icon: '💬', label: 'Chatbot',    path: '/chatbot'    },
  { icon: '📖', label: 'Journals',   path: '/journals'   },
]

const Sidebar: React.FC<Props> = ({ activePath, isOpen = false, onClose }) => (
  <>
    <button
      type="button"
      aria-label="Close navigation menu"
      className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
      onClick={onClose}
    />
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.sidebarLogo}>
        <div className={styles.logoText}>Medi<span>Link</span></div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => {
          const isActive = activePath?.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive && <div className={styles.activeBar} />}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  </>
)

export default Sidebar