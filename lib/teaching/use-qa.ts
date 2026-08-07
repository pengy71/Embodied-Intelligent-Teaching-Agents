'use client';

import { useCallback, useState } from 'react';

export interface QAResponse {
  answer: string;
  sources: Array<{
    pointId: string;
    title: string;
    chapter: string;
    pageReference?: string;
  }>;
  relatedPoints: Array<{
    id: string;
    title: string;
    summary?: string;
    chapter?: string;
  }>;
}

export interface UseQAResult {
  data: QAResponse | null;
  isLoading: boolean;
  error: Error | null;
  askQuestion: (question: string, options?: { teachingStyle?: string; depth?: string }) => Promise<QAResponse | null>;
}

export function useQA(): UseQAResult {
  const [data, setData] = useState<QAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const askQuestion = useCallback(async (question: string, options?: { teachingStyle?: string; depth?: string }): Promise<QAResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/teaching/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, profile: options }),
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('Request failed (' + res.status + ')');
      }

      const json = await res.json();
      const result: QAResponse = {
        answer: json.answer,
        sources: Array.isArray(json.sources) ? json.sources : [],
        relatedPoints: Array.isArray(json.relatedPoints) ? json.relatedPoints : [],
      };
      setData(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    askQuestion,
  };
}
