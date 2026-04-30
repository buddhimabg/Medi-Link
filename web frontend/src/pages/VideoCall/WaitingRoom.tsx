// src/pages/VideoCall/WaitingRoom.tsx
import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import styles  from './WaitingRoom.module.css'

interface Props {
  sessionId:     string
  onJoin:        () => void
  onCancel:      () => void
  onViewHistory: () => void
}

const QUEUE = [
  { i: 'P', name: 'Priyanka Jayawardhana', time: '5:00 PM', invited: true,  bg: '#2B52D4' },
  { i: 'R', name: 'Ravindra Perera',        time: '5:30 PM', invited: false, bg: '#6B7280' },
  { i: 'K', name: 'Kavindi Gunawardana',    time: '6:00 PM', invited: false, bg: '#6B7280' },
]

const WaitingRoom: React.FC<Props> = ({ sessionId, onJoin, onCancel, onViewHistory }) => {
  const [secs, setSecs] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          ☰
        </button>
        <button className={styles.backBtn} onClick={onCancel}>← Back</button>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <span className={styles.badgeBlue}>Session Open</span>
        <span className={styles.timerText}>00:{p(Math.floor(secs / 60))}:{p(secs % 60)}</span>
        <div className={styles.topbarRight}>
          <button className={styles.iconBtn}>🔔</button>
          <div className={styles.avatar}>D</div>
        </div>
      </header>

      <div className={styles.layout}>
        <Sidebar activePath="/video-call" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <div className={styles.inner}>
            <div className={styles.rippleWrap}>
              <div className={styles.ring1} />
              <div className={styles.ring2} />
              <div className={styles.bigAvatar}>P</div>
            </div>

            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>Waiting for Priyanka…</h2>
              <p className={styles.textSub}>Invitation sent. Session will begin once the patient joins.</p>
            </div>

            <div className={styles.codeBox}>
              Session Code: #{sessionId}&nbsp;|&nbsp;PIN: N/A
            </div>

            <div className={`${styles.card} ${styles.cardFull}`}>
              <h3 className={styles.cardTitle}>📋 Today's Patient Queue</h3>
              {QUEUE.map((q, i) => (
                <div key={i} className={styles.qRow} style={{ opacity: q.invited ? 1 : 0.65 }}>
                  <div className={`${styles.dot} ${q.invited ? styles.dotAmber : styles.dotGray}`} />
                  <div className={styles.qAvatar} style={{ background: q.bg }}>{q.i}</div>
                  <div className={styles.qInfo}>
                    <div className={styles.qName}>{q.name}</div>
                    <div className={styles.qTime}>{q.time}</div>
                  </div>
                  <span className={`${styles.badge} ${q.invited ? styles.badgeAmber : styles.badgeGray}`}>
                    {q.invited ? 'Invited…' : 'Upcoming'}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onViewHistory}>
                📋 View Patient History
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onJoin}>
                🎥 Patient Joined — Start Call
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onCancel}>
                Cancel Session
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default WaitingRoom