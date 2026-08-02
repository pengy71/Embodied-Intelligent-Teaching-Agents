import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loadKnowledge, isTeachingStoreConfigured, getResourcesForPoint } from '@/lib/teaching/store';
import { buildLearnContext, buildLearnRequirement } from '@/lib/teaching/learn-prompt';
import type { GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('LearnAPI');

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!isTeachingStoreConfigured()) {
    return apiError('INVALID_REQUEST', 503, 'Teaching knowledge base not configured: please set DATABASE_URL');
  }

  let body: { pointId?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const pointId = body?.pointId;
  if (!pointId || typeof pointId !== 'string') {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: pointId');
  }

  // 1. Build a grounded requirement from the knowledge graph + uploaded resources
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

  // 2. Delegate to the OpenMAIC multi-agent classroom generation pipeline (job-based).
  //    Media / TTS / web search are disabled for the MVP — only slides + multi-agent
  //    dialogue are generated (fastest and most reliable path).
  const input: GenerateClassroomInput = { requirement };
  const baseUrl = buildRequestOrigin(req);

  try {
    const jobId = nanoid(10);
    await createClassroomGenerationJob(jobId, input);
    after(() => runClassroomGenerationJob(jobId, input, baseUrl));
    log.info(`Started classroom generation for pointId=${pointId} jobId=${jobId}`);
    return apiSuccess(
      { jobId, pollUrl: `${baseUrl}/api/generate-classroom/${jobId}`, pollIntervalMs: 5000 },
      202,
    );
  } catch (err) {
    return apiError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Failed to start generation');
  }
}