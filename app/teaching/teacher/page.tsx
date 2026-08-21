'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  Target,
  ClipboardList,
} from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EChart } from '@/components/teaching/charts/echart';
import type { TeacherAnalyticsResult, TeacherAnalyticsStudent } from '@/lib/teaching/types';

const DEFAULT_RADAR = [
  { name: '环境感知', mastery: 0 },
  { name: '世界模型', mastery: 0 },
  { name: '任务规划', mastery: 0 },
  { name: '运动规划', mastery: 0 },
  { name: '操控控制', mastery: 0 },
  { name: '多智能体', mastery: 0 },
];

const DEFAULT_WEEKS = [
  { label: '第1周', count: 0 },
  { label: '第2周', count: 0 },
  { label: '第3周', count: 0 },
  { label: '第4周', count: 0 },
];

const DEFAULT_TEST = [
  { label: '优秀(90+)', value: 0 },
  { label: '良好(80-89)', value: 0 },
  { label: '及格(60-79)', value: 0 },
  { label: '不及格(<60)', value: 0 },
];

const DEFAULT_COMPLETION = [
  { label: '80-100%', value: 0 },
  { label: '60-79%', value: 0 },
  { label: '40-59%', value: 0 },
  { label: '<40%', value: 0 },
];

const DEFAULT_ERRORS = [
  { name: '操控控制', value: 0 },
  { name: '多智能体', value: 0 },
  { name: '运动规划', value: 0 },
  { name: '世界模型', value: 0 },
];

