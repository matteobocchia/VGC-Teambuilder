import { getPostgresRevision, PostgresRepositoryError, setPostgresShareToken } from '@/server/data/postgres';
import { getDataSourceState } from '@/server/data/source';
import { createShareToken, hashShareToken } from '@/server/domain/share';
import { revisionStore, shareTokenStore } from '@/server/domain/store';
import { failure, getAnonymousId, resolveRuntimeContext, success } from '@/server/http';
import { issue } from '@/server/domain/validation';

/** Create or rotate an anonymous read-only bearer link for a legal revision. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const source = getDataSourceState();
  if (!source.ready) return failure([{ path: '/', code: source.reason ?? 'DATA_SOURCE_UNAVAILABLE', message: 'The configured data source is unavailable.', blocking: true }], 503);
  const { id } = await params;
  const anonymous = getAnonymousId(request);
  let revision;
  try {
    revision = source.kind === 'postgresql' ? await getPostgresRevision(id) : revisionStore.get(id);
  } catch (error) {
    const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
    return failure([issue('/', code, 'The team revision could not be loaded.')], 503, { dataSource: source.kind });
  }
  if (!revision || revision.ownerId !== anonymous.id) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  if (revision.status !== 'legal' || revision.slots.length !== 6 || revision.slots.some((slot) => slot === null)) {
    return failure([issue('/id', 'REVISION_NOT_SHAREABLE', 'Only a complete legal revision can be shared read-only.')], 422, { validationStatus: revision.status });
  }

  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/teams/revisions/${encodeURIComponent(id)}?formatId=${encodeURIComponent(revision.formatId)}&dataReleaseId=${encodeURIComponent(revision.dataReleaseId)}`));
  if (context.response) return context.response;
  const token = createShareToken();
  const tokenHash = await hashShareToken(token);
  try {
    if (source.kind === 'postgresql') {
      const updated = await setPostgresShareToken(id, anonymous.id, tokenHash);
      if (!updated) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404, context.meta ?? {});
    } else {
      shareTokenStore.set(id, tokenHash);
    }
  } catch (error) {
    const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
    return failure([issue('/', code, 'The share link could not be created.')], 503, context.meta ?? {});
  }

  const shareUrl = new URL(`/teams/revisions/${encodeURIComponent(id)}?shareToken=${encodeURIComponent(token)}`, request.url).toString();
  return success({ revisionId: id, shareToken: token, shareUrl, readOnly: true }, { ...context.meta, access: 'owner', readOnly: true, validationStatus: revision.status });
}
