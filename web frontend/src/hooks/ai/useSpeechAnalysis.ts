import { useState } from 'react';
import { analyzeSpeech } from '../../api/aiApi';
import type { SpeechAnalysisResult } from '../../types/ai';
import { getErrorMessage } from '../../utils/errorHandler';

export const useSpeechAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeechAnalysisResult | null>(null);

  const performAnalysis = async (audioBlob: Blob) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeSpeech(audioBlob);
      setResult(data);
      return data;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, 'Failed to analyze speech');
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { performAnalysis, loading, error, result, reset };
};
