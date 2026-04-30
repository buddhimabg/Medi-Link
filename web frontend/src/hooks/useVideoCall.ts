// src/hooks/useVideoCall.ts
import { useState, useEffect, useRef, useCallback } from 'react'
import { videoApi } from '../api'
import type { CallData, Medication, NewMedication, ChatMessage } from '../types/videoCall'

export const Step = {
  PRE_CALL_SETUP  : 0,
  WAITING_ROOM    : 1,
  PATIENT_HISTORY : 2,
  CONNECTING      : 3,
  LIVE_CALL       : 4,
  SCREEN_SHARE    : 5,
  PRESCRIPTION    : 6,
  END_SESSION     : 7,
  SUMMARY         : 8,
} as const

export type Step = typeof Step[keyof typeof Step]

export function useVideoCall(sessionId: string) {

  const [step, setStep] = useState<Step>(Step.PRE_CALL_SETUP)

  // ── Device check ──────────────────────────────────────────
  const [camOk,    setCamOk]    = useState(false)
  const [micOk,    setMicOk]    = useState(false)
  const [checking, setChecking] = useState(false)

  // ── Call data ─────────────────────────────────────────────
  const [callData, setCallData] = useState<CallData | null>(null)
  const [loading] = useState(false)
  const [apiError] = useState('')

  // ── Timer ─────────────────────────────────────────────────
  const [duration, setDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Mic / Cam state ───────────────────────────────────────
  const [micMuted, setMicMuted] = useState(false)
  const [camOff,   setCamOff]   = useState(false)

  // ── Chat ──────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'patient', text: "Good evening Dr. Dilshari. I've been feeling much better this week.", time: '5:02 PM' },
    { role: 'doctor',  text: "That's wonderful! How are the breathing exercises going?",              time: '5:03 PM' },
    { role: 'patient', text: 'They help a lot! The 4-7-8 technique before bed improved my sleep.',   time: '5:04 PM' },
    { role: 'doctor',  text: 'Excellent progress! Let me share your cortisol report.',               time: '5:05 PM' },
  ])
  const [chatInput,     setChatInput]     = useState('')
  const [patientTyping, setPatientTyping] = useState(true)

  // ── Prescription ──────────────────────────────────────────
  const [medications, setMedications] = useState<Medication[]>([
    { id: 1, name: 'Sertraline (Zoloft)', dose: '75mg',  frequency: 'Once daily', duration: '30 days', withFood: 'Yes' },
    { id: 2, name: 'Lorazepam PRN',       dose: '0.5mg', frequency: 'As needed',  duration: '15 days', withFood: 'No'  },
  ])
  const [newMed,  setNewMed]  = useState<NewMedication>({
    name: '', dose: '', frequency: '', duration: '', withFood: 'Yes',
  })
  const [rxNotes, setRxNotes] = useState('Avoid alcohol. Report side effects. Follow up in 2 weeks.')
  const [rxSaved, setRxSaved] = useState(false)

  // ── Session notes ─────────────────────────────────────────
  const [sessionNotes, setSessionNotes] = useState('')

  // ─────────────────────────────────────────────────────────
  // Device check
  // ─────────────────────────────────────────────────────────
  const runDeviceCheck = useCallback(async () => {
    setChecking(true)
    setCamOk(false)
    setMicOk(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach(t => t.stop())
      setCamOk(true)
      setMicOk(true)
    } catch { /* permission denied */ }
    setChecking(false)
  }, [])

  useEffect(() => {
    runDeviceCheck()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [runDeviceCheck])

  // ─────────────────────────────────────────────────────────
  // Start session — DEMO MODE (switch to real when backend ready)
  // ─────────────────────────────────────────────────────────
  const handleStartSession = useCallback(async () => {
    // ══ DEMO MODE ══
    setCallData({
      roomId:    'demo-room-123',
      token:     'demo-token',
      appId:     0,
      userId:    'doctor-001',
      userName:  'Dr. Dilshari',
      sessionId: sessionId,
    })
    setStep(Step.WAITING_ROOM)

    // ══ REAL MODE — uncomment when backend is ready ══
    // setLoading(true)
    // setApiError('')
    // try {
    //   const data = await videoApi.createRoom(sessionId)
    //   setCallData(data)
    //   setStep(Step.WAITING_ROOM)
    // } catch (err: unknown) {
    //   setApiError(err instanceof Error ? err.message : 'Could not create room.')
    // }
    // setLoading(false)
  }, [sessionId])

  // ─────────────────────────────────────────────────────────
  // Join call
  // ─────────────────────────────────────────────────────────
  const handleJoinCall = useCallback(() => {
    setStep(Step.CONNECTING)
    setTimeout(() => {
      setStep(Step.LIVE_CALL)
      const start = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    }, 3000)
  }, [])

  // ─────────────────────────────────────────────────────────
  // End call
  // ─────────────────────────────────────────────────────────
  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    try { await videoApi.endCall(sessionId, duration) } catch { /* non-blocking */ }
    setStep(Step.SUMMARY)
  }, [sessionId, duration])

  // ─────────────────────────────────────────────────────────
  // Format duration
  // ─────────────────────────────────────────────────────────
  const formatDuration = useCallback((secs: number): string => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    const p = (n: number) => String(n).padStart(2, '0')
    return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
  }, [])

  // ─────────────────────────────────────────────────────────
  // Chat
  // ─────────────────────────────────────────────────────────
  const sendChatMessage = useCallback(() => {
    const text = chatInput.trim()
    if (!text) return
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'doctor', text, time: now }])
    setChatInput('')
    setPatientTyping(true)
    setTimeout(() => {
      setPatientTyping(false)
      const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [
        ...prev,
        { role: 'patient', text: 'I understand, thank you Doctor.', time: t },
      ])
    }, 2000)
  }, [chatInput])

  // ─────────────────────────────────────────────────────────
  // Prescription
  // ─────────────────────────────────────────────────────────
  const addMedication = useCallback(() => {
    if (!newMed.name || !newMed.dose) return
    setMedications(prev => [...prev, { id: Date.now(), ...newMed }])
    setNewMed({ name: '', dose: '', frequency: '', duration: '', withFood: 'Yes' })
  }, [newMed])

  const removeMedication = useCallback((id: number) => {
    setMedications(prev => prev.filter(m => m.id !== id))
  }, [])

  const issuePrescription = useCallback(async () => {
    try {
      await videoApi.issuePrescription(sessionId, { medications, notes: rxNotes })
      setRxSaved(true)
      setTimeout(() => setStep(Step.LIVE_CALL), 1200)
    } catch { setRxSaved(true) }
  }, [sessionId, medications, rxNotes])

  // ─────────────────────────────────────────────────────────
  return {
    step, setStep, Step,

    camOk, micOk, checking, runDeviceCheck,

    callData, loading, apiError,
    handleStartSession,
    handleJoinCall,
    handleEndCall,

    duration, formatDuration,

    micMuted, setMicMuted,
    camOff,   setCamOff,

    messages, chatInput, setChatInput,
    patientTyping, sendChatMessage,

    medications, newMed, setNewMed,
    addMedication, removeMedication,
    rxNotes, setRxNotes, rxSaved, issuePrescription,

    sessionNotes, setSessionNotes,
  }
}