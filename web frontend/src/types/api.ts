// src/types/api.ts
import type { CallData } from './videoCall'

export type { CallData }

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

// FIX: recordingUrl (and any other /uploads/... path) is a relative path
// served by the backend's static file middleware, NOT under /api. Pages
// that render it in an <a href> need the bare server origin, not the
// frontend's own origin (Vite dev server), or the browser resolves it
// against localhost:5173 and gets Vite's SPA fallback HTML instead of
// the actual file. Export this so any page can build a full download URL:
// `${SERVER_ORIGIN}${recordingUrl}`
export const SERVER_ORIGIN = BASE.replace(/\/api\/?$/, '')

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

// ── Multipart upload helper (for chat file/photo attachments) ──────────────
async function requestUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  // NOTE: Content-Type ekak set karanne na — browser eka FormData ekakata
  // boundary ekakma add karanne, dala nathnam multer eken parse wenne na.
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized: Session expired or invalid token.');
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Backend not reachable (HTTP ${res.status}).`)
  }

  const json = await res.json()
  if (!json.success) throw new Error(json.message ?? 'Upload failed')
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
  sessionId:           string
  status:              string
  sessionNotes:        string
  notesForPatient:     string
  duration:            number
  startedAt:           string | null
  endedAt:             string | null
  patientId:           string | null
  patientName:         string | null
  doctorId:            string
  medications:         Medication[]
  prescriptionsIssued: number
  rxSavedToDb:         boolean
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
  createRoom: (sessionId: string, patientId?: string, doctorConsent?: boolean) =>
    request<CallData>('POST', '/video/create-room', { sessionId, patientId, doctorConsent }),

  joinRoom: (sessionId: string, patientConsent?: boolean) =>
    request<CallData>('POST', '/video/join-room', { sessionId, patientConsent }),

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
      recordingStatus?: string
    }>('GET', `/video/call-info/${sessionId}`),

  getSessionSummary: (sessionId: string) =>
    request<SessionSummary>('GET', `/video/summary/${sessionId}`),

  issuePrescription: (sessionId: string, data: Record<string, unknown>) =>
    request<void>('POST', '/prescriptions', { sessionId, ...data }),

  getPrescriptions: (sessionId: string) =>
    request<Prescription[]>('GET', `/prescriptions/${sessionId}`),

  getRecordingStatus: (sessionId: string) =>
    request<{ status: string }>('GET', `/video/recording-status/${sessionId}`),

  getRecording: (roundKey: string) =>
    request<{ status: string; recordingUrl: string; duration: number }>(
      'GET', `/video/recording/${roundKey}`
    ),

    uploadRecording: async (sessionId: string, blob: Blob): Promise<{ recordingUrl: string }> => {
    const formData = new FormData()
    formData.append('recording', blob, `${sessionId}.webm`)
    const res = await fetch(`${BASE}/video/upload-recording/${sessionId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Upload failed')
    return json.data
  },

  saveTranscript: (sessionId: string, transcript: string) =>
    request<void>('PATCH', `/video/save-transcript/${sessionId}`, { transcript }),
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
  notesForPatient?: string
  medications: Medication[]
  moodLabel:   string
  moodColor:   string
  createdAt:   string
  patientName?: string
  recordingStatus?: string
  recordingUrl?:    string
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

export interface TodaysSessionRecord {
  id:              string
  patientId:       string
  patientName:     string
  date:            string
  duration:        number
  notes:           string
  notesForPatient: string
  medications:     Medication[]
  moodLabel:       string
}

export interface TodaysSummary {
  date:               string
  totalSessions:      number
  totalDuration:      number
  totalPrescriptions: number
  sessions:           TodaysSessionRecord[]
}

