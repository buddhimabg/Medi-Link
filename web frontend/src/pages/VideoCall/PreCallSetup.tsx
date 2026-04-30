// src/pages/VideoCall/PreCallSetup.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Step } from '../../hooks/useVideoCall'
import Sidebar from '../../components/layout/Sidebar'
import TopBar  from '../../components/layout/TopBar'
import styles  from './PreCallSetup.module.css'

interface Props {
  sessionId: string
  camOk:     boolean
  micOk:     boolean
  checking:  boolean
  loading:   boolean
  apiError:  string
  onRecheck: () => void
  onStart:   () => void
  onNavigateStep: (step: Step) => void
  stepTargets: {
    deviceCheck: Step
    waitingRoom: Step
    connecting: Step
    activeCall: Step
    screenShare: Step
    inCallChat: Step
    prescription: Step
    endCall: Step
    postCallSummary: Step
  }
}

interface DeviceInfo {
  cameraLabel:  string
  cameraRes:    string
  micLabel:     string
  micLevel:     string
  speakerLabel: string
  volume:       number
}

const cleanLabel = (raw: string, fallback: string): string => {
  if (!raw) return fallback
  return raw.replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/gi, '').replace(/\s+/g, ' ').trim() || fallback
}
const truncate = (str: string, max: number): string =>
  str.length > max ? str.substring(0, max) + '…' : str

