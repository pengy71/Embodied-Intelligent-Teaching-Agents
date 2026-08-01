import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createResource, listResources, isTeachingStoreConfigured } from '@/lib/teaching/store';
import { runExtraction } from '@/lib/teaching/extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE = 50 * 1024 * 1024;

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export async function GET() {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, '教学知识库未配置：请设置 DATABASE_URL');
  }
  try {
    const resources = await listResources();
    return apiSuccess({ resources });
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : '获取资源列表失败');
  }
}

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, '教学知识库未配置：请设置 DATABASE_URL');
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return apiError('MISSING_REQUIRED_FIELD', 400, '未提供文件（字段名 file）');
    }
    if (file.size > MAX_SIZE) {
      return apiError('INVALID_REQUEST', 413, '文件过大（上限 50MB）');
    }
    const id = randomUUID();
    const name = file.name || `resource-${id}`;
    const type = extOf(name) || 'file';
    const mime = file.type || 'application/octet-stream';
    const buffer = Buffer.from(await file.arrayBuffer());
    const resource = await createResource({
      id,
      name,
      type,
      mime,
      size: file.size,
      content: buffer,
    });

    // 进程内异步抽取（长驻服务器），不阻塞上传响应
    void runExtraction(id).catch((e) => {
      console.error(`[teaching] extraction ${id} failed:`, e);
    });

    return apiSuccess({ resource }, 202);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : '上传资源失败');
  }
}
