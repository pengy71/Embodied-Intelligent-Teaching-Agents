import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  loadKnowledge,
  withKnowledgeTx,
  saveKnowledgeInTx,
  isTeachingStoreConfigured,
} from '@/lib/teaching/store';
import { buildGraphEdges, computeStats } from '@/lib/teaching/knowledge-doc';
import type { KnowledgePoint } from '@/lib/teaching/knowledge-doc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, '教学知识库未配置：请设置 DATABASE_URL');
  }
  try {
    const doc = await loadKnowledge();
    return apiSuccess({
      doc,
      graphEdges: buildGraphEdges(doc),
      stats: computeStats(doc),
    });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : '加载知识文档失败');
  }
}

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, '教学知识库未配置：请设置 DATABASE_URL');
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      chapterId?: string;
      sectionId?: string;
      sectionTitle?: string;
      title?: string;
      summary?: string;
      prerequisites?: string[];
      related?: string[];
    };

    const chapterId = String(body?.chapterId ?? '').trim();
    const title = String(body?.title ?? '').trim();
    if (!chapterId) {
      return apiError('INVALID_REQUEST', 400, 'chapterId 不能为空');
    }
    if (!title) {
      return apiError('INVALID_REQUEST', 400, '知识点标题不能为空');
    }

    const sectionId = body?.sectionId ? String(body.sectionId).trim() : '';
    const sectionTitle = body?.sectionTitle ? String(body.sectionTitle).trim() : '';
    const summary = body?.summary ? String(body.summary).trim() : '';
    const prerequisites = Array.isArray(body?.prerequisites)
      ? body.prerequisites.filter((x): x is string => typeof x === 'string')
      : [];
    const related = Array.isArray(body?.related)
      ? body.related.filter((x): x is string => typeof x === 'string')
      : [];

    const outcome = await withKnowledgeTx(async (client, doc) => {
      const chapter = doc.chapters.find((c) => c.id === chapterId);
      if (!chapter) {
        throw new Error(`未找到章节：${chapterId}`);
      }

      let section = sectionId
        ? chapter.sections.find((s) => s.id === sectionId)
        : undefined;
      if (!section) {
        const newSectionId =
          sectionId || `${chapter.id}-s${chapter.sections.length + 1}`;
        section = {
          id: newSectionId,
          title: sectionTitle || `小节 ${chapter.sections.length + 1}`,
          points: [],
        };
        chapter.sections.push(section);
      }

      const existing = new Set(section.points.map((p) => p.id));
      const sectionNum = section.id.replace(/^.*-s/, '');
      let n = section.points.length + 1;
      let id = `${chapter.id}-${sectionNum}-${n}`;
      while (existing.has(id)) {
        n += 1;
        id = `${chapter.id}-${sectionNum}-${n}`;
      }

      const point: KnowledgePoint = {
        id,
        title,
        ...(summary ? { summary } : {}),
        ...(prerequisites.length ? { prerequisites } : {}),
        ...(related.length ? { related } : {}),
      };
      section.points.push(point);
      await saveKnowledgeInTx(client, doc);
      return { point, sectionId: section.id, chapterId: chapter.id, doc };
    });

    return apiSuccess(outcome, 201);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : '新增知识点失败');
  }
}