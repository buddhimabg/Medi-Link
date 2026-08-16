// src/hooks/useVideoCall.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import {
  videoApi, authApi, setToken, getToken,
  appointmentApi, patientHistoryApi, chatApi,
} from '../types/api'
import type {
  Medication as ApiMedication,
  QueuePatient,
  PatientHistoryRecord,
  ConversationMessage,
} from '../types/api'
import type { CallData, Medication, NewMedication, ChatMessage } from '../types/videoCall'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000'
const POLL_INTERVAL_MS = 3000

export const Step = {
  PRE_CALL_SETUP: 0,
  WAITING_ROOM: 1,
  PATIENT_HISTORY: 2,
  CONNECTING: 3,
  LIVE_CALL: 4,
  SCREEN_SHARE: 5,
  PRESCRIPTION: 6,
  END_SESSION: 7,
  SUMMARY: 8,
  TODAY_SESSIONS: 9,
} as const

export type Step = typeof Step[keyof typeof Step]

export function useVideoCall(sessionId: string) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(Step.PRE_CALL_SETUP)
  
  // මෙම flag එක මගින් cancel කිරීමෙන් පසු කිසිදු ක්‍රියාවලියක් සිදුවීම වළක්වයි
  const isCancelledRef = useRef(false)

  // States
  const [camOk, setCamOk] = useState(false)
  const [micOk, setMicOk] = useState(false)
  const [checking, setChecking] = useState(false)
  const [callData, setCallData] = useState<CallData | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryNotes, setSummaryNotes] = useState('')
  const [summaryNotesForPatient, setSummaryNotesForPatient] = useState('')
  const [summaryRxList, setSummaryRxList] = useState<NewMedication[]>([])
  const [summaryPatientName, setSummaryPatientName] = useState('')
  const [summaryPrescriptionsIssued, setSummaryPrescriptionsIssued] = useState(0)
  const [summaryRxSaved, setSummaryRxSaved] = useState(false)
  const [queueLoaded, setQueueLoaded] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // MODIFICATION: handleJoinCall's auto-transition-to-LIVE_CALL timeout is now tracked
  // so it can be cancelled if the doctor clicks "Cancel & Go Back" during CONNECTING
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [patientJoined, setPatientJoined] = useState(false)
  const [patientMicOn, setPatientMicOn] = useState(true)
  const [patientCamOn, setPatientCamOn] = useState(true)
  const [waitingStatus, setWaitingStatus] = useState<'waiting' | 'active' | 'ended' | 'cancelled'>('waiting')
  const [duration, setDuration] = useState(0)

  const [micMuted, setMicMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [chatConnected, setChatConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [patientTyping, setPatientTyping] = useState(false)

  const [medications, setMedications] = useState<Medication[]>([])
  const [newMed, setNewMed] = useState<NewMedication>({
    name: '', dose: '', frequency: '', duration: '', withFood: 'Yes',
  })
  const [rxNotes, setRxNotes] = useState('')
  const [rxSaved, setRxSaved] = useState(false)
  const [sessionNotes, setSessionNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const [patientName, setPatientName] = useState('')
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientHistory, setPatientHistory] = useState<PatientHistoryRecord[]>([])
  const [existingRx, setExistingRx] = useState<ApiMedication[]>([])
  const [existingRxNotes, setExistingRxNotes] = useState('')
  const [doctorName, setDoctorName] = useState<string>('')
  const [doctorQueue, setDoctorQueue] = useState<QueuePatient[]>([])
  const [queueCount, setQueueCount] = useState(0)
  const [nextPatient, setNextPatient] = useState<{ name: string; time: string } | null>(null)

  // 1. සියලු ක්‍රියාවලි නතර කිරීමේ මධ්‍යස්ථානය
  const stopAllProcesses = useCallback(() => {
    isCancelledRef.current = true // මෙයින් පසු කිසිවක් ක්‍රියාත්මක නොවේ
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current)
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (isCancelledRef.current) return // Cancel කර ඇත්නම් polling පටන් නොගන්න
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const status = await videoApi.getSessionStatus(sessionId)
        if (isCancelledRef.current) return // තත්පර 3කට පසුවත් පරීක්ෂා කිරීම
        setWaitingStatus(status.status)
        if (status.patientJoined) setPatientJoined(true)
        if (status.patientName) setPatientName(status.patientName)
        if (status.patientId && !patientId) setPatientId(status.patientId)
      } catch {}
    }, POLL_INTERVAL_MS)
  }, [sessionId, patientId])

