// src/pages/VideoCall/PatientHistoryPage.tsx
import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/DoctorPortalSidebar'
import TopBar  from '../../components/layout/TopBar'
import styles  from './PatientHistoryPage.module.css'
import { patientHistoryApi } from '../../types/api'
import type { PatientHistoryRecord } from '../../types/api'

interface Props {
  sessionId: string;
  patientId: string;
  patientName: string; // 👈 Add this
  onBack: () => void;
  onJoin: () => void;
}
const formatDuration = (secs: number): string => {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  return m > 0 ? `${m} min` : `${secs}s`
}
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Date string → "5:00 PM" format ────────────────────
const formatTime = (dateStr: string): string => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// ── Average duration calculator ────────────────────────
const avgDuration = (records: PatientHistoryRecord[]): string => {
  if (records.length === 0) return '—'
  const total = records.reduce((sum, r) => sum + (r.duration || 0), 0)
  return formatDuration(Math.round(total / records.length))
}

// ── Latest session date ────────────────────────────────
const lastSessionDate = (records: PatientHistoryRecord[]): string => {
  if (records.length === 0) return '—'
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  return formatDate(sorted[0].date)
}

// Enriched record type — backend sends patientName in response
interface EnrichedRecord extends PatientHistoryRecord {
  patientName?: string
}

