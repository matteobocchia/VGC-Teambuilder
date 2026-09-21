import { revisionStore } from '@/server/domain/store';
import { getAnonymousId, failure, withAnonymousCookie, success } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const revision = revisionStore.get(id);
  if (!revision) return failure([issue('/id', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404);
  const anonymous = getAnonymousId(request);
  if (revision.ownerId !== anonymous.id) return failure([issue('/id', 'REVISION_FORBIDDEN', 'Revision belongs to another anonymous browser.')], 403);
  const { ownerId: _ownerId, ...publicRevision } = revision;
  const response = success(publicRevision);
  return withAnonymousCookie(response, anonymous.id, anonymous.isNew);
}
