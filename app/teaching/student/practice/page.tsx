"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  usePractice,
  type PracticeQuestion,
  type PracticeMode,
} from "@/lib/teaching/use-practice";
import { trackLearningEvent } from "@/lib/teaching/track-event";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";

const TAB_MODE: Record<string, PracticeMode> = {
  "ai-generate": "adaptive",
  chapter: "chapter",
  special: "special",
  test: "test",
};

const TAB_LABEL: Record<string, string> = {
  "ai-generate": "AI 智能练习",
  chapter: "章节练习",
  special: "专项练习",
  test: "阶段测试",
};

function modeDescription(mode: PracticeMode): string {
  if (mode === "adaptive") return "基于知识图谱与学习画像生成个性化练习，作答后自动记录学习行为";
  if (mode === "special") return "围绕高频易错点生成专项练习";
  if (mode === "test") return "按课程知识图谱顺序生成阶段测试";
  return "按章节知识图谱顺序生成练习";
}

export default function StudentPracticePage() {
  const [activeTab, setActiveTab] = useState("ai-generate");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const { generate, isLoading, error } = usePractice();

  const handleGenerate = async (tab: string) => {
    const mode = TAB_MODE[tab] ?? "adaptive";
    setQuestions(await generate(mode));
    setAnswers({});
    setShowResult(false);
  };

  const handleAnswer = (qid: string, idx: number) => {
    if (showResult) return;
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  };

  const handleSubmit = () => {
    setShowResult(true);
    for (const q of questions) {
      const userAns = answers[q.id];
      const correct = userAns === q.answer;
      void trackLearningEvent({
        eventType: "practice",
        knowledgeNodeId: q.pointId,
        score: userAns === undefined ? null : correct ? 100 : 0,
        durationMinutes: 2,
        payload: { question: q.question, answered: userAns !== undefined, correct },
      });
    }
  };

  const correctCount = questions.filter((q) => answers[q.id] === q.answer).length;
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const wrongQuestions = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== q.answer,
  );
  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const renderPractice = (tab: string) => {
    const mode = TAB_MODE[tab] ?? "adaptive";
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {TAB_LABEL[tab]}
              </CardTitle>
              <CardDescription>{modeDescription(mode)}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleGenerate(tab)} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isLoading ? "生成中..." : questions.length > 0 ? "重新生成" : "生成练习"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error.message}</p>}
          {questions.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
              点击&ldquo;生成练习&rdquo;开始作答，答题数据将反馈到你的学习画像
            </div>
          ) : !showResult ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                已生成 <span className="font-medium text-foreground">{questions.length}</span> 道题，已作答{" "}
                <span className="font-medium text-foreground">{answeredCount}</span> 道
              </div>
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{q.chapter}</Badge>
                        <Badge
                          variant={q.difficulty === "hard" ? "destructive" : q.difficulty === "medium" ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {q.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                  </div>
                  <div className="ml-9 space-y-2">
                    {q.options.map((opt, i) => {
                      const isSelected = answers[q.id] === i;
                      return (
                        <button
                          key={i}
                          onClick={() => handleAnswer(q.id, i)}
                          className={`flex w-full items-center gap-2.5 rounded-md border p-2.5 text-left text-sm transition-base ${
                            isSelected ? "border-primary bg-primary/5" : "hover:border-primary/30 hover:bg-accent/50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded text-xs ${
                              isSelected ? "bg-primary text-primary-foreground" : "border border-input"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAnswers({})}>清空作答</Button>
                <Button onClick={handleSubmit} disabled={answeredCount === 0}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  提交答案
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-success">{correctCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">答对</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-destructive">{questions.length - correctCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">答错/未答</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">正确率</p>
                </div>
              </div>
              {questions.map((q, idx) => {
                const correct = answers[q.id] === q.answer;
                return (
                  <div key={q.id} className={`rounded-lg border p-4 ${correct ? "border-success/30" : "border-destructive/30"}`}>
                    <div className="mb-2 flex items-start gap-2">
                      {correct ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, i) => {
                            const isAns = q.answer === i;
                            const userSelected = answers[q.id] === i;
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
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">解析：{q.explanation}</p>
                        <p className="mt-1 text-xs text-muted-foreground">知识点：{q.pointTitle}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowResult(false); setAnswers({}); }}>再做一次</Button>
                <Button onClick={() => handleGenerate(tab)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  换一批题
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <PageHeader title="练习测试" description="AI 根据你的知识掌握情况智能生成个性化练习，作答数据实时反馈到学习画像" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="ai-generate">AI生成练习</TabsTrigger>
          <TabsTrigger value="chapter">章节练习</TabsTrigger>
          <TabsTrigger value="special">专项练习</TabsTrigger>
          <TabsTrigger value="test">阶段测试</TabsTrigger>
          <TabsTrigger value="wrong">错题集</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-generate" className="mt-6">{renderPractice("ai-generate")}</TabsContent>
        <TabsContent value="chapter" className="mt-6">{renderPractice("chapter")}</TabsContent>
        <TabsContent value="special" className="mt-6">{renderPractice("special")}</TabsContent>
        <TabsContent value="test" className="mt-6">{renderPractice("test")}</TabsContent>

        <TabsContent value="wrong" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-destructive" />
                错题集
              </CardTitle>
              <CardDescription>本次练习中答错的题目，可针对性复习</CardDescription>
            </CardHeader>
            <CardContent>
              {wrongQuestions.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  暂无错题，去练习中作答后会自动汇总到这里
                </div>
              ) : (
                <div className="space-y-3">
                  {wrongQuestions.map((q, idx) => (
                    <div key={q.id} className="rounded-lg border border-destructive/30 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{q.chapter}</Badge>
                        <Badge variant="destructive" className="text-xs">答错</Badge>
                      </div>
                      <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
                      <p className="mt-2 text-xs text-muted-foreground">正确答案：{q.options[q.answer]}</p>
                      <p className="mt-1 text-xs text-muted-foreground">解析：{q.explanation}</p>
                      <p className="mt-1 text-xs text-muted-foreground">知识点：{q.pointTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}