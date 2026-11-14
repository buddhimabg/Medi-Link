// src/pages/VideoCall/PatientVideoCallScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { io, Socket } from 'socket.io-client'
import { videoApi, getToken } from '../../types/api'
import type { CallData } from '../../types/videoCall'
import ConsentModal from './ConsentModal'
import styles from './PatientVideoCallScreen.module.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000'

type Phase = 'loading' | 'not-found' | 'waiting-for-doctor' | 'device-check' | 'consent' | 'in-call' | 'ended'

interface Props {
  userName?: string
}

const PatientVideoCallScreen: React.FC<Props> = ({ userName }) => {
  const { sessionId = '' } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [phase, setPhase]           = useState<Phase>('loading')
  const [doctorName, setDoctorName] = useState<string>('')
  const [camOk, setCamOk]           = useState(false)
  const [micOk, setMicOk]           = useState(false)
  const [duration, setDuration]     = useState(0)
  const [callData, setCallData]     = useState<CallData | null>(null)
  const [errorMsg, setErrorMsg]     = useState<string>('')

  // Live recording banner — pushed by the doctor's recording-status socket
  // event. Independent of chat, which is now ZegoCloud's own native panel
  // (showTextChat: true below) — no custom socket/DB chat wiring here
  // anymore, same as the doctor side.
  const [recordingBanner, setRecordingBanner] = useState(false)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const zegoRef         = useRef<InstanceType<typeof ZegoUIKitPrebuilt> | null>(null)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef       = useRef<Socket | null>(null)

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // ── Poll session status — wait until the doctor has created the room ──
  useEffect(() => {
    if (!sessionId) { setPhase('not-found'); return }
    let cancelled = false

    const poll = async () => {
      try {
        const status = await videoApi.getSessionStatus(sessionId)
        if (cancelled) return
        if (status.status === 'ended' || status.status === 'cancelled') {
          setPhase('ended')
          return
        }
        // Room exists (waiting or active) — move on to device check once
        if (phase === 'loading' || phase === 'waiting-for-doctor') {
          setPhase(prev => (prev === 'loading' || prev === 'waiting-for-doctor') ? 'device-check' : prev)
        }
      } catch {
        if (!cancelled) setPhase('waiting-for-doctor')
      }
    }

    poll()
    const id = setInterval(poll, 4000)
    return () => { cancelled = true; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ── Camera/mic preview during device-check phase ──
  useEffect(() => {
    if (phase !== 'device-check') return
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream
        setCamOk(true)
        setMicOk(true)
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => { setCamOk(false); setMicOk(false) })

    return () => {
      // Only stop the preview stream when leaving device-check (not when
      // moving into the call — the same stream local mute/cam toggles use)
    }
  }, [phase])

  // ── Session socket: recording-status banner only. Chat is now Zego's
  //     own native panel (showTextChat: true below), so the old
  //     conversationId/messages/chatApi wiring has been removed — this
  //     socket now only carries the live recording-status broadcast. ──
  const connectSessionSocket = useCallback(() => {
    if (socketRef.current?.connected) return
    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('join-session-room', { sessionId })
    })
    socket.on('recording-status', ({ recording }: { recording: boolean }) => {
      setRecordingBanner(recording)
    })
  }, [sessionId])

  useEffect(() => {
    if (phase !== 'in-call') return
    connectSessionSocket()
  }, [phase, connectSessionSocket])

  useEffect(() => {
    return () => { socketRef.current?.disconnect() }
  }, [])

  const handleJoinClick = () => setPhase('consent')

  const handleConsentAgree = useCallback(async () => {
    setErrorMsg('')
    try {
      const data = await videoApi.joinRoom(sessionId, true)
      setCallData(data)
      setPhase('in-call')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join the call.')
      setPhase('device-check')
    }
  }, [sessionId])

  const handleConsentDecline = () => setPhase('device-check')

  // ── Join the ZegoCloud room once we have CallData ──
  useEffect(() => {
    if (phase !== 'in-call' || !callData || !containerRef.current) return
    if (!callData.appId || callData.appId === 0) return

    streamRef.current?.getTracks().forEach(t => t.stop()) // stop the preview stream

    const { roomId, token, appId, userId, userName: uName } = callData
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(appId, token, roomId, userId, uName)
    const zego = ZegoUIKitPrebuilt.create(kitToken)
    zegoRef.current = zego
    zego.joinRoom({
      container: containerRef.current,
      scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
      showPreJoinView: false,
      showLeaveRoomConfirmDialog: false,
      showUserList: true,     // ✅ Zego native participants list — matches doctor side
      maxUsers: 2,
      showScreenSharingButton: false,
      showTextChat: true,     // ✅ Zego native chat — matches doctor side, replaces the old custom socket/DB chat panel
      showUserName: false,
      showRoomTimer: false,
      // ZegoCloud's own toggle buttons control the REAL published stream
      // (unlike the old custom Mic/Camera buttons, which toggled a dead
      // preview stream that was already .stop()'d above).
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: false,
      showLayoutButton: false,
      onLeaveRoom: () => { setPhase('ended') },
    })

    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

    return () => {
      try { zego.destroy() } catch { /* ignore */ }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, callData])

  const handleLeave = () => {
    try { zegoRef.current?.destroy() } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('ended')
  }

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // ── Pre-call screens — same card-based light/dark language as the
  //     doctor side, via the shared PatientVideoCallScreen.module.css ──
  if (phase === 'loading' || phase === 'waiting-for-doctor') {
    return (
      <div className={styles.centerScreen}>
        <div className={styles.centerIcon}>⏳</div>
        <h2 style={{ margin: 0 }}>Waiting for your doctor to start the session…</h2>
        <p className={styles.centerSub}>This page will update automatically.</p>
      </div>
    )
  }

  if (phase === 'not-found') {
    return (
      <div className={styles.centerScreen}>
        <div className={styles.centerIcon}>⚠️</div>
        <h2 style={{ margin: 0 }}>Invalid session link</h2>
        <button className={styles.primaryBtn} onClick={() => navigate('/patient-home')}>Go to Home</button>
      </div>
    )
  }

  if (phase === 'ended') {
    return (
      <div className={styles.centerScreen}>
        <div className={styles.centerIcon}>✅</div>
        <h2 style={{ margin: 0 }}>Session ended</h2>
        <p className={styles.centerSub}>Duration: {formatDuration(duration)}</p>
        <button className={styles.primaryBtn} onClick={() => navigate('/patient-home')}>Back to Home</button>
      </div>
    )
  }

  if (phase === 'device-check' || phase === 'consent') {
    return (
      <div className={styles.centerScreen}>
        <h2 style={{ marginBottom: 6 }}>Ready to join your session?</h2>
        <p className={styles.centerSub} style={{ marginBottom: 20 }}>Check your camera and microphone first</p>

        <div className={styles.devicePreview}>
          <video ref={videoRef} autoPlay muted playsInline className={styles.devicePreviewVideo} />
          <div className={styles.deviceStatusRow}>
            <span className={`${styles.deviceStatus} ${camOk ? styles.deviceStatusOk : styles.deviceStatusBad}`}>{camOk ? '● Camera OK' : '✕ No Camera'}</span>
            <span className={`${styles.deviceStatus} ${micOk ? styles.deviceStatusOk : styles.deviceStatusBad}`}>{micOk ? '● Mic OK' : '✕ No Mic'}</span>
          </div>
        </div>

        {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

        <button className={styles.primaryBtn} onClick={handleJoinClick}>Join Session →</button>

        {phase === 'consent' && (
          <ConsentModal role="patient" onAgree={handleConsentAgree} onDecline={handleConsentDecline} />
        )}
      </div>
    )
  }

  // ── in-call — same topbar / video-wrap / sidebar-card layout as the
  //     doctor's LiveCallScreen, via the shared class names ──
  return (
    <div className={styles.wrapper}>
      {recordingBanner && (
        <div className={styles.recordingBanner}>
          <span className={styles.recordingDot} />
          This session is being recorded
        </div>
      )}

      <header className={styles.topbar}>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <div className={styles.livePill}><div className={styles.liveDot} /><span className={styles.liveText}>Live</span></div>
        <div className={styles.timer}>{formatDuration(duration)}</div>
        <div className={styles.topbarRight}>
          <span className={styles.badgeBlue}>#{sessionId || 'SESSION'}</span>
          <button className={styles.endBtn} onClick={handleLeave}>Leave</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.videoWrap}>
          {/* ZegoCloud renders its own native bottom toolbar (mic, camera,
              chat, participants, leave) inside this container — same as
              the doctor side, no custom overlay buttons needed here. */}
          <div ref={containerRef} className={styles.zegoContainer} />
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>🩺 Doctor</h3>
            <div className={styles.kv}>
              <span className={styles.kvK}>Name</span>
              <span className={styles.kvV}>{doctorName || 'Doctor'}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.kvK}>Session</span>
              <span className={styles.kvV}>#{sessionId || '—'}</span>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>💡 Tips</h3>
            <p className={styles.hint}>
              Use the chat icon in the call toolbar below to message your
              doctor. If your connection drops, this page reconnects
              automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientVideoCallScreen