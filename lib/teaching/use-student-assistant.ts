'use client';

import { useCallback, useEffect, useState } from 'react';

export interface StudentAssistantData {
  recommendations: Array<{
    type: string;
    pointId: string;
    title: string;
    reason: string;
    priority: string;
  }>;
  learningPath: Array<{
    chapterId: string;
    title: string;
    progress: number;
    totalPoints: number;
    masteredPoints: number;
    isCurrent: boolean;
    points: Array<{
      id: string;
      title: string;
      mastered: boolean;
      isWeak: boolean;
    }>;
  }>;
  todaySuggestions: Array<{
    type: string;
    pointId: string;
    title: string;
    estimatedTime: number;
    reason: string;
  }>;
  studentProgress: {
    masteredPoints: string[];
    currentChapter: string;
    weakPoints: string[];
    learningHistory: Array<{
      pointId: string;
      timestamp: number;
      mastery: number;
    }>;
  };
  knowledgeStats: {
    totalPoints: number;
    masteredPoints: number;
    weakPoints: number;
    currentChapter: string;
  };
}

interface CacheEntry {
  promise: Promise<StudentAssistantData> | null;
  data: StudentAssistantData | null;
  ts: number;
}

const TTL = 30000;
const cache: CacheEntry = { promise: null, data: null, ts: 0 };
const subscribers = new Set<() => void>();

function notify(): void {
  for (const fn of subscribers) fn();
}

async function fetchStudentAssistant(): Promise<StudentAssistantData> {
  const res = await fetch('/api/teaching/student-assistant', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load student assistant data (' + res.status + ')');
  const json = await res.json();
  return json.data;
}

export interface UseStudentAssistantResult {
  data: StudentAssistantData | null;
  isLoading: boolean;
  error: Error | null;
  revalidate: () => Promise<void>;
}

export function useStudentAssistant(): UseStudentAssistantResult {
  const [data, setData] = useState<StudentAssistantData | null>(cache.data);
  const [isLoading, setIsLoading] = useState(!cache.data);
  const [error, setError] = useState<Error | null>(null);

  const revalidate = useCallback(async () => {
    if (!cache.promise) {
      cache.promise = fetchStudentAssistant()
        .then((d) => {
          cache.data = d;
          cache.ts = Date.now();
          notify();
          return d;
        })
        .finally(() => {
          cache.promise = null;
        });
    }
    try {
      const d = await cache.promise;
      setData(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setData(cache.data);
    subscribers.add(onChange);
    const fresh = Date.now() - cache.ts < TTL;
    if (!cache.data || !fresh) void revalidate();
    const onFocus = () => void revalidate();
    const id = window.setInterval(() => void revalidate(), TTL);
    window.addEventListener('focus', onFocus);
    return () => {
      subscribers.delete(onChange);
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [revalidate]);

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
}
