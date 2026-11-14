// src/pages/VideoCall/ScreenShare.tsx
import React from 'react'
import styles from './ScreenShare.module.css'

interface Props {
  duration:       number
  formatDuration: (s: number) => string
  onStopShare:    () => void
  onEnd:          () => void
}

const ScreenShare: React.FC<Props> = ({ duration, formatDuration, onStopShare, onEnd }) => {
  return (
    <>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <div className={styles.sharingPill}>
          <div className={styles.sharingDot} />
          <span className={styles.sharingText}>SHARING</span>
        </div>
        <div className={styles.timer}>{formatDuration(duration)}</div>
        <div className={styles.sharingNote}>🖥️ You are sharing your screen</div>
        <div className={styles.topbarRight}>
          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnPill} ${styles.btnSm}`} onClick={onStopShare}>Stop Sharing</button>
          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnPill} ${styles.btnSm}`} onClick={onEnd}>⏹ End</button>
        </div>
      </header>

      <div className={styles.wrap}>
        {/* Shared screen mock */}
        <div className={styles.screen}>
          {/* Browser chrome */}
          <div className={styles.browserBar}>
            <div className={`${styles.dot} ${styles.dotR}`} />
            <div className={`${styles.dot} ${styles.dotA}`} />
            <div className={`${styles.dot} ${styles.dotG}`} />
            <div className={styles.url}>MediLink Patient Portal — Mental Health Analysis</div>
          </div>

          <div className={styles.screenBody}>
            <h3 className={styles.screenTitle}>Mental Health Analysis — Priyanka</h3>
            <div className={styles.healthGrid}>
              <div className={styles.scoreBox}>
                <div className={styles.scoreLabel}>Health Score</div>
                <div className={styles.scoreVal}>63</div>
                <div className={styles.scoreSub}>out of 100</div>
              </div>
              <div className={styles.desc}>
                Your results indicate significant stress response activation with multiple elevated markers.
                This requires immediate attention and professional support.
              </div>
            </div>
            <div className={styles.metricGrid}>
              <div className={`${styles.metricBox} ${styles.metricDanger}`}>
                <div className={`${styles.metricLabel} ${styles.metricLabelRed}`}>Cortisol — HIGH</div>
                <div className={styles.metricVal}>35.2 Mg/dl</div>
                <div className={styles.metricRange}>Normal: 6-23 Mg/dl</div>
              </div>
              <div className={`${styles.metricBox} ${styles.metricSuccess}`}>
                <div className={`${styles.metricLabel} ${styles.metricLabelGreen}`}>ADTH — Normal</div>
                <div className={styles.metricVal}>18.4 pg/ml</div>
                <div className={styles.metricRange}>Normal: 10-60 pg/ml</div>
              </div>
            </div>
          </div>

          {/* Overlays */}
          <div className={styles.recBadge}><div className={styles.recDot} /> Recording</div>
          <div className={styles.miniCams}>
            <div className={`${styles.miniCam} ${styles.miniCamGreen}`}>P<div className={styles.miniCamLbl}>Priyanka</div></div>
            <div className={`${styles.miniCam} ${styles.miniCamBlue}`}>D<div className={styles.miniCamLbl}>You</div></div>
          </div>
        </div>

        {/* Side */}
        <div className={styles.side}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>🖥️ Share Options</h3>
            {[
              { icon: '🪟', name: 'Entire Screen', sub: 'Currently sharing', active: true },
              { icon: '📄', name: 'App Window',    sub: 'Share a specific app' },
              { icon: '📂', name: 'Share File',    sub: 'Send a document' },
            ].map((o, i) => (
              <div key={i} className={`${styles.shareOpt} ${o.active ? styles.shareOptActive : ''}`}>
                <span className={styles.shareOptIcon}>{o.icon}</span>
                <div>
                  <div className={styles.shareOptName}>{o.name}</div>
                  <div className={styles.shareOptSub}>{o.sub}</div>
                </div>
                {o.active && <div className={styles.activeIndicator} />}
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.cardTitleSm}`}>💬 Patient Reaction</h3>
            <div className={styles.reactionBubble}>
              "What does the cortisol level 35.2 mean exactly?"
            </div>
            <div className={styles.reactionTime}>Priyanka · just now</div>
          </div>

          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnFull}`} onClick={onStopShare}>⏹ Stop Sharing</button>
          <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnFull}`} onClick={onEnd}>📞 End Session</button>
        </div>
      </div>
    </>
  )
}

export default ScreenShare