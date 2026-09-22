import { FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { failure, readJson, resolveRuntimeContext } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const formatId = typeof body.formatId === 'string' ? body.formatId : FORMAT_ID;
  const releaseId = typeof body.dataReleaseId === 'string' ? body.dataReleaseId : RELEASE_ID;
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/showdown/export?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
  if (context.response) return context.response;
  if (typeof body.revisionId !== 'string' && !Array.isArray(body.slots)) return failure([issue('/', 'EXPORT_INPUT_REQUIRED', 'Provide a revisionId or six slots to export.')], 422);
  return failure([issue('/dataReleaseId', 'DATA_UNVERIFIED', 'Export is disabled until the canonical release and Showdown aliases are verified.', true, { dataStatus: context.meta?.dataStatus })], 422);
}
