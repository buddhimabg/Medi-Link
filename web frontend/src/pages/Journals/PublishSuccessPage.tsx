import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './PublishSuccessPage.module.css'

const PublishSuccessPage: React.FC = () => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div className={`medilink-app ${styles.page}`}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <div className={`${styles.successScreen} ${visible ? styles.visible : ''}`}>
            <div className={styles.successIcon}>🎉</div>
            <h1 className={styles.successTitle}>Article Published!</h1>
            <p className={styles.successSub}>Your article is now live and visible to your patients.</p>

            <div className={styles.successStats}>
              <div className={styles.successStat}>
                <div className={styles.successStatVal}>18</div>
                <div className={styles.successStatLabel}>Patients Notified</div>
              </div>
              <div className={styles.successStat}>
                <div className={styles.successStatVal}>3</div>
                <div className={styles.successStatLabel}>FAQ Links Created</div>
              </div>
              <div className={styles.successStat}>
                <div className={styles.successStatVal}>5 min</div>
                <div className={styles.successStatLabel}>Est. Read Time</div>
              </div>
            </div>

            <div className={styles.successActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => navigate('/journals/view/1')}
              >
                👁️ View Article
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => navigate('/journals')}
              >
                ← Back to Journals
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default PublishSuccessPage