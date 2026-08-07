'use client';

import { useCallback, useState } from 'react';

export type PracticeMode = 'adaptive' | 'chapter' | 'special' | 'test';

export interface PracticeQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  pointId: string;
  pointTitle: string;
  chapter: string;
  source: string;
  difficulty: string;
}

export interface UsePracticeResult {
  generate: (mode: PracticeMode, weakPointIds?: string[]) => Promise<PracticeQuestion[]>;
  isLoading: boolean;
  error: Error | null;
}

export function usePractice(): UsePracticeResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(async (mode: PracticeMode, weakPointIds?: string[]): Promise<PracticeQuestion[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teaching/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, weakPointIds }),
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Request failed (' + res.status + ')');
      }
      const json = await res.json();
      const questions: PracticeQuestion[] = Array.isArray(json?.questions) ? json.questions : [];
      return questions;
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { generate, isLoading, error };
}