import {
  getPoint,
  getPointChapter,
  getPointSection,
  getMistake,
  type KnowledgeDoc,
} from '@/lib/teaching/knowledge-doc';
import type { PointResourceExcerpt } from '@/lib/teaching/store';

export interface LearnContext {
  pointId: string;
  pointTitle: string;
  summary: string;
  chapterTitle: string;
  sectionTitle: string;
  prerequisites: { id: string; title: string }[];
  related: { id: string; title: string }[];
  mistakes: { title: string; wrong: string; right: string }[];
}

/** 从知识文档中提取某知识点的讲解上下文（章节/前置/关联/常见误区）。 */
export function buildLearnContext(doc: KnowledgeDoc, pointId: string): LearnContext | null {
  const point = getPoint(doc, pointId);
  if (!point) return null;
  const chapter = getPointChapter(doc, pointId);
  const section = getPointSection(doc, pointId);

  const resolve = (ids: string[] | undefined): { id: string; title: string }[] =>
    (ids ?? [])
      .map((id) => {
        const p = getPoint(doc, id);
        return p ? { id, title: p.title } : null;
      })
      .filter((x): x is { id: string; title: string } => x !== null);

  const mistakes = (point.mistakes ?? [])
    .map((id) => getMistake(doc, id))
    .filter((m) => m != null)
    .map((m) => ({ title: m!.title, wrong: m!.wrong, right: m!.right }));

  return {
    pointId,
    pointTitle: point.title,
    summary: point.summary ?? '',
    chapterTitle: chapter?.title ?? '',
    sectionTitle: section?.title ?? '',
    prerequisites: resolve(point.prerequisites),
    related: resolve(point.related),
    mistakes,
  };
}

/**
 * 组装 OpenMAIC 课堂生成的 requirement：把知识点上下文 + 资源摘录转成一段
 * 中文需求，驱动多智能体生成幻灯片与师生对话。
 */
export function buildLearnRequirement(
  ctx: LearnContext,
  resources: PointResourceExcerpt[],
): string {
  const lines: string[] = [];
  lines.push('请为具身智能课程生成一节多智能体课堂讲解（含幻灯片与师生多智能体对话）。');
  lines.push('');
  lines.push('## 讲解目标');
  lines.push(`知识点：${ctx.pointTitle}`);
  if (ctx.chapterTitle || ctx.sectionTitle) {
    lines.push(`所属：${[ctx.chapterTitle, ctx.sectionTitle].filter(Boolean).join(' / ')}`);
  }
  if (ctx.summary) {
    lines.push(`概述：${ctx.summary}`);
  }

  if (ctx.prerequisites.length > 0) {
    lines.push('');
    lines.push('## 前置知识');
    for (const p of ctx.prerequisites) lines.push(`- ${p.title}`);
  }

  if (ctx.related.length > 0) {
    lines.push('');
    lines.push('## 关联知识点');
    for (const r of ctx.related) lines.push(`- ${r.title}`);
  }

  if (ctx.mistakes.length > 0) {
    lines.push('');
    lines.push('## 常见误区（讲解中需主动澄清）');
    for (const m of ctx.mistakes) {
      lines.push(`- ${m.title}：错误认知——${m.wrong}；正确理解——${m.right}`);
    }
  }

  if (resources.length > 0) {
    lines.push('');
    lines.push('## 参考资料');
    for (const r of resources) {
      lines.push(`### ${r.name}（${r.type}）`);
      lines.push(r.excerpt);
      lines.push('');
    }
  }

  lines.push('## 要求');
  lines.push('- 用中文讲授。');
  lines.push('- 围绕该知识点系统讲解，联系前置与关联知识，帮助学生建立知识图谱。');
  lines.push('- 主动提示常见误区，帮助学生避免典型错误。');
  lines.push('- 生成多个场景（含幻灯片与师生多智能体对话），循序渐进地讲授。');
  return lines.join('\n');
}