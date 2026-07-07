export interface AiSuggestionDetail {
  value: number | null;
  confidence: number;
  source: string[];
  evidence?: string[];
}

export interface DetailedAiSuggestions {
  anxietyLevel?: AiSuggestionDetail | null;
  energyLevel?: AiSuggestionDetail | null;
  socialInteraction?: AiSuggestionDetail | null;
  motivationLevel?: AiSuggestionDetail | null;
  focusLevel?: AiSuggestionDetail | null;
  stressLevel?: AiSuggestionDetail | null;
  sleepLevel?: AiSuggestionDetail | null;
}

export interface AiSuggestions {
  anxietyLevel?: number;
  energyLevel?: number;
  socialInteraction?: number;
  motivationLevel?: number;
  focusLevel?: number;
  stressLevel?: number;
  sleepLevel?: number;
}

export interface JournalAnalysisResult {
  sentimentMood?: string;
  primaryEmotion?: string;
  emotionalIntensity?: number;
  stressLevel?: number;
  detectedTopics?: string[];
  copingStrategies?: string[];
  aiSummary?: string;
  suggestions?: AiSuggestions;
  detailedSuggestions?: DetailedAiSuggestions;
}

export interface SpeechAnalysisResult {
  speechTranscript?: string;
  sentimentMood?: string;
  primaryEmotion?: string;
  emotionalIntensity?: number;
  stressLevel?: number;
  detectedTopics?: string[];
  copingStrategies?: string[];
  aiSummary?: string;
  suggestions?: AiSuggestions;
  detailedSuggestions?: DetailedAiSuggestions;
}

export interface CameraAnalysisResult {
  cameraDetectedMood?: string;
  cameraConfidence?: number;
}

export interface AggregatedAnalysisResult {
  aiSuggestions: DetailedAiSuggestions;
  detectedMood?: {
    mood: string;
    confidence: number;
    source: string[];
  } | null;
  uiState: {
    showSuggestions: boolean;
    showDetectedMood: boolean;
    allowAcceptAll: boolean;
    allowModify: boolean;
    allowSkip: boolean;
    allowCancel: boolean;
  };
  extractedInsights: {
    keyEmotion: string | null;
    stressLevelText: string;
    summary: string;
  };
}
