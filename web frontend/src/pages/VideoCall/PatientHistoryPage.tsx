// src/pages/VideoCall/PatientHistoryPage.tsx
import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar  from '../../components/layout/TopBar'
import styles  from './PatientHistoryPage.module.css'

interface Props {
  sessionId?: string
  onBack:     () => void
  onJoin?:    () => void
}

// ── Demo data ──────────────────────────────────────────
const DEMO_HISTORY = {
  patient: {
    name:      'Priyanka Jayawardhana',
    id:        '#P-3af301',
    age:       28,
    gender:    'Female',
    condition: 'GAD + MDD',
    since:     'Jan 2025',
  },
  sessions: [
    {
      id:       'S-001',
      date:     'Feb 20, 2026',
      time:     '5:00 PM',
      duration: '47 min',
      doctor:   'Dr. Dilshari',
      notes:    'Patient reports reduced panic attacks. Sleep improved. Cortisol trending down. Continue CBT.',
      rx:       ['Sertraline 75mg', 'Lorazepam 0.5mg PRN'],
      mood:     'Improving',
      moodColor:'#22C55E',
    },
    {
      id:       'S-002',
      date:     'Jan 30, 2026',
      time:     '5:00 PM',
      duration: '52 min',
      doctor:   'Dr. Dilshari',
      notes:    'Discussed breathing techniques. Patient showing improvement in sleep patterns.',
      rx:       ['Sertraline 50mg'],
      mood:     'Moderate',
      moodColor:'#F59E0B',
    },
    {
      id:       'S-003',
      date:     'Jan 10, 2026',
      time:     '4:30 PM',
      duration: '38 min',
      doctor:   'Dr. Dilshari',
      notes:    'Initial assessment. High anxiety levels noted. Started medication plan.',
      rx:       ['Sertraline 25mg'],
      mood:     'Poor',
      moodColor:'#EF4444',
    },
    {
      id:       'S-004',
      date:     'Dec 20, 2025',
      time:     '3:00 PM',
      duration: '45 min',
      doctor:   'Dr. Dilshari',
      notes:    'First consultation. Diagnosed with GAD. Referred for CBT therapy.',
      rx:       [],
      mood:     'Poor',
      moodColor:'#EF4444',
    },
  ],
}

const PatientHistoryPage: React.FC<Props> = ({ onBack, onJoin }) => {
  const [selected, setSelected] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const selectedSession = DEMO_HISTORY.sessions.find(s => s.id === selected)

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar activePath="/video-call" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>

          {/* Header */}
          <div className={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* ── Back Button ── */}
              <button className={styles.backBtn} onClick={onBack} title="Back to Waiting Room">
                ← Back
              </button>
              <div>
                <h2 className={styles.title}>Patient History</h2>
                <p className={styles.sub}>
                  {DEMO_HISTORY.patient.name} · {DEMO_HISTORY.patient.condition}
                </p>
              </div>
            </div>
            {onJoin && (
              <button className={styles.startCallBtn} onClick={onJoin}>📹 Start Call</button>
            )}
          </div>

          {/* Patient info strip */}
          <div className={styles.patientStrip}>
            <div className={styles.patientAvatar}>P</div>
            <div>
              <div className={styles.patientName}>{DEMO_HISTORY.patient.name}</div>
              <div className={styles.patientMeta}>
                {DEMO_HISTORY.patient.id} · Age {DEMO_HISTORY.patient.age} · {DEMO_HISTORY.patient.gender} · Patient since {DEMO_HISTORY.patient.since}
              </div>
            </div>
            <div className={styles.conditionBadge}>{DEMO_HISTORY.patient.condition}</div>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { label: 'Total Sessions',  value: '4',         color: '#2B52D4' },
              { label: 'Last Session',    value: 'Feb 20',    color: '#7C3AED' },
              { label: 'Avg Duration',    value: '45 min',    color: '#059669' },
              { label: 'Current Mood',    value: 'Improving', color: '#22C55E' },
            ].map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statVal} style={{ color: s.color }}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sessions list + detail */}
          <div className={styles.grid}>

            {/* Sessions list */}
            <div className={styles.sessionsList}>
              <h3 className={styles.sectionTitle}>Session History</h3>
              {DEMO_HISTORY.sessions.map(s => (
                <div
                  key={s.id}
                  className={`${styles.sessionCard} ${selected === s.id ? styles.sessionCardActive : ''}`}
                  onClick={() => setSelected(selected === s.id ? null : s.id)}
                >
                  <div className={styles.sessionCardLeft}>
                    <div className={styles.moodDot} style={{ background: s.moodColor }} />
                    <div>
                      <div className={styles.sessionDate}>{s.date} · {s.time}</div>
                      <div className={styles.sessionDuration}>Duration: {s.duration}</div>
                    </div>
                  </div>
                  <div className={styles.moodBadge} style={{ background: s.moodColor + '20', color: s.moodColor }}>
                    {s.mood}
                  </div>
                </div>
              ))}
            </div>

            {/* Session detail */}
            <div className={styles.sessionDetail}>
              {selectedSession ? (
                <>
                  <h3 className={styles.sectionTitle}>
                    Session Details — {selectedSession.date}
                  </h3>

                  <div className={styles.detailCard}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Date</span>
                      <span className={styles.detailVal}>{selectedSession.date} at {selectedSession.time}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Duration</span>
                      <span className={styles.detailVal}>{selectedSession.duration}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Doctor</span>
                      <span className={styles.detailVal}>{selectedSession.doctor}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailKey}>Mood</span>
                      <span
                        className={styles.detailVal}
                        style={{ color: selectedSession.moodColor, fontWeight: 700 }}
                      >
                        {selectedSession.mood}
                      </span>
                    </div>
                  </div>

                  <div className={styles.notesCard}>
                    <div className={styles.notesTitle}>📋 Session Notes</div>
                    <p className={styles.notesText}>{selectedSession.notes}</p>
                  </div>

                  {selectedSession.rx.length > 0 && (
                    <div className={styles.rxCard}>
                      <div className={styles.notesTitle}>💊 Prescribed Medications</div>
                      {selectedSession.rx.map((rx, i) => (
                        <div key={i} className={styles.rxItem}>
                          <span className={styles.rxDot} />
                          {rx}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.selectPrompt}>
                  <div className={styles.selectIcon}>📋</div>
                  <div className={styles.selectText}>Select a session to view details</div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}

export default PatientHistoryPage