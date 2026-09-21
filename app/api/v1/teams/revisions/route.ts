import { FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { revisionStore } from '@/server/domain/store';
import { getAnonymousId, failure, readJson, resolveContext, success, withAnonymousCookie } from '@/server/http';
import { issue, validateTeam } from '@/server/domain/validation';
import type { TeamRevision } from '@/server/domain/types';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const formatId = typeof body.formatId === 'string' ? body.formatId : FORMAT_ID;
  const releaseId = typeof body.dataReleaseId === 'string' ? body.dataReleaseId : RELEASE_ID;
  const context = resolveContext(new Request(`https://vgc.local/api/v1/teams/revisions?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
  if (context.response) return context.response;
  const validation = validateTeam(body.slots, formatId);
  if (validation.issues.some((current) => current.blocking && current.code !== 'DATA_UNVERIFIED')) return failure(validation.issues, 422);
  if (validation.complete) return failure([issue('/dataReleaseId', 'DATA_UNVERIFIED', 'This provisional release cannot certify a complete team.', true, { dataStatus: context.meta?.dataStatus })], 422);
  const anonymous = getAnonymousId(request);
  const now = new Date().toISOString();
  const revision: TeamRevision = {
    id: crypto.randomUUID(),
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled team',
    formatId,
    dataReleaseId: releaseId,
    locale: body.locale === 'en' ? 'en' : 'it',
    slots: validation.slots,
    ownerId: anonymous.id,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  revisionStore.set(revision.id, revision);
  const { ownerId: _ownerId, ...publicRevision } = revision;
  const response = success({ revision: publicRevision, stats: validation.stats, issues: [] }, { ...context.meta, validationStatus: revision.status });
  return withAnonymousCookie(response, anonymous.id, anonymous.isNew);
}
