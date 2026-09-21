import { FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { failure, readJson, resolveContext } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const formatId = typeof body.formatId === 'string' ? body.formatId : FORMAT_ID;
  const releaseId = typeof body.dataReleaseId === 'string' ? body.dataReleaseId : RELEASE_ID;
  const context = resolveContext(new Request(`https://vgc.local/api/v1/showdown/import?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
  if (context.response) return context.response;
  if (typeof body.text !== 'string' || !body.text.trim()) return failure([issue('/text', 'SHOWDOWN_TEXT_REQUIRED', 'Showdown text is required.')], 422);
  return failure([issue('/dataReleaseId', 'DATA_UNVERIFIED', 'Import cannot certify a Champions team until the release is verified.', true, { dataStatus: context.meta?.dataStatus })], 422);
}
