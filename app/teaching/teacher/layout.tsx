'use client';

import { TeachingSidebar } from '@/components/teaching/sidebar';
import { AuthGuard } from '@/components/teaching/auth-guard';
import { useSession } from '@/lib/auth/use-session';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <AuthGuard role="teacher">
      <div className="flex h-screen overflow-hidden">
        <TeachingSidebar
          role="teacher"
          roleLabel="教师端"
          userName={user?.name ?? '教师'}
          userDesc="具身智能课程"
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 pt-14 pb-16 md:py-0">
          <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
