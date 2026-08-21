// RAG 检索编排：向量检索 top-K 文本块 + 知识图谱扩展。
// embedding 未配置时降级为关键词匹配，仍提供知识点 context。

import { embedQuery, isEmbeddingConfigured } from './embedding';
import { searchChunks } from './rag-store';
import { loadKnowledge } from './store';
import {
  getAllPoints,
  getPoint,
  getPointChapter,
  buildGraphEdges,
  type KnowledgeDoc,
} from './knowledge-doc';
import type { RagContext, RagContextChunk } from './types';
import { createLogger } from '@/lib/logger';
import { isTeachingRagEnabled } from '@/lib/config/feature-flags';

const log = createLogger('TeachingRAG');

const DEFAULT_COURSE_ID = 'default';

/** 从知识点 ID 集合提取图谱关联（前置/关联知识点）。 */
function expandGraph(doc: KnowledgeDoc, pointIds: string[]): RagContext['relatedPoints'] {
  const result: RagContext['relatedPoints'] = [];
  const seen = new Set<string>();

  const edges = buildGraphEdges(doc);
  for (const edge of edges) {
    if (!pointIds.includes(edge.source) && !pointIds.includes(edge.target)) continue;
    const otherId = pointIds.includes(edge.source) ? edge.target : edge.source;
    if (seen.has(otherId) || pointIds.includes(otherId)) continue;
    seen.add(otherId);
    const point = getPoint(doc, otherId);
    if (!point) continue;
    const chapter = getPointChapter(doc, otherId);
    result.push({
      id: point.id,
      title: point.title,
      summary: point.summary,
      chapter: chapter?.title,
    });
  }
  return result.slice(0, 10);
}

/** 从知识点 ID 集合构建知识点元数据（供 LLM context）。 */
function buildKnowledgePoints(
  doc: KnowledgeDoc,
  pointIds: string[],
): RagContext['knowledgePoints'] {
  const seen = new Set<string>();
  const result: RagContext['knowledgePoints'] = [];
  for (const id of pointIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const point = getPoint(doc, id);
    if (!point) continue;
    const chapter = getPointChapter(doc, id);
    result.push({
      id: point.id,
      title: point.title,
      summary: point.summary,
      chapter: chapter?.title ?? '',
      prerequisites: point.prerequisites ?? [],
      related: point.related ?? [],
    });
  }
  return result;
}

/**
 * 完整 RAG 检索：向量检索 top-K 块 + 图谱扩展。
 * 返回 chunks（原文块）、relatedPoints（关联知识点）、knowledgePoints（知识点元数据）。
 */
export async function retrieveContext(
  question: string,
  opts?: { courseId?: string; topK?: number },
): Promise<RagContext> {
  const courseId = opts?.courseId ?? DEFAULT_COURSE_ID;
  const topK = opts?.topK ?? 6;
  const doc = await loadKnowledge();

  if (!isTeachingRagEnabled() || !isEmbeddingConfigured()) {
    log.warn('RAG 未启用或 Embedding 未配置，降级为关键词匹配检索');
    return retrieveByKeywords(question, doc);
  }

  // 1. 向量化问题
  const queryVec = await embedQuery(question);

  // 2. 向量检索 top-K 块
  const results = await searchChunks(queryVec, courseId, topK);

  if (results.length === 0) {
    log.info({ question: question.slice(0, 60) }, '向量检索无结果，降级为关键词匹配');
    return retrieveByKeywords(question, doc);
  }

  // 3. 转换为 RagContextChunk
  const chunks: RagContextChunk[] = results.map((r) => ({
    chunkText: r.chunkText,
    pageRef: r.pageRef,
    pointId: r.pointId,
    chapterId: r.chapterId,
    similarity: r.similarity,
  }));

  // 4. 收集命中的知识点 ID，做图谱扩展
  const hitPointIds = [
    ...new Set(results.map((r) => r.pointId).filter((id): id is string => id !== null)),
  ];

  const relatedPoints = expandGraph(doc, hitPointIds);
  const knowledgePoints = buildKnowledgePoints(doc, hitPointIds);

  return {
    chunks,
    relatedPoints,
    knowledgePoints,
    degraded: false,
  };
}

/**
 * 降级检索：关键词匹配知识点（无向量）。
 * 复用原 QA 路由的关键词匹配逻辑，但返回 RagContext 结构。
 */
async function retrieveByKeywords(question: string, doc: KnowledgeDoc): Promise<RagContext> {
  const allPoints = getAllPoints(doc);
  const questionLower = question.toLowerCase();
  const keywords = extractKeywords(questionLower);

  const scored = allPoints.map((point) => {
    let score = 0;
    const titleLower = point.title.toLowerCase();
    const summaryLower = point.summary?.toLowerCase() ?? '';
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 3;
      if (summaryLower.includes(kw)) score += 1;
    }
    return { point, score };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => s.point);

  const hitPointIds = matched.map((p) => p.id);
  const relatedPoints = expandGraph(doc, hitPointIds);
  const knowledgePoints = buildKnowledgePoints(doc, hitPointIds);

  // 构造模拟 chunks（用知识点摘要作为文本）
  const chunks: RagContextChunk[] = matched.map((point) => {
    const chapter = getPointChapter(doc, point.id);
    return {
      chunkText: `【知识点】${point.title}\n${point.summary ?? ''}`,
      pageRef: null,
      pointId: point.id,
      chapterId: chapter?.id ?? null,
      similarity: 0.5,
    };
  });

  return {
    chunks,
    relatedPoints,
    knowledgePoints,
    degraded: true,
  };
}

function extractKeywords(text: string): string[] {
  const commonKeywords = [
    'RRT',
    'PRM',
    'PPO',
    'SAC',
    'DDPM',
    'diffusion',
    'world model',
    'reinforcement learning',
    'imitation learning',
    'motion planning',
    'force control',
    'Kalman filter',
    'point cloud',
    'ICP',
    'YOLO',
    'semantic segmentation',
    'Lie group',
    'Lie algebra',
    'SO(3)',
    'SE(3)',
    'Jacobian',
    'inverse kinematics',
    'forward kinematics',
    'dynamics',
    'Lagrange',
    'trajectory optimization',
    'grasp planning',
    'tactile sensing',
    'Sim-to-Real',
    'domain randomization',
    'behavioral cloning',
    'Flow Matching',
    'Score model',
    'normalizing flow',
    'HTN',
    'hierarchical task network',
    'task decomposition',
    'CPG',
    'DMP',
    'Tegotae',
    '感知',
    '规划',
    '控制',
    '协同',
    '强化学习',
    '模仿学习',
    '运动规划',
    '力控',
    '世界模型',
    '扩散模型',
    '归一化流',
    '机器人',
    '具身智能',
  ];

  const found: string[] = [];
  for (const keyword of commonKeywords) {
    if (text.includes(keyword.toLowerCase())) found.push(keyword);
  }

  if (found.length === 0) {
    const words = text.split(/[\s,，。、]+/).filter((w) => w.length > 1);
    found.push(...words.slice(0, 5));
  }

  return found;
}
