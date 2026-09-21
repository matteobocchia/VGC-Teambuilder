import { dataMeta, FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';
import { dataSourceMeta, getDataSourceState } from '@/server/data/source';

export async function GET() {
  const source = getDataSourceState();
  const healthy = source.ready;
  return Response.json({
    status: healthy ? 'degraded' : 'unhealthy',
    service: 'vgc-forge-api',
    apiVersion: 'v1',
    formatId: FORMAT_ID,
    dataRelease: RELEASE_ID,
    dataStatus: dataMeta.dataStatus,
    database: source.kind === 'postgresql' ? 'configured-not-ready' : source.kind,
    ...dataSourceMeta(),
    damageEngine: 'not-compatible-with-certified-mb-release',
  }, { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
