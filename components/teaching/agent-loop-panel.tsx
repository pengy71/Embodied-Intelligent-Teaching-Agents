"use client";

import { useState } from "react";
import {
  HelpCircle,
  GraduationCap,
  BarChart3,
  ClipboardCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Send,
  Sparkles,
  BookOpen,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAgentLoop } from "@/lib/teaching/use-agent-loop";
import type { LoopAgentName, LoopStep } from "@/lib/teaching/orchestration/teaching-loop-graph";

interface AgentMeta {
  label: string;
  icon: typeof HelpCircle;
  accent: string;
}

const AGENTS: Record<LoopAgentName, AgentMeta> = {
  qa: { label: "答疑智能体", icon: HelpCircle, accent: "text-blue-500" },
  guidance: { label: "导学/评测智能体", icon: GraduationCap, accent: "text-emerald-500" },
  analytics: { label: "学情分析智能体", icon: BarChart3, accent: "text-amber-500" },
  "teacher-summary": { label: "教师汇总智能体", icon: ClipboardCheck, accent: "text-purple-500" },
};

const ORDER: LoopAgentName[] = ["qa", "guidance", "analytics", "teacher-summary"];

function StepIcon({ status }: { status: LoopStep["status"] | "pending" }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-red-500" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />;
}

export function AgentLoopPanel({ defaultQuestion }: { defaultQuestion?: string }) {
  const [question, setQuestion] = useState(defaultQuestion ?? "");
  const [teachingStyle, setTeachingStyle] = useState("引导启发型");
  const [depth, setDepth] = useState("标准");
  const { steps, result, isRunning, error, runLoop } = useAgentLoop();

  const stepByAgent = new Map<LoopAgentName, LoopStep>();
  for (const s of steps) stepByAgent.set(s.agent, s);

  const handleRun = async () => {
    if (!question.trim()) return;
    await runLoop(question, { teachingStyle, depth });
  };

  return (
    <Card className="flex flex-col overflow-hidden" style={{ height: "750px" }}>
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              多智能体协同闭环
            </CardTitle>
            <CardDescription>
              提问触发答疑 → 数据同步导学/评测 → 练习数据同步学情分析 → 汇总教师端
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            LangGraph 状态机
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-4">
        {/* 输入区 */}
        <div className="shrink-0 space-y-3 rounded-lg border bg-muted/30 p-3">
          <Textarea
            placeholder="输入问题，启动四智能体协同闭环…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[56px] bg-background"
            disabled={isRunning}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={teachingStyle}
              onChange={(e) => setTeachingStyle(e.target.value)}
              disabled={isRunning}
            >
              <option>引导启发型</option>
              <option>严谨型</option>
              <option>通俗易懂型</option>
              <option>实践应用型</option>
            </select>
            <select
              className="rounded-md border bg-background px-2 py-1.5 text-sm"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              disabled={isRunning}
            >
              <option>基础</option>
              <option>标准</option>
              <option>深入</option>
            </select>
            <Button onClick={handleRun} disabled={!question.trim() || isRunning} className="ml-auto">
              {isRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              {isRunning ? "闭环运行中" : "运行协同闭环"}
            </Button>
          </div>
        </div>

        {/* 智能体执行轨迹 */}
        <div className="space-y-2">
          {ORDER.map((agent) => {
            const meta = AGENTS[agent];
            const step = stepByAgent.get(agent);
            const status = step?.status ?? "pending";
            const Icon = meta.icon;
            return (
              <div
                key={agent}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  status === "completed"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : status === "error"
                      ? "border-red-500/30 bg-red-500/5"
                      : status === "running"
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-background"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.accent}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{meta.label}</span>
                    <StepIcon status={status} />
                    {step?.durationMs != null && status === "completed" && (
                      <span className="text-xs text-muted-foreground">{(step.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step?.detail ?? "等待上游智能体完成…"}
                  </p>
                  {step?.error && <p className="mt-1 text-xs text-red-500">{step.error}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 闭环结果 */}
        {result && (
          <div className="space-y-4">
            {/* 答疑结果 */}
            {result.qa && (
              <ResultCard icon={HelpCircle} accent="text-blue-500" title="答疑结果">
                <p className="whitespace-pre-wrap text-sm">{result.qa.answer}</p>
                {result.qa.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.qa.sources.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                        <span className="truncate">{s.title}</span>
                        <span>· {s.chapter}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ResultCard>
            )}

            {/* 导学建议 */}
            {result.guidance && (
              <ResultCard icon={GraduationCap} accent="text-emerald-500" title="个性化导学">
                <p className="text-sm">{result.guidance.guidanceMessage}</p>
                {result.guidance.todayPlan.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.guidance.todayPlan.slice(0, 4).map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">
                        {t.type}：{t.title}
                      </Badge>
                    ))}
                  </div>
                )}
              </ResultCard>
            )}

            {/* 靶向练习 */}
            {result.practiceQuestions && result.practiceQuestions.length > 0 && (
              <ResultCard icon={BookOpen} accent="text-cyan-500" title="靶向练习题（评测）">
                <div className="space-y-2">
                  {result.practiceQuestions.map((q, i) => (
                    <div key={q.id} className="rounded-md border bg-background p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{q.type}</Badge>
                        <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                        <span className="text-xs text-muted-foreground">{q.pointTitle}</span>
                      </div>
                      <p className="mt-1 text-sm">
                        {i + 1}. {q.question}
                      </p>
                      {q.options && (
                        <ol className="mt-1 list-decimal pl-5 text-xs text-muted-foreground">
                          {q.options.map((opt, oi) => (
                            <li key={oi}>{opt}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ))}
                </div>
              </ResultCard>
            )}

            {/* 学情分析 */}
            {result.analytics && (
              <ResultCard icon={BarChart3} accent="text-amber-500" title="班级学情分析">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="学生数" value={result.analytics.summary.totalStudents} />
                  <Stat label="平均掌握度" value={`${result.analytics.summary.averageMastery}%`} />
                  <Stat label="预警人数" value={result.analytics.summary.warningCount} />
                </div>
                {result.analytics.errorDistribution.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.analytics.errorDistribution.slice(0, 4).map((e) => (
                      <Badge key={e.name} variant="outline" className="text-xs">
                        {e.name} · {e.value}%
                      </Badge>
                    ))}
                  </div>
                )}
              </ResultCard>
            )}

            {/* 教师端汇总 */}
            {result.teacherSummary && (
              <ResultCard icon={ClipboardCheck} accent="text-purple-500" title="教师端汇总建议">
                <div className="space-y-2">
                  {result.teacherSummary.suggestions.map((s, i) => (
                    <div key={i} className="rounded-md border bg-background p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{s.tag}</Badge>
                        <span className="text-sm font-medium">{s.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
                    </div>
                  ))}
                  <p className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已同步至教师端学情看板
                  </p>
                </div>
              </ResultCard>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({
  icon: Icon,
  accent,
  title,
  children,
}: {
  icon: typeof HelpCircle;
  accent: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${accent}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}