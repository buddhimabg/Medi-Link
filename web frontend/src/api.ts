// src/api.ts
import type { CallData } from './types/videoCall'

export type { CallData }

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

const getToken = (): string =>
  localStorage.getItem('medilink_token') ?? ''

const headers = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${getToken()}`,
})

async function request<T>(
  method: string,
  path:   string,
  body?:  unknown,
): Promise<T> {
  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body:    body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.message ?? 'Request failed')
  return json.data as T
}

// ── Video Call API ─────────────────────────────────────
export const videoApi = {
  createRoom: (sessionId: string) =>
    request<CallData>('POST', '/video/create-room', { sessionId }),

  joinRoom: (sessionId: string) =>
    request<CallData>('POST', '/video/join-room', { sessionId }),

  endCall: (sessionId: string, duration: number) =>
    request<void>('PATCH', `/video/end-call/${sessionId}`, { duration }),

  saveSessionNotes: (sessionId: string, notes: string) =>
    request<void>('PATCH', `/video/save-notes/${sessionId}`, { notes }),

  getCallInfo: (sessionId: string) =>
    request<CallData>('GET', `/video/call-info/${sessionId}`),

  issuePrescription: (sessionId: string, data: Record<string, unknown>) =>
    request<void>('POST', '/prescriptions', { sessionId, ...data }),
}

// ── Patient History API ────────────────────────────────
interface PatientHistory {
  sessionId: string
  notes:     string
  createdAt: string
}

export const patientHistoryApi = {
  getHistory: (sessionId: string) =>
    request<PatientHistory>('GET', `/patient-history/${sessionId}`),
}