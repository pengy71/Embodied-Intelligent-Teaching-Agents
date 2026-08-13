'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  AttributionCause,
  ErrorAttribution,
  GeneratedQuestion,
  GradedQuestion,
  PracticeDifficulty,
  PracticeMode,
  PracticeQuestionType,
  PracticeReport,
  PracticeRound,
  PracticeWeakPoint,
} from '@/lib/teaching/types';

export type {
  AttributionCause,
  ErrorAttribution,
  GeneratedQuestion as PracticeQuestion,
  GradedQuestion,
  PracticeDifficulty,
  PracticeMode,
  PracticeQuestionType,
  PracticeReport,
  PracticeRound,
  PracticeWeakPoint,
};

export interface PracticeGenerateOptions {
  count?: number;
  weakPointIds?: string[];
  chapterId?: string;
  chapterIds?: string[];
}

export interface PracticeSubmitOptions {
  eventType?: 'practice' | 'quiz';
  testId?: string;
}

export interface UsePracticeResult {
  generate: (
    mode: PracticeMode,
    opts?: PracticeGenerateOptions,
  ) => Promise<{ roundId: string; questions: GeneratedQuestion[] }>;
  submit: (
    roundId: string,
    questions: GeneratedQuestion[],
    answers: Record<string, number | string | null | undefined>,
    opts?: PracticeSubmitOptions,
  ) => Promise<PracticeRound | null>;
  generateVariants: (seed: GeneratedQuestion, count?: number) => Promise<GeneratedQuestion[]>;
  isGenerating: boolean;
  isGrading: boolean;
  isGeneratingVariants: boolean;
  error: Error | null;
}

export function usePractice(): UsePracticeResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(
    async (
      mode: PracticeMode,
      opts?: PracticeGenerateOptions,
    ): Promise<{ roundId: string; questions: GeneratedQuestion[] }> => {
      setIsGenerating(true);
      setError(null);
      try {
        const res = await fetch('/api/teaching/practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            count: opts?.count,
            weakPointIds: opts?.weakPointIds,
            chapterId: opts?.chapterId,
            chapterIds: opts?.chapterIds,
          }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('生成练习失败 (' + res.status + ')');
        const json = await res.json();
        return {
          roundId: json.roundId ?? '',
          questions: Array.isArray(json.questions) ? (json.questions as GeneratedQuestion[]) : [],
        };
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return { roundId: '', questions: [] };
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const submit = useCallback(
    async (
      roundId: string,
      questions: GeneratedQuestion[],
      answers: Record<string, number | string | null | undefined>,
      opts?: PracticeSubmitOptions,
    ): Promise<PracticeRound | null> => {
      setIsGrading(true);
      setError(null);
      try {
        const res = await fetch('/api/teaching/practice/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundId,
            questions,
            answers,
            eventType: opts?.eventType,
            testId: opts?.testId,
          }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('提交评阅失败 (' + res.status + ')');
        const json = await res.json();
        return (json.round ?? null) as PracticeRound | null;
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return null;
      } finally {
        setIsGrading(false);
      }
    },
    [],
  );

  const generateVariants = useCallback(
    async (seed: GeneratedQuestion, count?: number): Promise<GeneratedQuestion[]> => {
      setIsGeneratingVariants(true);
      setError(null);
      try {
        const res = await fetch('/api/teaching/practice/variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed, count }),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('生成变式题失败 (' + res.status + ')');
        const json = await res.json();
        return Array.isArray(json.questions) ? (json.questions as GeneratedQuestion[]) : [];
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return [];
      } finally {
        setIsGeneratingVariants(false);
      }
    },
    [],
  );

  return {
    generate,
    submit,
    generateVariants,
    isGenerating,
    isGrading,
    isGeneratingVariants,
    error,
  };
}

export interface UseWeakPointsResult {
  weakPoints: PracticeWeakPoint[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useWeakPoints(): UseWeakPointsResult {
  const [weakPoints, setWeakPoints] = useState<PracticeWeakPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teaching/practice/weak-points', { cache: 'no-store' });
      if (!res.ok) throw new Error('加载薄弱知识点失败 (' + res.status + ')');
      const json = await res.json();
      setWeakPoints(Array.isArray(json.weakPoints) ? (json.weakPoints as PracticeWeakPoint[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weakPoints, isLoading, error, refresh };
}


export interface UseWrongQuestionsResult {
  wrongQuestions: GradedQuestion[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useWrongQuestions(): UseWrongQuestionsResult {
  const [wrongQuestions, setWrongQuestions] = useState<GradedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/teaching/practice/wrong-questions', { cache: 'no-store' });
      if (!res.ok) throw new Error('加载错题集失败 (' + res.status + ')');
      const json = await res.json();
      setWrongQuestions(
        Array.isArray(json.wrongQuestions) ? (json.wrongQuestions as GradedQuestion[]) : [],
      );
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { wrongQuestions, isLoading, error, refresh };
}
