// src/types/videoCall.ts

export interface CallData {
  roomId:    string
  token:     string
  appId:     number
  userId:    string
  userName:  string
  sessionId: string
}

export interface Medication {
  id:        number
  name:      string
  dose:      string
  frequency: string
  duration:  string
  withFood:  string
}

export type NewMedication = Omit<Medication, 'id'>

export interface ChatMessage {
  role: 'doctor' | 'patient'
  text: string
  time: string
}

export interface QueuePatient {
  initials: string
  name:     string
  time:     string
  status:   'invited' | 'upcoming'
  bg:       string
}