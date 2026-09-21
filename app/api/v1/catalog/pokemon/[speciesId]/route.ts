import { findCatalogPokemon, getCatalog } from '@/server/domain/repository';
import { failure, resolveContext, success } from '@/server/http';
import { issue } from '@/server/domain/validation';

export async function GET(request: Request, { params }: { params: Promise<{ speciesId: string }> }) {
  const context = resolveContext(request);
  if (context.response) return context.response;
  const { speciesId } = await params;
  const formId = new URL(request.url).searchParams.get('formId');
  const pokemon = formId
    ? getCatalog().find((entry) => entry.speciesId === speciesId && entry.formId === formId)
    : getCatalog().find((entry) => entry.speciesId === speciesId) ?? findCatalogPokemon(speciesId);
  if (!pokemon) return failure([issue('/speciesId', 'UNKNOWN_SPECIES', 'Species is not present in the selected release.')], 404);
  return success(pokemon, context.meta ?? undefined);
}
