import { dataMeta, getFormat, getRelease, makeMeta, FORMAT_ID, RELEASE_ID } from './domain/repository';
import type { DataMeta, Issue } from './domain/types';
import { issue } from './domain/validation';

export function success<T>(data: T, extraMeta: Partial<DataMeta> & Record<string, unknown> = {}) {
  return Response.json({ data, meta: { ...makeMeta(), ...extraMeta } }, { headers: { 'Cache-Control': 'no-store' } });
}

export function failure(issues: Issue[], status = 422, extraMeta: Record<string, unknown> = {}) {
  return Response.json({ issues, meta: { ...dataMeta, ...extraMeta } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function resolveContext(request: Request): { formatId: string; releaseId: string; meta?: DataMeta; response?: Response } {
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
