import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import type { CallData, ChatMessage, Medication, NewMedication } from '../../types/videoCall'
import type { Medication as ApiMedication, PatientHistoryRecord } from '../../types/api'
import styles from './LiveCallScreen.module.css'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'

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

const QUICK_REPLIES = ["That's great!", 'I understand.', "Let's discuss.", 'Please continue.']

const LiveCallScreen: React.FC<Props> = ({
  callData, duration, formatDuration,
  micMuted, setMicMuted,
  camOff, setCamOff,
  sessionNotes, setSessionNotes,
  messages, chatInput, setChatInput,
  patientTyping, sendChatMessage,
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
  const chatBottomRef     = useRef<HTMLDivElement>(null)

  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat,         setShowChat]         = useState(false)
  const [isRecording,      setIsRecording]      = useState(false)
  const [noteSaved,        setNoteSaved]        = useState(false)
  const [inviteCopied,     setInviteCopied]     = useState(false)
  const [toast,            setToast]            = useState<string | null>(null)
  const [showBackConfirm,  setShowBackConfirm]  = useState(false)
  const [noteSaving,       setNoteSaving]       = useState(false)

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
      showUserList: false,
      maxUsers: 2,
      showScreenSharingButton: false,
      showTextChat: false,
      showUserName: false,
      showRoomTimer: false,
      showMyCameraToggleButton: false,
      showMyMicrophoneToggleButton: false,
      showAudioVideoSettingsButton: false,
      showLayoutButton: false,
      onLeaveRoom: () => {},
    })
    return () => { try { zego.destroy() } catch { /* ignore */ } }
  }, [callData])

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => { localStreamRef.current = stream })
      .catch(() => {})
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, patientTyping])

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

  const handleParticipate = useCallback(() => {
    setShowParticipants(prev => { if (!prev) setShowChat(false); return !prev })
  }, [])

  const handleScreenShare = useCallback(async () => {
    try {
      showToast('🖥️ Opening screen picker...')
      await navigator.mediaDevices.getDisplayMedia({ video: true })
      onShare()
    } catch { showToast('❌ Screen share cancelled') }
  }, [onShare, showToast])

  const handleChat = useCallback(() => {
    setShowChat(prev => { if (!prev) setShowParticipants(false); return !prev })
  }, [])

  const handleRecord = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      showToast('⏹ Recording stopped — downloading...')
      return
    }
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      .then(stream => {
        recordedChunksRef.current = []
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
        const recorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = recorder
        recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `medilink-session-${new Date().toISOString().slice(0, 10)}.webm`
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url); stream.getTracks().forEach(t => t.stop())
        }
        stream.getVideoTracks()[0].onended = () => { setIsRecording(false); showToast('⏹ Recording stopped') }
        recorder.start(1000); setIsRecording(true); showToast('⏺ Recording started')
      })
      .catch(() => showToast('❌ Recording permission denied'))
  }, [isRecording, showToast])

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

  const handleChatKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); sendChatMessage() }
  }

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
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onBack}>
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

          {/* Real sessionId */}
          <span className={styles.badgeBlue}>#{callData?.sessionId || sessionId || 'SESSION'}</span>
          {isRecording&&<span className={styles.recPill}><span className={styles.recDot}/>REC</span>}
          <button className={styles.endBtn} onClick={onEndConfirm}>↪ End Session</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.videoWrap}>

          {/* ZegoCloud video container */}
          <div ref={containerRef} className={styles.zegoContainer}/>

          {(!callData||callData.appId===0)&&(
            <div className={styles.fallback}>
              <div className={styles.waitingBox}>
                <div className={styles.waitingLabel}>WAITING</div>
              </div>

              {showParticipants&&(
                <div className={styles.participantsPanel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>👥 Participants</span>
                    <button className={styles.panelClose} onClick={()=>setShowParticipants(false)}>✕</button>
                  </div>
                  {/* ✅ Real doctor + patient names */}
                  {[
                    {name: doctorName, role:'Doctor (You)', color:'#2B52D4', mic:!micMuted, cam:!camOff},
                    {name: patientName || 'Patient', role:'Patient', color:'#059669', mic:true, cam:true},
                  ].map((p,i)=>(
                    <div key={i} className={styles.participantRow}>
                      <div className={styles.participantAvatar} style={{background:p.color}}>{p.name[0]}</div>
                      <div className={styles.participantInfo}>
                        <div className={styles.participantName}>{p.name}</div>
                        <div className={styles.participantRole}>{p.role}</div>
                      </div>
                      <div className={styles.participantIcons}>
                        <span>{p.mic?'🎤':'🔇'}</span><span>{p.cam?'📹':'🚫'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

          <div className={styles.controls}>
            {/* MUTE */}
            <button className={`${styles.ctrlItem} ${micMuted?styles.ctrlItemActive:''}`} onClick={handleMute} title={micMuted?'Unmute':'Mute'}>
              <div className={`${styles.ctrlIcon} ${micMuted?styles.ctrlIconRed:''}`}>
                {micMuted?(
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                ):(
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                )}
              </div>
              <span className={`${styles.ctrlLabel} ${micMuted?styles.ctrlLabelRed:''}`}>{micMuted?'Unmute':'Mute'}</span>
            </button>

            {/* VIDEO */}
            <button className={`${styles.ctrlItem} ${camOff?styles.ctrlItemActive:''}`} onClick={handleCamera} title={camOff?'Start Video':'Stop Video'}>
              <div className={`${styles.ctrlIcon} ${camOff?styles.ctrlIconRed:''}`}>
                {camOff?(
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34"/><path d="M23 7l-7 5 7 5V7z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ):(
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                )}
              </div>
              <span className={`${styles.ctrlLabel} ${camOff?styles.ctrlLabelRed:''}`}>{camOff?'Start Cam':'Video'}</span>
            </button>

            {/* INVITE */}
            <button className={`${styles.ctrlItem} ${inviteCopied?styles.ctrlItemGreen:''}`} onClick={handleInvite} title="Copy invite link">
              <div className={`${styles.ctrlIcon} ${inviteCopied?styles.ctrlIconGreen:''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <span className={`${styles.ctrlLabel} ${inviteCopied?styles.ctrlLabelGreen:''}`}>{inviteCopied?'Copied!':'Invite'}</span>
            </button>

            {/* PARTICIPANTS */}
            <button className={`${styles.ctrlItem} ${showParticipants?styles.ctrlItemGreen:''}`} onClick={handleParticipate} title="Participants">
              <div className={`${styles.ctrlIcon} ${showParticipants?styles.ctrlIconGreen:''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <span className={`${styles.ctrlLabel} ${showParticipants?styles.ctrlLabelGreen:''}`}>Participate</span>
            </button>

            {/* SHARE */}
            <button className={styles.ctrlItemShare} onClick={handleScreenShare} title="Share screen">
              <div className={styles.ctrlIconShare}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </div>
              <span className={styles.ctrlLabel}>Share</span>
            </button>

            {/* CHAT */}
            <button className={`${styles.ctrlItem} ${showChat?styles.ctrlItemGreen:''}`} onClick={handleChat} title="Chat">
              <div className={`${styles.ctrlIcon} ${showChat?styles.ctrlIconGreen:''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <span className={`${styles.ctrlLabel} ${showChat?styles.ctrlLabelGreen:''}`}>Chat</span>
            </button>

            {/* RECORD */}
            <button className={`${styles.ctrlItem} ${isRecording?styles.ctrlItemActive:''}`} onClick={handleRecord} title={isRecording?'Stop':'Record'}>
              <div className={`${styles.ctrlIcon} ${isRecording?styles.ctrlIconRed:''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  {isRecording?<rect x="9" y="9" width="6" height="6" fill="currentColor" stroke="none"/>:<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>}
                </svg>
              </div>
              <span className={`${styles.ctrlLabel} ${isRecording?styles.ctrlLabelRed:''}`}>{isRecording?'● Stop':'Record'}</span>
            </button>

            {/* LEAVE */}
            <button className={styles.ctrlItemLeave} onClick={onEndConfirm} title="Leave">
              <div className={styles.ctrlIconLeave}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.19 19.79 19.79 0 01.36 1.56 2 2 0 012.35 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.33 7.91a16 16 0 006.35 5.4z"/></svg>
              </div>
              <span className={styles.ctrlLabelLeave}>Leave</span>
            </button>
          </div>

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

        {showChat ? (
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <span className={styles.chatTitle}>💬 Session Chat</span>
                <span className={styles.chatOnline}>
                  {chatConnected
                    ? `● ${patientName || 'Patient'} online`
                    : '○ Connecting chat…'}
                </span>
              </div>
              <button className={styles.chatCloseBtn} onClick={()=>setShowChat(false)}>✕</button>
            </div>
            <div className={styles.chatMessages}>
              <div className={styles.chatTs}>Session started · {new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
              {messages.map((m,i)=>(
                <div key={i} className={`${styles.msgWrap} ${m.role==='patient'?styles.msgPatient:styles.msgDoctor}`}>
                  {/* ✅ Real patient name */}
                  {m.role==='patient'&&<div className={styles.msgSender}>{patientName || 'Patient'}</div>}
                  <div className={`${styles.bubble} ${m.role==='patient'?styles.bubblePatient:styles.bubbleDoctor}`}>{m.text}</div>
                  <div className={`${styles.msgTime} ${m.role==='doctor'?styles.msgTimeRight:''}`}>{m.time}{m.role==='doctor'?' ✓✓':''}</div>
                </div>
              ))}
              {patientTyping&&(
                <div className={`${styles.msgWrap} ${styles.msgPatient}`}>
                  <div className={styles.msgSender}>{patientName || 'Patient'}</div>
                  <div className={styles.typingBubble}>
                    {[0,0.2,0.4].map((d,i)=><div key={i} className={styles.typingDot} style={{animationDelay:`${d}s`}}/>)}
                  </div>
                </div>
              )}
              <div ref={chatBottomRef}/>
            </div>
            <div className={styles.quickReplies}>
              {QUICK_REPLIES.map((r,i)=><button key={i} className={styles.quickReply} onClick={()=>setChatInput(r)}>{r}</button>)}
            </div>
            <div className={styles.chatInputRow}>
              <input className={styles.chatInput} type="text" placeholder="Type a message…" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={handleChatKey}/>
              <button className={styles.chatSendBtn} onClick={sendChatMessage} disabled={!chatInput.trim()}>➤</button>
            </div>
          </div>
        ) : (
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