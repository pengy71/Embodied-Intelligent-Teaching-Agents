"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  usePractice,
  useWeakPoints,
  useWrongQuestions,
  type PracticeQuestion,
  type PracticeMode,
  type GradedQuestion,
  type PracticeRound,
  type PracticeQuestionType,
  type PracticeDifficulty,
  type AttributionCause,
} from "@/lib/teaching/use-practice";
import { useKnowledge } from "@/lib/teaching/use-knowledge";
import { useStudentStageTests } from "@/lib/teaching/use-stage-tests";
import type { StageTest } from "@/lib/teaching/types";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Loader2,
  Lightbulb,
  Target,
  BookOpen,
  ClipboardList,
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

const TYPE_LABEL: Record<PracticeQuestionType, string> = {
  choice: "选择题",
  fill: "填空题",
  short: "简答题",
  case: "案例分析",
  algorithm: "算法设计",
};

const DIFF_LABEL: Record<PracticeDifficulty, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DIFF_VARIANT: Record<PracticeDifficulty, "destructive" | "outline" | "secondary"> = {
  easy: "secondary",
  medium: "outline",
  hard: "destructive",
};

const CAUSE_LABEL: Record<AttributionCause, string> = {
  "concept-confusion": "概念混淆",
  "formula-misuse": "公式误用",
  "logic-gap": "逻辑缺失",
  careless: "粗心失误",
  other: "其他",
};

function modeDescription(mode: PracticeMode): string {
  if (mode === "adaptive") return "基于知识图谱与学习画像生成个性化练习，提交后自动评阅与归因";
  if (mode === "chapter") return "选择章节后，AI 按该章节知识点生成针对性练习，巩固章节内容";
  if (mode === "special") return "AI 列出你的薄弱知识点，选择后围绕其开展专项训练";
  if (mode === "test") return "完成教师发布的阶段测试，成绩计入学情分析";
  return "按章节知识图谱顺序生成练习";
}

function correctAnswerText(q: PracticeQuestion): string {
  if (q.type === "choice") {
    const idx = typeof q.answer === "number" ? q.answer : 0;
    return q.options?.[idx] ?? "";
  }
  if (q.type === "fill") return (q.acceptableAnswers ?? []).join(" / ");
  return q.referenceAnswer ?? "";
}

function studentAnswerText(g: GradedQuestion): string {
  if (g.studentAnswer === null) return "（未作答）";
  if (g.question.type === "choice") {
    return g.question.options?.[Number(g.studentAnswer)] ?? String(g.studentAnswer);
  }
  return String(g.studentAnswer);
}

export default function StudentPracticePage() {
  const [activeTab, setActiveTab] = useState("ai-generate");
  const [roundId, setRoundId] = useState("");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [round, setRound] = useState<PracticeRound | null>(null);
  const [variantLoadingId, setVariantLoadingId] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<PracticeMode | null>(null);
  const [activeTest, setActiveTest] = useState<StageTest | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedWeakPointIds, setSelectedWeakPointIds] = useState<string[]>([]);

  const { generate, submit, generateVariants, isGenerating, isGrading, isGeneratingVariants, error } =
    usePractice();
  const knowledge = useKnowledge();
  const weak = useWeakPoints();
  const wrongQuestions = useWrongQuestions();
  const stageTests = useStudentStageTests();

  const chapters = knowledge.doc?.chapters ?? [];
  const chapterTitle = (id: string) => chapters.find((c) => c.id === id)?.title ?? id;

  const startSession = (result: { roundId: string; questions: PracticeQuestion[] }, mode: PracticeMode, test: StageTest | null) => {
    setRoundId(result.roundId);
    setQuestions(result.questions);
    setAnswers({});
    setRound(null);
    setSessionMode(mode);
    setActiveTest(test);
  };

  const handleGenerate = async (tab: string) => {
    const mode = TAB_MODE[tab] ?? "adaptive";
    if (mode === "chapter" && !selectedChapterId) return;
    if (mode === "special" && selectedWeakPointIds.length === 0) return;
    const opts =
      mode === "chapter"
        ? { chapterId: selectedChapterId }
        : mode === "special"
          ? { weakPointIds: selectedWeakPointIds }
          : {};
    const result = await generate(mode, opts);
    if (result.questions.length === 0) return;
    startSession(result, mode, null);
  };

  const startTest = async (test: StageTest) => {
    const result = await generate("test", { chapterIds: test.config.chapterIds, count: test.config.count });
    if (result.questions.length === 0) return;
    startSession(result, "test", test);
  };

  const clearTestSession = () => {
    setQuestions([]);
    setAnswers({});
    setRound(null);
    setSessionMode(null);
    setActiveTest(null);
    void stageTests.refresh();
  };

  const backToSetup = () => {
    setQuestions([]);
    setAnswers([]);
    setRound(null);
    setSessionMode(null);
    setActiveTest(null);
  };

  const handleAnswer = (qid: string, value: number | string) => {
    if (round) return;
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmit = async () => {
    const isTest = activeTest !== null;
    const result = await submit(
      roundId,
      questions,
      answers,
      isTest ? { eventType: "quiz", testId: activeTest?.id } : undefined,
    );
    if (result) {
      setRound(result);
      void wrongQuestions.refresh();
      if (isTest) void stageTests.refresh();
    }
  };

  const handleVariants = async (seed: PracticeQuestion) => {
    setVariantLoadingId(seed.id);
    const variants = await generateVariants(seed);
    setVariantLoadingId(null);
    if (variants.length > 0) {
      setRoundId("");
      setQuestions(variants);
      setAnswers({});
      setRound(null);
      setSessionMode("special");
      setActiveTest(null);
    }
  };

  const handleRegenerate = () => {
    if (activeTest) {
      void startTest(activeTest);
    } else {
      void handleGenerate(activeTab);
    }
  };

  const resetRound = () => {
    setRound(null);
    setAnswers({});
  };

  const toggleWeakPoint = (id: string) => {
    setSelectedWeakPointIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== "";
  }).length;
  const wrongGraded = wrongQuestions.wrongQuestions;

  const renderSetup = (tab: string) => {
    const mode = TAB_MODE[tab] ?? "adaptive";
    const Icon = mode === "chapter" ? BookOpen : mode === "special" ? Target : mode === "test" ? ClipboardList : Sparkles;
    const canGen =
      mode === "chapter" ? Boolean(selectedChapterId) : mode === "special" ? selectedWeakPointIds.length > 0 : true;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4 text-primary" />
                {TAB_LABEL[tab]}
              </CardTitle>
              <CardDescription>{modeDescription(mode)}</CardDescription>
            </div>
            {mode === "test" ? (
              <Button variant="outline" size="sm" onClick={() => stageTests.refresh()} disabled={stageTests.isLoading}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleGenerate(tab)} disabled={isGenerating || !canGen}>
                {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                {isGenerating ? "生成中..." : "生成练习"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error.message}</p>}
          {mode === "chapter" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {chapters.length === 0 && (
                <div className="col-span-full flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  {knowledge.isLoading ? "加载章节中…" : "暂无章节数据"}
                </div>
              )}
              {chapters.map((c) => {
                const selected = selectedChapterId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChapterId(c.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-base ${
                      selected ? "border-primary bg-primary/5" : "hover:border-primary/30 hover:bg-accent/50"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {c.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.part}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {mode === "special" && (
            <div className="space-y-2">
              {weak.isLoading && (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />加载薄弱知识点…
                </div>
              )}
              {!weak.isLoading && weak.weakPoints.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  暂无薄弱知识点数据
                </div>
              )}
              {weak.weakPoints.map((wp) => {
                const selected = selectedWeakPointIds.includes(wp.id);
                return (
                  <label
                    key={wp.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-base ${
                      selected ? "border-primary bg-primary/5" : "hover:border-primary/30 hover:bg-accent/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={selected}
                      onChange={() => toggleWeakPoint(wp.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{wp.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{wp.chapter}</span>
                    </span>
                    <Progress value={wp.mastery} className="h-1.5 w-20" />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      掌握{wp.mastery}%{wp.wrongCount > 0 ? ` · 错${wp.wrongCount}` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {mode === "test" && (
            <div className="space-y-3">
              {stageTests.isLoading && (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />加载阶段测试…
                </div>
              )}
              {!stageTests.isLoading && stageTests.tests.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  教师尚未发布阶段测试
                </div>
              )}
              {stageTests.tests.map((t) => (
                <div key={t.test.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.test.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.test.description || "阶段综合测试"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {t.test.config.chapterIds.length > 0 ? (
                          t.test.config.chapterIds.map((id) => (
                            <Badge key={id} variant="outline" className="text-xs">{chapterTitle(id)}</Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">全部章节</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{t.test.config.count} 题</Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {t.submitted ? (
                        <>
                          <p className="text-sm font-medium text-success">已完成</p>
                          <p className="text-xs text-muted-foreground">得分 {t.score}</p>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => startTest(t.test)} disabled={isGenerating}>
                          {isGenerating && activeTest?.id === t.test.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          开始测试
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {mode === "adaptive" && (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
              点击&ldquo;生成练习&rdquo;开始作答，提交后将获得评阅、错题归因与训练报告
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAnswering = (tab: string) => {
    const mode = TAB_MODE[tab] ?? "adaptive";
    const isTest = mode === "test";
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {isTest && activeTest ? activeTest.title : TAB_LABEL[tab]}
              </CardTitle>
              <CardDescription>
                已生成 {questions.length} 道题，已作答 {answeredCount} 道
              </CardDescription>
            </div>
            {isTest ? (
              <Button variant="outline" size="sm" onClick={clearTestSession}>返回列表</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={backToSetup}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  返回
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleGenerate(tab)} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  重新生成
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error.message}</p>}
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{q.chapter}</Badge>
                      <Badge variant="outline" className="text-xs">{TYPE_LABEL[q.type]}</Badge>
                      <Badge variant={DIFF_VARIANT[q.difficulty]} className="text-xs">{DIFF_LABEL[q.difficulty]}</Badge>
                    </div>
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                </div>
                <div className="ml-9 space-y-2">
                  {q.type === "choice" ? (
                    q.options?.map((opt, i) => {
                      const isSelected = answers[q.id] === i;
                      return (
                        <button
                          key={i}
                          onClick={() => handleAnswer(q.id, i)}
                          className={`flex w-full items-center gap-2.5 rounded-md border p-2.5 text-left text-sm transition-base ${
                            isSelected ? "border-primary bg-primary/5" : "hover:border-primary/30 hover:bg-accent/50"
                          }`}
                        >
                          <span className="font-medium">{String.fromCharCode(65 + i)}.</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })
                  ) : (
                    <textarea
                      value={String(answers[q.id] ?? "")}
                      onChange={(e) => handleAnswer(q.id, e.target.value)}
                      placeholder={q.type === "fill" ? "请输入答案" : "请输入作答…"}
                      rows={q.type === "fill" ? 2 : q.type === "short" ? 4 : 6}
                      className="w-full resize-y rounded-md border bg-background p-2.5 text-sm outline-none focus:border-primary"
                    />
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAnswers({})}>清空作答</Button>
              <Button onClick={handleSubmit} disabled={isGrading || answeredCount === 0}>
                {isGrading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                {isGrading ? "评阅中..." : "提交评阅"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGradedQuestion = (g: GradedQuestion, idx: number) => {
    const q = g.question;
    const isVariantLoading = isGeneratingVariants && variantLoadingId === q.id;
    return (
      <div key={q.id} className="rounded-lg border p-4">
        <div className="mb-3 flex items-start gap-3">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              g.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {idx + 1}
          </span>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">{q.chapter}</Badge>
              <Badge variant="outline" className="text-xs">{TYPE_LABEL[q.type]}</Badge>
              <Badge variant={DIFF_VARIANT[q.difficulty]} className="text-xs">{DIFF_LABEL[q.difficulty]}</Badge>
              <Badge variant={g.passed ? "secondary" : "destructive"} className="text-xs">
                {g.passed ? `正确 ${g.score}分` : `${g.score}分`}
              </Badge>
            </div>
            <p className="text-sm font-medium">{q.question}</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>你的作答：{studentAnswerText(g)}</p>
              <p>{q.type === "choice" || q.type === "fill" ? "正确答案" : "参考答案"}：{correctAnswerText(q)}</p>
              {g.feedback && <p className="text-foreground/80">评语：{g.feedback}</p>}
              <p>解析：{q.explanation}</p>
              <p>知识点：{q.pointTitle}</p>
            </div>
            {g.attribution && (
              <div className="mt-2 rounded-md border border-amber-200/50 bg-amber-50/40 p-2.5 text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{CAUSE_LABEL[g.attribution.cause]}</Badge>
                  <span className="font-medium text-foreground">错题归因</span>
                </div>
                <p className="text-muted-foreground">{g.attribution.explanation}</p>
              </div>
            )}
            {!g.passed && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => handleVariants(q)} disabled={isVariantLoading}>
                {isVariantLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                生成同类变式题
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    const r = round!.report;
    const stats = [
      { label: "得分", value: `${r.score}` },
      { label: "正确率", value: `${r.accuracy}%` },
      { label: "正确/总数", value: `${r.correctCount}/${r.questionCount}` },
      { label: "未作答", value: `${r.unansweredCount}` },
    ];
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            训练报告
          </CardTitle>
          <CardDescription>
            本轮练习 {r.questionCount} 题，得分 {r.score}，正确率 {r.accuracy}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">分题型掌握</p>
            <div className="space-y-1">
              {r.byType.filter((t) => t.total > 0).map((t) => (
                <div key={t.type} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0">{TYPE_LABEL[t.type]}</span>
                  <Progress value={t.accuracy} className="h-2 flex-1" />
                  <span className="w-16 shrink-0 text-right">{t.correct}/{t.total}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">分难度掌握</p>
            <div className="space-y-1">
              {r.byDifficulty.filter((d) => d.total > 0).map((d) => (
                <div key={d.difficulty} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0">{DIFF_LABEL[d.difficulty]}</span>
                  <Progress value={d.accuracy} className="h-2 flex-1" />
                  <span className="w-16 shrink-0 text-right">{d.correct}/{d.total}</span>
                </div>
              ))}
            </div>
          </div>
          {r.weakPoints.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">薄弱知识点</p>
              <div className="flex flex-wrap gap-2">
                {r.weakPoints.map((w) => (
                  <Badge key={w.pointId} variant="outline" className="text-xs">
                    {w.title}（错 {w.wrongCount}）
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {r.recommendations.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
                <Lightbulb className="h-3.5 w-3.5 text-primary" /> 学习建议
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {r.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderResult = () => {
    const isTest = activeTest !== null;
    return (
      <div className="space-y-6">
        {renderReport()}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              逐题评阅与归因
            </CardTitle>
            <CardDescription>主观题由 AI 自动评阅，错题附错误成因与复盘建议</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {round!.gradedQuestions.map((g, idx) => renderGradedQuestion(g, idx))}
            <div className="flex justify-end gap-2">
              {isTest ? (
                <Button variant="outline" onClick={clearTestSession}>返回测试列表</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={backToSetup}>
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                    返回
                  </Button>
                  <Button variant="outline" onClick={resetRound}>再做一次</Button>
                </>
              )}
              <Button onClick={handleRegenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                {isTest ? "再练一轮" : "换一批题"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPractice = (tab: string) => {
    const mode = TAB_MODE[tab] ?? "adaptive";
    const isSession = questions.length > 0 && sessionMode === mode;
    if (round && isSession) return renderResult();
    if (isSession) return renderAnswering(tab);
    return renderSetup(tab);
  };

  return (
    <div>
      <PageHeader
        title="练习测试"
        description="AI 基于课程知识库生成多题型练习，提交后自动评阅、错题归因并生成训练报告与变式题"
      />

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
              <CardDescription>历次练习与测试中做错的题目及归因，可针对性生成变式题强化</CardDescription>
            </CardHeader>
            <CardContent>
              {wrongQuestions.isLoading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />加载错题集…
                </div>
              ) : wrongGraded.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  {round ? "本轮无错题，继续保持！" : "暂无错题，去练习中作答并提交后会自动汇总到这里"}
                </div>
              ) : (
                <div className="space-y-4">
                  {wrongGraded.map((g, idx) => renderGradedQuestion(g, idx))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}