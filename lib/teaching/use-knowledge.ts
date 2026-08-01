'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  computeStats,
  type KnowledgeDoc,
  type KnowledgeGraphEdgeData,
} from '@/lib/teaching/knowledge-doc';

export type KnowledgeStats = ReturnType<typeof computeStats>;

export interface KnowledgePayload {
  doc: KnowledgeDoc;
  graphEdges: KnowledgeGraphEdgeData[];
  stats: KnowledgeStats;
}

interface CacheEntry {
  promise: Promise<KnowledgePayload> | null;
  data: KnowledgePayload | null;
  ts: number;
}

const TTL = 15000;
const cache: CacheEntry = { promise: null, data: null, ts: 0 };
const subscribers = new Set<() => void>();

function notify(): void {
  for (const fn of subscribers) fn();
}

async function fetchKnowledge(): Promise<KnowledgePayload> {
  const res = await fetch('/api/teaching/knowledge', { cache: 'no-store' });
  if (!res.ok) throw new Error(`加载知识库失败 (${res.status})`);
  const json = (await res.json()) as {
    doc: KnowledgeDoc;
    graphEdges: KnowledgeGraphEdgeData[];
    stats: KnowledgeStats;
  };
  return { doc: json.doc, graphEdges: json.graphEdges, stats: json.stats };
}

export interface UseKnowledgeResult {
  data: KnowledgePayload | null;
  doc: KnowledgeDoc | null;
  graphEdges: KnowledgeGraphEdgeData[] | null;
  stats: KnowledgeStats | null;
  isLoading: boolean;
  error: Error | null;
  revalidate: () => Promise<void>;
}

export function useKnowledge(): UseKnowledgeResult {
  const [data, setData] = useState<KnowledgePayload | null>(cache.data);
  const [isLoading, setIsLoading] = useState(!cache.data);
  const [error, setError] = useState<Error | null>(null);

  const revalidate = useCallback(async () => {
    if (!cache.promise) {
      cache.promise = fetchKnowledge()
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
    doc: data?.doc ?? null,
    graphEdges: data?.graphEdges ?? null,
    stats: data?.stats ?? null,
    isLoading,
    error,
    revalidate,
  };
}
