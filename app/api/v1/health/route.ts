import { dataMeta, FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { configuredFormatId, configuredReleaseId, dataSourceMeta, getDataSourceState } from '@/server/data/source';
import { getPostgresContext, pingPostgres } from '@/server/data/postgres';

export async function GET() {
  const source = getDataSourceState();
  if (source.kind === 'postgresql') {
    const formatId = configuredFormatId();
    const releaseId = configuredReleaseId();
    if (!formatId || !releaseId) {
      return Response.json({ status: 'unhealthy', service: 'vgc-forge-api', apiVersion: 'v1', ...dataSourceMeta(), error: 'DATA_RELEASE_REQUIRED' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    try {
      await pingPostgres();
      const context = await getPostgresContext(formatId, releaseId);
      if (!context) return Response.json({ status: 'unhealthy', service: 'vgc-forge-api', apiVersion: 'v1', ...dataSourceMeta(), error: 'UNKNOWN_RELEASE_OR_FORMAT' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      return Response.json({ status: 'ok', service: 'vgc-forge-api', apiVersion: 'v1', formatId, dataRelease: releaseId, dataStatus: context.meta.dataStatus, ...dataSourceMeta(), database: 'postgresql', damageEngine: context.format.capabilities.damageEngine ? 'available' : 'not-configured' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ status: 'unhealthy', service: 'vgc-forge-api', apiVersion: 'v1', formatId, dataRelease: releaseId, ...dataSourceMeta(), database: 'unreachable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  const healthy = source.ready;
  return Response.json({
    status: healthy ? 'degraded' : 'unhealthy',
    service: 'vgc-forge-api',
    apiVersion: 'v1',
    formatId: FORMAT_ID,
    dataRelease: RELEASE_ID,
    dataStatus: dataMeta.dataStatus,
    database: source.kind,
    ...dataSourceMeta(),
    damageEngine: 'not-compatible-with-certified-mb-release',
  }, { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
