import { revisionStore, shareTokenStore } from '@/server/domain/store';
import { getDataSourceState } from '@/server/data/source';
import { getPostgresRevision, getPostgresRevisionByShareToken, PostgresRepositoryError } from '@/server/data/postgres';
import { failure, getAnonymousId, resolveRuntimeContext, success, withAnonymousCookie } from '@/server/http';
import { issue } from '@/server/domain/validation';
import { equalShareTokenHash as compareShareTokenHash, hashShareToken, isShareToken } from '@/server/domain/share';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const source = getDataSourceState();
  if (!source.ready) return failure([{ path: '/', code: source.reason ?? 'DATA_SOURCE_UNAVAILABLE', message: 'The configured data source is unavailable.', blocking: true }], 503);
  const { id } = await params;
  const shareToken = new URL(request.url).searchParams.get('shareToken');
  if (shareToken !== null && !isShareToken(shareToken)) return failure([issue('/shareToken', 'SHARE_TOKEN_INVALID', 'The share token is invalid.')], 404);
  let revision;
  try {
    if (shareToken) {
      const tokenHash = await hashShareToken(shareToken);
      revision = source.kind === 'postgresql'
        ? await getPostgresRevisionByShareToken(id, tokenHash)
        : shareTokenMatchesRevision(id, tokenHash) ? revisionStore.get(id) : undefined;
    } else {
      revision = source.kind === 'postgresql' ? await getPostgresRevision(id) : revisionStore.get(id);
    }
  } catch (error) {
    const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
    return failure([issue('/', code, 'The team revision could not be loaded.')], 503, { dataSource: source.kind });
  }
  if (!revision) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  const anonymous = getAnonymousId(request);
  const access = shareToken ? 'share' : 'owner';
  if (!shareToken && revision.ownerId !== anonymous.id) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  const parameters = new URLSearchParams({ formatId: revision.formatId, dataReleaseId: revision.dataReleaseId });
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/teams/revisions/${encodeURIComponent(id)}?${parameters}`));
  if (context.response) return context.response;
  const { ownerId: _ownerId, ...publicRevision } = revision;
  const response = success(publicRevision, { ...context.meta, validationStatus: revision.status, access, readOnly: access === 'share' });
  return withAnonymousCookie(response, anonymous.id, anonymous.isNew);
}

function shareTokenMatchesRevision(id: string, tokenHash: string): boolean {
  // The preview repository mirrors the PostgreSQL team-level token column by
  // keeping only a digest keyed by revision ID. No raw bearer token is stored.
  const storedHash = shareTokenStore.get(id);
  return storedHash !== undefined && compareShareTokenHash(storedHash, tokenHash);
}
