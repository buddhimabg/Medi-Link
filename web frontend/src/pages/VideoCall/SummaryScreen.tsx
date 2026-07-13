// src/pages/VideoCall/SummaryScreen.tsx
// Read-only recap of the round that just ended — everything shown here is
// sourced from the real MongoDB summary (videoApi.getSessionSummary),
// nothing here is editable. To change notes/prescriptions, the doctor
// re-opens the patient's next session or the Chatbot Patient Profile.
import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar  from '../../components/layout/TopBar'
import styles  from './SummaryScreen.module.css'
import type { Medication } from '../../types/api'

interface Props {
  sessionId:               string
  duration:                number
  formatDuration:          (s: number) => string
  summaryLoading:          boolean
  summaryNotes:            string
  summaryNotesForPatient:  string
  summaryRxList:           Medication[]
  prescriptionsIssued:     number
  rxSavedToDb:             boolean
  patientName?:            string
  onDashboard:             () => void
}

const SummaryScreen: React.FC<Props> = ({
  sessionId, duration, formatDuration,
  summaryLoading, summaryNotes, summaryNotesForPatient, summaryRxList,
  prescriptionsIssued, rxSavedToDb,
  patientName = 'Patient',
  onDashboard,
}) => {
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
              <div className={styles.bannerSub}>
                {patientName} · #{sessionId} · {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginLeft: 'auto' }} onClick={onDashboard}>
              Dashboard →
            </button>
          </div>

          {/* Stats — real numbers from the completed round */}
          <div className={styles.statsRow}>
            {[
              { val: formatDuration(duration) || '00:00',   label: 'Duration',            cls: styles.valBlue   },
              { val: String(prescriptionsIssued),            label: 'Prescriptions Issued', cls: styles.valPurple },
              { val: rxSavedToDb ? '✓' : '—',                label: 'Rx Saved to DB',       cls: styles.valGreen },
            ].map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={`${styles.statVal} ${s.cls}`}>{s.val}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {summaryLoading && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              Loading session summary...
            </div>
          )}

          {!summaryLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Session Notes — read-only, doctor's private observations */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}>📋 Session Notes</h3>
                <div style={{
                  minHeight: '90px', padding: '10px 12px', borderRadius: '8px',
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                  fontSize: '13px', color: summaryNotes ? '#1f2937' : '#9ca3af',
                  whiteSpace: 'pre-wrap',
                }}>
                  {summaryNotes || 'No session notes were recorded.'}
                </div>

                <h3 style={{ fontWeight: 700, margin: '18px 0 12px', fontSize: '15px' }}>💬 Notes for Patient</h3>
                <div style={{
                  minHeight: '60px', padding: '10px 12px', borderRadius: '8px',
                  background: '#eff6ff', border: '1px solid #dbeafe',
                  fontSize: '13px', color: summaryNotesForPatient ? '#1e3a8a' : '#9ca3af',
                  whiteSpace: 'pre-wrap',
                }}>
                  {summaryNotesForPatient || 'No notes were written for the patient this session.'}
                </div>
              </div>

              {/* Prescriptions — read-only */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}>💊 Prescriptions Issued</h3>
                {summaryRxList.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '13px' }}>No prescriptions issued this session.</div>
                ) : (
                  summaryRxList.map((rx, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{rx.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                        {rx.dose} · {rx.frequency} · {rx.duration}{rx.withFood ? ` · ${rx.withFood === 'Yes' ? 'with food' : rx.withFood === 'No' ? 'without food' : rx.withFood}` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default SummaryScreen
