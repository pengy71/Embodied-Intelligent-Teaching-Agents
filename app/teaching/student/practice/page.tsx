"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { practiceQuestions, wrongQuestions, courseStructure } from "@/lib/mock-data";
import {
  Sparkles,
  BookOpen,
  Target,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Award,
  TrendingUp,
} from "lucide-react";

export default function StudentPracticePage() {
  const [activeTab, setActiveTab] = useState("ai-generate");
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (qId: number, optionIdx: number, isMulti: boolean) => {
    setAnswers((prev) => {
      if (isMulti) {
        const current = (prev[qId] as number[]) || [];
        const newAns = current.includes(optionIdx)
          ? current.filter((i) => i !== optionIdx)
          : [...current, optionIdx];
        return { ...prev, [qId]: newAns };
      }
      return { ...prev, [qId]: optionIdx };
    });
  };

  const isCorrect = (q: typeof practiceQuestions[0]) => {
    const ans = answers[q.id];
    if (ans === undefined) return false;
    if (q.type === "多选") {
      const correct = q.answer as number[];
      const userAns = (ans as number[]).sort();
      return correct.length === userAns.length && correct.every((v) => userAns.includes(v));
    }
    return ans === q.answer;
  };

  const correctCount = practiceQuestions.filter(isCorrect).length;

  return (
    <div>
      <PageHeader title="练习测试" description="AI 根据你的知识掌握情况智能生成个性化练习，实现精准训练" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ai-generate">AI生成练习</TabsTrigger>
          <TabsTrigger value="chapter">章节练习</TabsTrigger>
          <TabsTrigger value="special">专项练习</TabsTrigger>
          <TabsTrigger value="test">阶段测试</TabsTrigger>
          <TabsTrigger value="wrong">错题集</TabsTrigger>
        </TabsList>

        {/* AI Generated Practice */}
        <TabsContent value="ai-generate" className="mt-6">
          {!showResult ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI 智能练习
                    </CardTitle>
                    <CardDescription>基于你的薄弱知识点和学习画像生成专属练习</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    重新生成
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg border bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    AI 已为你生成 <span className="font-medium text-foreground">{practiceQuestions.length}</span> 道练习题，
                    重点覆盖：<span className="font-medium text-foreground">Motion Planning</span>、
                    <span className="font-medium text-foreground">强化学习</span> 等薄弱知识点
                  </p>
                </div>

                <div className="space-y-6">
                  {practiceQuestions.map((q, idx) => (
                    <div key={q.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{q.type}</Badge>
                            <Badge variant={q.difficulty === "较难" ? "destructive" : q.difficulty === "中等" ? "outline" : "secondary"} className="text-xs">
                              {q.difficulty}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{q.chapter}</span>
                          </div>
                          <p className="text-sm font-medium">{q.question}</p>
                        </div>
                      </div>
                      <div className="ml-9 space-y-2">
                        {q.options.map((opt, i) => {
                          const isSelected = q.type === "多选"
                            ? ((answers[q.id] as number[]) || []).includes(i)
                            : answers[q.id] === i;
                          return (
                            <button
                              key={i}
                              onClick={() => handleAnswer(q.id, i, q.type === "多选")}
                              className={`flex w-full items-center gap-2.5 rounded-md border p-2.5 text-left text-sm transition-base ${
                                isSelected ? "border-primary bg-primary/5" : "hover:border-primary/30 hover:bg-accent/50"
                              }`}
                            >
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs ${
                                isSelected ? "bg-primary text-primary-foreground" : "border border-input"
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline">保存草稿</Button>
                  <Button onClick={() => setShowResult(true)}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    提交答案
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-primary" />
                  练习结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-3xl font-bold text-success">{correctCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">答对</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-3xl font-bold text-destructive">{practiceQuestions.length - correctCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">答错</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{Math.round((correctCount / practiceQuestions.length) * 100)}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">正确率</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {practiceQuestions.map((q, idx) => {
                    const correct = isCorrect(q);
                    return (
                      <div key={q.id} className={`rounded-lg border p-4 ${correct ? "border-success/30" : "border-destructive/30"}`}>
                        <div className="mb-2 flex items-start gap-2">
                          {correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt, i) => {
                                const isAns = q.type === "多选" ? (q.answer as number[]).includes(i) : q.answer === i;
                                const userAns = answers[q.id];
                                const userSelected = q.type === "多选" ? ((userAns as number[]) || []).includes(i) : userAns === i;
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                                      isAns ? "bg-success/10 text-success" : userSelected ? "bg-destructive/10 text-destructive" : ""
                                    }`}
                                  >
                                    <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
                                    <span>{opt}</span>
                                    {isAns && <CheckCircle2 className="ml-auto h-3.5 w-3.5" />}
                                    {userSelected && !isAns && <XCircle className="ml-auto h-3.5 w-3.5" />}
                                  </div>
                                );
                              })}
                            </div>
                            {!correct && (
                              <div className="mt-2 rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">解析：</span>{q.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowResult(false); setAnswers({}); }}>
                    再练一次
                  </Button>
                  <Button>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    生成新练习
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chapter Practice */}
        <TabsContent value="chapter" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courseStructure.chapters.map((ch, idx) => {
              const pointCount = ch.sections.reduce((a, s) => a + s.points.length, 0);
              const mastery = [75, 48, 38, 32][idx];
              return (
                <Card key={ch.id} className="transition-base hover:border-primary/30 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline">{pointCount} 知识点</Badge>
                    </div>
                    <h4 className="mb-1 text-sm font-semibold">{ch.title}</h4>
                    <p className="mb-3 text-xs text-muted-foreground">{ch.sections.length} 个小节</p>
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">掌握率</span>
                        <span className="font-medium">{mastery}%</span>
                      </div>
                      <Progress value={mastery} />
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                      开始章节练习
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Special Practice */}
        <TabsContent value="special" className="mt-6">
          <Card className="mb-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">AI 检测到 4 个薄弱知识点</p>
                  <p className="text-xs text-muted-foreground">建议优先开展专项训练，强化重点与难点知识掌握</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Manipulation 抓取规划", mastery: 22, count: 8, difficulty: "较难" },
              { name: "MARL 协作策略", mastery: 18, count: 6, difficulty: "较难" },
              { name: "轨迹优化", mastery: 28, count: 5, difficulty: "中等" },
              { name: "Dreamer 模型", mastery: 30, count: 7, difficulty: "中等" },
            ].map((item) => (
              <Card key={item.name} className="transition-base hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{item.name}</h4>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">掌握率 {item.mastery}%</Badge>
                        <Badge variant="secondary" className="text-xs">{item.difficulty}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.count} 道题</span>
                    <Button size="sm">
                      <Target className="mr-1 h-3.5 w-3.5" />
                      专项训练
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Test */}
        <TabsContent value="test" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  阶段性测试
                </CardTitle>
                <CardDescription>检验学习成果，了解知识掌握水平</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "第一章 阶段测试", questions: 20, duration: "30分钟", status: "已完成", score: 85 },
                  { name: "第二章 阶段测试", questions: 15, duration: "25分钟", status: "未开始", score: null },
                  { name: "期中综合测试", questions: 50, duration: "90分钟", status: "未开始", score: null },
                ].map((test) => (
                  <div key={test.name} className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{test.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.duration}
                        </span>
                        <span>{test.questions} 题</span>
                      </div>
                    </div>
                    {test.status === "已完成" ? (
                      <div className="flex items-center gap-3">
                        <Badge variant="default">{test.score}分</Badge>
                        <Button variant="outline" size="sm">查看报告</Button>
                      </div>
                    ) : (
                      <Button size="sm">开始测试</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">测试统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">已完成测试</span>
                    <span className="text-xl font-bold">1</span>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">平均成绩</span>
                    <span className="text-xl font-bold text-success">85</span>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">班级排名</span>
                    <span className="text-xl font-bold text-primary">前 15%</span>
                  </div>
                </div>
                <div className="rounded-lg border bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">下次测试</p>
                  <p className="mt-1 text-sm font-medium">第二章阶段测试</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">建议复习后参加</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Wrong Questions */}
        <TabsContent value="wrong" className="mt-6">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wrongQuestions.length}</p>
                    <p className="text-xs text-muted-foreground">错题总数</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-xs text-muted-foreground">已巩固</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wrongQuestions.length}</p>
                    <p className="text-xs text-muted-foreground">待复习</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {wrongQuestions.map((wq) => (
              <Card key={wq.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{wq.chapter}</Badge>
                        <Badge variant="destructive" className="text-xs">{wq.wrongReason}</Badge>
                        <span className="text-xs text-muted-foreground">{wq.date}</span>
                      </div>
                      <p className="text-sm font-medium">{wq.question}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                          <p className="mb-0.5 text-xs font-medium text-destructive">你的答案</p>
                          <p className="text-xs text-muted-foreground">{wq.yourAnswer}</p>
                        </div>
                        <div className="rounded-md border border-success/20 bg-success/5 p-2.5">
                          <p className="mb-0.5 text-xs font-medium text-success">正确答案</p>
                          <p className="text-xs text-muted-foreground">{wq.correctAnswer}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      重做
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">AI 查漏补缺建议</p>
                  <p className="text-xs text-muted-foreground">
                    建议重点复习&ldquo;扩展卡尔曼滤波&rdquo;和&ldquo;PPO算法&rdquo;相关知识点，可通过知识图谱查看前置依赖关系
                  </p>
                </div>
                <Button size="sm">
                  <Target className="mr-1 h-3.5 w-3.5" />
                  专项练习
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

