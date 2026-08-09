// Embedding 服务：通过 GLM（智谱）OpenAI 兼容端点生成文本向量。
// 复用 GLM_API_KEY，默认模型 embedding-3（2048 维）。

import { embed, embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createLogger } from '@/lib/logger';

const log = createLogger('TeachingEmbedding');

/** GLM embedding-3 默认输出 2048 维向量 */
export const EMBEDDING_DIM = 2048;

const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
const DEFAULT_MODEL = 'embedding-3';

let _model: ReturnType<ReturnType<typeof createOpenAI>['embedding']> | null = null;

function getApiKey(): string {
  return (
    process.env.EMBEDDING_API_KEY ??
    process.env.GLM_API_KEY ??
    process.env.OPENAI_API_KEY ??
    ''
  );
}

function getBaseUrl(): string {
  return process.env.EMBEDDING_BASE_URL ?? DEFAULT_BASE_URL;
}

function getModelName(): string {
  return process.env.EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

/** Embedding 是否已配置（API key 存在）。 */
export function isEmbeddingConfigured(): boolean {
  return getApiKey().length > 0;
}

function getEmbeddingModel() {
  if (_model) return _model;

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      'Embedding 未配置：请设置 EMBEDDING_API_KEY、GLM_API_KEY 或 OPENAI_API_KEY',
    );
  }

  const openai = createOpenAI({
    baseURL: getBaseUrl(),
    apiKey,
  });
  _model = openai.embedding(getModelName());
  return _model;
}

/** GLM embedMany 单次最多 64 条，超出需分批。 */
const EMBED_BATCH_SIZE = 64;

/** 批量生成文本向量。空数组返回空数组。自动分批处理（GLM 单次上限 64 条）。 */
export async function embedTexts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const model = getEmbeddingModel();
  const results: number[][] = [];
  for (let i = 0; i < values.length; i += EMBED_BATCH_SIZE) {
    const batch = values.slice(i, i + EMBED_BATCH_SIZE);
    const { embeddings } = await embedMany({ model, values: batch });
    results.push(...embeddings);
  }
  return results;
}

/** 生成单条文本向量（用于查询）。 */
export async function embedQuery(text: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const { embedding } = await embed({ model, value: text });
  return embedding;
}

/** 重置缓存的模型实例（测试用）。 */
export function _resetEmbeddingModel(): void {
  _model = null;
  log.debug('embedding model cache reset');
}