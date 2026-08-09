// 教学资源抽取管线：解析文件 -> LLM 抽取知识点/关系 -> 事务内合并入知识文档
// 失败置资源 status=failed 并回滚知识写入，不留下半成品。

import { generateObject } from 'ai';
import { z } from 'zod';
import { resolveModel } from '@/lib/server/resolve-model';
import { extractDocument } from '@/lib/document';
import { createLogger } from '@/lib/logger';
import {
  withKnowledgeTx,
  saveKnowledgeInTx,
  updateResource,
  getResourceContent,
} from '@/lib/teaching/store';
import { chunkSegments } from '@/lib/teaching/chunk';
import { embedTexts, isEmbeddingConfigured } from '@/lib/teaching/embedding';
import { insertChunks, deleteChunksByResource } from '@/lib/teaching/rag-store';
import { nanoid } from 'nanoid';
import type { ChunkInsert } from '@/lib/teaching/types';
import type { KnowledgeDoc } from '@/lib/teaching/knowledge-doc';
import type {
  KnowledgeChapter,
  KnowledgeSection,
  KnowledgePoint,
  CommonMistake,
} from '@/lib/teaching/knowledge-system';

const log = createLogger('TeachingExtract');

const MAX_TEXT_CHARS = 24000;
const SUPPLEMENT_PART = '补充资源';
const SUPPLEMENT_CHAPTER_ID = 'supplement';
const SUPPLEMENT_SECTION_ID = 'supplement-s1';

const MistakeSchema = z.object({
  title: z.string(),
  wrong: z.string(),
  right: z.string(),
});
const PointSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  mistakes: z.array(MistakeSchema).optional(),
  suggestedChapter: z.string().optional(),
});
const ExtractionSchema = z.object({
  points: z.array(PointSchema),
});

type ExtractedPoint = z.infer<typeof PointSchema>;

function ext(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function isTextExt(e: string): boolean {
  return ['txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'text'].includes(e);
}
interface ParsedSegment {
  text: string;
  page?: number;
}

/** 解析文件为带页码的文本段落（保留 DocumentBlock.pageNumber 用于溯源）。 */
async function parseToSegments(buffer: Buffer, name: string): Promise<ParsedSegment[]> {
  const e = ext(name);
  if (isTextExt(e)) {
    return [{ text: buffer.toString('utf8') }];
  }
  if (e === 'pdf') {
    const artifact = await extractDocument({
      buffer,
      fileName: name,
      mimeType: 'application/pdf',
      config: { providerId: 'unpdf' },
    });
    const segments: ParsedSegment[] = [];
    for (const block of artifact.blocks) {
      const text = block.text?.trim();
      if (text) segments.push({ text, page: block.pageNumber });
    }
    return segments;
  }
  throw new Error(`暂不支持 .${e} 格式的文本解析（MVP 支持 txt/md/pdf）`);
}

/** 将资源文本分块、向量化并存入 teaching_chunks。失败不影响知识点抽取。 */
async function indexResourceChunks(
  resourceId: string,
  segments: ParsedSegment[],
): Promise<void> {
  await deleteChunksByResource(resourceId);

  const chunks = chunkSegments(segments);
  if (chunks.length === 0) return;

  const texts = chunks.map((c) => c.text);
  const embeddings = await embedTexts(texts);

  const inserts: ChunkInsert[] = chunks.map((chunk, idx) => ({
    id: `res-${resourceId}-${idx}-${nanoid(6)}`,
    courseId: 'default',
    resourceId,
    pointId: null,
    chapterId: null,
    chunkText: chunk.text,
    chunkIndex: chunk.chunkIndex,
    pageRef: chunk.page != null ? `第${chunk.page}页` : null,
    embedding: embeddings[idx],
    metadata: { type: 'resource', resourceId },
  }));

  await insertChunks(inserts);
  log.info({ resourceId, chunkCount: inserts.length }, '资源向量化完成');
}

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '');
}

function locatePoint(doc: KnowledgeDoc, id: string): KnowledgePoint | null {
  for (const c of doc.chapters) {
    for (const s of c.sections) {
      const p = s.points.find((x) => x.id === id);
      if (p) return p;
    }
  }
  return null;
}

function findChapterByHint(doc: KnowledgeDoc, hint?: string): KnowledgeChapter | undefined {
  if (!hint) return undefined;
  const h = normalizeTitle(hint);
  if (!h) return undefined;
  return doc.chapters.find((c) => {
    const ct = normalizeTitle(c.title);
    return ct === h || ct.includes(h) || h.includes(ct);
  });
}

function ensureSupplementChapter(doc: KnowledgeDoc): KnowledgeChapter {
  const existing = doc.chapters.find((c) => c.id === SUPPLEMENT_CHAPTER_ID);
  if (existing) return existing;
  const nextNumber = doc.chapters.reduce((m, c) => Math.max(m, c.number), 0) + 1;
  const chapter: KnowledgeChapter = {
    id: SUPPLEMENT_CHAPTER_ID,
    number: nextNumber,
    title: '补充资源',
    part: SUPPLEMENT_PART,
    moduleId: doc.modules[0]?.id ?? 'foundations',
    summary: '由上传资源自动抽取的知识点。',
    sections: [{ id: SUPPLEMENT_SECTION_ID, title: '自动抽取', points: [] }],
  };
  doc.chapters.push(chapter);
  return chapter;
}

