"use client";

import { TeachingSidebar } from "@/components/teaching/sidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <TeachingSidebar
        role="student"
        roleLabel="学生端"
        userName="同学"
        userDesc="计算机科学专业"
      />
      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>
    </div>
  );
}
