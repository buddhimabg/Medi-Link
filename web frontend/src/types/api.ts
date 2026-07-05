// src/types/api.ts
import type { CallData } from './videoCall'

export type { CallData }

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

// ── Token helpers ──────────────────────────────────────────────────────────
export const getToken = (): string =>
  localStorage.getItem('medilink_token') ?? ''

export const setToken = (token: string): void => {
  localStorage.setItem('medilink_token', token)
  localStorage.setItem('medilink_logged_in', 'true')
}

export const clearToken = (): void => {
  localStorage.removeItem('medilink_token')
  localStorage.removeItem('medilink_logged_in')
  localStorage.removeItem('medilink_user')
}

// ── Request helper (Fixed to include Authorization header properly) ──────
async function request<T>(
  method: string,
  path:   string,
  body?:  unknown,
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // ටෝකන් එකක් තිබේ නම් පමණක් Authorization Header එක එකතු කරන්න
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // Token එක කල් ඉකුත් වී ඇත්නම් හෝ වැරදි නම් logout කරන්න
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized: Session expired or invalid token.');
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Backend not reachable (HTTP ${res.status}). ` +
      `Make sure backend is running on port 5000.`
    )
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.message ?? 'Request failed')
  return json.data as T
}

// ── Auth API ───────────────────────────────────────────────────────────────
export interface AuthUser {
  id:   string
  name:  string
  role:  string
  email: string
}

export interface LoginResponse {
  token: string
  user:  AuthUser
}

export const authApi = {
  register: (data: {
    name:      string
    email:     string
    password:  string
    role:      'patient' | 'doctor'
    phone?:    string
    age?:      number
    bloodType?: string
  }) => request<LoginResponse>('POST', '/auth/register', data),

  login: (email: string, password: string) =>
    request<LoginResponse>('POST', '/auth/login', { email, password }),

  me: () =>
    request<AuthUser>('GET', '/auth/me'),
}

// ── Video Call API ─────────────────────────────────────────────────────────
export interface SessionStatus {
  sessionId:     string
  status:        'waiting' | 'active' | 'ended' | 'cancelled'
  patientJoined: boolean
  patientName:   string | null
  patientId:     string | null
  startedAt:     string | null
}

export interface SessionSummary {
  sessionId:     string
  status:        string
  notes:         string
  duration:      number
  startedAt:     string | null
  endedAt:       string | null
  patientId:     string | null
  patientName:   string | null
  doctorId:      string
  prescriptions: Array<{
    id:            string
    medications: Medication[]
    notes:         string
    issuedAt:      string
  }>
}

export interface Medication {
  name:      string
  dose:      string
  frequency: string
  duration:  string
  withFood:  string
}

export const videoApi = {
  createRoom: (sessionId: string) =>
    request<CallData>('POST', '/video/create-room', { sessionId }),

  joinRoom: (sessionId: string) =>
    request<CallData>('POST', '/video/join-room', { sessionId }),

  sendInvitation: (sessionId: string) =>
    request<void>('POST', `/video/invite/${sessionId}`),

  getSessionStatus: async (sessionId: string): Promise<SessionStatus> => {
    // ගමනාන්තය නිවැරදි කර ඇත
    const res = await fetch(`${BASE}/video/session-status/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Request failed')
    return json.data as SessionStatus
  },

  endCall: (sessionId: string, duration: number, sessionNotes?: string) =>
    request<void>('PATCH', `/video/end-call/${sessionId}`, { duration, sessionNotes }),

  saveSessionNotes: (sessionId: string, notes: string) =>
    request<void>('PATCH', `/video/save-notes/${sessionId}`, { notes }),

  getCallInfo: (sessionId: string) =>
    request<CallData & {
      status:        string
      sessionNotes:  string
      patientJoined: boolean
      patientId:     string | null
      patientName:   string | null
    }>('GET', `/video/call-info/${sessionId}`),

  getSessionSummary: (sessionId: string) =>
    request<SessionSummary>('GET', `/video/summary/${sessionId}`),

  issuePrescription: (sessionId: string, data: Record<string, unknown>) =>
    request<void>('POST', '/prescriptions', { sessionId, ...data }),

  getPrescriptions: (sessionId: string) =>
    request<Prescription[]>('GET', `/prescriptions/${sessionId}`),
}

// ── Patient History API ────────────────────────────────────────────────────
export interface PatientHistoryRecord {
  _id:         string
  patientId:   string
  sessionId:   string
  doctorId:    string
  date:        string
  duration:    number
  notes:       string
  medications: Medication[]
  moodLabel:   string
  moodColor:   string
  createdAt:   string
  patientName?: string
}

