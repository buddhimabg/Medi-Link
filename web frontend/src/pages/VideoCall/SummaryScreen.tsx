// src/pages/VideoCall/SummaryScreen.tsx
import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar  from '../../components/layout/TopBar'
import styles  from './SummaryScreen.module.css'
import type { Medication } from '../../types/api'
import { videoApi } from '../../types/api'   // ✅ NEW import

interface Props {
  sessionId:      string
  duration:       number
  formatDuration: (s: number) => string
  summaryLoading: boolean
  summaryNotes:   string
  summaryRxList:  Medication[]
  patientName?:   string   // ✅ NEW prop
  onDashboard:    () => void
}

const SummaryScreen: React.FC<Props> = ({
  sessionId, duration, formatDuration,
  summaryLoading, summaryNotes, summaryRxList,
  patientName = 'Patient',   // ✅ NEW
  onDashboard,
}) => {
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [editNotes,  setEditNotes]  = useState(summaryNotes)
  const [notesSaved, setNotesSaved] = useState(false)
  const [saveError,  setSaveError]  = useState(false)

  // summaryNotes backend ලෙන් load වුනාම sync
  React.useEffect(() => {
    setEditNotes(summaryNotes)
  }, [summaryNotes])

  // ✅ FIX: Real API call — notes DB ලේ save කරනවා
  const handleSaveNotes = async () => {
    setSaveError(false)
    try {
      await videoApi.saveSessionNotes(sessionId, editNotes)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2500)
    } catch {
      setSaveError(true)
      setTimeout(() => setSaveError(false), 2500)
    }
  }

  // Real prescriptions use කරනවා, empty නම් empty show කරනවා
  const rxToShow: Array<{ name: string; dose: string }> = summaryRxList.length > 0
    ? summaryRxList.map(m => ({ name: m.name, dose: `${m.dose} · ${m.frequency} · ${m.duration}` }))
    : []

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

          {/* Banner — ✅ Real patient name */}
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

          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { val: formatDuration(duration) || '00:00', label: 'Duration',            cls: styles.valBlue   },
              { val: String(rxToShow.length),             label: 'Prescriptions Issued', cls: styles.valPurple },
              { val: String(summaryRxList.length > 0 ? '✓' : '—'), label: 'Rx Saved to DB', cls: styles.valGreen },
            ].map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={`${styles.statVal} ${s.cls}`}>{s.val}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Loading state */}
          {summaryLoading && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              Loading session summary...
            </div>
          )}

          {!summaryLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

              {/* Session Notes */}
              <div className={styles.card ?? ''} style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}>📋 Session Notes</h3>
                <textarea
                  value={editNotes}
                  onChange={e => { setEditNotes(e.target.value); setNotesSaved(false) }}
                  style={{
                    width: '100%', minHeight: '140px',
                    border: '1px solid #e5e7eb', borderRadius: '8px',
                    padding: '10px', fontSize: '13px',
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                  placeholder="Session notes..."
                />
                <button
                  onClick={handleSaveNotes}
                  style={{
                    marginTop: '10px', padding: '9px 20px',
                    background: saveError ? '#ef4444' : notesSaved ? '#059669' : '#2B52D4',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  {saveError ? '❌ Save Failed' : notesSaved ? '✓ Saved to DB!' : '💾 Save Notes'}
                </button>
              </div>

              {/* Prescriptions */}
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '15px' }}>💊 Prescriptions Issued</h3>
                {rxToShow.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '13px' }}>No prescriptions issued this session.</div>
                ) : (
                  rxToShow.map((rx, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid #e5e7eb',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{rx.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{rx.dose}</div>
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