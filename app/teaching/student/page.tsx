'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { personalStats, aiTemplates, learningPath } from '@/lib/mock-data';
import {
  STUDENT_ASSISTANT_STORAGE_KEY,
  defaultStudentAssistantPreferences,
  getDepthLabel,
  getPaceLabel,
  normalizeStudentAssistantPreferences,
  type StudentAssistantPreferences,
} from '@/lib/teaching/student-assistant';
import type { StudentGuidanceResult } from '@/lib/teaching/types';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Flame,
  TrendingUp,
  Target,
  CheckCircle2,
  Circle,
  Sparkles,
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Wrench,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Award,
  Map,
  Flag,
  Timer,
  ArrowRight,
  Download,
  Save,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Wrench,
};

export default function StudentAssistantPage() {
  const [activeTab, setActiveTab] = useState('today');
  const [guidance, setGuidance] = useState<StudentGuidanceResult | null>(null);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(true);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<StudentAssistantPreferences>(() => {
    if (typeof window === 'undefined') return defaultStudentAssistantPreferences;

    try {
      const saved = window.localStorage.getItem(STUDENT_ASSISTANT_STORAGE_KEY);
      return saved
        ? normalizeStudentAssistantPreferences(JSON.parse(saved))
        : defaultStudentAssistantPreferences;
    } catch {
      return defaultStudentAssistantPreferences;
    }
  });
  const [completedTaskIds, setCompletedTaskIds] = useState(
    () =>
      new Set(personalStats.todayPlan.filter((task) => task.done).map((task) => String(task.id))),
  );
  const [lastUpdated, setLastUpdated] = useState('加载中');
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const stats = guidance?.stats ?? {
    studyDays: personalStats.studyDays,
    totalHours: personalStats.totalHours,
    currentStreak: personalStats.currentStreak,
    masteredPoints: personalStats.masteredPoints,
    totalPoints: personalStats.totalPoints,
    overallProgress: Math.round((personalStats.masteredPoints / personalStats.totalPoints) * 100),
  };
  const todayPlan =
    guidance?.todayPlan ??
    personalStats.todayPlan.map((task) => ({
      ...task,
      id: String(task.id),
      reason: '',
      targetNodeId: '',
    }));
  const weakPoints = guidance?.weakPoints.map((point) => point.title) ?? personalStats.weakPoints;
  const path = guidance?.path ?? learningPath;
  const recommendedLearnPointId =
    todayPlan.find((task) => !task.done && task.type === '新知' && task.targetNodeId)
      ?.targetNodeId ??
    todayPlan.find((task) => !task.done && task.targetNodeId)?.targetNodeId ??
    '';
  const todayLearnHref = recommendedLearnPointId
    ? `/teaching/student/learn?point=${encodeURIComponent(recommendedLearnPointId)}`
    : '/teaching/student/learn';

  // 进入页面只读取数据库已存储的导学结果，不会调用大模型
  const loadStoredGuidance = async () => {
    setIsLoadingGuidance(true);
    try {
      const response = await fetch('/api/teaching/student-guidance', { method: 'GET' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '读取导学数据失败');
      }
      const result = (data.result as StudentGuidanceResult | null) ?? null;
      if (result) {
        setGuidance(result);
        setLastUpdated(new Date(result.generatedAt).toLocaleString('zh-CN'));
        setCompletedTaskIds(
          new Set(result.todayPlan.filter((task) => task.done).map((task) => task.id)),
        );
      } else {
        setLastUpdated('尚未生成');
      }
    } catch {
      setLastUpdated('尚未生成');
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  // 手动刷新时才调用大模型重新生成；失败时保留原有数据
  const regenerateGuidance = async () => {
    setIsLoadingGuidance(true);
    setGuidanceError(null);
    try {
      const response = await fetch('/api/teaching/student-guidance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '个性导学 agent 调用失败');
      }
      const result = data.result as StudentGuidanceResult;
      setGuidance(result);
      setLastUpdated(new Date(result.generatedAt).toLocaleString('zh-CN'));
      setCompletedTaskIds(
        new Set(result.todayPlan.filter((task) => task.done).map((task) => task.id)),
      );
      toast.success('个性导学 agent 已更新');
    } catch (error) {
      const message = error instanceof Error ? error.message : '个性导学 agent 调用失败';
      setGuidanceError(message);
      toast.error(message);
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  useEffect(() => {
    void loadStoredGuidance();
  }, []);

  // 从服务端读取该学生已保存的个性化偏好（服务端为准，失败时保留本地缓存）
  const loadServerPreferences = async () => {
    try {
      const response = await fetch('/api/teaching/student-preferences', { method: 'GET' });
      const data = await response.json();
      if (response.ok && data.success && data.preferences) {
        setPreferences(normalizeStudentAssistantPreferences(data.preferences));
      }
    } catch {
      // 服务端不可用或未登录时保留 localStorage 缓存
    }
  };

  useEffect(() => {
    void loadServerPreferences();
  }, []);

  const updatePreference = <K extends keyof StudentAssistantPreferences>(
    key: K,
    value: StudentAssistantPreferences[K],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const toggleTask = (taskId: string, checked: boolean) => {
    setCompletedTaskIds((current) => {
      const next = new Set(current);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
    toast.success(checked ? '任务已标记为完成' : '任务已恢复为待完成');
  };

  const refreshRecommendation = () => {
    void regenerateGuidance();
  };

  const savePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const response = await fetch('/api/teaching/student-preferences', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }
      // 服务端保存成功后同步本地缓存
      window.localStorage.setItem(STUDENT_ASSISTANT_STORAGE_KEY, JSON.stringify(data.preferences));
      toast.success('个性化设置已保存，正在按新风格重新生成导学建议');
      // 立即让 AI 以新风格重新生成导学结果
      if (guidance) {
        await regenerateGuidance();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '设置保存失败，请检查浏览器存储权限';
      toast.error(message);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div>
      <PageHeader title="AI学习助手" description="AI 结合学习进度和知识掌握情况，智能推荐学习内容">
        <Button
          variant="outline"
          size="sm"
          onClick={refreshRecommendation}
          disabled={isLoadingGuidance}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoadingGuidance ? 'animate-spin' : ''}`} />
          {isLoadingGuidance ? '生成中' : '刷新'}
        </Button>
      </PageHeader>

      {guidanceError && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            个性导学 agent 暂时不可用：{guidanceError}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex min-h-32 flex-col items-start gap-2 p-4 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-6 sm:pt-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.studyDays}</p>
              <p className="text-xs text-muted-foreground">累计学习天数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-32 flex-col items-start gap-2 p-4 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-6 sm:pt-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalHours}h</p>
              <p className="text-xs text-muted-foreground">总学习时长</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-32 flex-col items-start gap-2 p-4 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-6 sm:pt-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <Flame className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.currentStreak}</p>
              <p className="text-xs text-muted-foreground">连续学习天数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-h-32 flex-col items-start gap-2 p-4 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3 sm:p-6 sm:pt-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats.masteredPoints}/{stats.totalPoints}
              </p>
              <p className="text-xs text-muted-foreground">已掌握知识点</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="today">今日建议</TabsTrigger>
          <TabsTrigger value="path">学习路径</TabsTrigger>
          <TabsTrigger value="report">学习报告</TabsTrigger>
          <TabsTrigger value="personalize">个性化调整</TabsTrigger>
        </TabsList>

        {/* Today's Suggestion */}
        <TabsContent value="today" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* AI Suggestion Card */}
            <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">AI 导学寄语</CardTitle>
                    <CardDescription>
                      根据你的学习画像和知识图谱智能生成 · {lastUpdated}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground">
                  {guidance?.guidanceMessage ??
                    '正在结合学习画像、知识图谱和数据库学习记录生成导学建议。'}
                </p>
                {guidance?.portrait && (
                  <div className="mt-3 rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">多维度学情画像打分</span>
                      <Badge variant="secondary" className="text-xs">
                        {guidance.portrait.portraitScore} 分 · {guidance.portrait.level}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                      {guidance.portrait.dimensions.map((dim) => (
                        <div key={dim.key}>
                          <div className="text-sm font-semibold">{dim.score}</div>
                          <div className="text-[10px] text-muted-foreground">{dim.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {guidance?.modelString && (
                  <p className="mt-3 text-xs text-muted-foreground">模型：{guidance.modelString}</p>
                )}
                <div className="mt-6">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
                  >
                    <Link href={todayLearnHref}>
                      <ChevronRight className="mr-1 h-5 w-5" />
                      开始今日学习
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weak Points */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">薄弱知识点</CardTitle>
                <CardDescription>建议优先巩固</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakPoints.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border p-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-medium text-destructive">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">{p}</span>
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <Link href="/teaching/student/practice">巩固</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Today's Plan */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">今日学习路径</CardTitle>
              <CardDescription>AI 规划的最优学习顺序</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayPlan.map((task, idx) => {
                  const isDone = completedTaskIds.has(String(task.id));
                  const taskHref =
                    task.type === '新知'
                      ? '/teaching/student/resources'
                      : '/teaching/student/practice';

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                        isDone ? 'border-success/20 bg-success/5' : 'hover:border-primary/30'
                      }`}
                    >
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(checked) => toggleTask(String(task.id), checked === true)}
                        aria-label={`${isDone ? '恢复' : '完成'}${task.title}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {task.title}
                          </span>
                          <Badge
                            variant={
                              task.type === '巩固'
                                ? 'secondary'
                                : task.type === '新知'
                                  ? 'default'
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {task.type}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {task.chapter}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimated}
                          </span>
                        </div>
                      </div>
                      {!isDone && (
                        <Button asChild size="sm">
                          <Link href={taskHref}>{idx === 1 ? '开始学习' : '开始练习'}</Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Path */}
        <TabsContent value="path" className="mt-6">
          {/* Overview Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="flex items-center gap-3 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Map className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{path.overallProgress}%</p>
                  <p className="text-xs text-muted-foreground">整体进度</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="flex items-center gap-3 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
                  <Timer className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{path.estimatedDaysLeft}天</p>
                  <p className="text-xs text-muted-foreground">预计剩余时间</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="flex items-center gap-3 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{path.estimatedCompletion}</p>
                  <p className="text-xs text-muted-foreground">预计完成日期</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="flex items-center gap-3 pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
                  <Flag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{path.currentPhase}</p>
                  <p className="text-xs text-muted-foreground">当前阶段</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Path Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Map className="h-4 w-4 text-primary" />
                      AI 学习路径
                    </CardTitle>
                    <CardDescription>
                      根据你的学习画像和知识图谱动态规划，随学习进展持续更新
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={refreshRecommendation}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    刷新路径
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

                  <div className="space-y-6">
                    {path.phases.map((phase, idx) => {
                      const isCompleted = phase.status === 'completed';
                      const isInProgress = phase.status === 'in_progress';
                      const isNotStarted = phase.status === 'not_started';

                      return (
                        <div key={phase.id} className="relative">
                          {/* Phase node */}
                          <div className="flex items-start gap-4">
                            <div
                              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                                isCompleted
                                  ? 'border-success bg-success text-white'
                                  : isInProgress
                                    ? 'border-primary bg-primary/10'
                                    : 'border-muted-foreground/30 bg-muted'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : isInProgress ? (
                                <span className="text-sm font-bold text-primary">{idx + 1}</span>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">
                                  {idx + 1}
                                </span>
                              )}
                            </div>

                            <div
                              className={`flex-1 rounded-lg border p-4 ${isInProgress ? 'border-primary/30 bg-primary/5' : ''}`}
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <h4
                                  className={`text-sm font-semibold ${isNotStarted ? 'text-muted-foreground' : ''}`}
                                >
                                  {phase.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  {isCompleted && (
                                    <Badge variant="default" className="text-xs">
                                      已完成
                                    </Badge>
                                  )}
                                  {isInProgress && (
                                    <Badge variant="default" className="text-xs">
                                      进行中
                                    </Badge>
                                  )}
                                  {isNotStarted && (
                                    <Badge variant="secondary" className="text-xs">
                                      未开始
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mb-3">
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">进度</span>
                                  <span
                                    className={`font-medium ${
                                      phase.progress === 100
                                        ? 'text-success'
                                        : phase.progress > 0
                                          ? 'text-primary'
                                          : 'text-muted-foreground'
                                    }`}
                                  >
                                    {phase.progress}%
                                  </span>
                                </div>
                                <Progress value={phase.progress} />
                              </div>

                              {/* Time info */}
                              <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                                {isCompleted && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      完成于 {phase.completedDate}
                                    </span>
                                    <span>
                                      预估 {phase.estimatedDays} 天 · 实际 {phase.actualDays} 天
                                    </span>
                                  </>
                                )}
                                {isInProgress && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Timer className="h-3 w-3" />
                                      已学习 {phase.actualDays} 天 · 预估共 {phase.estimatedDays} 天
                                    </span>
                                  </>
                                )}
                                {isNotStarted && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    预估 {phase.estimatedDays} 天
                                  </span>
                                )}
                              </div>

                              {/* Sub-nodes */}
                              <div className="space-y-1.5">
                                {phase.nodes.map((node) => (
                                  <div
                                    key={node.name}
                                    className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm ${
                                      node.status === 'completed'
                                        ? 'border-success/20 bg-success/5'
                                        : node.status === 'in_progress'
                                          ? 'border-primary/20 bg-primary/5'
                                          : node.status === 'learning'
                                            ? 'border-amber-200 bg-amber-50/50'
                                            : 'border-border'
                                    }`}
                                  >
                                    {node.status === 'completed' && (
                                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                                    )}
                                    {node.status === 'in_progress' && (
                                      <Circle className="h-4 w-4 shrink-0 text-primary" />
                                    )}
                                    {node.status === 'learning' && (
                                      <Circle className="h-4 w-4 shrink-0 text-amber-500" />
                                    )}
                                    {node.status === 'not_started' && (
                                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                                    )}
                                    <span
                                      className={`flex-1 ${node.status === 'not_started' ? 'text-muted-foreground' : ''}`}
                                    >
                                      {node.name}
                                    </span>
                                    <span
                                      className={`text-xs font-medium ${
                                        node.mastery >= 70
                                          ? 'text-success'
                                          : node.mastery >= 40
                                            ? 'text-warning'
                                            : node.mastery > 0
                                              ? 'text-destructive'
                                              : 'text-muted-foreground'
                                      }`}
                                    >
                                      {node.mastery > 0 ? `${node.mastery}%` : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Current phase action */}
                              {isInProgress && (
                                <div className="mt-3 flex justify-end">
                                  <Button asChild size="sm">
                                    <Link href="/teaching/student/resources">
                                      继续学习
                                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                    </Link>
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestones & AI Insights */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Flag className="h-4 w-4 text-primary" />
                    学习里程碑
                  </CardTitle>
                  <CardDescription>关键节点与预计达成时间</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {path.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          m.achieved ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {m.achieved ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Flag className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm truncate ${m.achieved ? 'font-medium' : 'text-muted-foreground'}`}
                        >
                          {m.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.date}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI 路径优化建议
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium text-foreground">优先巩固前置知识</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      第三章掌握率偏低(38%)，建议先回顾第二章“世界模型”中 Dreamer 相关内容，
                      这是理解任务规划的前置基础。
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium text-foreground">增加练习频率</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      当前每周练习量偏少，建议将每周练习次数从 2 次提升至 4 次，
                      可加速薄弱知识点巩固，预计可提前 7 天完成课程。
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-medium text-foreground">节奏调整建议</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      根据你近两周的学习速度，保持当前每日 2 小时的学习节奏， 预计可在{' '}
                      {path.estimatedCompletion} 前完成全部课程。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Learning Report */}
        <TabsContent value="report" className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              报告基于最近 30 天学习、练习和问答数据生成
            </p>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              打印报告
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">学习进度概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">总体进度</span>
                    <span className="font-medium">
                      {Math.round((stats.masteredPoints / stats.totalPoints) * 100)}%
                    </span>
                  </div>
                  <Progress value={(stats.masteredPoints / stats.totalPoints) * 100} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-xs text-muted-foreground">本周学习</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">8.5h</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">练习正确率</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">76%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-muted-foreground">本月问答</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">{personalStats.recentQA.length} 次</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs text-muted-foreground">今日任务</span>
                    </div>
                    <p className="mt-1 text-lg font-bold">
                      {completedTaskIds.size}/{todayPlan.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">章节掌握情况</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: '第一章 环境感知', mastery: 75 },
                  { name: '第二章 世界模型', mastery: 48 },
                  { name: '第三章 任务规划', mastery: 38 },
                  { name: '第四章 多智能体', mastery: 32 },
                ].map((ch) => (
                  <div key={ch.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{ch.name}</span>
                      <span
                        className={`font-medium ${ch.mastery >= 60 ? 'text-success' : 'text-warning'}`}
                      >
                        {ch.mastery}%
                      </span>
                    </div>
                    <Progress value={ch.mastery} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">AI 综合学习报告</CardTitle>
              <CardDescription>AI 自动生成的个人学习分析</CardDescription>
            </CardHeader>
            <CardContent>
              {guidance?.report && (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                  <p className="mb-3">
                    <span className="font-medium text-foreground">学习状态：</span>
                    {guidance.report.status}
                  </p>
                  <p className="mb-3">
                    <span className="font-medium text-foreground">优势分析：</span>
                    {guidance.report.strengths}
                  </p>
                  <p className="mb-3">
                    <span className="font-medium text-foreground">改进建议：</span>
                    {guidance.report.improvements}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">下周目标：</span>
                    {guidance.report.nextWeekGoal}
                  </p>
                  <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs">学习投入评价</p>
                      <p className="mt-1 font-medium text-foreground">
                        {guidance.report.investmentLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs">知识掌握评价</p>
                      <p className="mt-1 font-medium text-foreground">
                        {guidance.report.masteryLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs">综合评语</p>
                      <p className="mt-1 font-medium text-foreground">
                        {guidance.report.overallComment}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div
                className={`rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground ${guidance?.report ? 'hidden' : ''}`}
              >
                <p className="mb-3">
                  <span className="font-medium text-foreground">学习状态：</span>
                  整体学习状态良好，连续学习 {stats.currentStreak}{' '}
                  天，学习习惯正在养成。本周学习时长 8.5 小时， 高于班级平均水平。
                </p>
                <p className="mb-3">
                  <span className="font-medium text-foreground">优势分析：</span>
                  在环境感知模块表现突出，特别是“相机模型与标定”和“目标检测”掌握率超过 78%，
                  具备扎实的感知基础。
                </p>
                <p className="mb-3">
                  <span className="font-medium text-foreground">改进建议：</span>
                  第三章任务规划掌握率偏低(38%)，建议：1) 先复习前置知识“世界模型”； 2)
                  结合仿真工具理解 RRT 算法；3) 增加练习量，当前该章节练习仅完成 3 题。
                </p>
                <p>
                  <span className="font-medium text-foreground">下周目标：</span>
                  完成第三章 3.1-3.2 的学习，掌握 HTN 和 RRT 核心概念，练习正确率提升至 80%。
                </p>
                <div className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs">学习投入评价</p>
                    <p className="mt-1 font-medium text-foreground">良好</p>
                  </div>
                  <div>
                    <p className="text-xs">知识掌握评价</p>
                    <p className="mt-1 font-medium text-foreground">稳步提升</p>
                  </div>
                  <div>
                    <p className="text-xs">综合评语</p>
                    <p className="mt-1 font-medium text-foreground">保持节奏，重点突破</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalization */}
        <TabsContent value="personalize" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* AI Template Selection */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">AI 教师模板</CardTitle>
                <CardDescription>选择适合你的教学风格，AI 会持续学习你的偏好</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiTemplates.map((tpl) => {
                    const Icon = iconMap[tpl.icon] || GraduationCap;
                    const isSelected = preferences.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => updatePreference('templateId', tpl.id)}
                        aria-pressed={isSelected}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:border-primary/30 hover:bg-accent/50'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </div>
                        <h4 className="text-sm font-semibold">{tpl.name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{tpl.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">适合：{tpl.suitable}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Fine-tuning */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">精细调整</CardTitle>
                <CardDescription>快速调整 AI 倾向</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm">教学节奏</Label>
                    <span className="text-xs text-muted-foreground">
                      {getPaceLabel(preferences.pace)}
                    </span>
                  </div>
                  <Slider
                    value={[preferences.pace]}
                    onValueChange={(value) => updatePreference('pace', value[0] ?? 50)}
                    aria-label="教学节奏"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm">内容深度</Label>
                    <span className="text-xs text-muted-foreground">
                      {getDepthLabel(preferences.depth)}
                    </span>
                  </div>
                  <Slider
                    value={[preferences.depth]}
                    onValueChange={(value) => updatePreference('depth', value[0] ?? 50)}
                    aria-label="内容深度"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="interaction-style" className="text-sm">
                      互动方式
                    </Label>
                    <Select
                      value={preferences.interactionStyle}
                      onValueChange={(value) =>
                        updatePreference(
                          'interactionStyle',
                          value as StudentAssistantPreferences['interactionStyle'],
                        )
                      }
                    >
                      <SelectTrigger id="interaction-style" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">直接讲解</SelectItem>
                        <SelectItem value="guided">提问引导</SelectItem>
                        <SelectItem value="socratic">启发思考</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-priority" className="text-sm">
                      资源呈现
                    </Label>
                    <Select
                      value={preferences.resourcePriority}
                      onValueChange={(value) =>
                        updatePreference(
                          'resourcePriority',
                          value as StudentAssistantPreferences['resourcePriority'],
                        )
                      }
                    >
                      <SelectTrigger id="resource-priority" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">均衡呈现</SelectItem>
                        <SelectItem value="visual">图示优先</SelectItem>
                        <SelectItem value="paper">论文优先</SelectItem>
                        <SelectItem value="practice">实验优先</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  {[
                    { key: 'analogy' as const, label: '案例类比' },
                    { key: 'diagram' as const, label: '图示说明' },
                    { key: 'code' as const, label: '代码示例' },
                    { key: 'citation' as const, label: '论文引用' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <Label htmlFor={`format-${item.key}`} className="text-sm">
                        {item.label}
                      </Label>
                      <Switch
                        id={`format-${item.key}`}
                        checked={preferences.formats[item.key]}
                        onCheckedChange={(checked) =>
                          updatePreference('formats', {
                            ...preferences.formats,
                            [item.key]: checked,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="auto-adapt" className="text-sm">
                      自动适应
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      允许 AI 根据学习行为微调风格
                    </p>
                  </div>
                  <Switch
                    id="auto-adapt"
                    checked={preferences.autoAdapt}
                    onCheckedChange={(checked) => updatePreference('autoAdapt', checked)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => void savePreferences()}
                  disabled={isSavingPreferences}
                >
                  <Save className={`mr-1.5 h-4 w-4 ${isSavingPreferences ? 'animate-spin' : ''}`} />
                  {isSavingPreferences ? '保存中' : '保存设置'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Evolution Info */}
          <Card className="mt-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI 动态演化
                </CardTitle>
                <Badge variant={preferences.autoAdapt ? 'default' : 'secondary'}>
                  {preferences.autoAdapt ? '自动运行' : '已暂停'}
                </Badge>
              </div>
              <CardDescription>你的 AI 教师会随学习行为持续调整</CardDescription>
            </CardHeader>
            <CardContent>
              {preferences.autoAdapt ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    guidance?.adaptationEvents ?? [
                      {
                        label: '等待个性导学 agent 读取学习事件',
                        action: '生成后会显示基于行为数据的风格调整',
                        time: '当前',
                      },
                    ]
                  ).map((event) => (
                    <div key={event.label} className="rounded-lg border bg-card p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-success" />
                        <span className="text-xs text-muted-foreground">{event.time}</span>
                      </div>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{event.action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                  自动适应已暂停。AI 将严格使用你当前保存的教学风格，不再根据行为自动调整。
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
