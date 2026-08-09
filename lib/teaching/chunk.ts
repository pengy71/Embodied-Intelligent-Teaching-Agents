// 文本分块工具：将解析后的文本段落切分为适合向量检索的块。
// 纯函数，无 IO，可直接单测。

import type { TextChunk } from './types';

export interface ChunkOptions {
  /** 每块目标字符数（默认 500） */
  chunkSize?: number;
  /** 相邻块重叠字符数（默认 100） */
  overlap?: number;
  /** 单块最小字符数，不足则合并到上一块（默认 50） */
  minChunkSize?: number;
}

export interface TextSegment {
  text: string;
  page?: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  chunkSize: 500,
  overlap: 100,
  minChunkSize: 50,
};

/**
 * 将带页码信息的文本段落切分为重叠的文本块。
 *
 * 每个 segment 独立切分（不跨页合并），保证 page 信息准确。
 * 过短的尾块（< minChunkSize）会被合并到前一块。
 */
export function chunkSegments(
  segments: TextSegment[],
  opts?: ChunkOptions,
): TextChunk[] {
  const { chunkSize, overlap, minChunkSize } = { ...DEFAULTS, ...opts };
  if (segments.length === 0) return [];

  const chunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const segment of segments) {
    const text = segment.text?.trim() ?? '';
    if (!text) continue;
    const page = segment.page;

    // 文本短于一个块，直接作为单个块
    if (text.length <= chunkSize) {
      if (text.length < minChunkSize && chunks.length > 0) {
        // 合并到上一块
        const last = chunks[chunks.length - 1];
        last.text += '\n' + text;
        // 保留 last.page（不覆盖为当前页，因为已合并）
      } else {
        chunks.push({ text, page, chunkIndex: globalIndex++ });
      }
      continue;
    }

    const step = Math.max(1, chunkSize - overlap);
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end).trim();
      if (slice) {
        // 尾块过短则合并到前一块
        if (slice.length < minChunkSize && chunks.length > 0 && start + chunkSize >= text.length) {
          const last = chunks[chunks.length - 1];
          last.text += '\n' + slice;
        } else {
          chunks.push({ text: slice, page, chunkIndex: globalIndex++ });
        }
      }
      start += step;
    }
  }

  return chunks;
}

/**
 * 将扁平字符串切分为块（无页码信息）。
 * 用于知识点元数据等不区分页码的场景。
 */
export function chunkText(text: string, opts?: ChunkOptions): TextChunk[] {
  return chunkSegments([{ text }], opts);
}