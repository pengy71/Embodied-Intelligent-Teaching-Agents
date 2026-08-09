// 知识点向量索引：将 KnowledgeDoc 中的知识点元数据向量化并存入 teaching_chunks。
// 用于 RAG 语义检索的知识点级召回（区别于资源原文块）。

import { nanoid } from 'nanoid';
import { loadKnowledge } from './store';
import {
  getAllPoints,
  getPoint,
  getPointChapter,
  type KnowledgeDoc,
  type KnowledgePoint,
} from './knowledge-doc';
import { chunkText } from './chunk';
import { embedTexts, isEmbeddingConfigured } from './embedding';
import { deleteKnowledgeChunks, insertChunks } from './rag-store';
import type { ChunkInsert } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingReindex');

const DEFAULT_COURSE_ID = 'default';

/** 为单个知识点构造检索文本（含标题、摘要、前置/关联知识点标题）。 */
function buildPointSearchText(
  doc: KnowledgeDoc,
  point: KnowledgePoint,
): string {
  const parts: string[] = [`【知识点】${point.title}`];
  if (point.summary) parts.push(point.summary);

  if (point.prerequisites && point.prerequisites.length > 0) {
    const titles = point.prerequisites
      .map((id) => getPoint(doc, id)?.title)
      .filter(Boolean);
    if (titles.length > 0) parts.push(`前置知识：${titles.join('、')}`);
  }

  if (point.related && point.related.length > 0) {
    const titles = point.related
      .map((id) => getPoint(doc, id)?.title)
      .filter(Boolean);
    if (titles.length > 0) parts.push(`关联知识：${titles.join('、')}`);
  }

  return parts.join('\n');
}

/**
 * 重建知识点向量索引：
 * 1. 读取当前 KnowledgeDoc
 * 2. 删除旧知识点块（resource_id IS NULL）
 * 3. 为每个知识点构造检索文本、分块、向量化、插入
 *
 * Embedding 未配置时直接返回 0（不报错，允许无向量模式运行）。
 */
export async function reindexKnowledgePoints(
  courseId: string = DEFAULT_COURSE_ID,
): Promise<{ indexed: number }> {
  if (!isEmbeddingConfigured()) {
    log.warn('Embedding 未配置，跳过知识点索引');
    return { indexed: 0 };
  }

  const doc = await loadKnowledge();
  const allPoints = getAllPoints(doc);

  if (allPoints.length === 0) {
    log.info('知识库为空，清空旧索引');
    await deleteKnowledgeChunks(courseId);
    return { indexed: 0 };
  }

  // 构造检索文本
  const pointTexts = allPoints.map((p) => buildPointSearchText(doc, p));

  // 分块（知识点文本通常较短，每条一个块）
  const allChunks = [];
  for (let i = 0; i < allPoints.length; i++) {
    const point = allPoints[i];
    const chapter = getPointChapter(doc, point.id);
    const chunks = chunkText(pointTexts[i]);
    for (const chunk of chunks) {
      allChunks.push({ point, chapter, chunk });
    }
  }

  if (allChunks.length === 0) {
    await deleteKnowledgeChunks(courseId);
    return { indexed: 0 };
  }

  // 批量向量化
  const texts = allChunks.map((c) => c.chunk.text);
  log.info({ pointCount: allPoints.length, chunkCount: texts.length }, '开始向量化知识点');
  const embeddings = await embedTexts(texts);

  // 构造 ChunkInsert
  const inserts: ChunkInsert[] = allChunks.map((c, idx) => ({
    id: `kp-chunk-${c.point.id}-${idx}-${nanoid(6)}`,
    courseId,
    resourceId: null,
    pointId: c.point.id,
    chapterId: c.chapter?.id ?? null,
    chunkText: c.chunk.text,
    chunkIndex: idx,
    pageRef: null,
    embedding: embeddings[idx],
    metadata: {
      type: 'knowledge-point',
      pointTitle: c.point.title,
      chapterTitle: c.chapter?.title ?? null,
    },
  }));

  // 删除旧块 + 插入新块
  await deleteKnowledgeChunks(courseId);
  await insertChunks(inserts);

  log.info({ indexed: inserts.length }, '知识点索引完成');
  return { indexed: inserts.length };
}