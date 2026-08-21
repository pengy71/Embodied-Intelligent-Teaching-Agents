'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EChart } from '@/components/teaching/charts/echart';
import type { TeacherAnalyticsResult } from '@/lib/teaching/types';
import {
  AlertTriangle,
  Award,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Download,
  Eye,
  FileBarChart,
  Lightbulb,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeacherStageTests } from '@/lib/teaching/use-stage-tests';
import { useKnowledge } from '@/lib/teaching/use-knowledge';
import type { StageTestDifficulty, TeacherExportType } from '@/lib/teaching/types';
import { toast } from 'sonner';
import { exportBehaviorStats, exportGradeSheet, exportTestReport } from '@/lib/teaching/export';

const RADAR_LABELS = [
  '环境感知',
  '世界模型',
  '任务规划',
  'Motion Planning',
  'Manipulation',
  '强化学习',
  '多智能体',
];
const WEEK_LABELS = ['第1周', '第2周', '第3周', '第4周'];
const TEST_LABELS = ['优秀(90+)', '良好(80-89)', '及格(60-79)', '待提升(<60)'];
const ERROR_LABELS = ['Manipulation', '多智能体协同', 'Motion Planning', '世界模型', '强化学习'];

const DIFF_LABEL: Record<StageTestDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  mixed: '混合',
};

