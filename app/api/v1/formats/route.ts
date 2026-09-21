import { dataMeta, formatProfile } from '@/server/domain/repository';
import { ensureDataSource, success } from '@/server/http';

export async function GET() {
  const sourceResponse = ensureDataSource();
  if (sourceResponse) return sourceResponse;
  return success([formatProfile], dataMeta);
}
