import { NextRequest, NextResponse } from 'next/server';
import { getResourceContent, isTeachingStoreConfigured } from '@/lib/teaching/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isTeachingStoreConfigured()) {
    return NextResponse.json({ error: '教学知识库未配置：请设置 DATABASE_URL' }, { status: 503 });
  }
  const { id } = await params;
  const content = await getResourceContent(id);
  if (!content) {
    return NextResponse.json({ error: '资源不存在' }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(content.buffer), {
    status: 200,
    headers: {
      'Content-Type': content.mime || 'application/octet-stream',
      'Content-Length': String(content.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(content.name)}"`,
    },
  });
}