export default function TeacherToolsPage() {
  const [activeTab, setActiveTab] = useState('knowledge-analysis');
  const [analytics, setAnalytics] = useState<TeacherAnalyticsResult | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const stageTests = useTeacherStageTests();
  const knowledge = useKnowledge();
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testChapterIds, setTestChapterIds] = useState<string[]>([]);
  const [testCount, setTestCount] = useState(8);
  const [testDifficulty, setTestDifficulty] = useState<StageTestDifficulty>('mixed');
  const [publishing, setPublishing] = useState(false);

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

  const chapters = knowledge.doc?.chapters ?? [];
  const chapterLabel = (id: string) => chapters.find((c) => c.id === id)?.title ?? id;

  const toggleTestChapter = (id: string) => {
    setTestChapterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handlePublishTest = async () => {
    if (!testTitle.trim()) return;
    setPublishing(true);
    try {
      await stageTests.createTest({
        title: testTitle.trim(),
        description: testDesc.trim(),
        config: { chapterIds: testChapterIds, count: testCount, difficulty: testDifficulty },
      });
      setTestTitle('');
      setTestDesc('');
      setTestChapterIds([]);
      setTestCount(8);
      setTestDifficulty('mixed');
    } finally {
      setPublishing(false);
    }
  };

  const summary = analytics?.summary ?? {
    totalStudents: 0,
    activeToday: 0,
    averageProgress: 0,
    averageMastery: 0,
    warningCount: 0,
  };

  const radarData = analytics?.radar.length
    ? analytics.radar
    : RADAR_LABELS.map((name) => ({ name, mastery: 0 }));
  const chapterData = analytics?.chapters ?? [];
  const studentRows = analytics?.students ?? [];
  const hotQuestions = analytics?.hotQuestions ?? [];
  const questionTrend = analytics?.questionTrend.length
    ? analytics.questionTrend
    : WEEK_LABELS.map((label) => ({ label, count: 0 }));
  const testDistribution = analytics?.testDistribution.length
    ? analytics.testDistribution
    : TEST_LABELS.map((label) => ({ label, value: 0 }));
  const errorDistribution = analytics?.errorDistribution.length
    ? analytics.errorDistribution
    : ERROR_LABELS.map((name) => ({ name, value: 0 }));
  const warningStudents = analytics?.warningStudents ?? [];
  const suggestions = analytics?.suggestions ?? [];
  const exportCards = analytics?.exportCards ?? [];

  const handleExport = (type: TeacherExportType | undefined, index: number) => {
    if (!analytics) {
      toast.error('学情数据尚未生成，请先点击右上角“重新生成”');
      return;
    }
    const resolvedType: TeacherExportType =
      type ?? (['grade-sheet', 'test-report', 'behavior-stats'] as const)[index % 3];
    switch (resolvedType) {
      case 'grade-sheet':
        exportGradeSheet(analytics);
        break;
      case 'test-report':
        exportTestReport(analytics);
        break;
      case 'behavior-stats':
        exportBehaviorStats(analytics);
        break;
      default:
        toast.error('未知的导出类型');
        return;
    }
    toast.success('导出成功，已开始下载');
  };
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

  const questionTrendOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
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
        barWidth: '40%',
        data: questionTrend.map((item) => item.count),
        itemStyle: { borderRadius: [6, 6, 0, 0], color: '#3b82f6' },
      },
    ],
  };

  const testDistributionOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center', textStyle: { color: '#64748b', fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
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

  const errorDistributionOption = {
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
        barWidth: '50%',
        data: errorDistribution.map((item) => item.value),
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: '#ef4444',
        },
      },
    ],
  };

  const statusBadge = (status: TeacherAnalyticsResult['students'][number]['status']) => {
    switch (status) {
      case '优秀':
        return <Badge>{status}</Badge>;
      case '良好':
        return <Badge variant="secondary">{status}</Badge>;
      case '及格':
        return <Badge variant="outline">{status}</Badge>;
      case '预警':
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <PageHeader
        title="教学工具"
        description="基于 PostgreSQL 学情数据与 LLM 分析，实时生成班级与个人教学洞察。"
      >
        <Button variant="outline" size="sm" onClick={() => setActiveTab('export')}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          查看导出
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">模型 {modelString}</Badge>
        <span>最近生成：{generatedAt}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => loadAnalytics(true)}
          disabled={isLoadingAnalytics}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
          {isLoadingAnalytics ? '刷新中' : '重新生成'}
        </Button>
      </div>

      {analyticsError && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            学情分析 agent 暂时不可用：{analyticsError}
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: '学生总数', value: summary.totalStudents, icon: Users, color: 'text-primary' },
          {
            label: '今日活跃',
            value: summary.activeToday,
            icon: TrendingUp,
            color: 'text-emerald-600',
          },
          {
            label: '平均进度',
            value: `${summary.averageProgress}%`,
            icon: BarChart3,
            color: 'text-blue-600',
          },
          {
            label: '平均掌握率',
            value: `${summary.averageMastery}%`,
            icon: Award,
            color: 'text-amber-600',
          },
          {
            label: '预警人数',
            value: summary.warningCount,
            icon: AlertTriangle,
            color: 'text-rose-600',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex min-h-28 items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="knowledge-analysis">知识点分析</TabsTrigger>
          <TabsTrigger value="student-report">学生学情</TabsTrigger>
          <TabsTrigger value="qa-analysis">问答分析</TabsTrigger>
          <TabsTrigger value="test-analysis">测试分析</TabsTrigger>
          <TabsTrigger value="stage-test">阶段测试</TabsTrigger>
          <TabsTrigger value="warning">学习预警</TabsTrigger>
          <TabsTrigger value="suggestions">教学建议</TabsTrigger>
          <TabsTrigger value="export">导出成绩</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge-analysis" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  知识掌握雷达
                </CardTitle>
                <CardDescription>班级在核心知识维度上的平均掌握情况</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={radarOption} style={{ height: '320px' }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">章节掌握明细</CardTitle>
                <CardDescription>按章节汇总知识点掌握率与薄弱项</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[320px] overflow-y-auto">
                {chapterData.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    正在生成章节分析...
                  </div>
                )}
                {chapterData.map((chapter) => (
                  <div key={chapter.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{chapter.title}</span>
                      <span
                        className={`text-sm font-bold ${chapter.mastery >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}
                      >
                        {chapter.mastery}%
                      </span>
                    </div>
                    <Progress value={chapter.mastery} />
                    <div className="flex flex-wrap gap-1.5">
                      {chapter.points.slice(0, 4).map((point) => (
                        <Badge key={point.id} variant="outline" className="text-xs">
                          {point.title}: {point.mastery}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="student-report" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-4 w-4 text-primary" />
                学生学情报告
              </CardTitle>
              <CardDescription>展示学习进度、掌握率、问答与测验表现</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">学生</th>
                      <th className="pb-3 pr-4 font-medium">学习进度</th>
                      <th className="pb-3 pr-4 font-medium">掌握率</th>
                      <th className="pb-3 pr-4 font-medium">问答数</th>
                      <th className="pb-3 pr-4 font-medium">测试成绩</th>
                      <th className="pb-3 pr-4 font-medium">状态</th>
                      <th className="pb-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.length === 0 && (
                      <tr>
                        <td className="py-6 text-sm text-muted-foreground" colSpan={7}>
                          正在生成学生学情...
                        </td>
                      </tr>
                    )}
                    {studentRows.map((student) => (
                      <tr key={student.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {student.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Progress value={student.progress} className="w-20" />
                            <span className="text-sm">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">{student.mastery}%</td>
                        <td className="py-3 pr-4 text-sm">{student.qaCount}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`text-sm font-medium ${
                              student.testScore >= 80
                                ? 'text-emerald-600'
                                : student.testScore >= 60
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                            }`}
                          >
                            {student.testScore}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="space-y-1">
                            {statusBadge(student.status)}
                            {student.reason && (
                              <p className="text-xs text-muted-foreground">{student.reason}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            详情
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa-analysis" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  高频提问分析
                </CardTitle>
                <CardDescription>提取班级中重复出现的疑难点</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hotQuestions.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    正在统计高频问题...
                  </div>
                )}
                {hotQuestions.map((question, index) => (
                  <div key={`${question.topic}-${index}`} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{question.topic}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            关联知识点：{question.knowledgePoint}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{question.count} 次</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">提问趋势</CardTitle>
                <CardDescription>最近四周学生提问量变化</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={questionTrendOption} style={{ height: '260px' }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="test-analysis" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">成绩分布</CardTitle>
                <CardDescription>本阶段测验成绩区间统计</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={testDistributionOption} style={{ height: '280px' }} />
                <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  {testDistribution.map((item) => (
                    <div key={item.label} className="rounded-lg border p-2">
                      <p className="text-lg font-bold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">错误分布</CardTitle>
                <CardDescription>找出章节中错题率最高的知识点</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={errorDistributionOption} style={{ height: '280px' }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stage-test" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  发布阶段测试
                </CardTitle>
                <CardDescription>选择章节范围与难度，发布后学生端即可参加测试</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stageTests.error && (
                  <p className="text-xs text-destructive">{stageTests.error.message}</p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="test-title">测试标题</Label>
                  <Input
                    id="test-title"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="例如：第一阶段综合测试"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="test-desc">测试说明</Label>
                  <textarea
                    id="test-desc"
                    value={testDesc}
                    onChange={(e) => setTestDesc(e.target.value)}
                    placeholder="可选：测试范围、注意事项等"
                    className="min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>章节范围</Label>
                  <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-md border p-2">
                    {knowledge.isLoading && (
                      <span className="text-xs text-muted-foreground">加载章节中…</span>
                    )}
                    {!knowledge.isLoading && chapters.length === 0 && (
                      <span className="text-xs text-muted-foreground">暂无章节数据</span>
                    )}
                    {chapters.map((c) => {
                      const checked = testChapterIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={checked}
                            onChange={() => toggleTestChapter(c.id)}
                          />
                          <span className="truncate">
                            第{c.number}章 {c.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="test-count">题目数量</Label>
                    <Input
                      id="test-count"
                      type="number"
                      min={1}
                      max={15}
                      value={testCount}
                      onChange={(e) =>
                        setTestCount(Math.min(Math.max(Number(e.target.value) || 1, 1), 15))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="test-difficulty">难度</Label>
                    <select
                      id="test-difficulty"
                      value={testDifficulty}
                      onChange={(e) => setTestDifficulty(e.target.value as StageTestDifficulty)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="easy">简单</option>
                      <option value="medium">中等</option>
                      <option value="hard">困难</option>
                      <option value="mixed">混合</option>
                    </select>
                  </div>
                </div>
                <Button onClick={handlePublishTest} disabled={publishing || !testTitle.trim()}>
                  {publishing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {publishing ? '发布中' : '发布测试'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">已发布测试</CardTitle>
                <CardDescription>学生提交后成绩自动计入测试分析</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageTests.isLoading && <p className="text-sm text-muted-foreground">加载中…</p>}
                {!stageTests.isLoading && stageTests.tests.length === 0 && (
                  <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                    尚未发布任何阶段测试
                  </div>
                )}
                {stageTests.tests.map((t) => (
                  <div key={t.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{t.title}</p>
                        {t.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="outline">{t.config.count}题</Badge>
                          <Badge variant="outline">{DIFF_LABEL[t.config.difficulty]}</Badge>
                          {t.config.chapterIds.length > 0 ? (
                            t.config.chapterIds.map((id) => (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {chapterLabel(id)}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              全部章节
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          发布于 {new Date(t.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void stageTests.removeTest(t.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warning" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                学习预警名单
              </CardTitle>
              <CardDescription>自动识别学习进度滞后或掌握率不足的学生</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {warningStudents.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  当前没有预警学生。
                </div>
              )}
              {warningStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-4 rounded-lg border border-rose-200/50 bg-rose-50/30 p-4 lg:flex-row lg:items-center"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-rose-100 text-rose-600">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{student.name}</span>
                      <span className="text-xs text-muted-foreground">{student.id}</span>
                      {student.reason && <Badge variant="destructive">{student.reason}</Badge>}
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">学习进度</span>
                        <Progress value={student.progress} className="w-24" />
                        <span className="text-sm font-medium text-rose-600">
                          {student.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      发送提醒
                    </Button>
                    <Button size="sm">查看报告</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="mt-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI 教学建议
              </CardTitle>
              <CardDescription>结合班级学情自动生成可直接执行的教学建议</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions.length === 0 && (
                <div className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
                  正在生成教学建议...
                </div>
              )}
              {suggestions.map((suggestion) => (
                <div
                  key={`${suggestion.tag}-${suggestion.title}`}
                  className="rounded-lg border bg-card p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">{suggestion.tag}</Badge>
                    <h4 className="font-semibold">{suggestion.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{suggestion.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                导出成绩
              </CardTitle>
              <CardDescription>将学情结果导出为成绩单、测试报告或行为统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {exportCards.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    正在准备导出内容...
                  </div>
                )}
                {exportCards.map((item, index) => {
                  const Icon = [FileBarChart, ClipboardCheck, BarChart3][index % 3];
                  return (
                    <div
                      key={item.title}
                      className="rounded-lg border p-4 transition-shadow hover:shadow-sm"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="mb-1 text-sm font-semibold">{item.title}</h4>
                      <p className="mb-3 text-xs text-muted-foreground">{item.desc}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleExport(item.type, index)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        导出
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
