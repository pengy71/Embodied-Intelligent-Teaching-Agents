// 答疑智能体：基于 RAG 检索上下文调用 LLM 生成可溯源回答。
// 替代原 qa/route.ts 中的关键词匹配 + 模板拼接逻辑。

import { callLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';
import { createLogger } from '@/lib/logger';
import { retrieveContext } from './rag';
import { loadKnowledge } from './store';
import { getPoint, getChapter, getPointChapter, getPointSection, getPointSectionNumber, type KnowledgeDoc } from './knowledge-doc';
import type { QAResult, QASource, RagContext } from './types';

const log = createLogger('TeachingQAAgent');

const TEXT_EXCERPT_LEN = 120;

interface QAProfile {
  teachingStyle?: string;
  depth?: string;
}

/** 将 RagContext 中的 chunks 格式化为带编号的检索上下文文本。 */
function formatContext(ctx: RagContext): { contextText: string; sourceChunks: RagContext['chunks'] } {
  const lines: string[] = [];

  if (ctx.chunks.length > 0) {
    lines.push('=== 检索到的教材原文/知识点 ===');
    ctx.chunks.forEach((chunk, i) => {
      const pageLabel = chunk.pageRef ? `（${chunk.pageRef}）` : '';
      lines.push(`[来源${i + 1}]${pageLabel} ${chunk.chunkText}`);
    });
    lines.push('');
  }

  if (ctx.knowledgePoints.length > 0) {
    lines.push('=== 相关知识点元数据 ===');
    for (const kp of ctx.knowledgePoints) {
      const parts = [`- ${kp.title}（${kp.chapter}）`];
      if (kp.summary) parts.push(`  摘要：${kp.summary}`);
      if (kp.prerequisites.length > 0) parts.push(`  前置：${kp.prerequisites.join('、')}`);
      if (kp.related.length > 0) parts.push(`  关联：${kp.related.join('、')}`);
      lines.push(parts.join('\n'));
    }
    lines.push('');
  }

  return { contextText: lines.join('\n'), sourceChunks: ctx.chunks };
}

/** 从检索结果构建 sources 数组（含章节、页码、原文摘录）。 */
function buildSources(
  ctx: RagContext,
  doc: KnowledgeDoc,
): QASource[] {
  const kpMap = new Map(ctx.knowledgePoints.map((kp) => [kp.id, kp]));

  return ctx.chunks.map((chunk) => {
    const point = chunk.pointId ? getPoint(doc, chunk.pointId) : undefined;
    const chapter = chunk.chapterId
      ? getChapter(doc, chunk.chapterId)
      : chunk.pointId
        ? getPointChapter(doc, chunk.pointId)
        : undefined;

    // 优先用知识点标题，否则用 chunk 文本前缀
    let title: string;
    let chapterName: string;
    if (point) {
      title = point.title;
      chapterName = chapter?.title ?? kpMap.get(chunk.pointId ?? '')?.chapter ?? '课程知识库';
    } else {
      // 资源原文块：用文本前 40 字作为标题
      title = chunk.chunkText.slice(0, 40).replace(/\n/g, ' ');
      chapterName = chapter?.title ?? '教材原文';
    }

    const section = point ? getPointSection(doc, point.id)?.title : undefined;
    const chapterNumber = chapter?.number;
    const sectionNumber = point ? getPointSectionNumber(doc, point.id) : undefined;

    return {
      pointId: chunk.pointId,
      title,
      chapter: chapterName,
      section,
      chapterNumber,
      sectionNumber,
      pageReference: chunk.pageRef ?? undefined,
      textExcerpt: chunk.chunkText.slice(0, TEXT_EXCERPT_LEN),
    };
  });
}

function buildSystemPrompt(profile: QAProfile): string {
  const style = profile.teachingStyle ?? '引导启发型';
  const depth = profile.depth ?? '标准';

  return `你是具身智能课程的"知识答疑智能体"。你的职责是基于课程知识库为学生提供精准、可溯源的专业答疑。

教学风格：${style}，深度：${depth}

回答规则：
1. **仅依据提供的检索上下文回答**，不得编造上下文中没有的内容。
2. 专业概念需通俗化解读，适配零基础学生理解。
3. 梳理当前知识点与前置知识、关联知识的关系，帮助学生建立知识体系。
4. 回答中引用检索来源时，用 [来源n] 标注（n 对应上下文中的来源编号）。
5. 如果检索上下文不足以回答问题，明确告知学生并建议查阅相关章节。
6. 回答使用中文，结构清晰。`;
}

function buildUserPrompt(question: string, contextText: string, profile: QAProfile): string {
  const style = profile.teachingStyle ?? '引导启发型';
  const depth = profile.depth ?? '标准';

  return `学生问题：${question}

学生画像：教学风格=${style}，深度=${depth}

${contextText}
请基于以上检索上下文回答学生的问题。回答中引用来源时用 [来源n] 标注。`;
}

/**
 * 运行答疑智能体：
 * 1. RAG 检索上下文
 * 2. 构建 prompt（检索上下文 + 知识点元数据）
 * 3. 调用 LLM 生成回答
 * 4. 构建 sources（含章节/页码/原文摘录）和 relatedPoints
 */
export async function runQAAgent(params: {
  question: string;
  profile?: QAProfile;
}): Promise<QAResult> {
  const { question } = params;
  const profile = params.profile ?? {};

  // 1. RAG 检索
  const ctx = await retrieveContext(question);

  // 2. 构建上下文文本
  const { contextText } = formatContext(ctx);

  // 3. 如果没有任何上下文，直接返回提示
  if (ctx.chunks.length === 0 && ctx.knowledgePoints.length === 0) {
    log.info({ question: question.slice(0, 60) }, '无检索结果');
    return {
      answer:
        '抱歉，我在课程知识库中没有找到与您问题直接相关的内容。\n\n建议：\n1. 尝试使用更具体的专业术语\n2. 查看课程知识图谱了解相关知识点\n3. 联系老师获取帮助',
      sources: [],
      relatedPoints: [],
    };
  }

  // 4. 调用 LLM
  const { model, thinkingConfig } = await resolveModel({ stage: 'teaching-qa' });
  const system = buildSystemPrompt(profile);
  const prompt = buildUserPrompt(question, contextText, profile);

  let answer: string;
  try {
    const result = await callLLM(
      { model, system, prompt, maxRetries: 0 },
      'teaching-qa',
      { retries: 1 },
      thinkingConfig,
    );
    answer = result.text;
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, 'LLM 答疑失败');
    // LLM 失败时返回检索到的原始上下文作为降级回答
    answer = buildFallbackAnswer(ctx, question);
  }

  // 5. 构建 sources 和 relatedPoints
  const doc = await loadKnowledge();
  const sources = buildSources(ctx, doc);
  const relatedPoints = ctx.relatedPoints;

  return { answer, sources, relatedPoints };
}

/** LLM 不可用时的降级回答：直接展示检索到的知识点摘要。 */
function buildFallbackAnswer(ctx: RagContext, question: string): string {
  const parts: string[] = [`关于您的问题"${question}"，以下是课程知识库中的相关内容：\n`];

  ctx.chunks.forEach((chunk, i) => {
    const pageLabel = chunk.pageRef ? `（${chunk.pageRef}）` : '';
    parts.push(`[来源${i + 1}]${pageLabel} ${chunk.chunkText}\n`);
  });

  if (ctx.knowledgePoints.length > 0) {
    parts.push('\n相关知识点：');
    for (const kp of ctx.knowledgePoints) {
      parts.push(`- ${kp.title}（${kp.chapter}）${kp.summary ? '：' + kp.summary : ''}`);
    }
  }

  parts.push('\n（注：当前为降级模式，LLM 暂不可用，以上为原始检索结果）');
  return parts.join('\n');
}