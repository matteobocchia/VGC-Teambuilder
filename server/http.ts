import { dataMeta, getFormat, getRelease, makeMeta, FORMAT_ID, RELEASE_ID } from './domain/repository';
import { configuredFormatId, configuredReleaseId, dataSourceMeta, getDataSourceState } from './data/source';
import { getPostgresContext, PostgresRepositoryError, type RuntimeContext } from './data/postgres';
import type { DataMeta, Issue } from './domain/types';
import { issue } from './domain/validation';

function unavailableMeta(): Record<string, unknown> {
  const state = getDataSourceState();
  return {
    apiVersion: dataMeta.apiVersion,
    schemaVersion: dataMeta.schemaVersion,
    releaseId: null,
    checksum: null,
    dataStatus: 'unavailable',
    source: state.kind,
    gaps: ['DATA_SOURCE_UNAVAILABLE', ...(state.reason ? [state.reason] : [])],
    coverage: {
      catalog: 'unavailable',
      legalities: 'unavailable',
      learnsets: 'unavailable',
      damageEngine: 'unavailable',
      teamValidation: 'unavailable',
    },
    ...dataSourceMeta(),
  };
}

function responseMeta(): Record<string, unknown> {
  return getDataSourceState().kind === 'bundled-preview'
    ? { ...makeMeta(), ...dataSourceMeta() }
    : unavailableMeta();
}

export function success<T>(data: T, extraMeta: Partial<DataMeta> & Record<string, unknown> = {}) {
  return Response.json({ data, meta: { ...responseMeta(), ...extraMeta } }, { headers: { 'Cache-Control': 'no-store' } });
}

export function failure(issues: Issue[], status = 422, extraMeta: Record<string, unknown> = {}) {
  return Response.json({ issues, meta: { ...responseMeta(), ...extraMeta } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function ensureDataSource(): Response | undefined {
  const state = getDataSourceState();
  if (state.ready) return undefined;
  const code = state.reason ?? 'DATA_SOURCE_UNAVAILABLE';
  const message = code === 'DATABASE_URL_REQUIRED'
    ? 'DATABASE_URL is required outside local development; bundled preview data is disabled.'
    : code === 'POSTGRESQL_RUNTIME_UNSUPPORTED'
      ? 'PostgreSQL is configured, but this runtime does not support the Node PostgreSQL adapter.'
      : 'PostgreSQL is configured, but its server-side adapter is not available.';
  return failure([{ path: '/', code, message, blocking: true }], 503, dataSourceMeta());
}

export function resolveContext(request: Request): { formatId: string; releaseId: string; meta?: DataMeta; response?: Response } {
  const sourceResponse = ensureDataSource();
  if (sourceResponse) return { formatId: '', releaseId: '', response: sourceResponse };
  const url = new URL(request.url);
  const formatId = url.searchParams.get('formatId') ?? FORMAT_ID;
  const releaseId = url.searchParams.get('dataReleaseId') ?? url.searchParams.get('releaseId') ?? RELEASE_ID;
  const format = getFormat(formatId);
  if (!format) return { formatId, releaseId, response: failure([issue('/formatId', 'UNKNOWN_FORMAT', 'Format is not available.')], 404) };
  const meta = getRelease(releaseId);
  if (!meta) return { formatId, releaseId, response: failure([issue('/dataReleaseId', 'UNKNOWN_RELEASE', 'Data release is not available.')], 404) };
  if (format.dataReleaseId !== releaseId) return { formatId, releaseId, response: failure([issue('/dataReleaseId', 'RELEASE_FORMAT_MISMATCH', 'Release does not contain the requested format.')], 422) };
  return { formatId, releaseId, meta };
}

export async function resolveRuntimeContext(request: Request): Promise<{
  formatId: string;
  releaseId: string;
  meta?: DataMeta;
  format?: RuntimeContext['format'];
  runtime: 'bundled-preview' | 'postgresql';
  postgresContext?: RuntimeContext;
  response?: Response;
}> {
  const sourceResponse = ensureDataSource();
  if (sourceResponse) return { formatId: '', releaseId: '', runtime: 'bundled-preview', response: sourceResponse };
  const state = getDataSourceState();
  const url = new URL(request.url);
  const formatId = url.searchParams.get('formatId') ?? configuredFormatId() ?? FORMAT_ID;
  const requestedReleaseId = url.searchParams.get('dataReleaseId') ?? url.searchParams.get('releaseId');
  const releaseId = requestedReleaseId ?? (state.kind === 'postgresql' ? configuredReleaseId() : RELEASE_ID);
  if (!releaseId) return {
    formatId,
    releaseId: '',
    runtime: 'postgresql',
    response: failure([issue('/dataReleaseId', 'DATA_RELEASE_REQUIRED', 'dataReleaseId is required when the PostgreSQL repository is active.')], 400),
  };

  if (state.kind !== 'postgresql') {
    const context = resolveContext(new Request(`https://vgc.local/api/v1/context?formatId=${encodeURIComponent(formatId)}&dataReleaseId=${encodeURIComponent(releaseId)}`));
    return { ...context, runtime: 'bundled-preview' };
  }

  try {
    const postgresContext = await getPostgresContext(formatId, releaseId);
    if (!postgresContext) return {
      formatId,
      releaseId,
      runtime: 'postgresql',
      response: failure([issue('/dataReleaseId', 'UNKNOWN_RELEASE_OR_FORMAT', 'The requested format and exact data release are not available together.')], 404),
    };
    return { formatId, releaseId, meta: postgresContext.meta, format: postgresContext.format, runtime: 'postgresql', postgresContext };
  } catch (error) {
    return {
      formatId,
      releaseId,
      runtime: 'postgresql',
      response: postgresFailure(error),
    };
  }
}

function postgresFailure(error: unknown): Response {
  const code = error instanceof PostgresRepositoryError ? error.code : 'POSTGRESQL_UNAVAILABLE';
  const message = error instanceof PostgresRepositoryError ? error.message : 'The PostgreSQL repository is unavailable.';
  return failure([issue('/', code, message)], 503, dataSourceMeta());
}

export async function readJson(request: Request): Promise<{ value?: unknown; issues: Issue[] }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return { issues: [issue('/', 'UNSUPPORTED_MEDIA_TYPE', 'Request body must use application/json.')] };
  const body = await request.text();
  if (body.length > 32768) return { issues: [issue('/', 'PAYLOAD_TOO_LARGE', 'Request body exceeds 32 KiB.')] };
  try {
    const value: unknown = JSON.parse(body);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return { issues: [issue('/', 'JSON_OBJECT_REQUIRED', 'Request body must be a JSON object.')] };
    return { value, issues: [] };
  } catch {
    return { issues: [issue('/', 'INVALID_JSON', 'Request body is not valid JSON.')] };
  }
}

export function getAnonymousId(request: Request): { id: string; isNew: boolean } {
  const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)vgc_anon=([^;]+)/)?.[1];
  if (!cookie) return { id: crypto.randomUUID(), isNew: true };
  try {
    const decoded = decodeURIComponent(cookie);
    if (/^[a-zA-Z0-9-]{16,100}$/.test(decoded)) return { id: decoded, isNew: false };
  } catch {
    // Treat malformed client cookies as a new anonymous browser.
  }
  return { id: crypto.randomUUID(), isNew: true };
}

export function withAnonymousCookie(response: Response, anonymousId: string, isNew: boolean): Response {
  if (isNew) {
    const secure = typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append('Set-Cookie', `vgc_anon=${encodeURIComponent(anonymousId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
  }
  return response;
}
