import client from "./client";
import type { JournalAnalysisResult, SpeechAnalysisResult, CameraAnalysisResult } from "../types/ai";

export const analyzeJournal = async (journalText: string): Promise<JournalAnalysisResult> => {
  return client.post("/api/ai/analyze-journal", { journalText });
};

export const analyzeSpeech = async (audioBlob: Blob): Promise<SpeechAnalysisResult> => {
  const formData = new FormData();
  formData.append("audio", audioBlob);
  
  return client.post("/api/ai/analyze-speech", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const analyzeCamera = async (imageBlob: Blob): Promise<CameraAnalysisResult> => {
  const formData = new FormData();
  formData.append("image", imageBlob);
  return client.post("/api/ai/analyze-camera", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const analyzeCombined = async (payload: {
  journalText?: string;
  speechText?: string;
  cameraData?: { mood?: string; confidence?: number };
}): Promise<import("../types/ai").AggregatedAnalysisResult> => {
  return client.post("/api/ai/analyze-combined", payload);
};
