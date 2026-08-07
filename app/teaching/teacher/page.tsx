"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Download,
  BookOpen,
} from "lucide-react";

// 模拟数据
const stats = {
  totalStudents: 128,
  activeToday: 86,
  averageProgress: 62,
  averageMastery: 58,
  weakPoints: 12,
  hotQuestions: [
    { topic: "RRT与PRM路径规划算法的区别是什么？", count: 38 },
    { topic: "卡尔曼滤波的预测和更新步骤如何理解？", count: 32 },
    { topic: "多智能体协同中的通信协议有哪些？", count: 28 },
    { topic: "强化学习在机器人控制中的应用场景？", count: 25 },
  ],
  warningStudents: [
    { id: "2024001", name: "张三", reason: "连续3天未学习，进度严重滞后", progress: 25 },
    { id: "2024015", name: "李四", reason: "知识点掌握率低于40%", progress: 38 },
    { id: "2024028", name: "王五", reason: "多次练习未完成", progress: 42 },
  ],
};

export default function TeacherOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">课程概览</h1>
          <p className="text-muted-foreground">
            实时掌握班级整体学习情况、知识掌握程度及薄弱知识点
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            刷新数据
          </Button>
          <Button size="sm">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            导出报告
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center justify-between pt-4 pb-3 px-4">
            <div>
              <p className="text-sm text-muted-foreground">班级总人数</p>
              <p className="mt-0.5 text-2xl font-bold">{stats.totalStudents}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                今日活跃 <span className="font-medium text-emerald-600">{stats.activeToday}</span> 人
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center justify-between pt-4 pb-3 px-4">
            <div>
              <p className="text-sm text-muted-foreground">平均学习进度</p>
              <p className="mt-0.5 text-2xl font-bold">{stats.averageProgress}%</p>
              <p className="mt-0.5 flex items-center gap-0.5 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                +5.2% 较上周
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center justify-between pt-4 pb-3 px-4">
            <div>
              <p className="text-sm text-muted-foreground">平均知识掌握率</p>
              <p className="mt-0.5 text-2xl font-bold">{stats.averageMastery}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                薄弱知识点 <span className="font-medium text-amber-600">{stats.weakPoints}</span> 个
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="flex items-center justify-between pt-4 pb-3 px-4">
            <div>
              <p className="text-sm text-muted-foreground">预警学生</p>
              <p className="mt-0.5 text-2xl font-bold">{stats.warningStudents.length}</p>
              <p className="mt-0.5 text-xs text-rose-600">需要关注</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hot Questions */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              高频问题 Top 4
            </CardTitle>
            <CardDescription>学生最常提问的知识点</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {stats.hotQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border p-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm truncate">{q.topic}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{q.count}次</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Teaching Suggestions */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-base">AI 教学建议</CardTitle>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                重新生成
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2.5">
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge variant="destructive">重点讲解</Badge>
                <h4 className="text-sm font-semibold">Manipulation 抓取规划</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                掌握率仅 22%，建议实物演示辅助讲解，结合&ldquo;抓取姿态估计&rdquo;和&ldquo;力控反馈&rdquo;拆解式教学。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge variant="secondary">课堂讨论</Badge>
                <h4 className="text-sm font-semibold">RRT 与 PRM 对比讨论</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                被提问 38 次，建议从单查询 vs 多查询、适用场景、实时性等维度引导讨论。
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Badge variant="default">练习建议</Badge>
                <h4 className="text-sm font-semibold">卡尔曼滤波专项练习</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                建议布置 5 道计算题，涵盖状态预测、观测更新和协方差传播。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Warning Students */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              学习预警名单
            </CardTitle>
            <CardDescription>自动识别学习进度滞后或知识掌握不足的学生</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {stats.warningStudents.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-sm font-semibold text-white">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-rose-600">{s.progress}%</p>
                  <p className="text-xs text-muted-foreground">学习进度</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">查看详情</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
