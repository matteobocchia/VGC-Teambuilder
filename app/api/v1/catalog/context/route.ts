import { abilityOptions, formatProfile, natureOptions, roleOptions, typeOptions } from '@/server/domain/repository';
import { getPostgresContextOptions } from '@/server/data/postgres';
import { failure, resolveRuntimeContext, success } from '@/server/http';

export async function GET(request: Request) {
  const context = await resolveRuntimeContext(request);
  if (context.response) return context.response;
  if (context.runtime === 'postgresql') {
    if (!context.format || !context.meta || !context.postgresContext) return failure([{ path: '/', code: 'DATA_RELEASE_REQUIRED', message: 'A configured data release is required.', blocking: true }], 400);
    const options = await getPostgresContextOptions(context.postgresContext);
    return success({ format: context.format, ...options }, context.meta);
  }
  return success({ format: formatProfile, types: typeOptions, natures: natureOptions, roles: roleOptions, abilities: abilityOptions }, context.meta ?? undefined);
}
