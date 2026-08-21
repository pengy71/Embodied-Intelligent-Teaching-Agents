'use client';

import { useCallback, useEffect, useState } from 'react';

import type { StageTest, StageTestConfig, StudentStageTest } from '@/lib/teaching/types';

async function fetchTests<T>(): Promise<T[]> {
  const res = await fetch('/api/teaching/tests', { cache: 'no-store' });
  if (!res.ok) throw new Error('加载阶段测试失败 (' + res.status + ')');
  const json = await res.json();
  return Array.isArray(json.tests) ? (json.tests as T[]) : [];
}

export interface UseStudentStageTestsResult {
  tests: StudentStageTest[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useStudentStageTests(): UseStudentStageTestsResult {
  const [tests, setTests] = useState<StudentStageTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTests(await fetchTests<StudentStageTest>());
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tests, isLoading, error, refresh };
}

export interface UseTeacherStageTestsResult {
  tests: StageTest[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createTest: (input: {
    title: string;
    description?: string;
    config: StageTestConfig;
    dueAt?: string;
  }) => Promise<StageTest | null>;
  removeTest: (id: string) => Promise<boolean>;
}

export function useTeacherStageTests(): UseTeacherStageTestsResult {
  const [tests, setTests] = useState<StageTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTests(await fetchTests<StageTest>());
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTest = useCallback(
    async (input: {
      title: string;
      description?: string;
      config: StageTestConfig;
      dueAt?: string;
    }): Promise<StageTest | null> => {
      setError(null);
      try {
        const res = await fetch('/api/teaching/tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('发布失败 (' + res.status + ')');
        const json = await res.json();
        await refresh();
        return (json.test ?? null) as StageTest | null;
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return null;
      }
    },
    [refresh],
  );

  const removeTest = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/teaching/tests/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('删除失败 (' + res.status + ')');
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        return false;
      }
    },
    [refresh],
  );

  return { tests, isLoading, error, refresh, createTest, removeTest };
}
