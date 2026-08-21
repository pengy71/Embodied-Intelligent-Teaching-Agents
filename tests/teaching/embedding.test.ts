import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the ai package
const mockEmbedMany = vi.fn();
const mockEmbed = vi.fn();
vi.mock('ai', () => ({
  embedMany: (...args: unknown[]) => mockEmbedMany(...args),
  embed: (...args: unknown[]) => mockEmbed(...args),
}));

// Mock @ai-sdk/openai
const mockEmbeddingModel = { modelId: 'embedding-3' };
const mockOpenAIProvider = {
  embedding: vi.fn(() => mockEmbeddingModel),
};
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => mockOpenAIProvider),
}));

import {
  embedTexts,
  embedQuery,
  isEmbeddingConfigured,
  _resetEmbeddingModel,
  EMBEDDING_DIM,
} from '@/lib/teaching/embedding';

describe('embedding service', () => {
  beforeEach(() => {
    vi.resetModules();
    _resetEmbeddingModel();
    mockEmbedMany.mockReset();
    mockEmbed.mockReset();
    delete process.env.EMBEDDING_API_KEY;
    delete process.env.GLM_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.EMBEDDING_BASE_URL;
    delete process.env.EMBEDDING_MODEL;
  });

  it('exports correct embedding dimension', () => {
    expect(EMBEDDING_DIM).toBe(2048);
  });

  it('isEmbeddingConfigured returns false when no API key', () => {
    expect(isEmbeddingConfigured()).toBe(false);
  });

  it('isEmbeddingConfigured returns true when GLM_API_KEY is set', () => {
    process.env.GLM_API_KEY = 'test-key';
    expect(isEmbeddingConfigured()).toBe(true);
  });

  it('isEmbeddingConfigured returns true when EMBEDDING_API_KEY is set', () => {
    process.env.EMBEDDING_API_KEY = 'test-key';
    expect(isEmbeddingConfigured()).toBe(true);
  });

  it('embedTexts returns empty array for empty input', async () => {
    process.env.GLM_API_KEY = 'test-key';
    const result = await embedTexts([]);
    expect(result).toEqual([]);
    expect(mockEmbedMany).not.toHaveBeenCalled();
  });

  it('embedTexts calls embedMany with correct values', async () => {
    process.env.GLM_API_KEY = 'test-key';
    const mockEmbeddings = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    mockEmbedMany.mockResolvedValue({ embeddings: mockEmbeddings });

    const result = await embedTexts(['hello', 'world']);

    expect(mockEmbedMany).toHaveBeenCalledTimes(1);
    const callArg = mockEmbedMany.mock.calls[0][0];
    expect(callArg.values).toEqual(['hello', 'world']);
    expect(result).toEqual(mockEmbeddings);
  });

  it('embedQuery calls embed with correct value', async () => {
    process.env.GLM_API_KEY = 'test-key';
    const mockEmbedding = [0.5, 0.6, 0.7];
    mockEmbed.mockResolvedValue({ embedding: mockEmbedding });

    const result = await embedQuery('test question');

    expect(mockEmbed).toHaveBeenCalledTimes(1);
    const callArg = mockEmbed.mock.calls[0][0];
    expect(callArg.value).toBe('test question');
    expect(result).toEqual(mockEmbedding);
  });

  it('uses GLM base URL by default', async () => {
    process.env.GLM_API_KEY = 'test-key';
    mockEmbedMany.mockResolvedValue({ embeddings: [[0.1]] });

    await embedTexts(['test']);

    const { createOpenAI } = await import('@ai-sdk/openai');
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        apiKey: 'test-key',
      }),
    );
  });

  it('uses custom base URL when EMBEDDING_BASE_URL is set', async () => {
    process.env.GLM_API_KEY = 'test-key';
    process.env.EMBEDDING_BASE_URL = 'https://custom.example.com/v1';
    process.env.EMBEDDING_MODEL = 'custom-model';
    mockEmbedMany.mockResolvedValue({ embeddings: [[0.1]] });

    await embedTexts(['test']);

    const { createOpenAI } = await import('@ai-sdk/openai');
    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://custom.example.com/v1',
      }),
    );
    expect(mockOpenAIProvider.embedding).toHaveBeenCalledWith('custom-model');
  });
});
