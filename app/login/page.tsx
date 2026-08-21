'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/lib/auth/use-session';
import { Brain, GraduationCap, User, Loader2, LogIn, AlertCircle } from 'lucide-react';

interface TestAccount {
  username: string;
  password: string;
  role: 'teacher' | 'student';
  name: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  { username: 'teacher', password: 'teacher123', role: 'teacher', name: '陈教授' },
  { username: '2024001', password: 'student123', role: 'student', name: '张明' },
  { username: '2024002', password: 'student123', role: 'student', name: '刘洋' },
  { username: '2024003', password: 'student123', role: 'student', name: '陈静' },
  { username: '2024004', password: 'student123', role: 'student', name: '王浩' },
  { username: '2024005', password: 'student123', role: 'student', name: '李雪' },
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status, login } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = searchParams.get('from');

  useEffect(() => {
    if (status === 'authenticated' && user) {
      const target =
        from && from.startsWith('/teaching')
          ? from
          : user.role === 'teacher'
            ? '/teaching/teacher'
            : '/teaching/student';
      router.replace(target);
    }
  }, [status, user, from, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(username.trim(), password);
      const target =
        from && from.startsWith('/teaching')
          ? from
          : u.role === 'teacher'
            ? '/teaching/teacher'
            : '/teaching/student';
      router.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (acc: TestAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/30 p-4">
      <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
        {/* Login form */}
        <Card className="border-primary/10 shadow-lg">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">具身智能教学平台</CardTitle>
                <CardDescription>Embodied Intelligent Teaching Agents</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting || status === 'loading'}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中…
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    登录
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test accounts */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-primary" />
              测试账号
            </CardTitle>
            <CardDescription>点击任意账号可快速填充，密码统一为下方所示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {TEST_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => quickFill(acc)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {acc.role === 'teacher' ? (
                    <GraduationCap className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{acc.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {acc.role === 'teacher' ? '教师' : '学生'}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {acc.username} / {acc.password}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
