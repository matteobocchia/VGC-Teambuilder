export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'vgc-forge-api',
    apiVersion: 'v1',
    dataRelease: 'champions-regulation-mb-doubles-2026-01',
  });
}
