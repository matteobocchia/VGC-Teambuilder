import { getPostgresCatalog, getPostgresContextOptions, getPostgresRevision, PostgresRepositoryError } from '@/server/data/postgres';
import { formatProfile, getCatalog, natureOptions, typeOptions } from '@/server/domain/repository';
import { serializeShowdownTeam } from '@/server/domain/showdown';
import { revisionStore } from '@/server/domain/store';
import { issue, type ValidationCatalog } from '@/server/domain/validation';
import type { Issue, TeamRevision } from '@/server/domain/types';
import { failure, getAnonymousId, readJson, resolveRuntimeContext, success } from '@/server/http';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const inputIssues: Issue[] = [];
  for (const field of ['formatId', 'dataReleaseId'] as const) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim())) inputIssues.push(issue(`/${field}`, `${field === 'formatId' ? 'FORMAT_ID' : 'DATA_RELEASE_ID'}_INVALID`, `${field} must be a non-empty string.`));
  }
  const hasRevision = typeof body.revisionId === 'string' && body.revisionId.trim().length > 0;
  const hasSlots = Array.isArray(body.slots);
  if (hasRevision === hasSlots) inputIssues.push(issue('/', 'EXPORT_INPUT_REQUIRED', 'Provide exactly one of revisionId or six slots.'));
  if (body.revisionId !== undefined && !hasRevision) inputIssues.push(issue('/revisionId', 'REVISION_ID_INVALID', 'revisionId must be a non-empty string.'));
  if (body.slots !== undefined && !hasSlots) inputIssues.push(issue('/slots', 'SIX_SLOTS_REQUIRED', 'slots must be an array of six sets.'));
  if (inputIssues.length) return failure(inputIssues, 400);

  const parameters = new URLSearchParams();
  if (typeof body.formatId === 'string') parameters.set('formatId', body.formatId.trim());
  if (typeof body.dataReleaseId === 'string') parameters.set('dataReleaseId', body.dataReleaseId.trim());
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/showdown/export?${parameters}`));
  if (context.response) return context.response;
  let catalog: ValidationCatalog;
  let revision: TeamRevision | undefined;
  try {
    if (context.runtime === 'postgresql') {
      const [pokemon, options] = await Promise.all([getPostgresCatalog(context.postgresContext!), getPostgresContextOptions(context.postgresContext!)]);
      catalog = { format: context.postgresContext!.format, pokemon, natureIds: options.natures.map((entry) => entry.id), natures: options.natures, types: options.types };
      if (hasRevision) revision = await getPostgresRevision(body.revisionId as string);
    } else {
      catalog = { format: formatProfile, pokemon: getCatalog(), natureIds: natureOptions.map((entry) => entry.id), natures: natureOptions, types: typeOptions };
      if (hasRevision) revision = revisionStore.get(body.revisionId as string);
    }
  } catch (error) {
    const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
    return failure([issue('/', code, 'The release catalog or revision is unavailable.')], 503, context.meta ?? {});
  }
  if (hasRevision && (!revision || revision.ownerId !== getAnonymousId(request).id)) return failure([issue('/revisionId', 'REVISION_NOT_FOUND', 'Team revision was not found.')], 404, context.meta ?? {});
  if (revision && (revision.formatId !== context.formatId || revision.dataReleaseId !== context.releaseId)) return failure([issue('/revisionId', 'REVISION_RELEASE_MISMATCH', 'Team revision belongs to a different format or data release.')], 422, context.meta ?? {});

  const certified = context.meta?.dataStatus === 'certified' && context.meta.coverage.catalog === 'complete' && context.meta.coverage.legalities === 'complete' && context.meta.coverage.learnsets === 'complete';
  if (!certified) return failure([issue('/dataReleaseId', 'DATA_UNVERIFIED', 'Showdown export requires a verified Champions catalog, learnsets and legality data.', true, { dataStatus: context.meta?.dataStatus })], 422, context.meta ?? {});
  const exported = serializeShowdownTeam((revision?.slots ?? body.slots) as TeamRevision['slots'], catalog, catalog.format);
  if (exported.issues.some((entry) => entry.blocking) || exported.text === null) return failure(exported.issues, 422, context.meta ?? {});
  return success({ text: exported.text }, context.meta ?? {});
}
