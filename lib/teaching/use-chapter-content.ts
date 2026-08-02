'use client';

import { useCallback, useEffect, useState } from 'react';

// 仅 ch01-ch17 在 public/docs/ 下有对应原文 Markdown。
const DOCS_CHAPTER_PATTERN = /^ch\d{2}$/;
const TTL = 5 * 60 * 1000;

interface CacheEntry {
  content: string;
  ts: number;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

function loadChapter(chapterId: string): Promise<string> {
  const pending = inflight.get(chapterId);
  if (pending) return pending;
  const promise = fetch(`/docs/${chapterId}.md`, { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`加载章节原文失败 (${res.status})`);
      const text = await res.text();
      cache.set(chapterId, { content: text, ts: Date.now() });
      return text;
    })
    .finally(() => {
      inflight.delete(chapterId);
    });
  inflight.set(chapterId, promise);
  return promise;
}

export interface UseChapterContentResult {
  content: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useChapterContent(
  chapterId: string | null | undefined,
): UseChapterContentResult {
  const supported = !!chapterId && DOCS_CHAPTER_PATTERN.test(chapterId);
  const [content, setContent] = useState<string | null>(() =>
    supported && chapterId ? cache.get(chapterId)?.content ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (id: string) => {
    const cached = cache.get(id);
    if (cached && Date.now() - cached.ts < TTL) {
      setContent(cached.content);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const text = await loadChapter(id);
      setContent(text);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setContent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supported || !chapterId) {
      setContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    void load(chapterId);
  }, [chapterId, supported, load]);

  return { content, isLoading, error };
}