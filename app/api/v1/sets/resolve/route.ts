import { FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { failure, readJson, resolveRuntimeContext } from '@/server/http';
import { issue, validateSet } from '@/server/domain/validation';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const formatId = typeof body.formatId === 'string' ? body.formatId : FORMAT_ID;
  const releaseId = typeof body.dataReleaseId === 'string' ? body.dataReleaseId : RELEASE_ID;
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/sets/resolve?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
  if (context.response) return context.response;
  if (context.runtime === 'postgresql') return failure([issue('/set', 'POSTGRESQL_VALIDATION_NOT_CONFIGURED', 'Set validation is not yet connected to the PostgreSQL release repository.', true)], 503, context.meta ?? {});
  const result = validateSet(body.set, formatId);
  if (result.issues.length) return failure(result.issues, 422);
  return failure([{
    path: '/dataReleaseId',
    code: 'DATA_UNVERIFIED',
    message: 'This provisional release cannot certify a legal set.',
    blocking: true,
    details: { dataStatus: context.meta?.dataStatus },
  }], 422);
}
