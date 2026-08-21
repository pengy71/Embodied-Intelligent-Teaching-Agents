'use client';

import { Streamdown } from 'streamdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';

interface ChapterContentProps {
  content: string;
  className?: string;
}

// 渲染 docs/ 下的章节原文 Markdown，支持 GFM 表格、代码高亮与 $$...$$ 数学公式。
export function ChapterContent({ content, className }: ChapterContentProps) {
  return (
    <Streamdown
      mode="static"
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      lineNumbers={false}
      className={cn('text-[13px] leading-relaxed', className)}
    >
      {content}
    </Streamdown>
  );
}
