export type DataSourceKind = 'postgresql' | 'bundled-preview' | 'unavailable';

export type DataSourceState = {
  kind: DataSourceKind;
  configured: boolean;
  ready: boolean;
  reason: 'DATABASE_URL_REQUIRED' | 'POSTGRESQL_RUNTIME_UNSUPPORTED' | 'POSTGRESQL_ADAPTER_NOT_CONFIGURED' | null;
};

function environment(): { databaseUrl: string; repository: string; nodeEnv: string } {
  if (typeof process === 'undefined') return { databaseUrl: '', repository: '', nodeEnv: '' };
  return {
    databaseUrl: process.env.DATABASE_URL?.trim() ?? '',
    repository: process.env.DATA_REPOSITORY?.trim().toLowerCase() ?? '',
    nodeEnv: process.env.NODE_ENV?.trim().toLowerCase() ?? '',
  };
}

export function isNodePostgresRuntime(): boolean {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

export function configuredFormatId(): string | undefined {
  const value = typeof process !== 'undefined' ? process.env.DATA_FORMAT_ID?.trim() : '';
  return value || undefined;
}

export function configuredReleaseId(): string | undefined {
  const value = typeof process !== 'undefined' ? process.env.DATA_RELEASE_ID?.trim() : '';
  return value || undefined;
}

/**
 * Selects the only data source allowed for the current runtime.
 *
 * The bundled catalog is deliberately a development/preview fixture. It is
 * never a production fallback and it is never used when DATABASE_URL is set.
 * The PostgreSQL adapter is loaded lazily by the Node runtime. This keeps
 * Cloudflare builds free of static Node imports; a Worker without a supported
 * SQL adapter fails explicitly instead of serving demo data.
 */
export function getDataSourceState(): DataSourceState {
  const { databaseUrl, repository, nodeEnv } = environment();
  const production = nodeEnv === 'production';

  if (repository === 'bundled-preview' && !production && !databaseUrl) {
    return { kind: 'bundled-preview', configured: false, ready: true, reason: null };
  }

  if (databaseUrl || repository === 'postgresql') {
    if (!databaseUrl) return { kind: 'unavailable', configured: false, ready: false, reason: 'DATABASE_URL_REQUIRED' };
    if (!isNodePostgresRuntime()) return { kind: 'unavailable', configured: true, ready: false, reason: 'POSTGRESQL_RUNTIME_UNSUPPORTED' };
    return { kind: 'postgresql', configured: true, ready: true, reason: null };
  }

  if (production) return { kind: 'unavailable', configured: false, ready: false, reason: 'DATABASE_URL_REQUIRED' };
  return { kind: 'bundled-preview', configured: false, ready: true, reason: null };
}

export function dataSourceMeta(): Record<string, unknown> {
  const state = getDataSourceState();
  return {
    dataSource: state.kind,
    dataSourceConfigured: state.configured,
    dataSourceReady: state.ready,
    dataSourceReason: state.reason,
    previewFallback: state.kind === 'bundled-preview',
  };
}
