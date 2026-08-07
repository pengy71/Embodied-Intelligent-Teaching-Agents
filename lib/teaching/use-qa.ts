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
  askQuestion: (question: string, options?: { teachingStyle?: string; depth?: string }) => Promise<void>;
}

export function useQA(): UseQAResult {
  const [data, setData] = useState<QAResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const askQuestion = useCallback(async (question: string, options?: { teachingStyle?: string; depth?: string }) => {
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
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
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
