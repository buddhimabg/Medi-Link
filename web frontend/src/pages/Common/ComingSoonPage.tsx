import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './ComingSoonPage.module.css'

interface Props {
  title: string
  subtitle: string
  activePath: string
}

const ComingSoonPage: React.FC<Props> = ({ title, subtitle, activePath }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar activePath={activePath} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.badge}>Coming Soon</div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
            <p className={styles.note}>This section is under development and will be available soon.</p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ComingSoonPage