export const appointmentApi = {
  getDoctorQueue: () =>
    request<AppointmentRecord[]>('GET', '/appointments/doctor'),

  getDoctorQueueEnriched: () =>
    request<QueuePatient[]>('GET', '/appointments/doctor/queue'),

  getTodaysSummary: () =>
    request<TodaysSummary>('GET', '/appointments/today-summary'),
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
export interface PatientRecord {
  _id:   string
  name:  string
  email: string
  phone?: string
}

export interface ConversationRecord {
  _id:            string
  patientId:      string
  doctorId:       string
  lastMessage:    string
  lastMessageAt:  string
  lastSenderRole: 'doctor' | 'patient' | 'bot'
  unreadCount:    number
  isArchived:     boolean
  needsEscalation?: boolean
  lastEscalationAt?: string | null
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
  type:           'normal' | 'ai-auto' | 'faq' | 'escalation' | 'attachment'
  aiConfidence?:  number
  isRead:         boolean
  isEscalated?:   boolean
  createdAt:      string
  attachmentUrl?:  string
  attachmentName?: string
  attachmentType?: string
  faqId?: {
    question: string
    category: string
  }
}

export type ConversationMessage = MessageRecord

// Patient side — a conversation thread enriched with the doctor's info
// (mirror of ConversationRecord, which is enriched with `patient` instead)
export interface PatientConversationRecord {
  _id:            string
  patientId:      string
  doctorId:       string
  lastMessage:    string
  lastMessageAt:  string
  lastSenderRole: 'doctor' | 'patient' | 'bot'
  unreadCount:    number
  isArchived:     boolean
  doctor: {
    _id:        string
    name:       string
    email:      string
    specialty?: string
    photo?:     string | null
  }
}

export interface PatientProfileData {
  patient: {
    _id:       string
    name:      string
    email:     string
    phone?:    string
    age?:      number | null
    bloodType?: string
    createdAt: string
  }
  sessionsCompleted: number
  latestMood:       string | null
  latestMoodColor:  string | null
  latestNote:       string
  recentMeds: {
    name:     string
    dose?:    string
    frequency?: string
    duration?: string
    withFood?: string
  }[]
  history: {
    _id:       string
    date:      string
    notes:     string
    moodLabel: string
    moodColor: string
    medications: unknown[]
  }[]
  chat: {
    unreadCount:   number
    lastMessage:   string
    lastMessageAt: string
  } | null
}

export interface AnalyticsData {
  totalMessages:    number
  unreadCount:      number
  aiReplied:        number
  faqReplied:       number
  doctorReplied:    number
  patientMessages:  number
  botReplyPercent:    number
  doctorReplyPercent: number
  conversationCount:  number
  dailyVolume: {
    date:  string
    label: string
    count: number
  }[]
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

export interface BroadcastRecord {
  _id:            string
  doctorId:       string
  message:        string
  recipients:     string[]
  deliveredCount: number
  readCount:      number
  sentAt:         string
  createdAt:      string
}

export interface BotSettingsData {
  _id?:                    string
  doctorId:                string
  isActive:                boolean
  autoReplyMode:           'always' | 'off_hours' | 'never'
  systemPrompt:            string
  model:                   string
  faqConfidenceThreshold:  number
  offHoursStart:           string
  offHoursEnd:             string
  escalationEnabled:       boolean
  escalationKeywords:      string[]
}

export const chatApi = {
  getConversations: () =>
    request<ConversationRecord[]>('GET', '/chat/conversations'),

  // Patient side — this patient's chat threads with their channeled doctor(s)
  getMyConversations: () =>
    request<PatientConversationRecord[]>('GET', '/chat/my-conversations'),

  // All registered patients — used by "New Message" to start a
  // brand-new conversation even if none exists yet.
  getPatients: () =>
    request<PatientRecord[]>('GET', '/chat/patients'),

  // Real patient snapshot (User + PatientHistory + Conversation) for
  // the "👤 Profile" screen — no hardcoded/fake data.
  getPatientProfile: (patientId: string) =>
    request<PatientProfileData>('GET', `/chat/patients/${patientId}/profile`),

  getOrCreateConversation: (patientId: string) =>
    request<ConversationRecord>('GET', `/chat/conversations/with/${patientId}`),

  // Patient side — get/create the conversation tied to a video session,
  // since the patient doesn't know their doctor's user id directly.
  getConversationBySession: (sessionId: string) =>
    request<ConversationRecord>('GET', `/chat/conversations/session/${sessionId}`),

  getMessages: (conversationId: string, page = 1, limit = 30) =>
    request<{ messages: MessageRecord[]; total: number; page: number; totalPages: number }>(
      'GET', `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    ),

  sendMessage: (conversationId: string, text: string) =>
    request<MessageRecord>('POST', `/chat/conversations/${conversationId}/messages`, { text }),

  // File/photo attachment — multipart upload, optional caption text
  sendAttachment: (conversationId: string, file: File, caption?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (caption?.trim()) form.append('caption', caption.trim());
    return requestUpload<MessageRecord>(`/chat/conversations/${conversationId}/attachment`, form);
  },

  markAsRead: (conversationId: string) =>
    request<void>('PATCH', `/chat/conversations/${conversationId}/read`),

  getAnalytics: () =>
    request<AnalyticsData>('GET', '/chat/analytics'),

  getBroadcasts: () =>
    request<BroadcastRecord[]>('GET', '/chat/broadcast'),

  sendBroadcast: (message: string, patientIds: string[]) =>
    request<BroadcastRecord>('POST', '/chat/broadcast', { message, patientIds }),

  getBotSettings: () =>
    request<BotSettingsData>('GET', '/chat/bot-settings'),

  updateBotSettings: (data: Partial<BotSettingsData>) =>
    request<BotSettingsData>('PUT', '/chat/bot-settings', data),

  getRecentMessages: async (limit = 5) => {
    const res = await fetch(`${BASE}/chat/recent-messages?limit=${limit}`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
    })
    if (res.status === 401) {
      clearToken()
      window.location.href = '/login'
      throw new Error('Unauthorized: Session expired or invalid token.')
    }
    return res.json() as Promise<{ success: boolean; messages: RecentMessageRecord[] }>
  },
}

export interface RecentMessageRecord {
  conversationId:  string
  patientId:       string
  patientName:     string
  patientEmail:    string
  patientAvatar:   string | null
  lastMessage:     string
  lastSenderRole:  'doctor' | 'patient' | 'bot'
  lastMessageType: 'normal' | 'ai-auto' | 'faq'
  isRead:          boolean
  unreadCount:     number
  lastMessageAt:   string
}
// ── Journal API ──────────────────────────────────────────────────────────
export interface JournalRecord {
  _id:        string
  doctorId:   string
  title:      string
  category:   string
  summary?:   string
  content?:   string
  tags?:      string[]
  status:     'Published' | 'Draft'
  fileName?:  string
  fileUrl?:   string
  fileSize?:  string
  views?:     number
  createdAt:  string
  updatedAt:  string
}

export interface JournalListResponse {
  data: JournalRecord[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface JournalListParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: string
}

export const journalApi = {
  // Pagination + search + filter — returns full response including pagination metadata
  getAll: async (params: JournalListParams = {}): Promise<JournalListResponse> => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.search) q.set('search', params.search)
    if (params.category) q.set('category', params.category)
    if (params.status) q.set('status', params.status)

    const res = await fetch(`${BASE}/journals?${q.toString()}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    if (res.status === 401) {
      clearToken()
      window.location.href = '/login'
      throw new Error('Unauthorized: Session expired or invalid token.')
    }
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Request failed')
    return { data: json.data, pagination: json.pagination }
  },

  getById: (id: string) => request<JournalRecord>('GET', `/journals/${id}`),

  // multipart/form-data upload — can't use the JSON request() helper
  create: async (formData: FormData): Promise<JournalRecord> => {
    const res = await fetch(`${BASE}/journals`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    })
    if (res.status === 401) {
      clearToken()
      window.location.href = '/login'
      throw new Error('Unauthorized: Session expired or invalid token.')
    }
    const json = await res.json()
    if (!json.success) throw new Error(json.message ?? 'Request failed')
    return json.data
  },

  update: (id: string, data: Partial<JournalRecord>) =>
    request<JournalRecord>('PUT', `/journals/${id}`, data),

  delete: (id: string) => request<{ message: string }>('DELETE', `/journals/${id}`),

  aiGenerate: (data: { prompt: string; title?: string; category?: string }) =>
    request<{ content: string }>('POST', '/journals/ai/generate', data),

  aiTopics: (data: { category?: string }) =>
    request<{ topics: string[] }>('POST', '/journals/ai/topics', data),
}