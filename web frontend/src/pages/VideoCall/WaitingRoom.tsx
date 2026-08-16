// src/pages/VideoCall/WaitingRoom.tsx
import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import styles from './WaitingRoom.module.css'
import type { QueuePatient } from '../../types/api'

interface Props {
  sessionId:     string
  onJoin:        () => void
  onCancel:      () => void
  onViewHistory: () => void
  // MODIFICATION: real invitation API call, passed from useVideoCall hook
  onSendInvitation: () => Promise<void>
  patientJoined:  boolean
  waitingStatus:  'waiting' | 'active' | 'ended' | 'cancelled'
  // Real patient name from polling / queue
  patientName?:   string
  // MODIFICATION: receive full queue from parent (useVideoCall) instead of fetching here
  doctorQueue?:   QueuePatient[]
}

const WaitingRoom: React.FC<Props> = ({
  sessionId, onJoin, onCancel, onViewHistory, onSendInvitation,
  patientJoined, waitingStatus,
  patientName = '',
  doctorQueue = [],
}) => {
  const [secs, setSecs]               = useState(0)
  const [menuOpen, setMenuOpen]       = useState(false)
  const [notified, setNotified]       = useState(false)
  const [pollCountdown, setPollCountdown] = useState(3)

  // Invitation flow
  const [inviteSent, setInviteSent]   = useState(false)
  const [joinSecs, setJoinSecs]       = useState(0)
  const joinRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // MODIFICATION: track real API send state + confirmation popup
  const [sendingInvite, setSendingInvite] = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [sendError, setSendError]         = useState('')

  // Session timer (topbar)
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Poll countdown display
  useEffect(() => {
    const t = setInterval(() => setPollCountdown(c => (c <= 1 ? 3 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  // Patient joined banner
  useEffect(() => {
    if (patientJoined && !notified) setNotified(true)
  }, [patientJoined, notified])

  // When invite is sent: start count-up, auto-proceed after 5s
  useEffect(() => {
    if (!inviteSent) return
    setJoinSecs(0)
    joinRef.current = setInterval(() => {
      setJoinSecs(s => {
        if (s + 1 >= 5) {
          clearInterval(joinRef.current!)
          onJoin()
        }
        return s + 1
      })
    }, 1000)
    return () => { if (joinRef.current) clearInterval(joinRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteSent])

  // MODIFICATION: actually calls the backend to invite the patient.
  // Only on success do we show the confirmation popup.
  const handleSendInvitationClick = async () => {
    setSendError('')
    setSendingInvite(true)
    try {
      await onSendInvitation()
      setSendingInvite(false)
      setShowConfirm(true)
    } catch (err) {
      console.error('Send invitation failed:', err)
      setSendingInvite(false)
      setSendError('Invitation එක යැවීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.')
    }
  }

  // MODIFICATION: doctor clicks "OK" on the confirmation popup —
  // only then does the waiting/connecting/live-call flow actually begin
  const handleConfirmOk = () => {
    setShowConfirm(false)
    setInviteSent(true)
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  // MODIFICATION: patient name resolution order:
  // 1. patientName from polling (real-time, most accurate)
  // 2. first patient name from doctorQueue (pre-loaded before patient joins)
  // 3. generic fallback
  const displayPatientName = patientName || (doctorQueue[0]?.patientName ?? 'Patient')
  const displayInitial      = displayPatientName[0]?.toUpperCase() ?? 'P'

  return (
    <div className={styles.page}>

      {/* ── Top bar ── */}
      <header className={styles.topbar}>
        <button type="button" className={styles.menuBtn}
          onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">☰</button>
        <button className={styles.backBtn} onClick={onCancel}>← Back</button>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <span className={styles.badgeBlue}>Session Open</span>
        <span className={styles.timerText}>00:{pad(Math.floor(secs / 60))}:{pad(secs % 60)}</span>
        <div className={styles.topbarRight}>
          <button className={styles.iconBtn}>🔔</button>
          <div className={styles.avatar}>D</div>
        </div>
      </header>

      <div className={styles.layout}>
        <Sidebar activePath="/video-call" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        <main className={styles.main}>
          <div className={styles.inner}>

            {/* ══════════════════════════════════════════════
                MODIFICATION: INVITATION-SENT CONFIRMATION MODAL
                Shown right after the backend confirms the invite went out.
                The waiting/connecting/live-call flow only starts once the
                doctor clicks OK here.
            ══════════════════════════════════════════════ */}
            {showConfirm && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000,
              }}>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: '32px 28px',
                  maxWidth: 360, width: '90%', textAlign: 'center',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    Invitation Sent!
                  </h3>
                  <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6B7280' }}>
                    The patient has been notified and invited to join this session.
                  </p>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ width: '100%' }}
                    onClick={handleConfirmOk}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                INVITATION SENT OVERLAY
            ══════════════════════════════════════════════ */}
            {inviteSent && (
              <div className={styles.inviteOverlay}>

                {/* Polling status dot */}
                <div className={styles.pollRow}>
                  <span className={styles.pollDot} />
                  <span className={styles.pollText}>
                    {waitingStatus === 'active'
                      ? 'Patient connected!'
                      : `Waiting for patient to join… (checking in ${pollCountdown} s)`}
                  </span>
                </div>

                {/* Avatar scene */}
                <div className={styles.avatarScene}>
                  <div className={styles.ripple1} />
                  <div className={styles.ripple2} />
                  <div className={styles.ripple3} />
                  <div className={`${styles.orbitRing} ${patientJoined ? styles.orbitRingActive : ''}`} />
                  <div className={`${styles.bigAvatar} ${patientJoined ? styles.bigAvatarJoined : styles.bigAvatarWaiting}`}>
                    {/* MODIFICATION: real initial from resolved patient name */}
                    {patientJoined ? '✓' : displayInitial}
                  </div>
                </div>

                {/* MODIFICATION: show real patient name in waiting overlay */}
                <div className={styles.textBlock}>
                  <h2 className={styles.textTitle}>
                    {patientJoined
                      ? `${displayPatientName} is ready!`
                      : `Waiting for ${displayPatientName}…`}
                  </h2>
                  <p className={styles.textSub}>
                    {patientJoined
                      ? 'Patient has joined. Starting call…'
                      : 'Invitation sent. Session will begin once the patient joins.'}
                  </p>
                </div>

                {/* Session code */}
                <div className={styles.codeBox}>
                  Session Code: #{sessionId}&nbsp;|&nbsp;PIN: N/A
                </div>

                {/* Count-up timer + progress bar */}
                <div className={styles.countUpWrap}>
                  <div className={styles.countUpLabel}>
                    Connecting in <span className={styles.countUpNum}>{joinSecs}s</span>
                    <span className={styles.countUpOf}> / 5s</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${(joinSecs / 5) * 100}%` }}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* ══════════════════════════════════════════════
                NORMAL VIEW (before invitation is sent)
            ══════════════════════════════════════════════ */}
            {!inviteSent && (
              <>
                {/* MODIFICATION: show error if the API call to send invitation fails */}
                {sendError && (
                  <div style={{
                    background: '#FEE2E2', border: '1.5px solid #FCA5A5', borderRadius: 10,
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    marginBottom: 16, color: '#991B1B', fontSize: 14,
                  }}>
                    ⚠️ {sendError}
                  </div>
                )}

                {/* Patient joined banner */}
                {notified && (
                  <div style={{
                    background: '#D1FAE5', border: '1.5px solid #34D399', borderRadius: 10,
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    marginBottom: 16, animation: 'fadeIn .4s ease',
                  }}>
                    <span style={{ fontSize: 22 }}>🟢</span>
                    <div>
                      {/* MODIFICATION: real patient name */}
                      <div style={{ fontWeight: 700, color: '#065F46', fontSize: 15 }}>
                        Patient has joined the waiting room!
                      </div>
                      <div style={{ fontSize: 13, color: '#047857', marginTop: 2 }}>
                        {displayPatientName} is ready. Click "Send Invitation" below to begin.
                      </div>
                    </div>
                  </div>
                )}

                {/* MODIFICATION: Real patient queue from doctorQueue prop */}
                <div className={`${styles.card} ${styles.cardFull}`}>
                  <h3 className={styles.cardTitle}>📋 Today's Patient Queue</h3>

                  {doctorQueue.length === 0 && (
                    <div style={{
                      background: '#F9FAFB', border: '1px dashed #E5E7EB',
                      borderRadius: 8, padding: '16px', textAlign: 'center',
                      color: '#9CA3AF', fontSize: 13,
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>📭</div>
                      No patients in queue yet.
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Patients will appear here once they book an appointment.
                      </div>
                    </div>
                  )}

                  {doctorQueue.map((q, i) => {
                    const isFirst    = i === 0
                    const timeStr    = new Date(q.date).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit',
                    })
                    const isJoined   = isFirst && patientJoined
                    const badgeClass = isFirst ? styles.badgeAmber : styles.badgeGray
                    const dotClass   = isFirst ? styles.dotAmber   : styles.dotGray
                    const avatarBg   = isFirst ? '#2B52D4' : '#6B7280'
                    const label      = isFirst
                      ? (isJoined ? '● Joined' : '● Next Up')
                      : 'Upcoming'

                    return (
                      <div key={q._id} className={styles.qRow} style={{ opacity: isFirst ? 1 : 0.65 }}>
                        <div className={`${styles.dot} ${dotClass}`} />
                        <div className={styles.qAvatar} style={{ background: avatarBg }}>
                          {q.patientInitial}
                        </div>
                        <div className={styles.qInfo}>
                          {/* MODIFICATION: real patient name from doctorQueue prop */}
                          <div className={styles.qName}>{q.patientName}</div>
                          <div className={styles.qTime}>{timeStr}</div>
                        </div>
                        <span className={`${styles.badge} ${badgeClass}`}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                  <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onViewHistory}>
                    📋 View Patient History
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleSendInvitationClick}
                    disabled={sendingInvite}
                  >
                    {sendingInvite ? '⏳ Sending…' : '📨 Send Invitation'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onCancel}>
                    Cancel Session
                  </button>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}

export default WaitingRoom