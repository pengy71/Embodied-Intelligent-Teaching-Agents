"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { personalStats, aiTemplates, learningPath } from "@/lib/mock-data";
import Link from "next/link";
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
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Lightbulb,
  MessageCircle,
  Wrench,
};

export default function StudentAssistantPage() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedTemplate, setSelectedTemplate] = useState("inspiring");
  const [pace, setPace] = useState(50);
  const [depth, setDepth] = useState(50);

  const stats = personalStats;

  return (
    <div>
      <PageHeader title="AI学习助手" description="AI 结合学习进度和知识掌握情况，智能推荐学习内容">
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          刷新
        </Button>
      </PageHeader>

      {/* Quick Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
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
          <CardContent className="flex items-center gap-3 pt-5">
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
          <CardContent className="flex items-center gap-3 pt-5">
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
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.masteredPoints}/{stats.totalPoints}</p>
              <p className="text-xs text-muted-foreground">已掌握知识点</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
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
                    <CardDescription>根据你的学习画像和知识图谱智能生成</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground">
                  你在<span className="font-medium text-primary">卡尔曼滤波</span>上的掌握率已达到 85%，表现很好！
                  不过在<span className="font-medium text-destructive">Motion Planning</span>方面还有提升空间。
                  今天建议先巩固卡尔曼滤波相关概念，然后进入第三章 HTN 层级任务网络的学习。
                  记得完成配套练习来检验学习效果。
                </p>
                <div className="mt-6">
                  <Link href="/student/learn">
                    <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      <ChevronRight className="mr-1 h-5 w-5" />
                      开始今日学习
                    </Button>
                  </Link>
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
                {stats.weakPoints.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border p-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-medium text-destructive">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm">{p}</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      学习
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
                {stats.todayPlan.map((task, idx) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 transition-base ${
                      task.done ? "bg-success/5 border-success/20" : "hover:border-primary/30"
                    }`}
                  >
                    {task.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        <Badge
                          variant={task.type === "巩固" ? "secondary" : task.type === "新知" ? "default" : "outline"}
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
                    {!task.done && (
                      <Button size="sm">
                        {idx === 1 ? "开始学习" : "开始练习"}
                      </Button>
                    )}
                  </div>
                ))}
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
                  <p className="text-2xl font-bold">{learningPath.overallProgress}%</p>
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
                  <p className="text-2xl font-bold">{learningPath.estimatedDaysLeft}天</p>
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
                  <p className="text-lg font-bold">{learningPath.estimatedCompletion}</p>
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
                  <p className="text-2xl font-bold">{learningPath.currentPhase}</p>
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
                    <CardDescription>根据你的学习画像和知识图谱动态规划，随学习进展持续更新</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
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
                    {learningPath.phases.map((phase, idx) => {
                      const isCompleted = phase.status === "completed";
                      const isInProgress = phase.status === "in_progress";
                      const isNotStarted = phase.status === "not_started";

                      return (
                        <div key={phase.id} className="relative">
                          {/* Phase node */}
                          <div className="flex items-start gap-4">
                            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                              isCompleted
                                ? "border-success bg-success text-white"
                                : isInProgress
                                ? "border-primary bg-primary/10"
                                : "border-muted-foreground/30 bg-muted"
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : isInProgress ? (
                                <span className="text-sm font-bold text-primary">{idx + 1}</span>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">{idx + 1}</span>
                              )}
                            </div>

                            <div className={`flex-1 rounded-lg border p-4 ${
                              isInProgress ? "border-primary/30 bg-primary/5" : ""
                            }`}>
                              <div className="mb-2 flex items-center justify-between">
                                <h4 className={`text-sm font-semibold ${
                                  isNotStarted ? "text-muted-foreground" : ""
                                }`}>
                                  {phase.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  {isCompleted && (
                                    <Badge variant="default" className="text-xs">已完成</Badge>
                                  )}
                                  {isInProgress && (
                                    <Badge variant="default" className="text-xs">进行中</Badge>
                                  )}
                                  {isNotStarted && (
                                    <Badge variant="secondary" className="text-xs">未开始</Badge>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mb-3">
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">进度</span>
                                  <span className={`font-medium ${
                                    phase.progress === 100 ? "text-success" : phase.progress > 0 ? "text-primary" : "text-muted-foreground"
                                  }`}>
                                    {phase.progress}%
                                  </span>
                                </div>
                                <Progress
                                  value={phase.progress}
                                  
                                />
                              </div>

                              {/* Time info */}
                              <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                                {isCompleted && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      完成于 {phase.completedDate}
                                    </span>
                                    <span>预估 {phase.estimatedDays} 天 · 实际 {phase.actualDays} 天</span>
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
                                      node.status === "completed"
                                        ? "border-success/20 bg-success/5"
                                        : node.status === "in_progress"
                                        ? "border-primary/20 bg-primary/5"
                                        : node.status === "learning"
                                        ? "border-amber-200 bg-amber-50/50"
                                        : "border-border"
                                    }`}
                                  >
                                    {node.status === "completed" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                                    {node.status === "in_progress" && <Circle className="h-4 w-4 shrink-0 text-primary" />}
                                    {node.status === "learning" && <Circle className="h-4 w-4 shrink-0 text-amber-500" />}
                                    {node.status === "not_started" && <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />}
                                    <span className={`flex-1 ${
                                      node.status === "not_started" ? "text-muted-foreground" : ""
                                    }`}>
                                      {node.name}
                                    </span>
                                    <span className={`text-xs font-medium ${
                                      node.mastery >= 70 ? "text-success" : node.mastery >= 40 ? "text-warning" : node.mastery > 0 ? "text-destructive" : "text-muted-foreground"
                                    }`}>
                                      {node.mastery > 0 ? `${node.mastery}%` : "—"}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Current phase action */}
                              {isInProgress && (
                                <div className="mt-3 flex justify-end">
                                  <Button size="sm">
                                    继续学习
                                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
                  {learningPath.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        m.achieved ? "bg-success text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {m.achieved ? <CheckCircle2 className="h-4 w-4" /> : <Flag className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${m.achieved ? "font-medium" : "text-muted-foreground"}`}>{m.title}</p>
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
                      第三章掌握率偏低(38%)，建议先回顾第二章"世界模型"中 Dreamer 相关内容，
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
                      根据你近两周的学习速度，保持当前每日 2 小时的学习节奏，
                      预计可在 {learningPath.estimatedCompletion} 前完成全部课程。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Learning Report */}
        <TabsContent value="report" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">学习进度概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">总体进度</span>
                    <span className="font-medium">{Math.round((stats.masteredPoints / stats.totalPoints) * 100)}%</span>
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">章节掌握情况</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "第一章 环境感知", mastery: 75 },
                  { name: "第二章 世界模型", mastery: 48 },
                  { name: "第三章 任务规划", mastery: 38 },
                  { name: "第四章 多智能体", mastery: 32 },
                ].map((ch) => (
                  <div key={ch.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{ch.name}</span>
                      <span className={`font-medium ${ch.mastery >= 60 ? "text-success" : "text-warning"}`}>{ch.mastery}%</span>
                    </div>
                    <Progress
                      value={ch.mastery}
                     
                    />
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
              <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                <p className="mb-3">
                  <span className="font-medium text-foreground">学习状态：</span>
                  整体学习状态良好，连续学习 {stats.currentStreak} 天，学习习惯正在养成。本周学习时长 8.5 小时，
                  高于班级平均水平。
                </p>
                <p className="mb-3">
                  <span className="font-medium text-foreground">优势分析：</span>
                  在环境感知模块表现突出，特别是"相机模型与标定"和"目标检测"掌握率超过 78%，
                  具备扎实的感知基础。
                </p>
                <p className="mb-3">
                  <span className="font-medium text-foreground">改进建议：</span>
                  第三章任务规划掌握率偏低(38%)，建议：1) 先复习前置知识"世界模型"；
                  2) 结合仿真工具理解 RRT 算法；3) 增加练习量，当前该章节练习仅完成 3 题。
                </p>
                <p>
                  <span className="font-medium text-foreground">下周目标：</span>
                  完成第三章 3.1-3.2 的学习，掌握 HTN 和 RRT 核心概念，练习正确率提升至 80%。
                </p>
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
                    const isSelected = selectedTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl.id)}
                        className={`rounded-lg border p-4 text-left transition-base ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "hover:border-primary/30 hover:bg-accent/50"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
                    <span className="text-xs text-muted-foreground">{pace < 33 ? "循序渐进" : pace < 66 ? "标准" : "快速"}</span>
                  </div>
                  <Slider value={[pace]} onValueChange={(v) => setPace(v[0])} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm">内容深度</Label>
                    <span className="text-xs text-muted-foreground">{depth < 33 ? "基础" : depth < 66 ? "标准" : "深入"}</span>
                  </div>
                  <Slider value={[depth]} onValueChange={(v) => setDepth(v[0])} />
                </div>
                <div className="space-y-3 pt-2">
                  {[
                    { label: "案例类比", defaultChecked: true },
                    { label: "图示说明", defaultChecked: true },
                    { label: "代码示例", defaultChecked: false },
                    { label: "论文引用", defaultChecked: false },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <Label className="text-sm">{item.label}</Label>
                      <Switch defaultChecked={item.defaultChecked} />
                    </div>
                  ))}
                </div>
                <Button className="w-full">
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  保存设置
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic Evolution Info */}
          <Card className="mt-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI 动态演化
              </CardTitle>
              <CardDescription>你的 AI 教师会随学习行为持续调整</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "检测到多次要求'简单一点'", action: "自动降低内容深度，增加生活化案例", time: "3天前" },
                  { label: "代码相关练习正确率高", action: "增加代码示例与实验环节", time: "1周前" },
                  { label: "偏好图示解释", action: "回答中优先使用图示和流程图", time: "2周前" },
                ].map((ev, i) => (
                  <div key={i} className="rounded-lg border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-success" />
                      <span className="text-xs text-muted-foreground">{ev.time}</span>
                    </div>
                    <p className="text-sm font-medium">{ev.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ev.action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


