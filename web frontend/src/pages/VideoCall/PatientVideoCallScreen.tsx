// src/pages/VideoCall/PatientVideoCallScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'
import { io, Socket } from 'socket.io-client'
import { videoApi, chatApi, getToken } from '../../types/api'
import type { CallData } from '../../types/videoCall'
import type { ChatMessage } from '../../types/videoCall'
import type { ConversationMessage } from '../../types/api'
import ConsentModal from './ConsentModal'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000'

const QUICK_REPLIES = ["That's great!", 'I understand.', "Let's discuss.", 'Please continue.']

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

  // ── Chat state ──
  const [showChat, setShowChat]           = useState(false)
  const [chatConnected, setChatConnected] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [chatInput, setChatInput]         = useState('')
  const [doctorTyping, setDoctorTyping]   = useState(false)
  const [unreadCount, setUnreadCount]     = useState(0)
  const prevMsgCountRef = useRef(0)

  // ── Live recording banner (not a chat message — see connectChatSocket) ──
  const [recordingBanner, setRecordingBanner] = useState(false)

  const videoRef      = useRef<HTMLVideoElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const zegoRef         = useRef<InstanceType<typeof ZegoUIKitPrebuilt> | null>(null)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const socketRef       = useRef<Socket | null>(null)
  const chatBottomRef   = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ── Chat: DB message → local ChatMessage shape (mirrors doctor side) ──
  const dbMsgToChatMsg = useCallback((msg: ConversationMessage): ChatMessage => ({
    role: msg.senderRole === 'patient' ? 'patient' : 'doctor',
    text: msg.senderRole === 'bot' ? `🤖 ${msg.text}` : msg.text,
    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }), [])

  // ── Chat: connect socket once we have a live session ──
  const connectChatSocket = useCallback(() => {
    if (socketRef.current?.connected) return
    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket
    socket.on('connect', () => {
      setChatConnected(true)
      // Join the session-wide room too (not just the chat room) — this is
      // what carries live mic/cam state and the recording-status banner.
      socket.emit('join-session-room', { sessionId })
    })
    socket.on('disconnect', () => setChatConnected(false))
    socket.on('new-message', ({ message }: { message: ConversationMessage }) => {
      if (message.senderRole === 'patient') return // our own — already added locally
      setMessages(prev => [...prev, dbMsgToChatMsg(message)])
      setDoctorTyping(false)
    })
    socket.on('typing', () => setDoctorTyping(true))
    socket.on('stop-typing', () => setDoctorTyping(false))
    // FIX: recording status now arrives as its own live event instead of
    // a saved chat message — shown as a dismissible top banner, not in chat.
    socket.on('recording-status', ({ recording }: { recording: boolean }) => {
      setRecordingBanner(recording)
    })
  }, [dbMsgToChatMsg, sessionId])

  // ── Chat: load/create the conversation for this session, join its room ──
  const loadChat = useCallback(async () => {
    try {
      const conv = await chatApi.getConversationBySession(sessionId)
      setConversationId(conv._id)
      socketRef.current?.emit('join-chat-room', { conversationId: conv._id })
      const result = await chatApi.getMessages(conv._id, 1, 30)
      setMessages(result.messages.map(dbMsgToChatMsg))
    } catch {
      // Conversation may not exist yet (e.g. doctor hasn't opened chat) —
      // harmless, chat panel just stays empty until it does.
    }
  }, [sessionId, dbMsgToChatMsg])

  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || !conversationId) return
    setMessages(prev => [...prev, { role: 'patient', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    setChatInput('')
    socketRef.current?.emit('stop-typing', { conversationId, role: 'patient' })
    try {
      await chatApi.sendMessage(conversationId, text)
    } catch {
      // Message still shows locally; a real failure will surface on next load.
    }
  }, [chatInput, conversationId])

  const handleChatInputChange = (v: string) => {
    setChatInput(v)
    if (!conversationId) return
    socketRef.current?.emit('typing', { conversationId, role: 'patient' })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', { conversationId, role: 'patient' })
    }, 1500)
  }

  const handleChatKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendChatMessage()
  }

  useEffect(() => {
    if (messages.length) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showChat])

  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const newMsgs = messages.slice(prevMsgCountRef.current)
      const incoming = newMsgs.filter(m => m.role === 'doctor').length
      if (incoming && !showChat) setUnreadCount(c => c + incoming)
    }
    prevMsgCountRef.current = messages.length
  }, [messages, showChat])

  useEffect(() => { if (showChat) setUnreadCount(0) }, [showChat])

  // Chat becomes usable once we're actually in the call
  useEffect(() => {
    if (phase !== 'in-call') return
    connectChatSocket()
    loadChat()
    return () => {
      if (conversationId) socketRef.current?.emit('leave-chat-room', { conversationId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      socketRef.current?.disconnect()
    }
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
      showUserList: false,
      maxUsers: 2,
      showScreenSharingButton: false,
      showTextChat: false,
      showUserName: false,
      showRoomTimer: false,
      // FIX: the old custom Mic/Camera buttons toggled a dead preview
      // stream (already .stop()'d above), not the real published stream —
      // so "muting" never actually changed what the doctor saw/heard.
      // ZegoCloud's own toggle buttons control the REAL stream and are
      // guaranteed to work, so we enable them instead of hand-rolling this.
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

  // ── Render ──
  const wrapStyle: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: '#0F1117',
    color: '#fff', padding: 20, fontFamily: 'inherit',
  }

  if (phase === 'loading' || phase === 'waiting-for-doctor') {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <h2 style={{ margin: 0 }}>Waiting for your doctor to start the session…</h2>
        <p style={{ color: '#9CA3AF', marginTop: 8 }}>This page will update automatically.</p>
      </div>
    )
  }

  if (phase === 'not-found') {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ margin: 0 }}>Invalid session link</h2>
        <button
          onClick={() => navigate('/patient-home')}
          style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2B52D4', color: '#fff', cursor: 'pointer' }}
        >Go to Home</button>
      </div>
    )
  }

  if (phase === 'ended') {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: 0 }}>Session ended</h2>
        <p style={{ color: '#9CA3AF', marginTop: 8 }}>Duration: {formatDuration(duration)}</p>
        <button
          onClick={() => navigate('/patient-home')}
          style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2B52D4', color: '#fff', cursor: 'pointer' }}
        >Back to Home</button>
      </div>
    )
  }

  if (phase === 'device-check' || phase === 'consent') {
    return (
      <div style={wrapStyle}>
        <h2 style={{ marginBottom: 6 }}>Ready to join your session?</h2>
        <p style={{ color: '#9CA3AF', marginBottom: 20 }}>Check your camera and microphone first</p>

        <div style={{
          width: 360, maxWidth: '90vw', aspectRatio: '4/3', borderRadius: 16,
          overflow: 'hidden', background: '#1F2430', position: 'relative', marginBottom: 18,
        }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 8,
          }}>
            <span style={{
              fontSize: 11, padding: '4px 8px', borderRadius: 6,
              background: camOk ? '#059669' : '#DC2626',
            }}>{camOk ? '● Camera OK' : '✕ No Camera'}</span>
            <span style={{
              fontSize: 11, padding: '4px 8px', borderRadius: 6,
              background: micOk ? '#059669' : '#DC2626',
            }}>{micOk ? '● Mic OK' : '✕ No Mic'}</span>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            background: '#7F1D1D', color: '#FECACA', padding: '10px 16px',
            borderRadius: 8, marginBottom: 14, fontSize: 13, maxWidth: 360,
          }}>{errorMsg}</div>
        )}

        <button
          onClick={handleJoinClick}
          style={{
            padding: '13px 32px', borderRadius: 10, border: 'none',
            background: '#2B52D4', color: '#fff', fontWeight: 700,
            fontSize: 15, cursor: 'pointer',
          }}
        >Join Session →</button>

        {phase === 'consent' && (
          <ConsentModal role="patient" onAgree={handleConsentAgree} onDecline={handleConsentDecline} />
        )}
      </div>
    )
  }

  // ── in-call ──
  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: '#12141C', color: '#fff',
        borderBottom: '1px solid #1F2430',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}><span style={{ color: '#2B52D4' }}>Medi</span>Link</div>
        <div style={{
          fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
          background: '#1F2430', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6,
        }}>⏱ {formatDuration(duration)}</div>
        <button
          onClick={handleLeave}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', background: '#DC2626',
            color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13.5,
          }}
        >Leave</button>
      </div>

      {/* Live recording banner — separate from chat, auto-shows/hides with
          the doctor's recording-status broadcast. Not a dismiss-once toast:
          it tracks the actual recording state for as long as it's on. */}
      {recordingBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 16px', background: '#7F1D1D', color: '#FECACA', fontSize: 13, fontWeight: 600,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
          This session is being recorded
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: '70vh' }}>
        {/* ZegoCloud renders its own reliable camera/mic toggle buttons
            inside this container — no custom overlay needed. */}
        <div ref={containerRef} style={{ flex: 1 }} />

        {showChat && (
          <div style={{
            width: 340, background: '#12141C', borderLeft: '1px solid #23283A',
            display: 'flex', flexDirection: 'column', color: '#fff',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: '1px solid #23283A',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>💬 Session Chat</div>
                <div style={{ fontSize: 12, color: chatConnected ? '#34D399' : '#9CA3AF' }}>
                  {chatConnected ? `● ${doctorName || 'Doctor'} online` : '○ Connecting chat…'}
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 16, cursor: 'pointer' }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'patient' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  {m.role === 'doctor' && <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>{doctorName || 'Doctor'}</div>}
                  <div style={{
                    padding: '8px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.4,
                    background: m.role === 'patient' ? '#2B52D4' : '#1F2430',
                    color: '#fff',
                    borderBottomRightRadius: m.role === 'patient' ? 3 : 12,
                    borderBottomLeftRadius: m.role === 'doctor' ? 3 : 12,
                  }}>{m.text}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: m.role === 'patient' ? 'right' : 'left' }}>
                    {m.time}{m.role === 'patient' ? ' ✓✓' : ''}
                  </div>
                </div>
              ))}
              {doctorTyping && (
                <div style={{ alignSelf: 'flex-start', fontSize: 12, color: '#9CA3AF' }}>{doctorName || 'Doctor'} is typing…</div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div style={{ display: 'flex', gap: 6, padding: '8px 12px', flexWrap: 'wrap' }}>
              {QUICK_REPLIES.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setChatInput(r)}
                  style={{
                    fontSize: 11.5, padding: '5px 10px', borderRadius: 14, border: '1px solid #2A2E3A',
                    background: 'transparent', color: '#9CA3AF', cursor: 'pointer',
                  }}
                >{r}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #23283A' }}>
              <input
                type="text"
                placeholder="Type a message…"
                value={chatInput}
                onChange={e => handleChatInputChange(e.target.value)}
                onKeyDown={handleChatKey}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 20, border: '1px solid #2A2E3A',
                  background: '#1F2430', color: '#fff', fontSize: 13, outline: 'none',
                }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: chatInput.trim() ? '#2B52D4' : '#2A2E3A', color: '#fff',
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed', fontSize: 14,
                }}
              >➤</button>
            </div>
          </div>
        )}
      </div>

      {/* FIX: the broken custom Mic/Camera buttons have been removed —
          ZegoCloud's own toggle buttons (enabled above, rendered inside
          the video container) now handle that reliably. Only the Chat
          button lives here, since it's independent of the media stream. */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, padding: '16px',
        background: '#12141C', borderTop: '1px solid #1F2430',
      }}>
        <button
          onClick={() => setShowChat(v => !v)}
          title="Chat"
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: showChat ? '#2B52D4' : '#1F2430', color: '#fff', fontSize: 22,
            position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'background 0.15s',
          }}
        >
          💬
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9,
              background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              border: '2px solid #12141C',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default PatientVideoCallScreen