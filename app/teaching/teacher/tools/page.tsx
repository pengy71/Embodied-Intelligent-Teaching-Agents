"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EChart } from "@/components/teaching/charts/echart";
import { AnalyticsAgentPanel } from "@/components/teaching/analytics-agent-panel";
import { studentStats, courseStructure } from "@/lib/mock-data";
import {
  BarChart3,
  FileBarChart,
  MessageSquare,
  ClipboardCheck,
  AlertTriangle,
  Lightbulb,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Eye,
} from "lucide-react";

export default function TeacherToolsPage() {
  const [activeTab, setActiveTab] = useState("knowledge-analysis");

  // Knowledge mastery radar chart
  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: "环境感知", max: 100 },
        { name: "世界模型", max: 100 },
        { name: "任务规划", max: 100 },
        { name: "Motion Planning", max: 100 },
        { name: "Manipulation", max: 100 },
        { name: "强化学习", max: 100 },
        { name: "多智能体", max: 100 },
      ],
      axisName: { color: "#64748b", fontSize: 12 },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      splitArea: { areaStyle: { color: ["#f8fafc", "transparent"] } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [75, 48, 50, 35, 22, 50, 18],
            name: "班级平均",
            areaStyle: { color: "rgba(59,130,246,0.15)" },
            lineStyle: { color: "#3b82f6", width: 2 },
            itemStyle: { color: "#3b82f6" },
          },
        ],
      },
    ],
  };

  // Test distribution pie chart
  const pieOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, left: "center", textStyle: { color: "#64748b", fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["40%", "65%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: 18, name: "优秀(90+)", itemStyle: { color: "#10b981" } },
          { value: 42, name: "良好(80-89)", itemStyle: { color: "#3b82f6" } },
          { value: 48, name: "及格(60-79)", itemStyle: { color: "#f59e0b" } },
          { value: 20, name: "不及格(<60)", itemStyle: { color: "#ef4444" } },
        ],
      },
    ],
  };

  // Error distribution by chapter
  const errorBarOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#f1f5f9" } },
      axisLabel: { color: "#64748b", fontSize: 12 },
    },
    yAxis: {
      type: "category",
      data: ["Manipulation", "多智能体协同", "Motion Planning", "世界模型", "强化学习"],
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisLabel: { color: "#64748b", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: "50%",
        data: [68, 55, 48, 42, 38],
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: "#ef4444",
        },
      },
    ],
  };

  const mockStudents = [
    { name: "刘洋", id: "2024005", progress: 88, mastery: 85, qaCount: 42, testScore: 92, status: "优秀" },
    { name: "陈静", id: "2024006", progress: 82, mastery: 78, qaCount: 35, testScore: 87, status: "良好" },
    { name: "王浩", id: "2024007", progress: 75, mastery: 72, qaCount: 28, testScore: 81, status: "良好" },
    { name: "李雪", id: "2024008", progress: 68, mastery: 65, qaCount: 22, testScore: 76, status: "及格" },
    { name: "张明", id: "2024001", progress: 25, mastery: 30, qaCount: 5, testScore: 45, status: "预警" },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "优秀": return <Badge variant="default">{status}</Badge>;
      case "良好": return <Badge variant="default">{status}</Badge>;
      case "及格": return <Badge variant="outline">{status}</Badge>;
      case "预警": return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <PageHeader title="教学工具" description="AI 分析各章节知识点学习情况，辅助教师精准教学">
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          导出数据
        </Button>
      </PageHeader>

      <AnalyticsAgentPanel />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="knowledge-analysis">知识点分析</TabsTrigger>
          <TabsTrigger value="student-report">学生学习报告</TabsTrigger>
          <TabsTrigger value="qa-analysis">问答分析</TabsTrigger>
          <TabsTrigger value="test-analysis">测试分析</TabsTrigger>
          <TabsTrigger value="warning">学习预警</TabsTrigger>
          <TabsTrigger value="suggestions">教学建议</TabsTrigger>
          <TabsTrigger value="export">导出成绩</TabsTrigger>
        </TabsList>

        {/* Knowledge Point Analysis */}
        <TabsContent value="knowledge-analysis" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  知识掌握雷达图
                </CardTitle>
                <CardDescription>各核心模块的班级平均掌握情况</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={radarOption} style={{ height: "320px" }} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">章节知识点掌握详情</CardTitle>
                <CardDescription>逐章节分析知识点掌握程度</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[320px] overflow-y-auto">
                {courseStructure.chapters.map((ch) => {
                  const points = ch.sections.flatMap((s) => s.points);
                  const avg = Math.round(points.reduce((a, p) => a + p.mastery, 0) / points.length);
                  return (
                    <div key={ch.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{ch.title}</span>
                        <span className={`text-sm font-bold ${avg >= 60 ? "text-success" : "text-destructive"}`}>{avg}%</span>
                      </div>
                      <Progress value={avg} />
                      <div className="flex flex-wrap gap-1.5">
                        {points.slice(0, 4).map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">
                            {p.title}: {p.mastery}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Student Learning Report */}
        <TabsContent value="student-report" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-primary" />
                学生学习报告
              </CardTitle>
              <CardDescription>展示学生学习时长、进度、知识掌握、问答及评测情况</CardDescription>
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
                    {mockStudents.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{s.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Progress value={s.progress} className="w-20" />
                            <span className="text-sm">{s.progress}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">{s.mastery}%</td>
                        <td className="py-3 pr-4 text-sm">{s.qaCount}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-sm font-medium ${s.testScore >= 80 ? "text-success" : s.testScore >= 60 ? "text-warning" : "text-destructive"}`}>
                            {s.testScore}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{statusBadge(s.status)}</td>
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

        {/* Q&A Analysis */}
        <TabsContent value="qa-analysis" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  高频提问分析
                </CardTitle>
                <CardDescription>AI 汇总学生高频提问内容，分析共性疑难问题</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentStats.hotQuestions.map((q, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{q.topic}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">涉及知识点：环境感知</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{q.count}次</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">提问趋势</CardTitle>
                <CardDescription>近4周学生提问数量变化</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart
                  option={{
                    tooltip: { trigger: "axis" },
                    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
                    xAxis: {
                      type: "category",
                      data: ["第1周", "第2周", "第3周", "第4周"],
                      axisLine: { lineStyle: { color: "#e2e8f0" } },
                      axisLabel: { color: "#64748b", fontSize: 12 },
                    },
                    yAxis: {
                      type: "value",
                      splitLine: { lineStyle: { color: "#f1f5f9" } },
                      axisLabel: { color: "#64748b", fontSize: 12 },
                    },
                    series: [
                      {
                        type: "bar",
                        barWidth: "40%",
                        data: [85, 112, 96, 134],
                        itemStyle: { borderRadius: [6, 6, 0, 0], color: "#3b82f6" },
                      },
                    ],
                  }}
                  style={{ height: "260px" }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Analysis */}
        <TabsContent value="test-analysis" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">成绩分布</CardTitle>
                <CardDescription>本次阶段测试成绩分布统计</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={pieOption} style={{ height: "280px" }} />
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "优秀", value: 18, color: "text-success" },
                    { label: "良好", value: 42, color: "text-primary" },
                    { label: "及格", value: 48, color: "text-warning" },
                    { label: "不及格", value: 20, color: "text-destructive" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border p-2">
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">错题分布</CardTitle>
                <CardDescription>各章节错题率排行，识别共性薄弱点</CardDescription>
              </CardHeader>
              <CardContent>
                <EChart option={errorBarOption} style={{ height: "280px" }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Learning Warning */}
        <TabsContent value="warning" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                学习预警名单
              </CardTitle>
              <CardDescription>AI 自动识别学习进度滞后或知识掌握不足的学生</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentStats.warningStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-4 rounded-lg border border-rose-200/50 bg-rose-50/30 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-rose-100 text-rose-600">{s.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.id}</span>
                      <Badge variant="destructive">{s.reason}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">学习进度</span>
                        <Progress value={s.progress} className="w-24"  />
                        <span className="text-sm font-medium text-rose-600">{s.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">发送提醒</Button>
                    <Button size="sm">查看报告</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teaching Suggestions */}
        <TabsContent value="suggestions" className="mt-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI 教学优化建议
              </CardTitle>
              <CardDescription>基于学情数据生成教学优化建议，辅助调整教学内容和授课策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">重点讲解</Badge>
                  <h4 className="font-semibold">Manipulation 章节需加强</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  该章节平均掌握率仅 22%，错题率高达 68%。建议：1) 增加实物演示环节；
                  2) 拆解"抓取规划"为更细粒度的子知识点；3) 布置仿真实验作业加深理解。
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary">课堂讨论</Badge>
                  <h4 className="font-semibold">RRT 与 PRM 对比讨论</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  高频提问 38 次，建议安排 15 分钟课堂讨论。可提供仿真环境让学生分别使用
                  RRT 和 PRM 规划路径，直观对比两种算法的差异与适用场景。
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="default">差异化教学</Badge>
                  <h4 className="font-semibold">分层教学建议</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  优秀学生(18人)可布置拓展阅读 Dreamer V3 论文；良好及及格学生(90人)重点巩固
                  卡尔曼滤波与 PPO 算法；预警学生(20人)需从基础概念补起，建议安排助教辅导。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Grades */}
        <TabsContent value="export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                导出成绩
              </CardTitle>
              <CardDescription>导出学生学习成绩及相关统计数据</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { title: "完整成绩单", desc: "包含学习进度、掌握率、测试成绩等全部数据", icon: FileBarChart },
                  { title: "阶段测试报告", desc: "本次阶段测试的详细成绩与错题分析", icon: ClipboardCheck },
                  { title: "学习行为统计", desc: "学习时长、问答记录、练习完成情况", icon: BarChart3 },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border p-4 transition-base hover:border-primary/30 hover:shadow-sm">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="mb-1 text-sm font-semibold">{item.title}</h4>
                    <p className="mb-3 text-xs text-muted-foreground">{item.desc}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      导出 Excel
                    </Button>
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


