'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TeachingResource } from '@/lib/teaching/store';

interface CacheEntry {
  promise: Promise<TeachingResource[]> | null;
  data: TeachingResource[] | null;
  ts: number;
}

const POLL_INTERVAL = 4000;
const cache: CacheEntry = { promise: null, data: null, ts: 0 };
const subscribers = new Set<() => void>();

function notify(): void {
  for (const fn of subscribers) fn();
}

async function fetchResources(): Promise<TeachingResource[]> {
  const res = await fetch('/api/teaching/resources', { cache: 'no-store' });
  if (!res.ok) throw new Error(`加载资源列表失败 (${res.status})`);
  const json = (await res.json()) as { resources: TeachingResource[] };
  return json.resources;
}

export interface UseResourcesResult {
  resources: TeachingResource[] | null;
  isLoading: boolean;
  error: Error | null;
  revalidate: () => Promise<void>;
}

export function useResources(): UseResourcesResult {
  const [data, setData] = useState<TeachingResource[] | null>(cache.data);
  const [isLoading, setIsLoading] = useState(!cache.data);
  const [error, setError] = useState<Error | null>(null);

  const revalidate = useCallback(async () => {
    if (!cache.promise) {
      cache.promise = fetchResources()
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
    void revalidate();
    const id = window.setInterval(() => void revalidate(), POLL_INTERVAL);
    return () => {
      subscribers.delete(onChange);
      window.clearInterval(id);
    };
  }, [revalidate]);

  return { resources: data, isLoading, error, revalidate };
}
