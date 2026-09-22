import { getCatalog } from '@/server/domain/repository';
import { getPostgresCatalog } from '@/server/data/postgres';
import { failure, resolveRuntimeContext, success } from '@/server/http';

export async function GET(request: Request) {
  const context = await resolveRuntimeContext(request);
  if (context.response) return context.response;
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim().toLocaleLowerCase() ?? '';
  const type = url.searchParams.get('type') ?? url.searchParams.get('typeId');
  const ability = url.searchParams.get('ability') ?? url.searchParams.get('abilityId');
  const role = url.searchParams.get('role');
  const offset = Number(url.searchParams.get('offset') ?? url.searchParams.get('cursor') ?? '0');
  const limit = Number(url.searchParams.get('limit') ?? '50');
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) return failure([{ path: '/limit', code: 'INVALID_PAGINATION', message: 'Offset must be non-negative and limit must be between 1 and 100.', blocking: true }], 400);

  const catalog = context.runtime === 'postgresql'
    ? await getPostgresCatalog(context.postgresContext!)
    : getCatalog();
  const filtered = catalog.filter((pokemon) => {
    const text = [pokemon.id, pokemon.speciesId, pokemon.formId, pokemon.labels.en, pokemon.labels.it ?? '', pokemon.role.id, pokemon.role.labels.en, pokemon.role.labels.it ?? ''].join(' ').toLocaleLowerCase();
    const matchesQuery = !q || text.includes(q);
    const matchesType = !type || pokemon.types.some((candidate) => candidate.id === type);
    const matchesAbility = !ability || pokemon.abilities.some((candidate) => candidate.id === ability);
    const matchesRole = !role || pokemon.role.id === role;
    return matchesQuery && matchesType && matchesAbility && matchesRole;
  });
  const page = filtered.slice(offset, offset + limit);
  const nextCursor = offset + limit < filtered.length ? String(offset + limit) : undefined;
  return success({ pokemon: page, total: filtered.length, ...(nextCursor ? { nextCursor } : {}), dataReleaseId: context.releaseId }, context.meta ?? undefined);
}
