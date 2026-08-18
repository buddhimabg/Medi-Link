import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { CallData, ChatMessage, Medication, NewMedication } from '../../types/videoCall'
import type { Medication as ApiMedication, PatientHistoryRecord } from '../../types/api'
import styles from './LiveCallScreen.module.css'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { videoApi } from '../../types/api'

// Curated common-medicine list for the autocomplete. Not exhaustive —
// this just speeds up the common cases and helps avoid typos; only exact
// matches from this list can be added to a prescription.
const MEDICINE_LIST = [
  'Sertraline', 'Escitalopram', 'Fluoxetine', 'Paroxetine', 'Citalopram',
  'Venlafaxine', 'Duloxetine', 'Bupropion', 'Mirtazapine', 'Trazodone',
  'Alprazolam', 'Diazepam', 'Lorazepam', 'Clonazepam', 'Buspirone',
  'Quetiapine', 'Risperidone', 'Olanzapine', 'Aripiprazole', 'Lithium',
  'Lamotrigine', 'Valproate', 'Carbamazepine', 'Propranolol', 'Hydroxyzine',
  'Zolpidem', 'Melatonin', 'Methylphenidate', 'Atomoxetine', 'Amitriptyline',
  'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Azithromycin',
  'Omeprazole', 'Metformin', 'Amlodipine', 'Atorvastatin', 'Losartan',
  'Cetirizine', 'Loratadine', 'Salbutamol', 'Prednisolone', 'Vitamin D3',
]

const isKnownMedicine = (name: string) =>
  MEDICINE_LIST.some(m => m.toLowerCase() === name.trim().toLowerCase())

// Dosage — number + recognised unit, within a sane clinical range so
// obvious typos (like "5000mg") are rejected before being prescribed.
const DOSE_PATTERN = /^(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml)$/i
const DOSE_RANGE: Record<string, [number, number]> = {
  mg: [0.01, 2000], mcg: [1, 2000], g: [0.01, 10], ml: [0.1, 500],
}
function validateDose(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Dosage is required'
  const match = trimmed.match(DOSE_PATTERN)
  if (!match) return 'Use a number + unit, e.g. 0.25mg, 500mg, 5ml'
  const value = parseFloat(match[1])
  const unit  = match[2].toLowerCase()
  const [min, max] = DOSE_RANGE[unit]
  if (value < min || value > max) return `${unit} dose should be between ${min} and ${max}${unit}`
  return null
}

// Frequency — fixed list only, no free text.
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'Once weekly', 'As needed (PRN)', 'At bedtime', 'Before meals', 'After meals',
]

// Duration — number + days/weeks/months, within a sane range.
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months)$/i
const DURATION_RANGE: Record<string, [number, number]> = {
  day: [1, 90], days: [1, 90], week: [1, 26], weeks: [1, 26], month: [1, 12], months: [1, 12],
}
function validateDuration(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Duration is required'
  const match = trimmed.match(DURATION_PATTERN)
  if (!match) return 'Use a number + unit, e.g. 7 days, 2 weeks, 1 month'
  const value = parseFloat(match[1])
  const unit  = match[2].toLowerCase()
  const [min, max] = DURATION_RANGE[unit]
  if (value < min || value > max) return `Should be between ${min} and ${max} ${unit}`
  return null
}

interface Props {
  callData:        CallData | null
  duration:        number
  formatDuration:  (s: number) => string
  micMuted:        boolean
  setMicMuted:     (v: boolean) => void
  camOff:          boolean
  setCamOff:       (v: boolean) => void
  sessionNotes:    string
  setSessionNotes: (v: string) => void
  messages:        ChatMessage[]
  chatInput:       string
  setChatInput:    (v: string) => void
  patientTyping:   boolean
  sendChatMessage: () => void
  notifyPatient?:   (text: string) => void
  patientMicOn?:    boolean
  patientCamOn?:    boolean
  onRecordingChange?: (recording: boolean) => void
  onShare:         () => void
  onPrescribe:     () => void
  onEndConfirm:    () => void
  onBack:          () => void

  // Prescription overlay props
  showPrescription?:    boolean
  medications?:         Medication[]
  removeMedication?:    (id: number) => void
  newMed?:              NewMedication
  setNewMed?:           (v: NewMedication) => void
  onAddMed?:            () => void
  rxNotes?:             string
  setRxNotes?:          (v: string) => void
  onIssue?:             () => void
  rxSaved?:             boolean
  onClosePrescription?: () => void

