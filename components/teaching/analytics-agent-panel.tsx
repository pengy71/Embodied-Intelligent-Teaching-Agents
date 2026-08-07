'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, AlertTriangle, Lightbulb, Activity } from 'lucide-react';

interface AnalyticsMetrics {
  activeStudents: number;
  completionRate: number;
  averageMastery: number;
  qaCount: number;
  practiceAttempts: number;
  averageScore: number;
}

interface ChapterStat {
  chapterId: string;
  chapter: string;
  completion: number;
  mastery: number;
  pointCount: number;
  weakPointCount: number;
}

interface WeakPoint {
  pointId: string;
  title: string;
  mastery: number;
  attempts: number;
}

interface AnalyticsData {
  generatedAt: string;
  metrics: AnalyticsMetrics;
  chapterStats: ChapterStat[];
  weakPoints: WeakPoint[];
  teachingSuggestions: string[];
  dataStatus: string;
  dataStatusLabel: string;
}

export function AnalyticsAgentPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/teaching/analytics', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Request failed (' + res.status + ')');
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json as AnalyticsData);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          正在加载学情分析数据...
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-destructive">
          <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
          学情分析加载失败：{error ?? '未知错误'}
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: '活跃学生', value: data.metrics.activeStudents, suffix: '人' },
    { label: '完成率', value: data.metrics.completionRate, suffix: '%' },
    { label: '平均掌握度', value: data.metrics.averageMastery, suffix: '%' },
    { label: '答疑数', value: data.metrics.qaCount, suffix: '次' },
    { label: '练习次数', value: data.metrics.practiceAttempts, suffix: '次' },
    { label: '平均成绩', value: data.metrics.averageScore, suffix: '分' },
  ];

  return (
    <div className="space-y-4">
      {data.dataStatusLabel ? (
        <Badge variant="secondary" className="text-xs">{data.dataStatusLabel}</Badge>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-2xl font-semibold">
                {item.value}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{item.suffix}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> 章节掌握情况
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.chapterStats.map((chapter) => (
            <div key={chapter.chapterId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{chapter.chapter}</span>
                <span className="text-muted-foreground">掌握 {chapter.mastery}% · 完成 {chapter.completion}%</span>
              </div>
              <Progress value={chapter.mastery} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" /> 薄弱知识点
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.weakPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无明显薄弱点。</p>
            ) : (
              data.weakPoints.map((point) => (
                <div key={point.pointId} className="flex items-center justify-between text-sm">
                  <span className="truncate">{point.title}</span>
                  <Badge variant="destructive" className="ml-2 text-xs">掌握 {point.mastery}%</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" /> AI 教学建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.teachingSuggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无建议。</p>
            ) : (
              data.teachingSuggestions.map((suggestion, index) => (
                <p key={index} className="text-sm">{index + 1}. {suggestion}</p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}