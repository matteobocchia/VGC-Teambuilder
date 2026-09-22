import { FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { resolveDamageEngine, validateDamageRequest } from '@/server/domain/damage';
import { failure, readJson, resolveRuntimeContext } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  if (body.formatId !== undefined && (typeof body.formatId !== 'string' || !body.formatId.trim())) return failure([issue('/formatId', 'FORMAT_ID_INVALID', 'formatId must be a non-empty string when provided.')], 400);
  if (body.dataReleaseId !== undefined && (typeof body.dataReleaseId !== 'string' || !body.dataReleaseId.trim())) return failure([issue('/dataReleaseId', 'DATA_RELEASE_ID_INVALID', 'dataReleaseId must be a non-empty string when provided.')], 400);
  const formatId = typeof body.formatId === 'string' ? body.formatId : FORMAT_ID;
  const releaseId = typeof body.dataReleaseId === 'string' ? body.dataReleaseId : RELEASE_ID;
  const validation = validateDamageRequest({ ...body, formatId, dataReleaseId: releaseId });
  if (validation.issues.length) return failure(validation.issues, 400);
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/calculator?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
  if (context.response) return context.response;
  const engine = resolveDamageEngine(context);
  if (!engine) return failure([issue('/dataReleaseId', 'DATA_UNVERIFIED', 'No certified Champions damage engine is available for this release.', true, { dataStatus: context.meta?.dataStatus, engine: 'not-compatible-with-certified-mb-release' })], 422, { ...context.meta, mechanicsVersion: null });
  return failure([issue('/', 'DAMAGE_ENGINE_UNAVAILABLE', 'The configured damage engine cannot calculate this request.', true)], 503, { ...context.meta, mechanicsVersion: engine.mechanicsVersion });
}