  //NEW — real data props
  patientName?:     string
  doctorName?:      string
  sessionId?:       string
  onSaveNote?:      () => Promise<void>
  existingRx?:      ApiMedication[]
  existingRxNotes?: string
  patientHistory?:  PatientHistoryRecord[]
  chatConnected?:   boolean
}

const LiveCallScreen: React.FC<Props> = ({
  callData, duration, formatDuration,
  micMuted, setMicMuted,
  camOff, setCamOff,
  sessionNotes, setSessionNotes,
  messages, chatInput, setChatInput,
  patientTyping, sendChatMessage,
  patientMicOn = true, patientCamOn = true, onRecordingChange,
  onShare, onPrescribe, onEndConfirm, onBack,

  // prescription overlay
  showPrescription = false,
  medications = [],
  removeMedication,
  newMed,
  setNewMed,
  onAddMed,
  rxNotes = '',
  setRxNotes,
  onIssue,
  rxSaved = false,
  onClosePrescription,

  // NEW props
  patientName    = 'Patient',
  doctorName     = 'Doctor',
  sessionId      = '',
  onSaveNote,
  existingRx     = [],
  existingRxNotes = '',
  patientHistory = [],
  chatConnected  = false,
}) => {
  const containerRef      = useRef<HTMLDivElement>(null)
  const zegoRef           = useRef<InstanceType<typeof ZegoUIKitPrebuilt> | null>(null)
  const localStreamRef    = useRef<MediaStream | null>(null)
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const [isRecording,      setIsRecording]      = useState(false)
  const [noteSaved,        setNoteSaved]        = useState(false)
  const [inviteCopied,     setInviteCopied]     = useState(false)
  const [toast,            setToast]            = useState<string | null>(null)
  const [showBackConfirm,  setShowBackConfirm]  = useState(false)
  const [noteSaving,       setNoteSaving]       = useState(false)
  const [cloudRecStatus,   setCloudRecStatus]   = useState<string>('none')
  const [transcriptText, setTranscriptText] = useState('')
  const recognitionRef = useRef<any>(null)
  const transcriptRef  = useRef('') // mirrors transcriptText, read by stopAndSaveTranscript so it always has the latest text without needing to be re-created (and re-wired into onLeaveRoom) on every keystroke

  // ── Prescription form validation state ──────────────────────
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [nameTouched,     setNameTouched]     = useState(false)
  const [doseTouched,     setDoseTouched]     = useState(false)
  const [durationTouched, setDurationTouched] = useState(false)
  const nameWrapRef = useRef<HTMLDivElement>(null)

  const medSuggestions = useMemo(() => {
    const q = (newMed?.name || '').trim().toLowerCase()
    if (!q) return []
    return MEDICINE_LIST.filter(m => m.toLowerCase().startsWith(q)).slice(0, 8)
  }, [newMed?.name])

  const nameError = nameTouched && (newMed?.name || '').trim() && !isKnownMedicine(newMed?.name || '')
    ? 'Please select a medicine from the suggestions list'
    : nameTouched && !(newMed?.name || '').trim()
      ? 'Medicine name is required'
      : null
  const doseError     = doseTouched ? validateDose(newMed?.dose || '') : null
  const durationError = durationTouched ? validateDuration(newMed?.duration || '') : null

  const canAddMed = isKnownMedicine(newMed?.name || '')
    && !validateDose(newMed?.dose || '')
    && !validateDuration(newMed?.duration || '')
    && (newMed?.frequency || '').trim() !== ''

  const handleAddMedClick = () => {
    setNameTouched(true)
    setDoseTouched(true)
    setDurationTouched(true)
    if (!canAddMed) return
    onAddMed?.()
    setNameTouched(false)
    setDoseTouched(false)
    setDurationTouched(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nameWrapRef.current && !nameWrapRef.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ZegoCloud initialize
  useEffect(() => {
    if (!callData || !containerRef.current) return
    if (!callData.appId || callData.appId === 0) return
    const { roomId, token, appId, userId, userName } = callData
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(appId, token, roomId, userId, userName)
    const zego = ZegoUIKitPrebuilt.create(kitToken)
    zegoRef.current = zego
    zego.joinRoom({
      container: containerRef.current,
      scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
      showPreJoinView: false,
      showLeaveRoomConfirmDialog: false,
      showUserList: true,     // ✅ Zego native participants list (replaces custom panel)
      maxUsers: 2,
      showScreenSharingButton: true,
      showTextChat: true,     // ✅ Zego native chat (replaces custom chat panel)
      showUserName: false,
      showRoomTimer: false,
      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: false,
      showLayoutButton: false,
      // Save the transcript whenever the doctor actually leaves via
      // ZegoCloud's own native hangup button. stopAndSaveTranscript reads
      // from transcriptRef (a mutable ref, not the transcriptText state),
      // so it's safe to call here even though it isn't in this effect's
      // dependency array — it always has the latest transcript.
      onLeaveRoom: () => { stopAndSaveTranscript() },
    })
    return () => { try { zego.destroy() } catch { /* ignore */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callData])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => { localStreamRef.current = stream })
      .catch(() => {})
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Poll cloud recording status while the call is live — purely additive,
  // doesn't touch the existing local `isRecording` screen-record button.
  useEffect(() => {
    const sid = callData?.sessionId || sessionId
    if (!sid) return
    const poll = () => videoApi.getRecordingStatus(sid).then(r => setCloudRecStatus(r.status)).catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [callData?.sessionId, sessionId])

  const handleMute = useCallback(() => {
    const willMute = !micMuted
    setMicMuted(willMute)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !willMute })
    }
    showToast(willMute ? '🔇 Microphone muted' : '🎤 Microphone unmuted')
  }, [micMuted, setMicMuted, showToast])

  const handleCamera = useCallback(() => {
    const willOff = !camOff
    setCamOff(willOff)
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !willOff })
    }
    showToast(willOff ? '📷 Camera turned off' : '📹 Camera turned on')
  }, [camOff, setCamOff, showToast])

  const handleInvite = useCallback(() => {
    const link = `${window.location.origin}/video-call/${callData?.sessionId || sessionId || 'SESSION'}`
    navigator.clipboard.writeText(link)
      .then(() => {
        setInviteCopied(true)
        showToast('✅ Session link copied!')
        setTimeout(() => setInviteCopied(false), 3000)
      })
      .catch(() => window.prompt('Copy this link:', link))
  }, [callData, sessionId, showToast])

  const startTranscription = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { showToast('⚠️ Speech-to-text not supported in this browser'); return }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event: any) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' '
      }
      if (finalText.trim()) {
        setTranscriptText(prev => {
          const next = `${prev}\n[${new Date().toLocaleTimeString()}] ${finalText.trim()}`
          transcriptRef.current = next // keep the ref in sync so stopAndSaveTranscript always sees the latest text
          return next
        })
      }
    }
    recognition.onerror = () => { /* silently ignore, keep call running */ }
    recognition.start()
    recognitionRef.current = recognition
    showToast('📝 Live transcription started')
  }, [showToast])

  // Reads from transcriptRef (not the transcriptText state) so this stays
  // stable across the whole call — safe to reference from the joinRoom
  // effect's onLeaveRoom closure below without re-joining the room every
  // time new transcript text comes in.
