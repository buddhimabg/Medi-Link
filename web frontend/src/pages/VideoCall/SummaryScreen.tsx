// src/pages/VideoCall/SummaryScreen.tsx
import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar  from '../../components/layout/TopBar'
import styles  from './SummaryScreen.module.css'

interface Props {
  duration:       number
  formatDuration: (s: number) => string
  onDashboard:    () => void
}

const TIMELINE = [
  { time: '5:00 PM', text: 'Patient joined. Session started.',       color: '#22C55E', line: true  },
  { time: '5:08 PM', text: 'Lab report reviewed with patient.',       color: '#2B52D4', line: true  },
  { time: '5:24 PM', text: 'Screen share — MediLink report shared.',  color: '#D97706', line: true  },
  { time: '5:38 PM', text: 'Prescription written and issued.',        color: '#7C3AED', line: true  },
  { time: '5:47 PM', text: 'Session ended by doctor.',                color: '#EF4444', line: false },
]

const SummaryScreen: React.FC<Props> = ({ duration, formatDuration, onDashboard }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.page}>
      <TopBar
        badge={<span className={styles.badgeGreen}>✓ Session Complete</span>}
        onMenuClick={() => setMenuOpen(true)}
      />

      <div className={styles.layout}>
        <Sidebar activePath="/video-call" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className={styles.main}>

        {/* ── Back Button ── */}
        <div className={styles.backRow}>
          <button className={styles.backBtn} onClick={onDashboard} title="Return to Dashboard">
            ← Back to Dashboard
          </button>
        </div>

        {/* Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerCheck}>✓</div>
          <div>
            <div className={styles.bannerTitle}>Session Complete</div>
            <div className={styles.bannerSub}>Priyanka Jayawardhana · Fri, Feb 20, 2026 · 5:00 – 5:47 PM</div>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginLeft: 'auto' }}>
            Next Patient →
          </button>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          {[
            { val: formatDuration(duration) || '47:33', label: 'Duration',             cls: styles.valBlue   },
            { val: '2',   label: 'Prescriptions Issued',  cls: styles.valPurple },
            { val: '4th', label: 'Session Number',         cls: styles.valGreen  },
            { val: '⭐',  label: 'Awaiting Rating',        cls: styles.valAmber  },
          ].map((s, i) => (
            <div key={i} className={styles.statCard}>
              <div className={`${styles.statVal} ${s.cls}`}>{s.val}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 2-col summary grid */}
        <div className={styles.summaryGrid}>
          {/* Notes */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📋 Session Notes</h3>
            <p className={styles.notesText}>
              <strong>Observation:</strong> Patient reports reduced panic attacks. Sleep improved.
              Cortisol trending downward. Continue CBT program.<br /><br />
              <strong>Plan:</strong> Increased Sertraline 50mg → 75mg. Follow-up in 2 weeks. Continue mood journaling daily.
            </p>
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.btnFull}`}>✏️ Edit Notes</button>
          </div>

          {/* Prescriptions */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>💊 Prescriptions Issued</h3>
            {[
              { name: 'Sertraline (Zoloft)', dose: '75mg · Once daily · 30 days' },
              { name: 'Lorazepam PRN',       dose: '0.5mg · As needed · 15 days' },
            ].map((rx, i) => (
              <div key={i} className={styles.rxItem}>
                <span>💊</span>
                <div className={styles.rxInfo}>
                  <div className={styles.rxName}>{rx.name}</div>
                  <div className={styles.rxDose}>{rx.dose}</div>
                </div>
                <span className={styles.badgeGreen} style={{ fontSize: 10 }}>✓ Sent</span>
              </div>
            ))}
            <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm} ${styles.btnFull}`}>🖨️ Print / Download Rx</button>
          </div>

          {/* Timeline */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>⏱ Session Timeline</h3>
            {TIMELINE.map((t, i) => (
              <div key={i} className={styles.tlItem}>
                <span className={styles.tlTime}>{t.time}</span>
                <div className={styles.tlSpine}>
                  <div className={styles.tlDot} style={{ background: t.color }} />
                  {t.line && <div className={styles.tlLine} />}
                </div>
                <span className={styles.tlText}>{t.text}</span>
              </div>
            ))}
          </div>

          {/* Next steps */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📅 Next Steps</h3>
            <div className={styles.followUpBox}>
              <span style={{ fontSize: 26 }}>📅</span>
              <div>
                <div className={styles.followUpTitle}>Follow-up Session</div>
                <div className={styles.followUpSub}>Suggested: 2 weeks</div>
                <div className={styles.followUpDate}>Fri, Mar 6, 2026 · 5:00 PM</div>
              </div>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} style={{ marginLeft: 'auto' }}>Schedule</button>
            </div>
            {[
              { icon: '📋', text: 'Ask patient to continue daily mood journaling' },
              { icon: '💊', text: 'Patient notified of new Rx via app'             },
              { icon: '📖', text: 'Share "Managing Cortisol" journal article'      },
            ].map((n, i) => (
              <div key={i} className={styles.nextItem}>
                <span>{n.icon}</span>{n.text}
              </div>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>Next Patient — Ravindra Perera →</button>
          <button className={`${styles.btn} ${styles.btnOutline}`}>📋 View Patient Record</button>
          <button className={`${styles.btn} ${styles.btnLight}`}>📊 Session Analytics</button>
          <button className={`${styles.btn} ${styles.btnLight}`} style={{ marginLeft: 'auto' }} onClick={onDashboard}>🏠 Return to Dashboard</button>
        </div>
        </main>
      </div>
    </div>
  )
}

export default SummaryScreen