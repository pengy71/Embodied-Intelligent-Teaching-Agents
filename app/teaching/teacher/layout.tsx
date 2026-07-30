"use client";

import { TeachingSidebar } from "@/components/teaching/sidebar";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <TeachingSidebar role="teacher" roleLabel="教师端" userName="陈教授" userDesc="计算机科学与技术学院" />
      <main className="flex-1 overflow-y-auto bg-muted/30 pt-14 pb-16 md:py-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
