import { dataMeta, formatProfile } from '@/server/domain/repository';
import { ensureDataSource, failure, resolveRuntimeContext, success } from '@/server/http';

export async function GET(request: Request) {
  const runtime = await resolveRuntimeContext(request);
  if (runtime.runtime === 'postgresql') {
    if (runtime.response) return runtime.response;
    if (!runtime.format || !runtime.meta) return failure([{ path: '/', code: 'DATA_RELEASE_REQUIRED', message: 'A configured data release is required.', blocking: true }], 400);
    return success([runtime.format], runtime.meta);
  }
  const sourceResponse = ensureDataSource();
  if (sourceResponse) return sourceResponse;
  return success([formatProfile], dataMeta);
}