export const patientHistoryApi = {
  getBySession: (sessionId: string) =>
    request<{ sessionId: string; notes: string; medications: Medication[]; createdAt: string }>(
      'GET', `/patient-history/session/${sessionId}`
    ),

  getByPatient: (patientId: string) =>
    request<PatientHistoryRecord[]>('GET', `/patient-history/${patientId}`),

  save: (data: {
    patientId:   string
    sessionId:   string
    notes:       string
    medications: Medication[]
    moodLabel?:  string
    moodColor?:  string
  }) => request<PatientHistoryRecord>('POST', '/patient-history', data),
}

export type { Prescription }
interface Prescription {
  id:           string
  medications: Medication[]
  notes:       string
  issuedAt:    string
}

// ── Appointment API ────────────────────────────────────────────────────────
export interface AppointmentRecord {
  _id:          string
  patientId:    string
  doctorId:     string
  notes:        string
  prescription: string
  status:       string
  date:         string
}

export interface QueuePatient {
  _id:           string
  patientId:     string
  patientName:   string
  patientInitial: string
  sessionId:      string | null
  notes:          string
  status:         string
  date:           string
}

export const appointmentApi = {
  getDoctorQueue: () =>
    request<AppointmentRecord[]>('GET', '/appointments/doctor'),

  getDoctorQueueEnriched: () =>
    request<QueuePatient[]>('GET', '/appointments/doctor/queue'),
}

// ── FAQ API ────────────────────────────────────────────────────────────────
export interface FAQRecord {
  _id:        string
  doctorId:   string
  question:   string
  answer:     string
  keywords:   string[]
  category:   string
  isActive:   boolean
  usageCount: number
  createdAt:  string
  updatedAt:  string
}

export type FAQCategory = 'GENERAL' | 'MEDICATION' | 'APPOINTMENT' | 'MENTAL_HEALTH'

export const faqApi = {
  getAll: (category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : ''
    return request<FAQRecord[]>('GET', `/chat/faqs${q}`)
  },

  create: (data: { question: string; answer: string; keywords: string[]; category: FAQCategory }) =>
    request<FAQRecord>('POST', '/chat/faqs', data),

  update: (id: string, data: Partial<{ question: string; answer: string; keywords: string[]; category: FAQCategory; isActive: boolean }>) =>
    request<FAQRecord>('PUT', `/chat/faqs/${id}`, data),

  remove: (id: string) =>
    request<void>('DELETE', `/chat/faqs/${id}`),

  toggle: (id: string) =>
    request<FAQRecord>('PATCH', `/chat/faqs/${id}/toggle`),
}

// ── Chat / Conversation API ────────────────────────────────────────────────
export interface ConversationRecord {
  _id:            string
  patientId:      string
  doctorId:       string
  lastMessage:    string
  lastMessageAt:  string
  lastSenderRole: 'doctor' | 'patient' | 'bot'
  unreadCount:    number
  isArchived:     boolean
  patient: {
    _id:   string
    name:  string
    email: string
    role:  string
  }
}

export interface MessageRecord {
  _id:            string
  conversationId: string
  senderId:       string
  senderRole:     'doctor' | 'patient' | 'bot'
  text:           string
  type:           'normal' | 'ai-auto' | 'faq'
  aiConfidence?:  number
  isRead:         boolean
  createdAt:      string
  faqId?: {
    question: string
    category: string
  }
}

export type ConversationMessage = MessageRecord

export interface AnalyticsData {
  totalMessages:    number
  unreadCount:      number
  aiReplied:        number
  faqReplied:       number
  topFAQs: {
    label:    string
    count:    number
    category: string
  }[]
  recentBroadcasts: unknown[]
  unreadMessages?: number
  faqQueries?:     number
  doctorReplies?:  number
}

export const chatApi = {
  getConversations: () =>
    request<ConversationRecord[]>('GET', '/chat/conversations'),

  getOrCreateConversation: (patientId: string) =>
    request<ConversationRecord>('GET', `/chat/conversations/with/${patientId}`),

  getMessages: (conversationId: string, page = 1, limit = 30) =>
    request<{ messages: MessageRecord[]; total: number; page: number; totalPages: number }>(
      'GET', `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    ),

  sendMessage: (conversationId: string, text: string) =>
    request<MessageRecord>('POST', `/chat/conversations/${conversationId}/messages`, { text }),

  markAsRead: (conversationId: string) =>
    request<void>('PATCH', `/chat/conversations/${conversationId}/read`),

  getAnalytics: () =>
    request<AnalyticsData>('GET', '/chat/analytics'),
}