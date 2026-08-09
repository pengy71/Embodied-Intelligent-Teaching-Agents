"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, User, ArrowRight, Brain, Sparkles } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-purple-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900">
            具身智能课程教学智能体
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-500">
            通过课程知识图谱、长期学习记忆、多智能体协同，
            实现"教师-AI-学生"协同的智能教学模式
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Embodied Intelligent Teaching Agents
          </div>
        </div>

        {/* Role cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Teacher */}
          <button
            onClick={() => router.push("/teaching/teacher")}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
            <div className="relative">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-slate-900">教师端</h2>
              <p className="mb-6 text-sm leading-relaxed text-slate-500">
                课程知识体系构建、学情分析、教学辅助。帮助教师实现教学数据化、辅导精准化和备课高效化。
              </p>
              <div className="flex flex-wrap gap-2">
                {["课程概览", "课程建设", "教学工具"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
                进入教师端
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </button>

          {/* Student */}
          <button
            onClick={() => router.push("/teaching/student")}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-150" />
            <div className="relative">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <User className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-slate-900">学生端</h2>
              <p className="mb-6 text-sm leading-relaxed text-slate-500">
                个性化学习支持、智能答疑、练习测试。AI教师随学习行为持续演化，成为专属你的AI教师。
              </p>
              <div className="flex flex-wrap gap-2">
                {["AI学习助手", "学习资源", "答疑中心", "练习测试"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex items-center text-sm font-medium text-emerald-600 transition-transform group-hover:translate-x-1">
                进入学生端
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-400">
          具身智能课程教学智能体 · Embodied Intelligent Teaching Agents
        </div>
      </div>
    </div>
  );
}