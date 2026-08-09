import { describe, expect, it } from 'vitest';
import { chunkSegments, chunkText } from '@/lib/teaching/chunk';

describe('chunkSegments', () => {
  it('returns empty array for empty input', () => {
    expect(chunkSegments([])).toEqual([]);
  });

  it('returns single chunk for text shorter than chunkSize', () => {
    const result = chunkSegments([{ text: '短文本', page: 1 }]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('短文本');
    expect(result[0].page).toBe(1);
    expect(result[0].chunkIndex).toBe(0);
  });

  it('splits long text into multiple chunks with overlap', () => {
    const longText = 'A'.repeat(1200);
    const result = chunkSegments([{ text: longText }], { chunkSize: 500, overlap: 100 });
    expect(result.length).toBeGreaterThan(1);

    // Each chunk (except possibly the last) should be ~chunkSize
    for (const chunk of result) {
      expect(chunk.text.length).toBeLessThanOrEqual(500);
    }

    // Chunks should have sequential indices
    result.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it('preserves page numbers from segments', () => {
    const result = chunkSegments(
      [
        { text: 'page one content', page: 1 },
        { text: 'page two content', page: 2 },
      ],
      { chunkSize: 500, minChunkSize: 10 },
    );
    expect(result).toHaveLength(2);
    expect(result[0].page).toBe(1);
    expect(result[1].page).toBe(2);
  });

  it('skips empty segments', () => {
    const result = chunkSegments([
      { text: '', page: 1 },
      { text: 'valid', page: 2 },
      { text: '   ', page: 3 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('valid');
  });

  it('merges tail chunk shorter than minChunkSize into previous', () => {
    // chunkSize=500, overlap=30, step=470, minChunkSize=50
    // 510 chars: chunk[0]=0..500, tail=470..510 (40 chars < 50) -> merged
    const text = 'X'.repeat(510);
    const result = chunkSegments([{ text }], { chunkSize: 500, overlap: 30, minChunkSize: 50 });
    expect(result).toHaveLength(1);
    // Merged: 500 chars + '\n' separator + 40 char tail = 541
    expect(result[0].text.length).toBe(541);
  });

  it('handles multiple segments independently', () => {
    const result = chunkSegments(
      [
        { text: 'A'.repeat(600), page: 1 },
        { text: 'B'.repeat(600), page: 2 },
      ],
      { chunkSize: 500, overlap: 100 },
    );
    // Each 600-char segment with step=400: chunk at 0..500, then 400..600 (200 chars)
    // So 2 chunks per segment = 4 total
    expect(result).toHaveLength(4);
    expect(result[0].page).toBe(1);
    expect(result[2].page).toBe(2);
  });
});

describe('chunkText', () => {
  it('chunks a flat string without page info', () => {
    const result = chunkText('A'.repeat(1200), { chunkSize: 500, overlap: 100 });
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.page).toBeUndefined();
    }
  });

  it('returns single chunk for short text', () => {
    const result = chunkText('hello');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('hello');
  });
});