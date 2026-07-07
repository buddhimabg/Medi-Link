import { useState } from 'react';
import { analyzeJournal } from '../../api/aiApi';
import type { JournalAnalysisResult } from '../../types/ai';

export const useJournalAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JournalAnalysisResult | null>(null);

  const performAnalysis = async (journalText: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeJournal(journalText);
      setResult(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze journal';
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
