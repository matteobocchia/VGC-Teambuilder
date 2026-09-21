import { dataMeta, FORMAT_ID, RELEASE_ID } from '@/server/domain/repository';

export async function GET() {
  return Response.json({
    status: 'degraded',
    service: 'vgc-forge-api',
    apiVersion: 'v1',
    formatId: FORMAT_ID,
    dataRelease: RELEASE_ID,
    dataStatus: dataMeta.dataStatus,
    database: 'not-configured',
    damageEngine: 'not-compatible-with-certified-mb-release',
  });
}