const PreCallSetup: React.FC<Props> = ({
  sessionId, camOk, micOk, checking,
  loading, apiError, onRecheck, onStart, onNavigateStep, stepTargets,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number>(0)
  const micBarRefs   = useRef<(HTMLDivElement | null)[]>([])

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    cameraLabel: 'Detecting...', cameraRes: 'Detecting...',
    micLabel: 'Detecting...', micLevel: 'Good',
    speakerLabel: 'Default Speakers', volume: 70,
  })
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  const startMicAnalyzer = (stream: MediaStream) => {
    try {
      audioCtxRef.current?.close()
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source   = audioCtx.createMediaStreamSource(stream)
      const analyzer = audioCtx.createAnalyser()
      analyzer.fftSize = 64
      analyzer.smoothingTimeConstant = 0.8
      source.connect(analyzer)
      const data = new Uint8Array(analyzer.frequencyBinCount)
      const animate = () => {
        analyzer.getByteFrequencyData(data)
        micBarRefs.current.forEach((bar, i) => {
          if (!bar) return
          const value = data[Math.floor((i / micBarRefs.current.length) * data.length)] || 0
          bar.style.height = `${Math.max(15, (value / 255) * 100)}%`
        })
        const avg   = data.reduce((a, b) => a + b, 0) / data.length
        const level = avg > 60 ? 'Loud' : avg > 20 ? 'Good' : avg > 5 ? 'Low' : 'Silent'
        setDeviceInfo(prev => prev.micLevel !== level ? { ...prev, micLevel: level } : prev)
        animFrameRef.current = requestAnimationFrame(animate)
      }
      animate()
    } catch (err) { console.error('Mic analyzer error:', err) }
  }

  const startCamera = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      const videoTrack    = stream.getVideoTracks()[0]
      const videoSettings = videoTrack?.getSettings()
      const width         = videoSettings?.width  || 1280
      const height        = videoSettings?.height || 720
      const res           = height >= 1080 ? '1080p' : height >= 720 ? '720p' : '480p'
      const cameraLabel   = truncate(cleanLabel(videoTrack?.label || '', 'Integrated Camera'), 28)
      const audioTrack    = stream.getAudioTracks()[0]
      const micLabel      = truncate(cleanLabel(audioTrack?.label || '', 'Built-in Microphone'), 28)
      setDeviceInfo(prev => ({ ...prev, cameraLabel, cameraRes: `${width}x${height} · ${res}`, micLabel }))
      startMicAnalyzer(stream)
    } catch (err) { console.error('Camera/Mic error:', err) }
  }, [])

  useEffect(() => {
    startCamera()
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const speakers = devices.filter(d => d.kind === 'audiooutput')
      if (speakers.length > 0) {
        const label = truncate(cleanLabel(speakers[0].label || '', 'Default Speakers'), 28)
        setDeviceInfo(prev => ({ ...prev, speakerLabel: label }))
      }
    }).catch(() => {})
    const onDeviceChange = () => startCamera()
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close()
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }, [startCamera])

  const micBadgeClass = () => {
    switch (deviceInfo.micLevel) {
      case 'Loud': return styles.badgeAmber
      case 'Good': return styles.badgeGreen
      case 'Low':  return styles.badgeAmber
      default:     return styles.badgeGray
    }
  }

  return (
    <div className={styles.page}>
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className={styles.layout}>
        <Sidebar activePath="/video-call" isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className={styles.main}>
          <div className={styles.heading}>
            <h2 className={styles.title}>Pre-Call Setup</h2>
            <p className={styles.sub}>Check your camera and microphone before starting the session</p>
          </div>
          <div className={styles.stepBarWrap}>
            <div className={styles.stepBar}>
              <button type="button" className={`${styles.stepBtn} ${styles.stepBtnActive}`} onClick={() => onNavigateStep(stepTargets.deviceCheck)}>1 · Device Check</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.waitingRoom)}>2 · Waiting Room</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.connecting)}>3 · Connecting</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.activeCall)}>4 · Active Call</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.screenShare)}>5 · Screen Share</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.inCallChat)}>6 · In-Call Chat</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.prescription)}>7 · Prescription</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.endCall)}>8 · End Call</button>
              <button type="button" className={styles.stepBtn} onClick={() => onNavigateStep(stepTargets.postCallSummary)}>9 · Post-Call Summary</button>
            </div>
          </div>

          <div className={styles.grid}>
            {/* Camera & Mic card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📷 Camera &amp; Microphone</h3>

              <div className={styles.camPreview}>
                <video ref={videoRef} autoPlay muted playsInline className={styles.videoFeed} />
                {!camOk && (
                  <div className={styles.camFallback}>
                    <div className={styles.avatarLg}>Dr</div>
                    <span className={styles.camText}>Camera Preview</span>
                  </div>
                )}
                <div className={styles.camBadgePos}>
                  <span className={`${styles.badge} ${camOk ? styles.badgeGreen : styles.badgeRed}`}>
                    {camOk ? '● Camera OK' : '✕ No Camera'}
                  </span>
                </div>
                <div className={styles.camRes}>{camOk ? deviceInfo.cameraRes : 'Not detected'}</div>
              </div>

              <div className={styles.micRow}>
                <span className={styles.micIcon}>🎤</span>
                <div className={styles.micBars}>
                  {[0,1,2,3,4,5,6].map(i => (
                    <div key={i} ref={el => { micBarRefs.current[i] = el }}
                      className={`${styles.micBar} ${i === 6 ? styles.micBarGreen : ''}`}
                      style={{ height: '15%', opacity: micOk ? 1 : 0.3 }} />
                  ))}
                </div>
                <span className={styles.micStatus}>{micOk ? 'Mic Active' : 'No Mic'}</span>
                <span className={`${styles.badge} ${micOk ? micBadgeClass() : styles.badgeRed}`}>
                  {micOk ? deviceInfo.micLevel : 'Error'}
                </span>
              </div>

              {/* Camera row */}
              <div className={styles.deviceRow}>
                <div className={styles.deviceLeft}>
                  <div className={styles.deviceIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.deviceName}>{deviceInfo.cameraLabel}</div>
                    <div className={styles.deviceSub}>Resolution: {deviceInfo.cameraRes}</div>
                  </div>
                </div>
                <span className={camOk ? styles.checkOk : styles.checkFail}>{camOk ? '✓' : '✗'}</span>
              </div>

              {/* Mic row */}
              <div className={styles.deviceRow}>
                <div className={styles.deviceLeft}>
                  <div className={styles.deviceIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.deviceName}>{deviceInfo.micLabel}</div>
                    <div className={styles.deviceSub}>Input level: {micOk ? deviceInfo.micLevel : 'Not detected'}</div>
                  </div>
                </div>
                <span className={micOk ? styles.checkOk : styles.checkFail}>{micOk ? '✓' : '✗'}</span>
              </div>

              {/* Speaker row */}
              <div className={styles.deviceRow}>
                <div className={styles.deviceLeft}>
                  <div className={styles.deviceIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
                    </svg>
                  </div>
                  <div>
                    <div className={styles.deviceName}>{deviceInfo.speakerLabel}</div>
                    <div className={styles.deviceSub}>Volume: {deviceInfo.volume}%</div>
                  </div>
                </div>
                <button
                  className={`${styles.volumeBtn} ${showVolumeSlider ? styles.volumeBtnActive : ''}`}
                  onClick={() => setShowVolumeSlider(v => !v)}
                >🔊</button>
              </div>

              {showVolumeSlider && (
                <div className={styles.volumeWrap}>
                  <span>🔈</span>
                  <input type="range" min={0} max={100} value={deviceInfo.volume}
                    onChange={e => setDeviceInfo(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
                    className={styles.volumeSlider} />
                  <span>🔊</span>
                  <span className={styles.volValue}>{deviceInfo.volume}%</span>
                </div>
              )}

              <div className={styles.cardActions}>
                <button
                  className={`${styles.btn} ${styles.btnLight}`}
                  onClick={() => { onRecheck(); startCamera() }}
                  disabled={checking}
                >
                  {checking ? '⟳ Checking…' : '⚙️ Settings'}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnGrow}`}
                  onClick={onStart}
                  disabled={loading || checking}
                >
                  {loading ? 'Setting up…' : 'Start Session →'}
                </button>
              </div>
              {apiError && <div className={styles.errorBox}>⚠️ {apiError}</div>}
            </div>

            {/* Right info column */}
            <div className={styles.infoCol}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>📋 Session Details</h3>
                {[
                  { k: 'Session ID',  v: `#${sessionId}`, mono: true },
                  { k: 'Date & Time', v: 'Fri, Dec 26 · 5:00 PM' },
                  { k: 'Mode',        v: 'Teleconsultation' },
                  { k: 'Total Slots', v: '8 patients · 3 left' },
                ].map((row, i) => (
                  <div key={i} className={styles.kv}>
                    <span className={styles.kvKey}>{row.k}</span>
                    <span className={`${styles.kvVal} ${row.mono ? styles.kvMono : ''}`}>{row.v}</span>
                  </div>
                ))}
              </div>

              <div className={styles.card}>
                <h3 className={styles.cardTitle}>👤 First Patient</h3>
                <div className={styles.patientBubble}>
                  <div className={styles.avatar}>P</div>
                  <div>
                    <div className={styles.patientName}>Priyanka Jayawardhana</div>
                    <div className={styles.patientSub}>5:00 PM · 4th session</div>
                    <span className={`${styles.badge} ${styles.badgeGreen}`} style={{ marginTop: 6, display: 'inline-flex' }}>
                      ● Waiting in lobby
                    </span>
                  </div>
                </div>
                <div className={styles.queueLabel}>Next in Queue</div>
                {[
                  { i: 'R', name: 'Ravindra Perera',     time: '5:30 PM' },
                  { i: 'K', name: 'Kavindi Gunawardana', time: '6:00 PM' },
                ].map((p, idx) => (
                  <div key={idx} className={styles.queueItem}>
                    <div className={`${styles.avatar} ${styles.avatarGray} ${styles.avatarSm}`}>{p.i}</div>
                    <span className={styles.queueName}>{p.name}</span>
                    <span className={styles.queueTime}>{p.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default PreCallSetup