import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../components/DoctorPortalSidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './PublishSuccessPage.module.css'

const PublishSuccessPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const articleId = (location.state as { articleId?: string } | null)?.articleId
  const [menuOpen, setMenuOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div className={`medilink-app ${styles.page}`}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <div className={`${styles.successScreen} ${visible ? styles.visible : ''}`}>
            <div className={styles.successIcon}>🎉</div>
            <h1 className={styles.successTitle}>Article Published!</h1>
            <p className={styles.successSub}>Your article is now live and visible to your patients.</p>

            <div className={styles.successActions}>
              {articleId && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => navigate(`/journals/view/${articleId}`)}
                >
                  👁️ View Article
                </button>
              )}
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