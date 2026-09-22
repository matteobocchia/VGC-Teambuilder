import { getPostgresCatalog, getPostgresContextOptions, PostgresRepositoryError } from '@/server/data/postgres';
import { getCatalog, formatProfile, natureOptions, typeOptions } from '@/server/domain/repository';
import { parseShowdownTeam } from '@/server/domain/showdown';
import { issue, type ValidationCatalog } from '@/server/domain/validation';
import type { Issue } from '@/server/domain/types';
import { failure, readJson, resolveRuntimeContext, success } from '@/server/http';

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (parsed.issues.length) return failure(parsed.issues, parsed.issues[0].code === 'PAYLOAD_TOO_LARGE' ? 413 : parsed.issues[0].code === 'UNSUPPORTED_MEDIA_TYPE' ? 415 : 400);
  const body = parsed.value as Record<string, unknown>;
  const inputIssues: Issue[] = [];
  for (const field of ['formatId', 'dataReleaseId'] as const) {
    if (body[field] !== undefined && (typeof body[field] !== 'string' || !body[field].trim())) inputIssues.push(issue(`/${field}`, `${field === 'formatId' ? 'FORMAT_ID' : 'DATA_RELEASE_ID'}_INVALID`, `${field} must be a non-empty string.`));
  }
  if (body.locale !== undefined && body.locale !== 'it' && body.locale !== 'en') inputIssues.push(issue('/locale', 'LOCALE_INVALID', 'Locale must be it or en.'));
  if (typeof body.text !== 'string' || !body.text.trim()) inputIssues.push(issue('/text', 'SHOWDOWN_TEXT_REQUIRED', 'Showdown text is required.'));
  if (inputIssues.length) return failure(inputIssues, 400);

  const parameters = new URLSearchParams();
  if (typeof body.formatId === 'string') parameters.set('formatId', body.formatId.trim());
  if (typeof body.dataReleaseId === 'string') parameters.set('dataReleaseId', body.dataReleaseId.trim());
  const context = await resolveRuntimeContext(new Request(`https://vgc.local/api/v1/showdown/import?${parameters}`));
  if (context.response) return context.response;

  let catalog: ValidationCatalog;
  try {
    if (context.runtime === 'postgresql') {
      const [pokemon, options] = await Promise.all([getPostgresCatalog(context.postgresContext!), getPostgresContextOptions(context.postgresContext!)]);
      catalog = { format: context.postgresContext!.format, pokemon, natureIds: options.natures.map((entry) => entry.id), natures: options.natures, types: options.types };
    } else catalog = { format: formatProfile, pokemon: getCatalog(), natureIds: natureOptions.map((entry) => entry.id), natures: natureOptions, types: typeOptions };
  } catch (error) {
    const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
    return failure([issue('/', code, 'The release catalog is unavailable.')], 503, context.meta ?? {});
  }
  const inspected = parseShowdownTeam(body.text as string, catalog);
  const certified = context.meta?.dataStatus === 'certified' && context.meta.coverage.catalog === 'complete' && context.meta.coverage.legalities === 'complete' && context.meta.coverage.learnsets === 'complete';
  const releaseIssues = certified ? [] : [issue('/dataReleaseId', 'DATA_UNVERIFIED', 'Showdown import requires a verified Champions catalog, learnsets and legality data.', true, { dataStatus: context.meta?.dataStatus })];
  const issues = [...inspected.issues, ...releaseIssues];
  if (issues.some((entry) => entry.blocking)) return failure(issues, 422, context.meta ?? {});
  return success({ slots: inspected.slots, issues: [] }, context.meta ?? {});
}