const cancelSession = useCallback(async () => {
    // 1. Polling සහ Timers වහාම නතර කරන්න
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    
    // 2. Socket සම්බන්ධතාවය විසන්ධි කරන්න
    if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
    }

    // 3. යෙදුම නැවත එම පිටුවට ලෝඩ් වීම වැළැක්වීමට session id එක ඉවත් කරන්න
    localStorage.removeItem('active_session_id');

    try {
        // API එකට දන්වන්න මෙම ඇමතුම අවලංගු කළ බව
        await videoApi.endCall(sessionId, 0, 'Cancelled by doctor');
    } catch (error) {
        console.error("Cancel API call failed", error);
    } finally {
        // 4. state එක reset කර navigate කිරීම
        setInviteSent(false);
        setStep(Step.PRE_CALL_SETUP);
        
        // replace: true මගින් browser history එකෙන් එම පිටුව ඉවත් වේ
        navigate(-1 as any, { replace: true }); 
    }
}, [sessionId, navigate]);

  // MODIFICATION: clears any pending auto-join timeout so a stale call to
  // setStep(LIVE_CALL) can never fire after the doctor has navigated away
  const goToWaitingRoom = useCallback(() => {
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current)
      joinTimeoutRef.current = null
    }
    setStep(Step.WAITING_ROOM)
    startPolling()
  }, [startPolling])

  const dbMsgToChatMsg = useCallback((msg: ConversationMessage): ChatMessage => ({
    role: msg.senderRole === 'doctor' ? 'doctor' : 'patient',
    text: msg.senderRole === 'bot' ? `🤖 ${msg.text}` : msg.text,
    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }), [])

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return
    const socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
    socketRef.current = socket
    socket.on('connect', () => {
      setChatConnected(true)
      // Join the session-wide room (not just the chat room) so we get
      // live mic/cam state and recording-status events from the patient.
      socket.emit('join-session-room', { sessionId })
    })
    socket.on('disconnect', () => setChatConnected(false))
    socket.on('patient-joined', ({ patientName: pName }) => {
      setPatientJoined(true)
      if (pName) setPatientName(pName)
    })
    socket.on('new-message', ({ message }) => {
      if (message.senderRole === 'doctor') return
      setMessages(prev => [...prev, dbMsgToChatMsg(message)])
      setPatientTyping(false)
    })
    socket.on('typing', () => setPatientTyping(true))
    socket.on('stop-typing', () => setPatientTyping(false))
    // Patient reporting their own mic/cam state — Participants panel was
    // previously hardcoded to always show the patient as mic:true, cam:true.
    socket.on('media-state', ({ role, micOn, camOn }: { role: string; micOn: boolean; camOn: boolean }) => {
      if (role !== 'patient') return
      setPatientMicOn(micOn)
      setPatientCamOn(camOn)
    })
  }, [dbMsgToChatMsg, sessionId])

  // Broadcast the DOCTOR's own mic/cam state whenever it changes, so the
  // patient side (if it ever shows a participants view) has accurate info too.
  useEffect(() => {
    socketRef.current?.emit('media-state', { sessionId, role: 'doctor', micOn: !micMuted, camOn: !camOff })
  }, [micMuted, camOff, sessionId])

  // Recording start/stop — sent as a dedicated live event, not a chat
  // message, so the patient sees a banner instead of it cluttering the
  // conversation history.
  const setRecordingStatus = useCallback((recording: boolean) => {
    socketRef.current?.emit('recording-status', { sessionId, recording })
  }, [sessionId])

  const leaveChatRoom = useCallback((cid: string) => {
    socketRef.current?.emit('leave-chat-room', { conversationId: cid })
  }, [])

  // FIX: loadConversation now keys off sessionId (via getConversationBySession)
  // instead of the doctor-guessed patientId. Previously this used
  // chatApi.getOrCreateConversation(patientId) where `patientId` could
  // still be the QUEUE'S guess (set before the real patient joined) —
  // the poll below only sets patientId if it wasn't already set
  // (`!patientId` guard), so a stale queue guess never got corrected.
  // That caused doctor and patient to resolve to two DIFFERENT
  // Conversation documents (different socket rooms), so messages never
  // crossed. getConversationBySession looks up VideoSession.patientId
  // directly — the exact same value the patient side uses — so both
  // parties always land in the same conversation/room.
  const loadConversation = useCallback(async () => {
    try {
      const conv = await chatApi.getConversationBySession(sessionId)
      setConversationId(conv._id)
      socketRef.current?.emit('join-chat-room', { conversationId: conv._id })
      chatApi.markAsRead(conv._id).catch(() => {})
      const result = await chatApi.getMessages(conv._id, 1, 30)
      setMessages(result.messages.map(dbMsgToChatMsg))
    } catch {}
  }, [sessionId, dbMsgToChatMsg])

  const saveSessionNotes = useCallback(async () => {
    await videoApi.saveSessionNotes(sessionId, sessionNotes)
    setNotesSaved(true)
  }, [sessionId, sessionNotes])

  const fetchPatientData = useCallback(async (pid: string) => {
    try {
      const history = await patientHistoryApi.getByPatient(pid)
      setPatientHistory(history)
      if (history.length > 0) {
        if (history[0].patientName && !patientName) setPatientName(history[0].patientName)
        setExistingRx(history[0].medications || [])
        setExistingRxNotes(history[0].notesForPatient || '')
      }
    } catch {}
  }, [patientName])

  const fetchQueue = useCallback(async () => {
    try {
      const queue: QueuePatient[] = await appointmentApi.getDoctorQueueEnriched()
      setDoctorQueue(queue)
      setQueueCount(Math.max(0, queue.length - 1))
      const next = queue[1] ?? null
      if (next) {
        setNextPatient({ name: next.patientName, time: new Date(next.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
      }
      if (queue.length > 0) {
        if (!patientName && queue[0].patientName) setPatientName(queue[0].patientName)
        if (!patientId && queue[0].patientId) setPatientId(queue[0].patientId)
      }
    } catch {}
    setQueueLoaded(true)
  }, [patientId, patientName])

  // MODIFICATION: alert() removed — the UI (WaitingRoom) now shows a proper
  // confirmation popup. Errors are thrown so the caller can catch & display them.
  const handleSendInvitation = useCallback(async () => {
    await videoApi.sendInvitation(sessionId)
    setInviteSent(true)
  }, [sessionId])

  const runDeviceCheck = useCallback(async () => {
    setChecking(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach(t => t.stop())
      setCamOk(true); setMicOk(true)
    } catch {}
    setChecking(false)
  }, [])

useEffect(() => {
    runDeviceCheck();
    fetchQueue();

    // Cleanup: පිටුවෙන් ඉවත් වූ වහාම සියල්ල නතර වේ
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
        if (socketRef.current) socketRef.current.disconnect();
    };
}, [runDeviceCheck, fetchQueue]);

  // FIX: chat conversation load now triggers off `patientJoined` (set
  // true only once the real patient has called joinRoom — see
  // 'patient-joined' socket event / status poll below), NOT off
  // `patientId`, which could still hold a stale queue guess. This
  // guarantees VideoSession.patientId is actually set in the DB by the
  // time we look up the conversation, matching the patient side exactly.
  useEffect(() => {
    if (!patientJoined || conversationId) return
    loadConversation()
  }, [patientJoined, conversationId, loadConversation])

  // Medical history / previous Rx lookup is lower-stakes than chat — a
  // brief queue-guess mismatch here just means stale sidebar info, not
  // a broken feature, so this can stay keyed off patientId as before.
  useEffect(() => {
    if (!patientId) return
    fetchPatientData(patientId)
  }, [patientId, fetchPatientData])

  const handleStartSession = useCallback(async () => {
    setLoading(true)
    // Attach whichever patient is currently first in queue — this lets
    // endCall save PatientHistory/Prescription correctly even when the
    // doctor is testing solo (no separate patient login joining the room).
    const firstInQueue = doctorQueue[0]?.patientId
    try {
      const data = await videoApi.createRoom(sessionId, firstInQueue)
      setCallData(data)
      connectSocket()
      setStep(Step.WAITING_ROOM)
      startPolling()
    } catch {
      setStep(Step.WAITING_ROOM)
      connectSocket()
      startPolling()
    }
    setLoading(false)
  }, [sessionId, connectSocket, startPolling, doctorQueue])

  // MODIFICATION: store the auto-transition timeout in joinTimeoutRef so it
  // can be cancelled (see goToWaitingRoom) if the doctor backs out during CONNECTING
  const handleJoinCall = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setStep(Step.CONNECTING)
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current)
    joinTimeoutRef.current = setTimeout(() => {
      setStep(Step.LIVE_CALL)
      const start = Date.now()
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - start) / 1000)), 1000)
      joinTimeoutRef.current = null
    }, 3000)
  }, [])

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (conversationId) leaveChatRoom(conversationId)
    try { await videoApi.endCall(sessionId, duration, sessionNotes) } catch {}
    // Session ended → the completed patient's appointment is now 'completed'
    // on the backend, so re-fetch the queue to drop them for the next round.
    await fetchQueue()

    // Fetch the REAL summary for the round that just ended — this is what
    // powers the (read-only) Summary screen: duration, prescriptions
    // actually issued, session notes, and notes for patient, all sourced
    // fresh from MongoDB rather than local component state.
    setSummaryLoading(true)
    try {
      const summary = await videoApi.getSessionSummary(sessionId)
      setSummaryNotes(summary.sessionNotes || '')
      setSummaryNotesForPatient(summary.notesForPatient || '')
      setSummaryRxList(summary.medications || [])
      setSummaryPatientName(summary.patientName || patientName || 'Patient')
      setSummaryPrescriptionsIssued(summary.prescriptionsIssued || 0)
      setSummaryRxSaved(summary.rxSavedToDb || false)
    } catch {
      // Fall back to whatever we tracked locally during the call
      setSummaryNotes(sessionNotes)
      setSummaryNotesForPatient(rxNotes)
      setSummaryRxList(medications)
      setSummaryPatientName(patientName || 'Patient')
      setSummaryPrescriptionsIssued(medications.length)
      setSummaryRxSaved(medications.length > 0)
    } finally {
      setSummaryLoading(false)
    }

    setStep(Step.SUMMARY)
  }, [sessionId, duration, sessionNotes, conversationId, leaveChatRoom, fetchQueue, patientName, rxNotes, medications])

  const formatDuration = useCallback((secs: number): string => {
    const m = Math.floor(secs / 60); const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [])

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !conversationId) return
    setMessages(prev => [...prev, { role: 'doctor', text: chatInput, time: new Date().toLocaleTimeString() }])
    setChatInput('')
    await chatApi.sendMessage(conversationId, chatInput)
  }, [chatInput, conversationId])

  // Sends an automated message from the doctor's side (e.g. "recording
  // started") — same delivery path as sendChatMessage, just not tied to
  // the chat input box. Used to notify the patient of things like
  // recording status without the doctor having to type it manually.
  const sendSystemMessage = useCallback(async (text: string) => {
    if (!conversationId) return
    setMessages(prev => [...prev, { role: 'doctor', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    try { await chatApi.sendMessage(conversationId, text) } catch { /* best-effort notification */ }
  }, [conversationId])

  const addMedication = useCallback(() => {
    if (!newMed.name || !newMed.dose) return
    setMedications(prev => [...prev, { id: Date.now(), ...newMed }])
    setNewMed({ name: '', dose: '', frequency: '', duration: '', withFood: 'Yes' })
  }, [newMed])

  const issuePrescription = useCallback(async () => {
    await videoApi.issuePrescription(sessionId, { medications, notes: rxNotes })
    setRxSaved(true)
    setTimeout(() => setStep(Step.LIVE_CALL), 1200)
  }, [sessionId, medications, rxNotes])

  return {
    step, setStep, Step,
    goToWaitingRoom,
    handleStartSession,
    handleJoinCall,
    handleEndCall,
    handleSendInvitation,
    cancelSession,
    runDeviceCheck,
    camOk, micOk, checking,
    callData, loading, apiError,
    patientJoined, waitingStatus, patientName, patientId, patientHistory, existingRx, existingRxNotes,
    patientMicOn, patientCamOn, setRecordingStatus,
    doctorName, doctorQueue,
    duration, formatDuration,
    micMuted, setMicMuted, camOff, setCamOff,
    messages, chatInput, setChatInput, patientTyping, sendChatMessage, sendSystemMessage, chatConnected, conversationId,
    medications, newMed, setNewMed, addMedication, removeMedication: (id: number) => setMedications(prev => prev.filter(m => m.id !== id)),
    rxNotes, setRxNotes, rxSaved, issuePrescription,
    sessionNotes, setSessionNotes: (v: string) => { setSessionNotes(v); setNotesSaved(false) }, notesSaved, saveSessionNotes,
    queueCount, nextPatient,
    summaryLoading, summaryNotes, summaryNotesForPatient, summaryRxList,
    summaryPatientName, summaryPrescriptionsIssued, summaryRxSaved,
    queueLoaded
  }
}