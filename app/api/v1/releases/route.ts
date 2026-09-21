import { dataMeta, formatProfile } from '@/server/domain/repository';
import { success } from '@/server/http';

export async function GET() {
  return success([{ ...dataMeta, formats: [formatProfile.id], capabilities: formatProfile.capabilities }], dataMeta);
}