function statusBadge(status: TeacherAnalyticsStudent['status']) {
  switch (status) {
    case '优秀':
      return <Badge>优秀</Badge>;
    case '良好':
      return <Badge variant="secondary">良好</Badge>;
    case '及格':
      return <Badge variant="outline">及格</Badge>;
    case '预警':
      return <Badge variant="destructive">预警</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function TeacherOverviewPage() {
  const [analytics, setAnalytics] = useState<TeacherAnalyticsResult | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadAnalytics = async (force = false) => {
    setIsLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const response = force
        ? await fetch('/api/teaching/teacher-analytics', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ force: true }),
          })
        : await fetch('/api/teaching/teacher-analytics', { method: 'GET' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '学情分析 agent 调用失败');
      }
      const result = data.result as TeacherAnalyticsResult | null;
      if (result) {
        setAnalytics(result);
      }
    } catch (error) {
      if (force) {
        setAnalyticsError(error instanceof Error ? error.message : '学情分析 agent 调用失败');
      }
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    void loadAnalytics(false);
  }, []);

  const summary = analytics?.summary ?? {
    totalStudents: 0,
    activeToday: 0,
    averageProgress: 0,
    averageMastery: 0,
    warningCount: 0,
  };
  const activity = analytics?.activity ?? {
    totalEvents: 0,
    studyCount: 0,
    practiceCount: 0,
    qaCount: 0,
    quizCount: 0,
    reviewCount: 0,
  };
  const radarData = analytics?.radar.length ? analytics.radar : DEFAULT_RADAR;
  const completionData = analytics?.completionDistribution.length
    ? analytics.completionDistribution
    : DEFAULT_COMPLETION;
  const questionTrend = analytics?.questionTrend.length ? analytics.questionTrend : DEFAULT_WEEKS;
  const testDistribution = analytics?.testDistribution.length
    ? analytics.testDistribution
    : DEFAULT_TEST;
  const errorDistribution = analytics?.errorDistribution.length
    ? analytics.errorDistribution
    : DEFAULT_ERRORS;
  const students = analytics?.students ?? [];
  const hotQuestions = analytics?.hotQuestions ?? [];
  const warnings = analytics?.warningStudents ?? [];
  const suggestions = analytics?.suggestions ?? [];
  const exportCards = analytics?.exportCards ?? [];
  const chapters = analytics?.chapters ?? [];
  const generatedAt = analytics
    ? new Date(analytics.generatedAt).toLocaleString('zh-CN')
    : '等待生成';
  const modelString = analytics?.modelString ?? '未加载';

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: radarData.map((item) => ({ name: item.name, max: 100 })),
      axisName: { color: '#64748b', fontSize: 12 },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      splitArea: { areaStyle: { color: ['#f8fafc', 'transparent'] } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: radarData.map((item) => item.mastery),
            name: '班级平均',
            areaStyle: { color: 'rgba(59,130,246,0.15)' },
            lineStyle: { color: '#3b82f6', width: 2 },
            itemStyle: { color: '#3b82f6' },
          },
        ],
      },
    ],
  };

  const completionOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center', textStyle: { color: '#64748b', fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: completionData.map((item, index) => ({
          value: item.value,
          name: item.label,
          itemStyle: { color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index] },
        })),
      },
    ],
  };

  const questionTrendOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: questionTrend.map((item) => item.label),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        barWidth: '42%',
        data: questionTrend.map((item) => item.count),
        itemStyle: { borderRadius: [6, 6, 0, 0], color: '#8b5cf6' },
      },
    ],
  };

  const testOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center', textStyle: { color: '#64748b', fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '42%'],
        label: { show: false },
        labelLine: { show: false },
        data: testDistribution.map((item, index) => ({
          value: item.value,
          name: item.label,
          itemStyle: { color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index] },
        })),
      },
    ],
  };

  const errorOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    yAxis: {
      type: 'category',
      data: errorDistribution.map((item) => item.name),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        barWidth: '46%',
        data: errorDistribution.map((item) => item.value),
        itemStyle: { borderRadius: [0, 6, 6, 0], color: '#ef4444' },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader title="课程概览" description="实时掌握班级整体学习情况、知识掌握程度及薄弱知识点">
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAnalytics(true)}
          disabled={isLoadingAnalytics}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
          {isLoadingAnalytics ? '刷新中' : '刷新数据'}
        </Button>
        <Button asChild size="sm">
          <Link href="/teaching/teacher/tools">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            导出报告
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">模型 {modelString}</Badge>
        <span>最近生成：{generatedAt}</span>
        <span>班级数据与 LLM 分析均来自真实 PostgreSQL 与 GLM</span>
      </div>

      {analyticsError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            学情分析 agent 暂时不可用：{analyticsError}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          {
            label: '班级人数',
            value: summary.totalStudents,
            desc: `今日活跃 ${summary.activeToday}`,
            icon: Users,
            color: 'text-primary',
          },
          {
            label: '平均进度',
            value: `${summary.averageProgress}%`,
            desc: '学习完成度',
            icon: TrendingUp,
            color: 'text-emerald-600',
          },
          {
            label: '平均掌握率',
            value: `${summary.averageMastery}%`,
            desc: '知识点掌握',
            icon: Target,
            color: 'text-amber-600',
          },
          {
            label: '预警学生',
            value: summary.warningCount,
            desc: '需要关注',
            icon: AlertTriangle,
            color: 'text-rose-600',
          },
          {
            label: '练习记录',
            value: activity.practiceCount,
            desc: `问答 ${activity.qaCount}`,
            icon: ClipboardList,
            color: 'text-violet-600',
          },
          {
            label: '学习事件',
            value: activity.totalEvents,
            desc: `复习 ${activity.reviewCount}`,
            icon: BarChart3,
            color: 'text-sky-600',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-l-4 border-l-current/20">
              <CardContent className="flex min-h-28 items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 text-2xl font-bold">{item.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">知识掌握雷达图</CardTitle>
            <CardDescription>班级在各章节的平均掌握水平</CardDescription>
          </CardHeader>
          <CardContent>
            <EChart option={radarOption} style={{ height: 320 }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">学习完成度分布</CardTitle>
            <CardDescription>学生当前学习进度分层情况</CardDescription>
          </CardHeader>
          <CardContent>
            <EChart option={completionOption} style={{ height: 320 }} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">高频问题 Top 4</CardTitle>
            <CardDescription>学生最常提问的知识点与概念</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotQuestions.length > 0 ? (
              hotQuestions.map((question, index) => (
                <div
                  key={`${question.topic}-${index}`}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{question.topic}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {question.knowledgePoint}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {question.count} 次
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-muted-foreground">暂无问答数据</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">班级练习与测验分布</CardTitle>
            <CardDescription>练习、问答、测验、复习的行为统计</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">练习 {activity.practiceCount}</Badge>
              <Badge variant="outline">问答 {activity.qaCount}</Badge>
              <Badge variant="outline">测验 {activity.quizCount}</Badge>
              <Badge variant="outline">复习 {activity.reviewCount}</Badge>
              <Badge variant="outline">学习 {activity.studyCount}</Badge>
            </div>
            <EChart option={testOption} style={{ height: 260 }} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">共性薄弱知识点</CardTitle>
            <CardDescription>用于课堂教学调整的重点突破方向</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <EChart option={errorOption} style={{ height: 280 }} />
            <div className="space-y-2">
              {chapters.slice(0, 4).map((chapter) => (
                <div key={chapter.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{chapter.title}</p>
                    <Badge variant="secondary">{chapter.mastery}%</Badge>
                  </div>
                  <Progress value={chapter.mastery} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">教学建议</CardTitle>
            <CardDescription>结合班级共性弱点生成的课堂调整依据</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length > 0 ? (
              suggestions.map((item) => (
                <div key={item.title} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        item.tag === '重点讲解'
                          ? 'destructive'
                          : item.tag === '课堂讨论'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {item.tag}
                    </Badge>
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-muted-foreground">暂无可展示的教学建议</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">学生学习明细</CardTitle>
          <CardDescription>按个人维度查看完成度、掌握率、问答与练习数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {students.length > 0 ? (
            students.map((student) => (
              <div key={student.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{student.name}</p>
                      <span className="text-xs text-muted-foreground">{student.id}</span>
                      {statusBadge(student.status)}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      完成度 {student.completionRate}% | 掌握率 {student.mastery}% | 测验{' '}
                      {student.testScore} 分
                    </p>
                  </div>
                  {student.reason && <Badge variant="destructive">{student.reason}</Badge>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs text-muted-foreground">
                  <span>学习 {student.studyCount}</span>
                  <span>练习 {student.practiceCount}</span>
                  <span>问答 {student.qaCount}</span>
                  <span>测验 {student.quizCount}</span>
                </div>
                <Progress value={student.completionRate} className="mt-3 h-2" />
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-muted-foreground">暂无学生明细</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">预警学生</CardTitle>
            <CardDescription>需要重点关注的学生名单</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.length > 0 ? (
              warnings.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-rose-600">{student.progress}%</p>
                    <p className="text-xs text-muted-foreground">{student.reason ?? '需要关注'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-muted-foreground">暂无预警学生</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">报告导出</CardTitle>
            <CardDescription>用于课堂调整与阶段性汇报的分析视图</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {exportCards.length > 0 ? (
              exportCards.map((card) => (
                <div key={card.title} className="rounded-lg border p-3">
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
                </div>
              ))
            ) : (
              <p className="py-8 text-sm text-muted-foreground">暂无导出项</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">教学调整依据</CardTitle>
          <CardDescription>从共性薄弱知识点到课堂策略建议</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {chapters.slice(0, 3).map((chapter, index) => (
            <div key={chapter.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold">{chapter.title}</p>
              </div>
              <Progress value={chapter.mastery} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">平均掌握率 {chapter.mastery}%</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
