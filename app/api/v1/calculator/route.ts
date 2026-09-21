import { FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { failure, readJson, resolveContext } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const formatId = typeof body.formatId === 'string' ? body.formatId : FORMAT_ID;
  const releaseId = typeof body.dataReleaseId === 'string' ? body.dataReleaseId : RELEASE_ID;
  const context = resolveContext(new Request(`https://vgc.local/api/v1/calculator?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
  if (context.response) return context.response;
  return failure([issue('/dataReleaseId', 'DATA_UNVERIFIED', 'No certified Champions damage engine is available for this release.', true, { dataStatus: context.meta?.dataStatus, engine: 'not-compatible-with-certified-mb-release' })], 422, { mechanicsVersion: null });
}
