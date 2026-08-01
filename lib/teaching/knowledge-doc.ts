// 知识文档数据模型与纯函数（数据源驱动）
// 把原本写死在 knowledge-system.ts 的静态数据，改为按 KnowledgeDoc 参数运算，
// 供组件/API 在运行时从数据库加载的知识文档上复用同一套查询与图谱派生逻辑。

import {
  modules as seedModules,
  chapters as seedChapters,
  commonMistakes as seedMistakes,
  type KnowledgeModule,
  type KnowledgePoint,
  type KnowledgeSection,
  type KnowledgeChapter,
  type CommonMistake,
  type KnowledgeGraphEdgeData,
  type KnowledgePointNode,
} from '@/lib/teaching/knowledge-system';

export type {
  KnowledgeModule,
  KnowledgePoint,
  KnowledgeSection,
  KnowledgeChapter,
  CommonMistake,
  KnowledgeGraphEdgeData,
  KnowledgeGraphEdgeType,
  KnowledgePointNode,
} from '@/lib/teaching/knowledge-system';

export interface KnowledgeDoc {
  modules: KnowledgeModule[];
  chapters: KnowledgeChapter[];
  commonMistakes: CommonMistake[];
}

/** 用现有 17 章静态数据生成初始知识文档，作为数据库首次播种源。 */
export function seedKnowledgeDoc(): KnowledgeDoc {
  return {
    modules: seedModules,
    chapters: seedChapters,
    commonMistakes: seedMistakes,
  };
}

export function getAllPoints(doc: KnowledgeDoc): KnowledgePoint[] {
  return doc.chapters.flatMap((c) => c.sections.flatMap((s) => s.points));
}

export function getPoint(doc: KnowledgeDoc, id: string): KnowledgePoint | undefined {
  for (const c of doc.chapters) {
    for (const s of c.sections) {
      const p = s.points.find((x) => x.id === id);
      if (p) return p;
    }
  }
  return undefined;
}

export function getChapter(doc: KnowledgeDoc, id: string): KnowledgeChapter | undefined {
  return doc.chapters.find((c) => c.id === id);
}

export function getModule(doc: KnowledgeDoc, id: string): KnowledgeModule | undefined {
  return doc.modules.find((m) => m.id === id);
}

export function getMistake(doc: KnowledgeDoc, id: string): CommonMistake | undefined {
  return doc.commonMistakes.find((m) => m.id === id);
}

export function getPointChapter(doc: KnowledgeDoc, pointId: string): KnowledgeChapter | undefined {
  return doc.chapters.find((c) => c.sections.some((s) => s.points.some((p) => p.id === pointId)));
}

export function getPointSection(doc: KnowledgeDoc, pointId: string): KnowledgeSection | undefined {
  for (const c of doc.chapters) {
    for (const s of c.sections) {
      if (s.points.some((p) => p.id === pointId)) return s;
    }
  }
  return undefined;
}

export function getChapterPointCount(doc: KnowledgeDoc, chapterId: string): number {
  const c = getChapter(doc, chapterId);
  if (!c) return 0;
  return c.sections.reduce((sum, s) => sum + s.points.length, 0);
}

// === 知识图谱：知识点级关系数据（与 knowledge-system.ts 中静态版逻辑一致） ===

export function buildGraphEdges(doc: KnowledgeDoc): KnowledgeGraphEdgeData[] {
  const allPoints = getAllPoints(doc);
  const pointMap = new Map(allPoints.map((p) => [p.id, p]));
  const edges: KnowledgeGraphEdgeData[] = [];
  const prereqPairs = new Set<string>();
  const relatedPairs = new Set<string>();
  const casePairs = new Set<string>();

  for (const p of allPoints) {
    for (const id of p.prerequisites ?? []) {
      if (!pointMap.has(id)) continue;
      edges.push({ source: id, target: p.id, type: 'prerequisite' });
      prereqPairs.add([id, p.id].sort().join('\0'));
    }
  }
  for (const p of allPoints) {
    for (const id of p.related ?? []) {
      if (!pointMap.has(id)) continue;
      const pair = [p.id, id].sort().join('\0');
      if (prereqPairs.has(pair) || relatedPairs.has(pair)) continue;
      relatedPairs.add(pair);
      edges.push({ source: p.id, target: id, type: 'related' });
    }
  }
  for (const p of allPoints) {
    for (const id of p.cases ?? []) {
      if (!pointMap.has(id)) continue;
      const key = p.id + '\0' + id;
      if (casePairs.has(key)) continue;
      casePairs.add(key);
      edges.push({ source: p.id, target: id, type: 'case' });
    }
  }
  return edges;
}

export function getGraphNodes(doc: KnowledgeDoc): KnowledgePointNode[] {
  const edges = buildGraphEdges(doc);
  const connectedPointIds = new Set(edges.flatMap((e) => [e.source, e.target]));
  const result: KnowledgePointNode[] = [];
  for (const id of connectedPointIds) {
    const point = getPoint(doc, id);
    const chapter = getPointChapter(doc, id);
    if (!point || !chapter) continue;
    const mod = getModule(doc, chapter.moduleId);
    if (!mod) continue;
    result.push({ point, chapter, module: mod });
  }
  return result;
}

export function computeStats(doc: KnowledgeDoc) {
  const allPoints = getAllPoints(doc);
  return {
    chapterCount: doc.chapters.length,
    sectionCount: doc.chapters.reduce((sum, c) => sum + c.sections.length, 0),
    pointCount: allPoints.length,
    mistakeCount: doc.commonMistakes.length,
    moduleCount: doc.modules.length,
    relationCount: allPoints.reduce(
      (sum, p) =>
        sum +
        (p.prerequisites?.length ?? 0) +
        (p.related?.length ?? 0) +
        (p.cases?.length ?? 0) +
        (p.experiments?.length ?? 0),
      0,
    ),
  };
}
