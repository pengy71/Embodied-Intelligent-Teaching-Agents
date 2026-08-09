"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardCheck,
  RefreshCw,
  Loader2,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeacherLoopSummary } from "@/lib/teaching/orchestration/teaching-loop-graph";

export function TeacherLoopCard() {
  const [summary, setSummary] = useState<TeacherLoopSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teaching/agent-loop/trace", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "加载闭环汇总失败");
      }
      setSummary((data.summary as TeacherLoopSummary | null) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载闭环汇总失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-purple-500" />
              多智能体协同闭环动态
            </CardTitle>
            <CardDescription>
              学生提问触发四智能体联动后的最新教师端汇总（答疑 → 导学/评测 → 学情分析 → 汇总）
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载最新闭环汇总…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-6 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : !summary ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Sparkles className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">暂无闭环记录</p>
            <p className="text-xs text-muted-foreground mt-1">
              学生在答疑中心发起“协同闭环”后，汇总建议将在此实时呈现
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <HelpCircle className="mr-1 h-3 w-3" />
                触发问题
              </Badge>
              <span className="text-sm font-medium">{summary.triggerQuestion}</span>
              {summary.triggerKnowledgePoint && (
                <Badge variant="secondary" className="text-xs">
                  {summary.triggerKnowledgePoint}
                </Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(summary.generatedAt).toLocaleString("zh-CN")}
              </span>
            </div>

            {summary.classSnapshot && (
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="学生数" value={summary.classSnapshot.totalStudents} />
                <MiniStat label="平均掌握度" value={`${summary.classSnapshot.averageMastery}%`} />
                <MiniStat label="预警人数" value={summary.classSnapshot.warningCount} />
              </div>
            )}

            {summary.suggestions.length > 0 && (
              <div className="space-y-2">
                {summary.suggestions.map((s, i) => (
                  <div key={i} className="rounded-md border bg-muted/30 p-2.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{s.tag}</Badge>
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.body}</p>
                  </div>
                ))}
              </div>
            )}

            {summary.studentSnapshot && summary.studentSnapshot.weakPoints.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">触发学生薄弱点：</span>
                {summary.studentSnapshot.weakPoints.map((w) => (
                  <Badge key={w.id} variant="outline" className="text-xs">
                    {w.title} · {w.mastery}%
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">{summary.closedLoop}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-background p-2 text-center">
      <div className="text-base font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}