const stopAndSaveTranscript = useCallback(async () => {
  recognitionRef.current?.stop()
  const sid  = callData?.sessionId || sessionId
  const text = transcriptRef.current.trim()
  if (sid && text) {
    const cleaned = sessionNotes.replace(/\n*--- Session Transcript ---[\s\S]*$/, '').trimEnd()
    setSessionNotes(`${cleaned}\n\n--- Session Transcript ---\n${text}`)
    try {
      await videoApi.saveTranscript(sid, text)
    } catch { /* non-blocking */ }
  }
}, [callData?.sessionId, sessionId, sessionNotes, setSessionNotes])

  // Auto-start transcription once the call is live
  useEffect(() => {
    if (callData?.appId) startTranscription()
    return () => { recognitionRef.current?.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callData?.appId])

  const handleRecord = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      showToast('⏹ Recording stopped — downloading...')
      onRecordingChange?.(false)
      return
    }
navigator.mediaDevices.getDisplayMedia({
  video: {
    displaySurface: 'browser', // "This Tab" option eka prefer karana widiyata browser ta hint ekak denawa
  },
  audio: true,
  preferCurrentTab: true,     // Chrome eke, "This Tab" eka automatically pre-select karanawa
  selfBrowserSurface: 'include',
}as any)
      .then(stream => {
        recordedChunksRef.current = []
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
          const sid  = callData?.sessionId || sessionId
          // Upload to backend — links to PatientHistory automatically
          if (sid) {
            videoApi.uploadRecording(sid, blob)
              .then(() => showToast('✅ Recording saved to patient history!'))
              .catch(() => showToast('❌ Recording upload failed'))
          }
          // Keep local download too, as a backup copy for the doctor
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `medilink-session-${new Date().toISOString().slice(0, 10)}.webm`
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url); stream.getTracks().forEach(t => t.stop())
        }

        stream.getVideoTracks()[0].onended = () => { setIsRecording(false); showToast('⏹ Recording stopped'); onRecordingChange?.(false) }
        recorder.start(1000); setIsRecording(true); showToast('⏺ Recording started')
        // FIX: this used to go through notifyPatient (a real chat message
        // saved to the conversation, cluttering the chat history). It now
        // fires a dedicated 'recording-status' socket event instead — the
        // patient shows it as a live top banner, not a chat bubble.
        onRecordingChange?.(true)
      })
      .catch(() => showToast('❌ Recording permission denied'))
  }, [isRecording, showToast, onRecordingChange])

  // real DB API call
  const handleSaveNote = useCallback(async () => {
    if (!sessionNotes.trim()) { showToast('⚠️ Please type a note first'); return }
    setNoteSaving(true)
    try {
      await onSaveNote?.()
      setNoteSaved(true)
      showToast('✅ Note saved to database!')
      setTimeout(() => setNoteSaved(false), 2500)
    } catch {
      showToast('❌ Failed to save note')
    }
    setNoteSaving(false)
  }, [sessionNotes, onSaveNote, showToast])

  // Patient initial letter for avatar
  const patientInitial = patientName ? patientName[0].toUpperCase() : 'P'
  const doctorInitial  = doctorName  ? doctorName[0].toUpperCase()  : 'D'
  return (
    <div className={styles.wrapper}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Back confirmation dialog */}
      {showBackConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <div className={styles.confirmIcon}>⚠️</div>
            <div className={styles.confirmTitle}>Leave Live Call?</div>
            <div className={styles.confirmSub}>The call is still active. Are you sure you want to go back?</div>
            <div className={styles.confirmActions}>
              <button className={`${styles.btn} ${styles.btnLight}`} onClick={() => setShowBackConfirm(false)}>
                Stay in Call
              </button>
              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => { stopAndSaveTranscript(); onBack() }}
              >
                Leave Call
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={styles.topbar}>
        <button
          className={styles.backBtn}
          onClick={() => setShowBackConfirm(true)}
          title="Back to Waiting Room"
        >
          ← Back
        </button>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <div className={styles.livePill}><div className={styles.liveDot}/><span className={styles.liveText}>{showPrescription ? 'LIVE · Rx' : 'Live'}</span></div>
        <div className={styles.timer}>{formatDuration(duration)}</div>
        <div className={styles.signal}>
          {[8,12,16,20,14].map((h,i)=><span key={i} className={styles.bar} style={{height:h}}/>)}
          <span className={styles.signalLabel}>Strong</span>
        </div>
        <div className={styles.topbarRight}>

