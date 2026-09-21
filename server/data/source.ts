export type DataSourceKind = 'postgresql' | 'bundled-preview' | 'unavailable';

export type DataSourceState = {
  kind: DataSourceKind;
  configured: boolean;
  ready: boolean;
  reason: 'DATABASE_URL_REQUIRED' | 'POSTGRESQL_ADAPTER_NOT_CONFIGURED' | null;
};

function environment(): { databaseUrl: string; repository: string; nodeEnv: string } {
  if (typeof process === 'undefined') return { databaseUrl: '', repository: '', nodeEnv: '' };
  return {
    databaseUrl: process.env.DATABASE_URL?.trim() ?? '',
    repository: process.env.DATA_REPOSITORY?.trim().toLowerCase() ?? '',
    nodeEnv: process.env.NODE_ENV?.trim().toLowerCase() ?? '',
  };
}

/**
 * Selects the only data source allowed for the current runtime.
 *
 * The bundled catalog is deliberately a development/preview fixture. It is
 * never a production fallback and it is never used when DATABASE_URL is set.
 * The PostgreSQL route repository is wired in a later slice; until then a
 * configured database fails explicitly instead of serving demo data.
 */
export function getDataSourceState(): DataSourceState {
  const { databaseUrl, repository, nodeEnv } = environment();
  const production = nodeEnv === 'production';

  if (repository === 'bundled-preview' && !production && !databaseUrl) {
    return { kind: 'bundled-preview', configured: false, ready: true, reason: null };
  }

  if (databaseUrl || repository === 'postgresql') {
    if (!databaseUrl) return { kind: 'unavailable', configured: false, ready: false, reason: 'DATABASE_URL_REQUIRED' };
    return { kind: 'postgresql', configured: true, ready: false, reason: 'POSTGRESQL_ADAPTER_NOT_CONFIGURED' };
  }

  if (production) return { kind: 'unavailable', configured: false, ready: false, reason: 'DATABASE_URL_REQUIRED' };
  return { kind: 'bundled-preview', configured: false, ready: true, reason: null };
}

export function dataSourceMeta(): Record<string, unknown> {
  const state = getDataSourceState();
  return {
    dataSource: state.kind,
    dataSourceReady: state.ready,
    dataSourceReason: state.reason,
  };
}
