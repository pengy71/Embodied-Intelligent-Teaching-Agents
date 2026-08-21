'use client';

import { useMemo, useState } from 'react';
import {
  ChevronRight,
  Network,
  AlertTriangle,
  Link2,
  FlaskConical,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Layers,
  Loader2,
  CornerDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getPoint,
  getMistake,
  getChapterPointCount,
  getPointChapter,
  getPointSection,
  getModule,
  type KnowledgeDoc,
} from '@/lib/teaching/knowledge-doc';
import type { KnowledgeChapter, KnowledgeSection } from '@/lib/teaching/knowledge-system';
import { useChapterContent } from '@/lib/teaching/use-chapter-content';
import { ChapterContent } from '@/components/teaching/knowledge/chapter-content';
import { extractPointContent } from '@/lib/teaching/chapter-extract';

const PARTS = [
  '第一部分：导论与生物基础',
  '第二部分：控制与学习基础',
  '第三部分：学习范式与案例',
] as const;

function resolveSectionLabel(doc: KnowledgeDoc, sectionId: string): string {
  for (const c of doc.chapters) {
    const s = c.sections.find((x) => x.id === sectionId);
    if (s) return `第${c.number}章 · ${s.title}`;
  }
  return sectionId;
}

function RelationList({
  ids,
  doc,
  onSelect,
  emptyText,
}: {
  ids?: string[];
  doc: KnowledgeDoc;
  onSelect: (id: string) => void;
  emptyText: string;
}) {
  if (!ids || ids.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const p = getPoint(doc, id);
        const label = p ? p.title : resolveSectionLabel(doc, id);
        return (
          <button
            key={id}
            onClick={() => p && onSelect(id)}
            className={cn(
              'rounded-md border px-2 py-1 text-xs transition-colors',
              p ? 'hover:border-primary/40 hover:bg-primary/5' : 'border-dashed cursor-default',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PointDetail({
  pointId,
  doc,
  onSelect,
}: {
  pointId: string;
  doc: KnowledgeDoc;
  onSelect: (id: string) => void;
}) {
  const point = getPoint(doc, pointId);
  if (!point) return null;
  const chapter = getPointChapter(doc, pointId);
  const section = getPointSection(doc, pointId);
  const mistakes = (point.mistakes ?? []).map((id) => getMistake(doc, id)).filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {chapter && (
            <span>
              第{chapter.number}章 {chapter.title}
            </span>
          )}
          {section && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span>{section.title}</span>
            </>
          )}
        </div>
        <h3 className="mt-1 text-lg font-semibold">{point.title}</h3>
        {point.summary && <p className="mt-1 text-sm text-muted-foreground">{point.summary}</p>}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5" /> 前置依赖
          </div>
          <RelationList
            ids={point.prerequisites}
            doc={doc}
            onSelect={onSelect}
            emptyText="无前置依赖"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" /> 关联知识点
          </div>
          <RelationList ids={point.related} doc={doc} onSelect={onSelect} emptyText="暂无关联" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Network className="h-3.5 w-3.5" /> 案例关联
          </div>
          <RelationList ids={point.cases} doc={doc} onSelect={onSelect} emptyText="无案例关联" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" /> 实验关联
          </div>
          <RelationList
            ids={point.experiments}
            doc={doc}
            onSelect={onSelect}
            emptyText="无实验关联"
          />
        </div>
      </div>

      {mistakes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" /> 易错点
          </div>
          {mistakes.map((m) => (
            <div
              key={m!.id}
              className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-1.5"
            >
              <p className="text-sm font-medium text-amber-900">{m!.title}</p>
              <p className="text-xs text-red-600">
                <span className="font-medium">✗ 常见误区：</span>
                {m!.wrong}
              </p>
              <p className="text-xs text-emerald-700">
                <span className="font-medium">✓ 正确理解：</span>
                {m!.right}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterRow({
  chapter,
  doc,
  expandedChapters,
  expandedSections,
  selectedPoint,
  onToggleChapter,
  onToggleSection,
  onSelectPoint,
}: {
  chapter: KnowledgeChapter;
  doc: KnowledgeDoc;
  expandedChapters: Set<string>;
  expandedSections: Set<string>;
  selectedPoint: string | null;
  onToggleChapter: (id: string) => void;
  onToggleSection: (id: string) => void;
  onSelectPoint: (id: string) => void;
}) {
  const mod = getModule(doc, chapter.moduleId);
  const isExpanded = expandedChapters.has(chapter.id);
  const pointCount = getChapterPointCount(doc, chapter.id);

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => onToggleChapter(chapter.id)}
        className="flex w-full items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90',
          )}
        />
        <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: mod?.color }} />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              第{chapter.number}章 {chapter.title}
            </span>
            {chapter.isCaseStudy && (
              <Badge variant="secondary" className="text-[10px]">
                案例
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{chapter.summary}</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {pointCount} 知识点
        </Badge>
      </button>

      {isExpanded && (
        <div className="border-t">
          {chapter.sections.map((section, sectionIndex) => (
            <SectionRow
              key={section.id}
              section={section}
              chapterNumber={chapter.number}
              sectionNumber={sectionIndex + 1}
              isExpanded={expandedSections.has(section.id)}
              selectedPoint={selectedPoint}
              onToggle={() => onToggleSection(section.id)}
              onSelectPoint={onSelectPoint}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionRow({
  section,
  chapterNumber,
  sectionNumber,
  isExpanded,
  selectedPoint,
  onToggle,
  onSelectPoint,
}: {
  section: KnowledgeSection;
  chapterNumber: number;
  sectionNumber: number;
  isExpanded: boolean;
  selectedPoint: string | null;
  onToggle: () => void;
  onSelectPoint: (id: string) => void;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors"
      >
        <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90',
          )}
        />
        <span className="text-sm font-medium">
          {chapterNumber}.{sectionNumber} {section.title}
        </span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {section.points.length}
        </Badge>
      </button>
      {isExpanded && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 pl-12">
          {section.points.map((point) => {
            const hasRel =
              (point.prerequisites?.length ?? 0) +
                (point.related?.length ?? 0) +
                (point.cases?.length ?? 0) +
                (point.experiments?.length ?? 0) +
                (point.mistakes?.length ?? 0) >
              0;
            return (
              <button
                key={point.id}
                onClick={() => onSelectPoint(point.id)}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs transition-colors',
                  selectedPoint === point.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:border-primary/40 hover:bg-accent/50',
                )}
              >
                {point.title}
                {hasRel && <span className="ml-1 text-primary">·</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StructureSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2 flex h-[600px] items-center justify-center rounded-xl border bg-slate-50/50 text-sm text-muted-foreground">
        知识结构加载中…
      </div>
      <div className="lg:col-span-3 h-[600px] rounded-xl border bg-slate-50/50" />
    </div>
  );
}

function PointContentPanel({
  pointId,
  doc,
  onSelect,
}: {
  pointId: string;
  doc: KnowledgeDoc;
  onSelect: (id: string) => void;
}) {
  const point = getPoint(doc, pointId);
  const chapter = getPointChapter(doc, pointId);
  const { content, isLoading, error } = useChapterContent(chapter?.id);
  const pointMarkdown = useMemo(
    () => (content ? extractPointContent(content, pointId) : null),
    [content, pointId],
  );

  return (
    <ScrollArea className="h-[600px] pr-3">
      <div className="space-y-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 border-b pb-2">
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold">
              {chapter ? `第${chapter.number}章 · ${chapter.title}` : '章节原文'}
            </span>
            {point && (
              <Badge variant="secondary" className="ml-auto max-w-[50%] truncate text-[10px]">
                已选：{point.title}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载知识点原文…
            </div>
          ) : error ? (
            <p className="py-8 text-sm text-destructive">{error.message}</p>
          ) : pointMarkdown ? (
            <ChapterContent content={pointMarkdown} />
          ) : content ? (
            <ChapterContent content={content} />
          ) : (
            <p className="py-8 text-sm text-muted-foreground">该章节暂无原文内容。</p>
          )}
        </div>

        <details open className="group rounded-lg border bg-card p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
            <CornerDownRight className="h-4 w-4 text-muted-foreground" />
            知识点详情：关联关系与易错点
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 border-t pt-3">
            <PointDetail pointId={pointId} doc={doc} onSelect={onSelect} />
          </div>
        </details>
      </div>
    </ScrollArea>
  );
}

export function KnowledgeStructure({
  doc,
  onSelectPoint,
}: { doc?: KnowledgeDoc; onSelectPoint?: (id: string) => void } = {}) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['ch01']));
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['ch01-s2']));
  const [selectedPoint, setSelectedPointState] = useState<string | null>('ch01-1-2');
  const setSelectedPoint = (id: string | null) => {
    setSelectedPointState(id);
    if (id && onSelectPoint) onSelectPoint(id);
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  if (!doc) {
    return <StructureSkeleton />;
  }

  const hasSelected = selectedPoint ? Boolean(getPoint(doc, selectedPoint)) : false;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="h-4 w-4" />
          五级结构：章节 -&gt; 小节 -&gt; 知识点 -&gt; 关联知识点 -&gt; 易错点
          <span className="ml-auto text-xs">点击知识点查看关联关系</span>
        </div>
        <ScrollArea className="h-[600px] pr-3">
          <div className="space-y-4">
            {PARTS.map((part) => (
              <div key={part}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {part}
                </h3>
                <div className="space-y-2">
                  {doc.chapters
                    .filter((c) => c.part === part)
                    .map((chapter) => (
                      <ChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        doc={doc}
                        expandedChapters={expandedChapters}
                        expandedSections={expandedSections}
                        selectedPoint={selectedPoint}
                        onToggleChapter={(id) => toggle(expandedChapters, setExpandedChapters, id)}
                        onToggleSection={(id) => toggle(expandedSections, setExpandedSections, id)}
                        onSelectPoint={setSelectedPoint}
                      />
                    ))}
                </div>
              </div>
            ))}
            {doc.chapters.filter((c) => !PARTS.includes(c.part as (typeof PARTS)[number])).length >
              0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  补充资源
                </h3>
                <div className="space-y-2">
                  {doc.chapters
                    .filter((c) => !PARTS.includes(c.part as (typeof PARTS)[number]))
                    .map((chapter) => (
                      <ChapterRow
                        key={chapter.id}
                        chapter={chapter}
                        doc={doc}
                        expandedChapters={expandedChapters}
                        expandedSections={expandedSections}
                        selectedPoint={selectedPoint}
                        onToggleChapter={(id) => toggle(expandedChapters, setExpandedChapters, id)}
                        onToggleSection={(id) => toggle(expandedSections, setExpandedSections, id)}
                        onSelectPoint={setSelectedPoint}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="lg:col-span-3">
        <div className="sticky top-0">
          {selectedPoint && hasSelected ? (
            <PointContentPanel pointId={selectedPoint} doc={doc} onSelect={setSelectedPoint} />
          ) : (
            <div className="flex h-[600px] items-center justify-center rounded-lg border-2 border-dashed">
              <div className="text-center text-sm text-muted-foreground">
                <Lightbulb className="mx-auto mb-2 h-8 w-8 opacity-40" />
                选择左侧知识点查看原文内容
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
