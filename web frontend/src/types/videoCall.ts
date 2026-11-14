// src/types/videoCall.ts
import type { Medication as ApiMedication } from './api'

export interface CallData {
  roomId:    string
  token:     string
  appId:     number
  userId:    string
  userName:  string
  sessionId: string
}

// Invitation status type for better state management
export interface InvitationStatus {
  sent:      boolean
  timestamp: string | null
  error:     string | null
}

// Medication with id — used in local state
export interface Medication extends ApiMedication {
  id: number
}

// NewMedication — no id, used for form input (matches api.ts Medication)
export type NewMedication = ApiMedication

export interface ChatMessage {
  role: 'doctor' | 'patient'
  text: string
  time: string
}