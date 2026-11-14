import client from "./client";
import type { JournalAnalysisResult, SpeechAnalysisResult, CameraAnalysisResult } from "../types/ai";

// AI requests go through Gemini which can take longer with retries across models
const AI_TIMEOUT = 60_000;

export const analyzeJournal = async (journalText: string): Promise<JournalAnalysisResult> => {
  return client.post("/api/ai/analyze-journal", { journalText }, { timeout: AI_TIMEOUT });
};

export const analyzeSpeech = async (audioBlob: Blob): Promise<SpeechAnalysisResult> => {
  const formData = new FormData();
  formData.append("audio", audioBlob);
  
  return client.post("/api/ai/analyze-speech", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: AI_TIMEOUT,
  });
};

export const analyzeCamera = async (imageBlob: Blob): Promise<CameraAnalysisResult> => {
  const formData = new FormData();
  formData.append("image", imageBlob);
  return client.post("/api/ai/analyze-camera", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: AI_TIMEOUT,
  });
};

export const analyzeCombined = async (payload: {
  journalText?: string;
  speechText?: string;
  cameraData?: { mood?: string; confidence?: number };
}): Promise<import("../types/ai").AggregatedAnalysisResult> => {
  return client.post("/api/ai/analyze-combined", payload, { timeout: AI_TIMEOUT });
};
