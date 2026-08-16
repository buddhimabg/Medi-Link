import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import TopBar from '../../components/layout/TopBar'
import styles from './UploadProgressPage.module.css'

const UploadProgressPage: React.FC = () => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(70)

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 99) { clearInterval(t); return 99 }
        return p + 1
      })
    }, 80)
    return () => clearInterval(t)
  }, [])

  const steps = [
    { icon: '✅', label: 'File validated',          status: 'Done',  state: 'done'    },
    { icon: '⏳', label: 'Uploading to server...',  status: `${progress}%`, state: progress >= 99 ? 'done' : 'active' },
    { icon: '🔍', label: 'Content review',          status: '',      state: progress >= 99 ? 'active' : 'pending' },
    { icon: '🌐', label: 'Publishing to patients',  status: '',      state: 'pending' },
  ]

  return (
    <div className={`medilink-app ${styles.page}`}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar activePath="/journals" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <h1 className={styles.pageTitle}>Upload Article</h1>
          <p className={styles.pageSub}>Uploading and processing your article</p>

          <div className={styles.progressGrid}>
            {/* Left */}
            <div className={styles.card}>
              <div className={styles.cardSectionTitle}>📤 Upload Progress</div>

              <div className={styles.fileUploadItem}>
                <div className={styles.fileUploadHeader}>
                  <span className={styles.fileUploadIcon}>📄</span>
                  <div className={styles.fileUploadInfo}>
                    <div className={styles.fileUploadName}>Managing_Anxiety_CBT.pdf</div>
                    <div className={styles.fileUploadSize}>2.4 MB · {progress < 99 ? 'Uploading...' : 'Complete'}</div>
                  </div>
                  <button type="button" className={styles.fileUploadClose}>✕</button>
                </div>
                <div className={styles.progressBarWrap}>
                  <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className={styles.steps}>
                {steps.map(step => (
                  <div
                    key={step.label}
                    className={`${styles.step} ${
                      step.state === 'done' ? styles.stepDone :
                      step.state === 'active' ? styles.stepActive : styles.stepPending
                    }`}
                  >
                    <span className={styles.stepIcon}>{step.icon}</span>
                    <span className={styles.stepText}>{step.label}</span>
                    {step.status && <span className={styles.stepStatus}>{step.status}</span>}
                  </div>
                ))}
              </div>

              <div className={styles.warningBanner}>⏳ Please wait. Do not close this page.</div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => navigate('/journals/upload')}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  style={{ flex: 1 }}
                  onClick={() => navigate('/journals/success')}
                >
                  Complete Upload
                </button>
              </div>
            </div>

            {/* Right */}
            <div>
              <div className={styles.previewCard}>
                <div className={styles.previewCardHeader}>
                  <div className={styles.previewDots}>
                    <div className={`${styles.dot} ${styles.dotRed}`} />
                    <div className={`${styles.dot} ${styles.dotYellow}`} />
                    <div className={`${styles.dot} ${styles.dotGreen}`} />
                  </div>
                  <span>Article Preview</span>
                </div>
                <div className={styles.previewCardBody}>
                  <div className={styles.previewTitle}>Managing Anxiety with CBT</div>
                  <div className={styles.previewDesc}>
                    Evidence-based CBT strategies for managing anxiety disorders, including thought restructuring and graded exposure...
                  </div>
                  <div className={styles.previewTags}>
                    <span className={styles.previewTag}>CBT</span>
                    <span className={styles.previewTag}>Anxiety</span>
                    <span className={styles.previewTag}>Therapy</span>
                  </div>
                </div>
              </div>

              <div className={styles.publishSettingsCard}>
                <div className={styles.publishSettingsHeader}>⚙️ Publish Settings</div>
                <div className={styles.publishRow}><span>Category</span><span className={styles.publishVal}>Anxiety Management</span></div>
                <div className={styles.publishRow}><span>Visibility</span><span className={styles.publishVal}>All My Patients</span></div>
                <div className={styles.publishRow}><span>Notify Patients</span><span className={`${styles.publishVal} ${styles.green}`}>Yes</span></div>
                <div className={styles.publishRow}><span>Auto-FAQ Link</span><span className={`${styles.publishVal} ${styles.teal}`}>Enabled</span></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default UploadProgressPage