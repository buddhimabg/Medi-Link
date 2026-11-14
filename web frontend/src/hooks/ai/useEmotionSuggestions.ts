import { useState } from 'react';
import type { AggregatedAnalysisResult } from '../../types/ai';

export const useEmotionSuggestions = () => {
  const [aggregatedResult, setAggregatedResult] = useState<AggregatedAnalysisResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const triggerReview = (newResult: AggregatedAnalysisResult) => {
    setAggregatedResult(newResult);
    setIsReviewing(true);
  };

  const acceptSuggestions = (callback: (s: AggregatedAnalysisResult) => void) => {
    if (aggregatedResult) {
      callback(aggregatedResult);
    }
    setIsReviewing(false);
    setAggregatedResult(null);
  };

  const skipSuggestions = () => {
    setIsReviewing(false);
    setAggregatedResult(null);
  };

  return {
    aggregatedResult,
    isReviewing,
    triggerReview,
    acceptSuggestions,
    skipSuggestions,
  };
};
