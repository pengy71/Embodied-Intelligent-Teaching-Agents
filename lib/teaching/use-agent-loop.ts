'use client';

import { useCallback, useRef, useState } from 'react';

import type {
  LoopStep,
  TeachingLoopResult,
} from '@/lib/teaching/orchestration/teaching-loop-graph';

export interface UseAgentLoopResult {
  steps: LoopStep[];
  result: TeachingLoopResult | null;
  isRunning: boolean;
  error: string | null;
  runLoop: (
    question: string,
    options?: { teachingStyle?: string; depth?: string; force?: boolean },
  ) => Promise<TeachingLoopResult | null>;
  reset: () => void;
}

export function useAgentLoop(): UseAgentLoopResult {
  const [steps, setSteps] = useState<LoopStep[]>([]);
  const [result, setResult] = useState<TeachingLoopResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setResult(null);
    setError(null);
  }, []);

  const runLoop = useCallback(
    async (
      question: string,
      options?: { teachingStyle?: string; depth?: string; force?: boolean },
    ): Promise<TeachingLoopResult | null> => {
      setIsRunning(true);
      setError(null);
      setSteps([]);
      setResult(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/teaching/agent-loop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            profile: {
              teachingStyle: options?.teachingStyle,
              depth: options?.depth,
            },
            force: options?.force !== false,
          }),
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: TeachingLoopResult | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let event: { type: string; [key: string]: unknown };
            try {
              event = JSON.parse(trimmed);
            } catch {
              continue;
            }
            if (event.type === 'step' && event.step) {
              setSteps((prev) => [...prev, event.step as LoopStep]);
            } else if (event.type === 'result' && event.result) {
              finalResult = event.result as TeachingLoopResult;
              setResult(finalResult);
            } else if (event.type === 'error') {
              const message = typeof event.message === 'string' ? event.message : '闭环运行失败';
              setError(message);
            }
          }
        }

        return finalResult;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return null;
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [],
  );

  return { steps, result, isRunning, error, runLoop, reset };
}