<button
  className={styles.endBtn}
  onClick={() => {
    if (isRecording) handleRecord()
    stopAndSaveTranscript()
    onEndConfirm()
  }}
  title="End Session"
>
  🔴 End Session
</button>
          <span className={styles.badgeBlue}>#{callData?.sessionId || sessionId || 'SESSION'}</span>
          {isRecording&&<span className={styles.recPill}><span className={styles.recDot}/>REC</span>}
          {cloudRecStatus === 'recording' && (
            <span className={styles.recPill} style={{ background: '#2B52D4' }}>
              <span className={styles.recDot}/>☁️ Recording
            </span>
          )}

          <button className={styles.topIconBtn} onClick={handleInvite} title="Copy invite link">
            {inviteCopied ? '✅' : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            )}
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.videoWrap}>

          {/* ZegoCloud video container — the ZegoCloud UIKit renders its
              own native bottom toolbar (mic, camera, screen-share, leave)
              inside this container automatically. */}
          <div ref={containerRef} className={styles.zegoContainer}/>

          {/* Custom Record button, docked next to ZegoCloud's own native
              bottom toolbar (mic, camera, screen-share, chat, participants,
              leave). Chat and Participants are Zego's own native buttons
              (showTextChat / showUserList above) — Record has no native
              Zego equivalent (it's a local screen capture that uploads to
              our own backend), so it stays custom. Plain floating icon,
              no button chip — matches the rest of Zego's own overlay
              icons instead of a standalone pill. */}
          <div className={styles.zegoExtraBar}>
            <button
              className={styles.zegoRecordIcon}
              onClick={handleRecord}
              title={isRecording ? 'Stop recording' : 'Record'}
              style={isRecording ? { color: '#ef4444' } : undefined}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10"/>
                {isRecording ? <rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none"/> : <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>}
              </svg>
            </button>
          </div>

          {(!callData||callData.appId===0)&&(
            <div className={styles.fallback}>
              <div className={styles.waitingBox}>
                <div className={styles.waitingLabel}>WAITING</div>
              </div>

              {/*Real patient name */}
              <div className={styles.patientCenter}>
                <div className={styles.patientRing}><div className={styles.patientRing2}><div className={styles.patientAvatar}>{patientInitial}</div></div></div>
                <div className={styles.patientName}>{patientName || 'Patient'}</div>
                <div className={styles.patientSub}>Patient · Connected</div>
                <span className={styles.connectedBadge}>● Connected · HD Video</span>
                {micMuted&&<div className={styles.statusBanner}>🔇 Your microphone is muted</div>}
                {camOff&&<div className={styles.statusBanner}>📷 Your camera is off</div>}
              </div>

              {/*Real doctor name */}
              <div className={`${styles.selfCam} ${camOff?styles.selfCamOff:''}`}>
                {camOff?<div className={styles.selfCamOffIcon}>📷</div>:<div className={styles.selfCamAvatar}>{doctorInitial}</div>}
                <div className={styles.selfCamLabel}>You ({doctorName})</div>
                {micMuted&&<div className={styles.selfMutedIcon}>🔇</div>}
              </div>
            </div>
          )}
          {/* PRESCRIPTION OVERLAY */}
          {showPrescription && (
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '400px', height: '100%',
              background: '#ffffff', zIndex: 50,
              overflowY: 'auto',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f9fafb',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>💊 e-Prescription</div>
                  {/* ✅ Real patient name */}
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {patientName} · #{callData?.sessionId || sessionId || 'SESSION'}
                  </div>
                </div>
                <button
                  onClick={onClosePrescription}
                  style={{
                    background: '#e5e7eb', border: 'none', borderRadius: '50%',
                    width: '32px', height: '32px', cursor: 'pointer',
                    fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>

              <div style={{ padding: '16px 20px', flex: 1 }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    PRESCRIBED MEDICATIONS
                  </div>
                  {medications.length === 0 && (
                    <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                      No medications added yet
                    </div>
                  )}
                  {medications.map(med => (
                    <div key={med.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', background: '#f9fafb',
                      borderRadius: '8px', marginBottom: '6px', border: '1px solid #e5e7eb',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{med.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          {med.dose} · {med.frequency} · {med.duration}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMedication?.(med.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    NEW MEDICATION
                  </div>
                  <div style={{ marginBottom: '8px', position: 'relative' }} ref={nameWrapRef}>
                    <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '4px' }}>Medicine Name</label>
                    <input
                      placeholder="e.g. Alprazolam"
                      value={newMed?.name || ''}
                      onChange={e => { setNewMed?.({ ...newMed!, name: e.target.value }); setShowSuggestions(true); setNameTouched(false) }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setNameTouched(true)}
                      autoComplete="off"
                      style={{ width: '100%', padding: '8px 10px', border: `1px solid ${nameError ? '#DC2626' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    {showSuggestions && medSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                        background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8,
                        marginTop: 4, boxShadow: '0 4px 14px rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto',
                      }}>
                        {medSuggestions.map(name => (
                          <div
                            key={name}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setNewMed?.({ ...newMed!, name }); setShowSuggestions(false); setNameTouched(false) }}
                            style={{ padding: '8px 12px', fontSize: '12.5px', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >💊 {name}</div>
                        ))}
                      </div>
                    )}
                    {showSuggestions && (newMed?.name || '').trim() && medSuggestions.length === 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
                        background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8,
                        marginTop: 4, padding: '8px 12px', fontSize: '12px', color: '#9CA3AF',
                      }}>No match — pick from the list, we don't accept free-text medicine names.</div>
                    )}
                    {nameError && (
                      <div style={{ fontSize: '10.5px', color: '#DC2626', marginTop: '3px' }}>{nameError}</div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '4px' }}>Dosage</label>
                      <input
                        placeholder="e.g. 0.25mg"
                        value={newMed?.dose || ''}
                        onChange={e => setNewMed?.({ ...newMed!, dose: e.target.value })}
                        onBlur={() => setDoseTouched(true)}
                        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${doseError ? '#DC2626' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      {doseError && (
                        <div style={{ fontSize: '10.5px', color: '#DC2626', marginTop: '3px' }}>{doseError}</div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '4px' }}>Frequency</label>
                      <select
                        value={newMed?.frequency || ''}
                        onChange={e => setNewMed?.({ ...newMed!, frequency: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      >
                        <option value="">Select…</option>
                        {FREQUENCY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '4px' }}>Duration</label>
                      <input
                        placeholder="e.g. 14 days"
                        value={newMed?.duration || ''}
                        onChange={e => setNewMed?.({ ...newMed!, duration: e.target.value })}
                        onBlur={() => setDurationTouched(true)}
                        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${durationError ? '#DC2626' : '#e5e7eb'}`, borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      {durationError && (
                        <div style={{ fontSize: '10.5px', color: '#DC2626', marginTop: '3px' }}>{durationError}</div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '4px' }}>With Food?</label>
                      <select
                        value={newMed?.withFood || 'Yes'}
                        onChange={e => setNewMed?.({ ...newMed!, withFood: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      >
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleAddMedClick}
                    disabled={!canAddMed}
                    style={{
                      width: '100%', padding: '9px', background: canAddMed ? '#2B52D4' : '#9CA3AF',
                      color: '#fff', border: 'none', borderRadius: '6px',
                      fontSize: '13px', cursor: canAddMed ? 'pointer' : 'not-allowed', fontWeight: 600,
                      opacity: canAddMed ? 1 : 0.6,
                    }}
                  >+ Add</button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', color: '#374151', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Notes for Patient
                  </label>
                  <textarea
                    placeholder="e.g. Avoid alcohol. Follow up in 2 weeks."
                    value={rxNotes}
                    onChange={e => setRxNotes?.(e.target.value)}
                    style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e7eb',
                      borderRadius: '8px', minHeight: '80px', fontSize: '13px',
                      resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={onClosePrescription}
                    style={{
                      padding: '11px', background: '#f3f4f6',
                      color: '#374151', border: '1px solid #e5e7eb',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    }}
                  >Save Draft</button>
                  <button
                    onClick={onIssue}
                    style={{
                      padding: '11px',
                      background: rxSaved ? '#059669' : '#2B52D4',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      transition: 'background 0.2s',
                    }}
                  >
                    {rxSaved ? '✓ Issued!' : '🚀 Issue Prescription'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Chat is now Zego's own native panel (showTextChat: true above),
            so this sidebar — Patient Info / Previous Rx / Session Notes —
            is always shown instead of toggling with a custom chat panel. */}
        {(
          <div className={styles.sidebar}>
            {/* ✅ Patient Info — real data */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>👤 Patient Info</h3>
              <div className={styles.kv}>
                <span className={styles.kvK}>Name</span>
                <span className={styles.kvV}>{patientName || '—'}</span>
              </div>
              <div className={styles.kv}>
                <span className={styles.kvK}>Sessions</span>
                <span className={styles.kvV}>{patientHistory.length > 0 ? `${patientHistory.length} Total` : 'First session'}</span>
              </div>
              {patientHistory.length === 0 && (
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>No previous history found</div>
              )}
            </div>

            {/* ✅ Active Rx — real data from DB */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🔗 Previous Rx</h3>
              {existingRx.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>No previous prescriptions</div>
              ) : (
                existingRx.slice(0, 3).map((rx, i) => (
                  <div key={i} className={styles.rxItem}>
                    <div className={styles.rxName}>{rx.name}</div>
                    <div className={styles.rxDose}>{rx.dose} · {rx.frequency}</div>
                  </div>
                ))
              )}
              {existingRxNotes && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', background: '#EFF6FF',
                  border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 11.5, color: '#1E3A8A',
                }}>
                  💬 Last visit's notes: {existingRxNotes}
                </div>
              )}
              <button className={styles.prescribeBtn} onClick={onPrescribe}>💊 Write Prescription</button>
            </div>

            {/* Session Notes */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📋 Session Notes</h3>
              <textarea
                className={styles.notesArea}
                placeholder="Type observations..."
                value={sessionNotes}
                onChange={e=>setSessionNotes(e.target.value)}
              />
              {/* ✅ FIX: Save Note button — real API call */}
              <button
                className={`${styles.saveNoteBtn} ${noteSaved?styles.saveNoteSaved:''}`}
                onClick={handleSaveNote}
                disabled={noteSaving}
              >
                {noteSaving ? 'Saving...' : noteSaved ? '✓ Saved to DB!' : 'Save Note'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveCallScreen