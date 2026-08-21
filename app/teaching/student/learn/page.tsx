'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useKnowledge } from '@/lib/teaching/use-knowledge';
import { useLearnSession, useStudentProgress } from '@/lib/teaching/use-learn';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Sparkles,
  Circle,
  AlertCircle,
  Play,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { FloatingQA } from '@/components/teaching/floating-qa';

const STEP_LABELS: Record<string, string> = {
  initializing: '初始化',
  researching: '检索资料',
  generating_outlines: '生成讲解大纲',
  generating_scenes: '生成讲解场景',
  generating_media: '生成配图',
  generating_tts: '生成语音',
  persisting: '保存课堂',
  completed: '完成',
  queued: '排队中',
  failed: '失败',
};

export default function LearnPage() {
  const knowledge = useKnowledge();
  const session = useLearnSession();
  const progress = useStudentProgress();

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const startedRef = useRef<string | null>(null);

  const { state, start, reset } = session;

  const allPoints = useMemo(() => {
    if (!knowledge.doc) return [];
    return knowledge.doc.chapters.flatMap((c) => c.sections.flatMap((s) => s.points));
  }, [knowledge.doc]);

  const selectedPoint = useMemo(
    () => allPoints.find((p) => p.id === selectedPointId) ?? null,
    [allPoints, selectedPointId],
  );

  function expandChapterOf(pointId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      const ch = knowledge.doc?.chapters.find((c) =>
        c.sections.some((s) => s.points.some((p) => p.id === pointId)),
      );
      if (ch) next.add(ch.id);
      return next;
    });
  }

  function toggleChapter(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectPoint(id: string) {
    if (id === selectedPointId) return;
    setSelectedPointId(id);
    expandChapterOf(id);
  }

  function handleRetry() {
    if (!selectedPointId) return;
    startedRef.current = null;
    reset();
    start(selectedPointId);
  }

  function handleMarkLearned() {
    if (!selectedPointId) return;
    void progress.markLearned(selectedPointId);
  }

  function handleRegenerate() {
    if (!selectedPointId) return;
    start(selectedPointId, { force: true });
  }

  // 选取起始知识点：?point= 参数 > 首个未学点 > 第一章首点
  useEffect(() => {
    if (selectedPointId || !knowledge.doc || allPoints.length === 0) return;
    const fromUrl =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('point')
        : null;
    const start =
      (fromUrl && allPoints.find((p) => p.id === fromUrl)) ||
      allPoints.find((p) => progress.progress[p.id]?.status !== 'learned') ||
      allPoints[0];
    setSelectedPointId(start.id);
    expandChapterOf(start.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPointId, knowledge.doc, allPoints, progress.progress]);

  // 选中知识点后自动发起多智能体讲解生成
  useEffect(() => {
    if (!selectedPointId) return;
    if (startedRef.current === selectedPointId) return;
    startedRef.current = selectedPointId;
    start(selectedPointId);
  }, [selectedPointId, start]);

  if (knowledge.error) {
    return (
      <div>
        <PageHeader title="知识点学习" description="基于知识图谱的多智能体 AI 辅导" />
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            知识库加载失败：{knowledge.error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!knowledge.doc) {
    return (
      <div>
        <PageHeader title="知识点学习" description="基于知识图谱的多智能体 AI 辅导" />
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载知识库…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="知识点学习" description="基于知识图谱的多智能体 AI 辅导" />
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* 左：知识点树 */}
        <Card className="w-full shrink-0 lg:w-80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              知识点
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              {knowledge.doc.chapters.map((chapter) => {
                const isOpen = expanded.has(chapter.id);
                const learnedCount = chapter.sections.reduce(
                  (sum, s) =>
                    sum +
                    s.points.filter((p) => progress.progress[p.id]?.status === 'learned').length,
                  0,
                );
                const totalCount = chapter.sections.reduce((sum, s) => sum + s.points.length, 0);
                return (
                  <div key={chapter.id}>
                    <button
                      type="button"
                      onClick={() => toggleChapter(chapter.id)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-muted"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="truncate">{chapter.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {learnedCount}/{totalCount}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="ml-3 border-l pl-2">
                        {chapter.sections.map((section) => (
                          <div key={section.id} className="py-0.5">
                            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                              {section.title}
                            </p>
                            {section.points.map((point) => {
                              const isLearned = progress.progress[point.id]?.status === 'learned';
                              const isSelected = selectedPointId === point.id;
                              return (
                                <button
                                  key={point.id}
                                  type="button"
                                  onClick={() => selectPoint(point.id)}
                                  className={cn(
                                    'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                                  )}
                                >
                                  {isLearned ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                                  )}
                                  <span className="truncate">{point.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 右：生成会话 */}
        <Card className="flex flex-1 flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{selectedPoint ? selectedPoint.title : 'AI 讲解'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPointId ? (
              <div className="flex h-[55vh] items-center justify-center text-sm text-muted-foreground">
                请从左侧选择一个知识点开始学习
              </div>
            ) : state.status === 'generating' ? (
              <div className="flex h-[55vh] flex-col items-center justify-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="text-base font-medium">
                    {(STEP_LABELS[state.step] ?? state.step) || '生成中'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {state.message || '正在生成多智能体讲解…'}
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <Progress value={state.progress} className="h-2" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {state.progress}%
                    {state.totalScenes
                      ? ` · ${state.scenesGenerated}/${state.totalScenes} 场景`
                      : ''}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  多智能体生成需多次调用大模型，约 1-2 分钟，请耐心等待
                </p>
              </div>
            ) : state.status === 'succeeded' ? (
              <div className="flex h-[55vh] flex-col items-center justify-center gap-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <div>
                  <p className="text-lg font-medium">讲解已生成</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    已生成 {state.scenesGenerated} 个场景的多智能体课堂讲解
                  </p>
                  {state.cached && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      已复用历史生成内容，点击「重新生成」可更新
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {state.classroomId && (
                    <Button asChild size="lg">
                      <Link href={`/classroom/${state.classroomId}`}>
                        <Play className="mr-1 h-4 w-4" />
                        进入课堂学习
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" size="lg" onClick={handleMarkLearned}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    标记已学完
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleRegenerate}>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    重新生成
                  </Button>
                </div>
              </div>
            ) : state.status === 'failed' ? (
              <div className="flex h-[55vh] flex-col items-center justify-center gap-4 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="text-base font-medium">生成失败</p>
                  <p className="mt-1 max-w-md whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {state.error}
                  </p>
                </div>
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="mr-1 h-4 w-4" />
                  重试
                </Button>
              </div>
            ) : (
              <div className="flex h-[55vh] items-center justify-center text-sm text-muted-foreground">
                正在准备讲解…
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <FloatingQA />
    </div>
  );
}