const PatientHistoryPage: React.FC<Props> = ({ sessionId, patientId, onBack, onJoin }) => {
  const [selected,     setSelected]     = useState<string | null>(null)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [records,      setRecords]      = useState<EnrichedRecord[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  // FIX: real patient name from DB — not hardcoded
  const [patientName,  setPatientName]  = useState<string>('')

  // ✅ API fetch — patientId ලැබුනාම fetch කරනවා
  useEffect(() => {
    if (!patientId) return

    const fetchHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await patientHistoryApi.getByPatient(patientId) as EnrichedRecord[]

        // Latest first sort
        const sorted = [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setRecords(sorted)

        // FIX: real patient name — backend enriched response ලෙන්
        if (sorted.length > 0 && sorted[0].patientName) {
          setPatientName(sorted[0].patientName)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'History load කිරීමේ error.')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [patientId])

  const selectedRecord = records.find(r => r._id === selected)

  // FIX: real patient name from DB — fallback chain
  // 1. patientName from API response
  // 2. patientName state (set from first record)
  // 3. Generic ID-based name (no hardcoding)
  const displayName    = patientName || (patientId ? `Patient #${patientId.slice(-6).toUpperCase()}` : 'Patient')
  const patientInitial = displayName[0]?.toUpperCase() ?? 'P'

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>

          {/* ── Header ── */}
          <div className={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className={styles.backBtn} onClick={onBack} title="Back to Waiting Room">
                ← Back
              </button>
              <div>
                <h2 className={styles.title}>Patient History</h2>
                <p className={styles.sub}>Previous sessions and prescriptions</p>
              </div>
            </div>
            {onJoin && (
              <button className={styles.joinBtn} onClick={onJoin}>
                📹 Start Call Now
              </button>
            )}
          </div>

          {/* ── No patientId yet ── */}
          {!patientId && (
            <div style={{
              background: '#FEF3C7', border: '1.5px solid #FCD34D',
              borderRadius: 12, padding: '20px 24px', display: 'flex',
              alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <div>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: 14, marginBottom: 4 }}>
                  Patient data loading…
                </div>
                <div style={{ fontSize: 13, color: '#B45309' }}>
                  "No patient has been selected from the patient queue. Data only loads after a patient joins the Waiting Room."
                </div>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {patientId && loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280', fontSize: 14 }}>
              ⏳ Loading patient history…
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{
              background: '#FEE2E2', border: '1.5px solid #FECACA',
              borderRadius: 10, padding: '14px 18px', color: '#DC2626', fontSize: 13,
            }}>
              <strong>History load කිරීමේ error:</strong> {error}
              <br />
              <span style={{ fontSize: 12, color: '#EF4444' }}>
                Backend running ද? Token valid ද?
              </span>
            </div>
          )}

          {/* ── Main content — patientId ඇති + load ඉවර ── */}
          {patientId && !loading && (
            <>
              {/* Patient info strip — real name from DB */}
              <div className={styles.patientStrip}>
                <div className={styles.patientAvatar}>{patientInitial}</div>
                <div>
                  {/* FIX: real patient name, not hardcoded */}
                  <div className={styles.patientName}>{displayName}</div>
                  <div className={styles.patientMeta}>
                    ID: {patientId}
                    {records.length > 0 && (
                      <> · Patient since {formatDate(records[records.length - 1].date)}</>
                    )}
                  </div>
                </div>
                <div className={styles.conditionBadge}>
                  {records.length > 0 ? `${records.length} Sessions` : 'New Patient'}
                </div>
              </div>

              {/* Stats row */}
              <div className={styles.statsRow}>
                {[
                  { label: 'Total Sessions', value: String(records.length),    color: '#2B52D4' },
                  { label: 'Last Session',   value: lastSessionDate(records),  color: '#7C3AED' },
                  { label: 'Avg Duration',   value: avgDuration(records),      color: '#059669' },
                  {
                    label: 'Latest Mood',
                    value: records[0]?.moodLabel || '—',
                    color: records[0]?.moodColor || '#6B7280',
                  },
                ].map((s, i) => (
                  <div key={i} className={styles.statCard}>
                    <div className={styles.statVal} style={{ color: s.color }}>{s.value}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Empty state — new patient ── */}
              {records.length === 0 && (
                <div style={{
                  background: '#F0FDF4', border: '1.5px solid #BBF7D0',
                  borderRadius: 12, padding: '32px', textAlign: 'center', marginTop: 8,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🌱</div>
                  <div style={{ fontWeight: 700, color: '#166534', fontSize: 15, marginBottom: 6 }}>
                    New Patient — {displayName}
                  </div>
                  <div style={{ fontSize: 13, color: '#16A34A' }}>
                    මෙම patient ට previous sessions නැහැ. මෙය ඔවුන්ගේ first session.
                  </div>
                </div>
              )}

              {/* Sessions list + detail */}
              {records.length > 0 && (
                <div className={styles.grid}>

                  {/* Sessions list */}
                  <div className={styles.sessionsList}>
                    <h3 className={styles.sectionTitle}>Session History — {displayName}</h3>
                    {records.map(r => (
                      <div
                        key={r._id}
                        className={`${styles.sessionCard} ${selected === r._id ? styles.sessionCardActive : ''}`}
                        onClick={() => setSelected(selected === r._id ? null : r._id)}
                      >
                        <div className={styles.sessionCardLeft}>
                          <div className={styles.moodDot} style={{ background: r.moodColor || '#6B7280' }} />
                          <div>
                            <div className={styles.sessionDate}>
                              {formatDate(r.date)} · {formatTime(r.date)}
                            </div>
                            <div className={styles.sessionDuration}>
                              Duration: {formatDuration(r.duration)}
                            </div>
                          </div>
                        </div>
                        <div
                          className={styles.moodBadge}
                          style={{
                            background: (r.moodColor || '#6B7280') + '20',
                            color: r.moodColor || '#6B7280',
                          }}
                        >
                          {r.moodLabel || 'Neutral'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Session detail */}
                  <div className={styles.sessionDetail}>
                    {selectedRecord ? (
                      <>
                        <h3 className={styles.sectionTitle}>
                          Session Details — {formatDate(selectedRecord.date)}
                        </h3>

                        <div className={styles.detailCard}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailKey}>Patient</span>
                            <span className={styles.detailVal}>{displayName}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailKey}>Date</span>
                            <span className={styles.detailVal}>
                              {formatDate(selectedRecord.date)} at {formatTime(selectedRecord.date)}
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailKey}>Duration</span>
                            <span className={styles.detailVal}>
                              {formatDuration(selectedRecord.duration)}
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailKey}>Session ID</span>
                            <span className={styles.detailVal} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              #{selectedRecord.sessionId}
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailKey}>Mood</span>
                            <span
                              className={styles.detailVal}
                              style={{ color: selectedRecord.moodColor || '#6B7280', fontWeight: 700 }}
                            >
                              {selectedRecord.moodLabel || 'Neutral'}
                            </span>
                          </div>
                        </div>

                        {/* Session Notes (excluding transcript) + Transcript, split apart */}
                        {(() => {
                          const rawNotes = selectedRecord.notes || ''
                          const marker = '--- Session Transcript ---'
                          const idx = rawNotes.indexOf(marker)
                          const doctorNotes = idx >= 0 ? rawNotes.slice(0, idx).trim() : rawNotes.trim()
                          const transcript  = idx >= 0 ? rawNotes.slice(idx + marker.length).trim() : ''
                          return (
                            <>
                              <div className={styles.notesCard}>
                                <div className={styles.notesTitle}>📋 Session Notes</div>
                                {doctorNotes ? (
                                  <p className={styles.notesText}>{doctorNotes}</p>
                                ) : (
                                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                                    No notes recorded for this session.
                                  </p>
                                )}
                              </div>

                              <div className={styles.notesCard}>
                                <div className={styles.notesTitle}>📝 Session Transcript</div>
                                {transcript ? (
                                  <p className={styles.notesText} style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7 }}>
                                    {transcript}
                                  </p>
                                ) : (
                                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                                    No transcript available for this session.
                                  </p>
                                )}
                              </div>
                            </>
                          )
                        })()}

                        {/* Medications */}
                        <div className={styles.rxCard}>
                          <div className={styles.notesTitle}>💊 Prescribed Medications</div>
                          {selectedRecord.medications && selectedRecord.medications.length > 0 ? (
                            selectedRecord.medications.map((med, i) => (
                              <div key={i} className={styles.rxItem}>
                                <span className={styles.rxDot} />
                                <span>
                                  <strong>{med.name}</strong> {med.dose}
                                  {med.frequency && ` · ${med.frequency}`}
                                  {med.duration && ` · ${med.duration}`}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                              No prescriptions issued for this session.
                            </p>
                          )}
                        </div>

                        {/* Session Recording */}
                        <div className={styles.notesCard}>
                          <div className={styles.notesTitle}>🎥 Session Recording</div>
                          {selectedRecord.recordingStatus === 'completed' && selectedRecord.recordingUrl ? (
                            <a
                              href={selectedRecord.recordingUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: '#2B52D4', color: '#fff', padding: '9px 16px',
                                borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                              }}
                            >
                              ⬇️ Download Recording
                            </a>
                          ) : selectedRecord.recordingStatus === 'processing' ? (
                            <p style={{ fontSize: 13, color: '#B45309', fontStyle: 'italic' }}>
                              ⏳ Recording is still processing — check back shortly.
                            </p>
                          ) : selectedRecord.recordingStatus === 'failed' ? (
                            <p style={{ fontSize: 13, color: '#DC2626', fontStyle: 'italic' }}>
                              ⚠️ Recording failed for this session.
                            </p>
                          ) : (
                            <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                              No recording available for this session
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className={styles.selectPrompt}>
                        <div className={styles.selectIcon}>📋</div>
                        <div className={styles.selectText}>
                          Session එකක් select කරන්න details බලන්න
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  )
}

export default PatientHistoryPage