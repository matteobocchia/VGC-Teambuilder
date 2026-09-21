import { abilityOptions, formatProfile, natureOptions, roleOptions, typeOptions } from '@/server/domain/repository';
import { resolveContext, success } from '@/server/http';

export async function GET(request: Request) {
  const context = resolveContext(request);
  if (context.response) return context.response;
  return success({ format: formatProfile, types: typeOptions, natures: natureOptions, roles: roleOptions, abilities: abilityOptions }, context.meta ?? undefined);
}