function mergeExtraction(
  doc: KnowledgeDoc,
  resourceId: string,
  points: ExtractedPoint[],
): { doc: KnowledgeDoc; pointIds: string[] } {
  const newDoc: KnowledgeDoc = {
    modules: doc.modules,
    chapters: doc.chapters.map((c) => ({
      ...c,
      sections: c.sections.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) })),
    })),
    commonMistakes: [...doc.commonMistakes],
  };

  const titleToId = new Map<string, string>();
  for (const c of newDoc.chapters) {
    for (const s of c.sections) {
      for (const p of s.points) titleToId.set(normalizeTitle(p.title), p.id);
    }
  }

  const pointIds: string[] = [];
  let mistakeCounter = 0;

  const resolveIds = (titles: string[] | undefined): string[] => {
    if (!titles) return [];
    const ids: string[] = [];
    for (const t of titles) {
      const id = titleToId.get(normalizeTitle(t));
      if (id) ids.push(id);
    }
    return ids;
  };

  for (let i = 0; i < points.length; i++) {
    const ep = points[i];
    const title = ep.title?.trim();
    if (!title) continue;
    const norm = normalizeTitle(title);
    const existingId = titleToId.get(norm);

    if (existingId) {
      const p = locatePoint(newDoc, existingId);
      if (p) {
        const prereq = new Set([...(p.prerequisites ?? []), ...resolveIds(ep.prerequisites)]);
        const rel = new Set([...(p.related ?? []), ...resolveIds(ep.related)]);
        p.prerequisites = [...prereq];
        p.related = [...rel];
        if (ep.summary && !p.summary) p.summary = ep.summary;
      }
      pointIds.push(existingId);
      continue;
    }

    const pointId = `kp-${resourceId}-${i + 1}`;
    titleToId.set(norm, pointId);

    let targetChapter = findChapterByHint(newDoc, ep.suggestedChapter);
    if (!targetChapter) targetChapter = ensureSupplementChapter(newDoc);
    let section: KnowledgeSection | undefined =
      targetChapter.sections[targetChapter.sections.length - 1];
    if (!section) {
      section = { id: `${targetChapter.id}-s1`, title: '自动抽取', points: [] };
      targetChapter.sections.push(section);
    }

    const mistakes: string[] = (ep.mistakes ?? []).map((m) => {
      mistakeCounter += 1;
      const id = `m-${resourceId}-${mistakeCounter}`;
      const mistake: CommonMistake = {
        id,
        pointId,
        title: m.title,
        wrong: m.wrong,
        right: m.right,
      };
      newDoc.commonMistakes.push(mistake);
      return id;
    });

    const newPoint: KnowledgePoint = {
      id: pointId,
      title,
      summary: ep.summary,
      prerequisites: resolveIds(ep.prerequisites),
      related: resolveIds(ep.related),
      mistakes,
    };
    section.points.push(newPoint);
    pointIds.push(pointId);
  }

  return { doc: newDoc, pointIds };
}

function buildPrompt(text: string): string {
  return [
    '从以下教学资源文本中抽取知识点。对每个知识点给出：',
    '- title：简洁的知识点名称',
    '- summary：一句话说明（可选）',
    '- prerequisites：前置知识点的标题列表（可选）',
    '- related：关联知识点的标题列表（可选）',
    '- mistakes：常见误区数组，每项含 title/wrong/right（可选）',
    '- suggestedChapter：建议归属章节标题，如“导论”“运动控制”等；留空则归入补充资源',
    '仅抽取文本中明确出现的知识点，不要臆造；prerequisites/related 的标题尽量与已有知识点一致。',
    '文本：',
    '"""',
    text,
    '"""',
  ].join('\n');
}

/** 解析 -> LLM 抽取 -> 事务内合并 -> 更新资源状态。失败置 failed 并回滚。 */
export async function runExtraction(resourceId: string): Promise<void> {
  log.info({ resourceId }, '开始抽取');
  try {
    const content = await getResourceContent(resourceId);
    if (!content) throw new Error('资源不存在');

    await updateResource(resourceId, { status: 'parsing' });
    const segments = await parseToSegments(content.buffer, content.name);
    const text = segments.map((s) => s.text).join('\n').slice(0, MAX_TEXT_CHARS);
    await updateResource(resourceId, { status: 'extracting', parsedText: text });

    let points: ExtractedPoint[];
    try {
      const { model } = await resolveModel({});
      const result = await generateObject({
        model,
        schema: ExtractionSchema,
        system:
          '你是课程知识结构化助手。从给定的教学资源文本中抽取知识点及其关联关系，严格输出 JSON。',
        prompt: buildPrompt(text),
      });
      points = result.object.points;
    } catch (e) {
      throw new Error(`LLM 抽取失败：${e instanceof Error ? e.message : String(e)}`);
    }

    const pointIds = await withKnowledgeTx(async (client, doc) => {
      const merged = mergeExtraction(doc, resourceId, points);
      await saveKnowledgeInTx(client, merged.doc);
      await updateResource(resourceId, { status: 'ready', pointIds: merged.pointIds }, client);
      return merged.pointIds;
    });


    // RAG: 分块 + 向量化 + 存入 teaching_chunks（失败不影响知识点抽取结果）
    if (isEmbeddingConfigured()) {
      try {
        await indexResourceChunks(resourceId, segments);
      } catch (e) {
        log.warn(
          { resourceId, err: e instanceof Error ? e.message : String(e) },
          '资源向量化失败（不影响知识点）',
        );
      }
    }
    log.info({ resourceId, pointCount: pointIds.length }, '抽取完成');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ resourceId, err: msg }, '抽取失败');
    await updateResource(resourceId, { status: 'failed', error: msg }).catch(() => undefined);
  }
}
