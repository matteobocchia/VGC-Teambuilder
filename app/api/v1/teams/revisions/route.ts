import { getPostgresCatalog, getPostgresContextOptions, PostgresRepositoryError, savePostgresRevision } from '@/server/data/postgres';
import { revisionStore } from '@/server/domain/store';
import { getAnonymousId, failure, readJson, resolveRuntimeContext, success, withAnonymousCookie } from '@/server/http';
import { issue, validateTeam, type ValidationCatalog } from '@/server/domain/validation';
import type { Issue, TeamRevision } from '@/server/domain/types';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const inputIssues: Issue[] = [];
  for (const field of ['formatId', 'dataReleaseId'] as const) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim())) inputIssues.push(issue(`/${field}`, `${field === 'formatId' ? 'FORMAT_ID' : 'DATA_RELEASE_ID'}_INVALID`, `${field} must be a non-empty string.`));
  }
  if (body.locale !== undefined && body.locale !== 'it' && body.locale !== 'en') inputIssues.push(issue('/locale', 'LOCALE_INVALID', 'Locale must be it or en.'));
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length > 120)) inputIssues.push(issue('/name', 'TEAM_NAME_INVALID', 'Team name must contain at most 120 characters.'));
  if (inputIssues.length) return failure(inputIssues, 400);

  const parameters = new URLSearchParams();
  if (typeof body.formatId === 'string') parameters.set('formatId', body.formatId.trim());
  if (typeof body.dataReleaseId === 'string') parameters.set('dataReleaseId', body.dataReleaseId.trim());
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/teams/revisions?${parameters}`));
  if (context.response) return context.response;

  let catalog: ValidationCatalog | undefined;
  if (context.runtime === 'postgresql') {
    try {
      const [pokemon, options] = await Promise.all([
        getPostgresCatalog(context.postgresContext!),
        getPostgresContextOptions(context.postgresContext!),
      ]);
      catalog = { format: context.postgresContext!.format, pokemon, natureIds: options.natures.map((nature) => nature.id) };
    } catch (error) {
      const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
      return failure([issue('/', code, 'The release catalog is unavailable.')], 503, context.meta ?? {});
    }
  }

  const validation = validateTeam(body.slots, context.formatId, catalog);
  if (validation.issues.some((current) => current.blocking)) return failure(validation.issues, 422, context.meta ?? {});

  const selectedPokemon = catalog?.pokemon.filter((pokemon) => validation.slots.some((set) => set?.formId === pokemon.formId)) ?? [];
  const certified = context.meta?.dataStatus === 'certified'
    && context.meta.coverage.legalities === 'complete'
    && context.meta.coverage.learnsets === 'complete'
    && context.meta.coverage.teamValidation === 'available'
    && (catalog ? selectedPokemon.length === 6 && selectedPokemon.every((pokemon) => pokemon.legalityStatus === 'allowed') : false);
  const status: TeamRevision['status'] = !validation.complete ? 'draft' : certified ? 'legal' : 'blocked';
  const warnings = validation.complete && !certified
    ? [issue('/dataReleaseId', 'DATA_UNVERIFIED', 'This release cannot certify team legality; the complete team was saved as a blocked draft.', false, { dataStatus: context.meta?.dataStatus })]
    : [];
  const anonymous = getAnonymousId(request);
  const now = new Date().toISOString();
  const revision: TeamRevision = {
    id: crypto.randomUUID(),
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled team',
    formatId: context.formatId,
    dataReleaseId: context.releaseId,
    locale: body.locale === 'en' ? 'en' : 'it',
    slots: validation.slots,
    ownerId: anonymous.id,
    status,
    createdAt: now,
    updatedAt: now,
  };
  if (context.runtime === 'postgresql') {
    try {
      await savePostgresRevision(revision);
    } catch (error) {
      const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
      return failure([issue('/', code, 'The team revision could not be saved.')], 503, context.meta ?? {});
    }
  } else revisionStore.set(revision.id, revision);

  const { ownerId: _ownerId, ...publicRevision } = revision;
  const response = success({ revision: publicRevision, stats: validation.stats, issues: warnings }, { ...context.meta, validationStatus: status });
  return withAnonymousCookie(response, anonymous.id, anonymous.isNew);
}
