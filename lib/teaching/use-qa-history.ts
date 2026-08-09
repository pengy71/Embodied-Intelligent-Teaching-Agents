'use client';

import { useCallback, useState } from 'react';
import type { QASource } from './use-qa';

export interface QAHistoryRecord {
  id: string;
  question: string;
  answer: string;
  sources: QASource[];
  relatedPoints: Array<{
    id: string;
    title: string;
    summary?: string;
    chapter?: string;
  }>;
  profile: {
    teachingStyle?: string;
    depth?: string;
  };
  createdAt: string;
}

export interface UseQAHistoryResult {
  records: QAHistoryRecord[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  fetchHistory: () => Promise<void>;
}

export function useQAHistory(): UseQAHistoryResult {
  const [records, setRecords] = useState<QAHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/teaching/qa/history?limit=50', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to fetch history (' + res.status + ')');
      }

      const json = await res.json();
      setRecords(Array.isArray(json.records) ? json.records : []);
      setTotal(Number(json.total ?? 0));
      setHasMore(Boolean(json.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    records,
    total,
    hasMore,
    isLoading,
    error,
    fetchHistory,
  };
}