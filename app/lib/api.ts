export type ApiLocale = 'it' | 'en';
export type DataStatus = 'certified' | 'provisional' | 'unverified';

export type ApiMeta = {
  apiVersion?: string;
  schemaVersion?: string;
  releaseId: string | null;
  checksum: string | null;
  dataStatus: DataStatus;
  source?: string;
  gaps: string[];
  dataSource?: string;
  dataSourceReady?: boolean;
  coverage?: {
    catalog: 'complete' | 'partial' | 'unknown' | 'unavailable';
    legalities: 'complete' | 'partial' | 'unknown' | 'unavailable';
    learnsets: 'complete' | 'partial' | 'unknown' | 'unavailable';
    damageEngine: 'available' | 'unavailable';
    teamValidation: 'available' | 'preview-only' | 'unavailable';
  };
};

export type ApiLabels = { it: string | null; en: string };

export type ApiOption = {
  id: string;
  labels: ApiLabels;
};

export type ApiStatValues = Record<'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', number>;

export type ApiInitialSet = {
  speciesId: string;
  formId?: string;
  teraTypeId?: string;
  itemId: string | null;
  abilityId: string;
  natureId: string;
  level: 50;
  statPoints: ApiStatValues;
  moveIds: string[];
};

export type ApiPokemon = ApiOption & {
  speciesId: string;
  formId: string;
  role: ApiOption;
  types: ApiOption[];
  baseStats: ApiStatValues;
  abilities: ApiOption[];
  items: ApiOption[];
  learnableMoves: ApiOption[];
  legalFormats: string[];
  legalityStatus?: 'allowed' | 'banned' | 'conditional' | 'unknown';
  initialSet?: ApiInitialSet;
};

export type ApiCatalogPage = {
  pokemon: ApiPokemon[];
  total: number;
  dataReleaseId: string;
  nextCursor?: string;
};

export type ApiFormat = {
  id: string;
  labels: ApiLabels;
  game: 'pokemon-champions';
  context: 'ranked-battles' | 'vgc-championship' | 'fixture';
  battleMode: 'singles' | 'doubles';
  level: 50;
  dataReleaseId: string;
  statPoints: { perStatMax: 32; totalMax: 66 };
  speciesClause: boolean;
  itemClause: boolean;
  capabilities: { tera: boolean; damageEngine: boolean };
};

type ApiEnvelope<T> = { data: T; meta: ApiMeta };

export type ApiIssue = { path: string; code: string; message: string; blocking: boolean };

export type ApiTeamSet = {
  speciesId: string;
  formId?: string;
  teraTypeId?: string;
  itemId: string | null;
  abilityId: string;
  natureId: string;
  level: 50;
  statPoints: ApiStatValues;
  moveIds: string[];
};

export type ApiTeamRevision = {
  id: string;
  name: string;
  formatId: string;
  dataReleaseId: string;
  locale: ApiLocale;
  slots: Array<ApiTeamSet | null>;
  status: 'draft' | 'blocked' | 'legal';
  createdAt: string;
  updatedAt: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const defaultFormatId = 'champions-regulation-mb-doubles';

async function requestJson<T>(path: string, options: { signal?: AbortSignal; method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 12_000);
  const abortCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortCaller, { once: true });
  try {
    const response = await fetch(path, { method: options.method ?? 'GET', headers: { Accept: 'application/json', ...(options.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, body: options.method === 'POST' ? JSON.stringify(options.body) : undefined, signal: controller.signal });
    let payload: (ApiEnvelope<T> & { issues?: ApiIssue[] }) | null = null;
    try {
      payload = (await response.json()) as ApiEnvelope<T> & { issues?: ApiIssue[] };
    } catch {
      throw new ApiClientError('The data service returned an invalid response.', response.status, 'INVALID_API_RESPONSE');
    }
    if (!response.ok) {
      const apiIssue = payload?.issues?.[0];
      throw new ApiClientError(apiIssue?.message ?? 'The data service is unavailable.', response.status, apiIssue?.code ?? 'DATA_SERVICE_UNAVAILABLE', payload?.issues ?? []);
    }
    if (!payload || payload.data === undefined || !payload.meta) throw new ApiClientError('The data service returned an invalid response.', response.status, 'INVALID_API_RESPONSE');
    return payload;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (options.signal?.aborted) throw error;
    if (controller.signal.aborted) throw new ApiClientError('The data service timed out.', 408, 'REQUEST_TIMEOUT');
    throw new ApiClientError('The data service is unavailable.', 503, 'DATA_SERVICE_UNAVAILABLE');
  } finally {
    globalThis.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortCaller);
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<ApiEnvelope<T>> {
  return requestJson<T>(path, { signal });
}

export async function getCatalogContext(options: { formatId?: string; dataReleaseId?: string; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams({ formatId: options.formatId ?? defaultFormatId });
  if (options.dataReleaseId) params.set('dataReleaseId', options.dataReleaseId);
  return getJson<{ format: ApiFormat; types: ApiOption[]; natures: ApiOption[]; roles: ApiOption[]; abilities: ApiOption[] }>(`/api/v1/catalog/context?${params}`, options.signal);
}

export async function getCatalogPokemon(options: { formatId?: string; dataReleaseId?: string; locale?: ApiLocale; query?: string; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams({ formatId: options.formatId ?? defaultFormatId, limit: '100' });
  if (options.dataReleaseId) params.set('dataReleaseId', options.dataReleaseId);
  if (options.locale) params.set('locale', options.locale);
  if (options.query?.trim()) params.set('q', options.query.trim());
  const first = await getJson<ApiCatalogPage>(`/api/v1/catalog/pokemon?${params}`, options.signal);
  const allPokemon = [...first.data.pokemon];
  let cursor = first.data.nextCursor;
  while (cursor && allPokemon.length < first.data.total) {
    params.set('offset', cursor);
    const page = await getJson<ApiCatalogPage>(`/api/v1/catalog/pokemon?${params}`, options.signal);
    allPokemon.push(...page.data.pokemon);
    cursor = page.data.nextCursor;
  }
  return { ...first, data: { ...first.data, pokemon: allPokemon, nextCursor: undefined } };
}

export async function saveTeamRevision(input: { name: string; formatId: string; dataReleaseId: string; locale: ApiLocale; slots: Array<ApiTeamSet | null> }, signal?: AbortSignal) {
  return requestJson<{ revision: ApiTeamRevision; stats: Array<ApiStatValues | null>; issues: ApiIssue[] }>('/api/v1/teams/revisions', { method: 'POST', body: input, signal });
}

export async function getTeamRevision(id: string, signal?: AbortSignal) {
  return getJson<ApiTeamRevision>(`/api/v1/teams/revisions/${encodeURIComponent(id)}`, signal);
}

export { defaultFormatId };
