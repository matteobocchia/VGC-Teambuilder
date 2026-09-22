import { revisionStore } from '@/server/domain/store';
import { getDataSourceState } from '@/server/data/source';
import { getPostgresRevision, PostgresRepositoryError } from '@/server/data/postgres';
import { failure, getAnonymousId, resolveRuntimeContext, withAnonymousCookie, success } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const source = getDataSourceState();
  if (!source.ready) return failure([{ path: '/', code: source.reason ?? 'DATA_SOURCE_UNAVAILABLE', message: 'The configured data source is unavailable.', blocking: true }], 503);
  const { id } = await params;
  let revision;
  try {
    revision = source.kind === 'postgresql' ? await getPostgresRevision(id) : revisionStore.get(id);
  } catch (error) {
    const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
    return failure([issue('/', code, 'The team revision could not be loaded.')], 503, { dataSource: source.kind });
  }
  if (!revision) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  const anonymous = getAnonymousId(request);
  if (revision.ownerId !== anonymous.id) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  const parameters = new URLSearchParams({ formatId: revision.formatId, dataReleaseId: revision.dataReleaseId });
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/teams/revisions/${encodeURIComponent(id)}?${parameters}`));
  if (context.response) return context.response;
  const { ownerId: _ownerId, ...publicRevision } = revision;
  const response = success(publicRevision, { ...context.meta, validationStatus: revision.status });
  return withAnonymousCookie(response, anonymous.id, anonymous.isNew);
}
