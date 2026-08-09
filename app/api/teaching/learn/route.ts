import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  loadKnowledge,
  isTeachingStoreConfigured,
  getResourcesForPoint,
  getLearnCache,
  upsertLearnCache,
} from '@/lib/teaching/store';
import { buildLearnContext, buildLearnRequirement } from '@/lib/teaching/learn-prompt';
import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import {
  createClassroomGenerationJob,
  readClassroomGenerationJob,
} from '@/lib/server/classroom-job-store';
import { buildRequestOrigin, readClassroom } from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('LearnAPI');

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  let body: { pointId?: unknown; force?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const pointId = body?.pointId;
  if (!pointId || typeof pointId !== 'string') {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: pointId');
  }

  const force = body.force === true;
  const baseUrl = buildRequestOrigin(req);

  // 1. 命中缓存：该知识点已生成过课堂且文件仍存在 -> 直接复用，避免重复生成与等待
  if (!force) {
    try {
      const cached = await getLearnCache(pointId);
      if (cached) {
        const classroom = await readClassroom(cached.classroomId);
        if (classroom) {
          log.info(`Learn cache hit: pointId=${pointId} classroomId=${cached.classroomId}`);
          return apiSuccess(
            {
              cached: true,
              classroomId: cached.classroomId,
              url: `${baseUrl}/classroom/${cached.classroomId}`,
              scenesCount: cached.scenesCount ?? classroom.scenes.length,
              createdAt: cached.createdAt,
            },
            200,
          );
        }
        log.warn(`Learn cache stale (classroom file missing): pointId=${pointId}, regenerating`);
      }
    } catch (err) {
      log.warn(`Learn cache lookup failed for pointId=${pointId}, falling back to generation:`, err);
    }
  }

  // 2. Build a grounded requirement from the knowledge graph + uploaded resources
  let requirement: string;
  try {
    const doc = await loadKnowledge();
    const ctx = buildLearnContext(doc, pointId);
    if (!ctx) {
      return apiError('INVALID_REQUEST', 404, `Knowledge point not found: ${pointId}`);
    }
    const resources = await getResourcesForPoint(pointId);
    requirement = buildLearnRequirement(ctx, resources);
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to build learning context');
  }

  // 3. Delegate to the OpenMAIC multi-agent classroom generation pipeline (job-based).
  //    Media / TTS / web search are disabled for the MVP - only slides + multi-agent
  //    dialogue are generated (fastest and most reliable path).
  const input: GenerateClassroomInput = { requirement };

  try {
    const jobId = nanoid(10);
    await createClassroomGenerationJob(jobId, input);
    after(() =>
      runClassroomGenerationJob(jobId, input, baseUrl).then(async () => {
        // 生成成功后写入/更新缓存，下次访问同一知识点直接复用
        try {
          const job = await readClassroomGenerationJob(jobId);
          if (job?.status === 'succeeded' && job.result?.classroomId) {
            await upsertLearnCache(
              pointId,
              job.result.classroomId,
              jobId,
              job.result.scenesCount ?? null,
            );
            log.info(`Cached classroom for pointId=${pointId} classroomId=${job.result.classroomId}`);
          }
        } catch (cacheErr) {
          log.warn(`Failed to update learn cache for pointId=${pointId}:`, cacheErr);
        }
      }),
    );
    log.info(`Started classroom generation for pointId=${pointId} jobId=${jobId} force=${force}`);
    return apiSuccess(
      { jobId, pollUrl: `${baseUrl}/api/generate-classroom/${jobId}`, pollIntervalMs: 5000 },
      202,
    );
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to start generation');
  }
}