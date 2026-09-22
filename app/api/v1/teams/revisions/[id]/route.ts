import { revisionStore } from '@/server/domain/store';
import { getDataSourceState } from '@/server/data/source';
import { failure, getAnonymousId, withAnonymousCookie, success } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const source = getDataSourceState();
  if (!source.ready) return failure([{ path: '/', code: source.reason ?? 'DATA_SOURCE_UNAVAILABLE', message: 'The configured data source is unavailable.', blocking: true }], 503);
  if (source.kind === 'postgresql') return failure([{ path: '/', code: 'POSTGRESQL_TEAM_REPOSITORY_NOT_CONFIGURED', message: 'Team revisions are not yet connected to the PostgreSQL repository.', blocking: true }], 503, { dataSource: source.kind });
  const { id } = await params;
  const revision = revisionStore.get(id);
  if (!revision) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  const anonymous = getAnonymousId(request);
  if (revision.ownerId !== anonymous.id) return failure([issue('/id', 'REVISION_FORBIDDEN', 'Revision belongs to another anonymous browser.')], 403);
  const { ownerId: _ownerId, ...publicRevision } = revision;
  const response = success(publicRevision);
  return withAnonymousCookie(response, anonymous.id, anonymous.isNew);
}
