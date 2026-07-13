// src/pages/VideoCall/TodaysSessionsPage.tsx
// Real data: GET /api/appointments/today-summary — every completed
// video-call round today (from PatientHistory), with prescriptions and
// notes, so the doctor can review the whole day at a glance.
import { useEffect, useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import TopBar  from '../../components/layout/TopBar'
import { appointmentApi } from '../../types/api'
import type { TodaysSummary } from '../../types/api'
import styles from './PreCallSetup.module.css'

interface Props {
  onBack: () => void
}

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const fmtDuration = (secs: number): string => {
  const m = Math.floor(secs / 60); const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TodaysSessionsPage({ onBack }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData]         = useState<TodaysSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    appointmentApi.getTodaysSummary()
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load today\'s sessions.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activePath="/video-call" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className={styles.main}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button className={styles.backBtn ?? ''} onClick={onBack}
              style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              ← Back
            </button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A2E' }}>📅 Today's Completed Sessions</div>
              <div style={{ fontSize: 12.5, color: '#6B7280' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading today's sessions…</div>
          )}

          {!loading && data && (
            <>
              {/* Summary stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#2B52D4' }}>{data.totalSessions}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Sessions Completed</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{fmtDuration(data.totalDuration)}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Total Time Spent</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>{data.totalPrescriptions}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Medications Prescribed</div>
                </div>
              </div>

              {/* Session list */}
              {data.sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  No sessions completed yet today.
                </div>
              ) : (
                data.sessions.map(s => (
                  <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 18, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1A1A2E' }}>{s.patientName}</div>
                        <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{fmtTime(s.date)} · {fmtDuration(s.duration)} duration</div>
                      </div>
                      <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                        ✓ Completed
                      </span>
                    </div>

                    {s.notes && (
                      <div style={{ fontSize: 12.5, color: '#374151', marginBottom: 8, background: '#F9FAFB', borderRadius: 8, padding: '8px 10px' }}>
                        📋 {s.notes}
                      </div>
                    )}
                    {s.notesForPatient && (
                      <div style={{ fontSize: 12.5, color: '#1E3A8A', marginBottom: 8, background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '8px 10px' }}>
                        💬 {s.notesForPatient}
                      </div>
                    )}
                    {s.medications.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {s.medications.map((m, i) => (
                          <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: '#2B52D4', background: '#EEF2FF', border: '1px solid #DBEAFE', borderRadius: 999, padding: '4px 10px' }}>
                            💊 {m.name} {m.dose}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
