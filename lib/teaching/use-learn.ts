'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STUDENT_ID_KEY = 'openmaic.student.id';

/** 获取或创建本地学生 ID（无鉴权 MVP，存 localStorage）。 */
export function getOrCreateStudentId(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let id = window.localStorage.getItem(STUDENT_ID_KEY);
    if (!id) {
      const rand =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      id = rand;
      window.localStorage.setItem(STUDENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export interface LearnJobState {
  status: 'idle' | 'generating' | 'succeeded' | 'failed';
  step: string;
  progress: number;
  message: string;
  scenesGenerated: number;
  totalScenes?: number;
  classroomId?: string;
  classroomUrl?: string;
  error: string | null;
}

const IDLE_STATE: LearnJobState = {
  status: 'idle',
  step: '',
  progress: 0,
  message: '',
  scenesGenerated: 0,
  error: null,
};

export interface UseLearnSessionResult {
  state: LearnJobState;
  start: (pointId: string) => void;
  reset: () => void;
}

/**
 * 发起 OpenMAIC 多智能体课堂生成并轮询进度：
 * POST /api/teaching/learn -> 取 jobId -> 轮询 /api/generate-classroom/[jobId]。
 */
export function useLearnSession(): UseLearnSessionResult {
  const [state, setState] = useState<LearnJobState>(IDLE_STATE);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePointRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    activePointRef.current = null;
    setState(IDLE_STATE);
  }, [stopPolling]);

  const start = useCallback(
    (pointId: string) => {
      stopPolling();
      activePointRef.current = pointId;
      setState({
        status: 'generating',
        step: 'initializing',
        progress: 0,
        message: '正在准备多智能体讲解…',
        scenesGenerated: 0,
        error: null,
      });

      const poll = async (jobId: string) => {
        if (activePointRef.current !== pointId) return; // 已被更新的知识点取代
        try {
          const r = await fetch(`/api/generate-classroom/${jobId}`, { cache: 'no-store' });
          if (!r.ok) return;
          const j = await r.json();
          const result = j.result;
          const next: LearnJobState = {
            status:
              j.status === 'succeeded' ? 'succeeded' : j.status === 'failed' ? 'failed' : 'generating',
            step: j.step ?? '',
            progress: typeof j.progress === 'number' ? j.progress : 0,
            message: j.message ?? '',
            scenesGenerated: typeof j.scenesGenerated === 'number' ? j.scenesGenerated : 0,
            totalScenes: j.totalScenes,
            classroomId: result?.classroomId,
            classroomUrl: result?.url,
            error: j.error ?? null,
          };
          if (activePointRef.current === pointId) setState(next);
          if (j.done) stopPolling();
        } catch {
          /* 瞬时错误时继续轮询 */
        }
      };

      void (async () => {
        try {
          const res = await fetch('/api/teaching/learn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pointId }),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            throw new Error(`请求失败 (${res.status})${txt ? `：${txt}` : ''}`);
          }
          const json = await res.json();
          const jobId = json.jobId;
          const interval = typeof json.pollIntervalMs === 'number' ? json.pollIntervalMs : 5000;
          if (!jobId) throw new Error('未返回 jobId');
          if (activePointRef.current !== pointId) return; // 请求期间已切换
          await poll(jobId);
          if (activePointRef.current !== pointId) return;
          pollRef.current = setInterval(() => void poll(jobId), interval);
        } catch (err) {
          if (activePointRef.current === pointId) {
            setState({
              ...IDLE_STATE,
              status: 'failed',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      })();
    },
    [stopPolling],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { state, start, reset };
}

export interface ProgressEntry {
  pointId: string;
  status: 'learning' | 'learned';
}

export interface UseStudentProgressResult {
  progress: Record<string, ProgressEntry>;
  loading: boolean;
  markLearned: (pointId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useStudentProgress(): UseStudentProgressResult {
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const studentId = getOrCreateStudentId();
    try {
      const res = await fetch(`/api/teaching/progress?studentId=${encodeURIComponent(studentId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      const map: Record<string, ProgressEntry> = {};
      for (const p of json.progress ?? []) {
        map[p.pointId] = { pointId: p.pointId, status: p.status };
      }
      setProgress(map);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const markLearned = useCallback(async (pointId: string) => {
    const studentId = getOrCreateStudentId();
    setProgress((prev) => ({ ...prev, [pointId]: { pointId, status: 'learned' } }));
    try {
      await fetch('/api/teaching/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, pointId, status: 'learned' }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { progress, loading, markLearned, reload };
}