'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SessionUser {
  uid: string;
  role: 'teacher' | 'student';
  name: string;
  studentId: string | null;
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
}

// Module-level singleton so every component shares one fetch.
let cache: SessionState | null = null;
let inflight: Promise<SessionState> | null = null;
const subscribers = new Set<(s: SessionState) => void>();

function broadcast(state: SessionState) {
  cache = state;
  inflight = null;
  for (const fn of subscribers) fn(state);
}

export function refreshSession(): Promise<SessionState> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      const json = await res.json();
      const user = json.user ?? null;
      const state: SessionState = {
        user,
        status: user ? 'authenticated' : 'unauthenticated',
      };
      broadcast(state);
      return state;
    } catch {
      const state: SessionState = { user: null, status: 'unauthenticated' };
      broadcast(state);
      return state;
    }
  })();
  return inflight;
}

export function setSession(user: SessionUser | null) {
  broadcast({
    user,
    status: user ? 'authenticated' : 'unauthenticated',
  });
}

export function useSession() {
  const [state, setState] = useState<SessionState>(cache ?? { user: null, status: 'loading' });

  useEffect(() => {
    subscribers.add(setState);
    if (!cache && !inflight) {
      void refreshSession();
    } else if (cache) {
      setState(cache);
    }
    return () => {
      subscribers.delete(setState);
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<SessionUser> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || '登录失败');
    }
    setSession(json.user);
    return json.user as SessionUser;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
  }, []);

  return { ...state, refresh: refreshSession, login, logout };
}