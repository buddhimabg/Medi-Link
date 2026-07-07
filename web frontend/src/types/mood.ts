export type MoodName = "terrible" | "sad" | "okay" | "good" | "great";

export interface MoodEntry {
  mood?: string | null;
  sleepLevel?: number | string | null;
  energyLevel?: number | string | null;
  motivationLevel?: number | string | null;
  socialInteraction?: number | string | null;
  focusLevel?: number | string | null;
  anxietyLevel?: number | string | null;
  stressLevel?: number | string | null;
  createdAt?: string | number | Date | null;
  mentalHealthScore?: number;

  // AI Optional Fields
  journalSentimentMood?: string;
  journalPrimaryEmotion?: string;
  journalEmotionalIntensity?: number;
  journalStressLevel?: number;
  journalTopics?: string[];
  journalCopingStrategies?: string[];
  journalAiSummary?: string;

  speechTranscript?: string;
  speechSentimentMood?: string;
  speechPrimaryEmotion?: string;
  speechEmotionalIntensity?: number;
  speechStressLevel?: number;
  speechTopics?: string[];
  speechCopingStrategies?: string[];
  speechAiSummary?: string;

  cameraDetectedMood?: string;
  cameraConfidence?: number;

  finalConfirmedMood?: Record<string, number>;
  overallWellbeingScore?: number;
  emotionalRiskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';

  [key: string]: unknown;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export interface OverviewData {
  dashboardStats: {
    sevenDayAverage: number;
    checkInStreak: number;
    recoveryScore: number;
  };
  weeklyChart: any[];
  insights: any;
}
