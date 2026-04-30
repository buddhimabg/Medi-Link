// src/pages/VideoCall/LiveCallScreen.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { CallData, ChatMessage } from '../../types/videoCall'
import styles from './LiveCallScreen.module.css'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'

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

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

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
    const link = `${window.location.origin}/video-call/${callData?.sessionId || 'Ce9f8c'}`
    navigator.clipboard.writeText(link)
      .then(() => {
        setInviteCopied(true)
        showToast('✅ Session link copied!')
        setTimeout(() => setInviteCopied(false), 3000)
      })
      .catch(() => window.prompt('Copy this link:', link))
  }, [callData, showToast])

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

  const handleSaveNote = useCallback(() => {
    if (!sessionNotes.trim()) { showToast('⚠️ Please type a note first'); return }
    setNoteSaved(true); showToast('✅ Note saved!')
    setTimeout(() => setNoteSaved(false), 2500)
  }, [sessionNotes, showToast])

  const handleChatKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); sendChatMessage() }
  }

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
        {/* ── Back Button ── */}
        <button
          className={styles.backBtn}
          onClick={() => setShowBackConfirm(true)}
          title="Back to Waiting Room"
        >
          ← Back
        </button>
        <div className={styles.logo}><span>Medi</span>Link</div>
        <div className={styles.livePill}><div className={styles.liveDot}/><span className={styles.liveText}>Live</span></div>
        <div className={styles.timer}>{formatDuration(duration)}</div>
        <div className={styles.signal}>
          {[8,12,16,20,14].map((h,i)=><span key={i} className={styles.bar} style={{height:h}}/>)}
          <span className={styles.signalLabel}>Strong</span>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.badgeBlue}>#{callData?.sessionId||'Ce9f8c'}</span>
          <span className={styles.badgeGray}>Slot 3/8</span>
          {isRecording&&<span className={styles.recPill}><span className={styles.recDot}/>REC</span>}
          <button className={styles.endBtn} onClick={onEndConfirm}>↪ End Session</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.videoWrap}>
          <div ref={containerRef} className={styles.zegoContainer}/>

          {(!callData||callData.appId===0)&&(
            <div className={styles.fallback}>
              <div className={styles.waitingBox}>
                <div className={styles.waitingLabel}>WAITING</div>
                {[{i:'R',name:'Roshan',time:'5.30 PM'},{i:'K',name:'Kavindi',time:'6.00 PM'}].map((p,i)=>(
                  <div key={i} className={styles.waitingRow}>
                    <div className={styles.waitingAvatar}>{p.i}</div>
                    <span className={styles.waitingName}>{p.name}·{p.time}</span>
                  </div>
                ))}
              </div>
              <div className={styles.overlayBtns}>
                <button className={styles.overlayBtn}>📋 Notes</button>
                <button className={styles.overlayBtn} onClick={onPrescribe}>🔗 Rx</button>
              </div>
              {showParticipants&&(
                <div className={styles.participantsPanel}>
                  <div className={styles.panelHeader}>
                    <span className={styles.panelTitle}>👥 Participants (2)</span>
                    <button className={styles.panelClose} onClick={()=>setShowParticipants(false)}>✕</button>
                  </div>
                  {[
                    {name:'Dr. Dilshari',role:'Doctor (You)',color:'#2B52D4',mic:!micMuted,cam:!camOff},
                    {name:'Priyanka Jayawardhana',role:'Patient',color:'#059669',mic:true,cam:true},
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
              <div className={styles.patientCenter}>
                <div className={styles.patientRing}><div className={styles.patientRing2}><div className={styles.patientAvatar}>P</div></div></div>
                <div className={styles.patientName}>Priyanka Jayawardhana</div>
                <div className={styles.patientSub}>Patient·Anxiety&amp;Depression</div>
                <span className={styles.connectedBadge}>●Connected·HD Video</span>
                {micMuted&&<div className={styles.statusBanner}>🔇 Your microphone is muted</div>}
                {camOff&&<div className={styles.statusBanner}>📷 Your camera is off</div>}
              </div>
              <div className={`${styles.selfCam} ${camOff?styles.selfCamOff:''}`}>
                {camOff?<div className={styles.selfCamOffIcon}>📷</div>:<div className={styles.selfCamAvatar}>Dr</div>}
                <div className={styles.selfCamLabel}>You (Dr.Dilshari)</div>
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
        </div>

        {showChat?(
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <span className={styles.chatTitle}>💬 Session Chat</span>
                <span className={styles.chatOnline}>● Priyanka online</span>
              </div>
              <button className={styles.chatCloseBtn} onClick={()=>setShowChat(false)}>✕</button>
            </div>
            <div className={styles.chatMessages}>
              <div className={styles.chatTs}>Session started·{new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
              {messages.map((m,i)=>(
                <div key={i} className={`${styles.msgWrap} ${m.role==='patient'?styles.msgPatient:styles.msgDoctor}`}>
                  {m.role==='patient'&&<div className={styles.msgSender}>Priyanka</div>}
                  <div className={`${styles.bubble} ${m.role==='patient'?styles.bubblePatient:styles.bubbleDoctor}`}>{m.text}</div>
                  <div className={`${styles.msgTime} ${m.role==='doctor'?styles.msgTimeRight:''}`}>{m.time}{m.role==='doctor'?' ✓✓':''}</div>
                </div>
              ))}
              {patientTyping&&(
                <div className={`${styles.msgWrap} ${styles.msgPatient}`}>
                  <div className={styles.msgSender}>Priyanka</div>
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
        ):(
          <div className={styles.sidebar}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>👤 Patient Info</h3>
              {[{k:'ID',v:'#P-3af301'},{k:'Age/Sex',v:'28/Female'},{k:'Sessions',v:'4 Total'},{k:'Condition',v:'GAD+MDD'}].map((r,i)=>(
                <div key={i} className={styles.kv}><span className={styles.kvK}>{r.k}</span><span className={styles.kvV}>{r.v}</span></div>
              ))}
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>🔗 Active Rx</h3>
              {[{name:'Sertraline',dose:'50mg·Once daily'},{name:'Lorazepam',dose:'0.5mg·As needed'}].map((rx,i)=>(
                <div key={i} className={styles.rxItem}><div className={styles.rxName}>{rx.name}</div><div className={styles.rxDose}>{rx.dose}</div></div>
              ))}
              <button className={styles.prescribeBtn} onClick={onPrescribe}>💊 Write Prescription</button>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📊 Mood Trend</h3>
              <div className={styles.moodBars}>
                {[['#FECACA','50%'],['#FECACA','40%'],['#FDE68A','65%'],['#BBF7D0','78%'],['#BBF7D0','90%'],['#2B52D4','88%']].map(([bg,h],i)=>(
                  <div key={i} className={styles.moodBar} style={{background:bg,height:h}}/>
                ))}
              </div>
              <div className={styles.moodLabels}>{['Oct','Nov','Dec','Jan','Feb','Now'].map(l=><span key={l}>{l}</span>)}</div>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>📋 Session Notes</h3>
              <textarea className={styles.notesArea} placeholder="Type observations..." value={sessionNotes} onChange={e=>setSessionNotes(e.target.value)}/>
              <button className={`${styles.saveNoteBtn} ${noteSaved?styles.saveNoteSaved:''}`} onClick={handleSaveNote}>{noteSaved?'✓ Saved!':'Save Note'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveCallScreen