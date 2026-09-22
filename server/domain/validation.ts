import { findCatalogPokemon, getFormat, natureOptions } from './repository';
import type { CatalogPokemon, CompetitiveSet, Issue, StatValues } from './types';
import { statKeys } from './types';

export const issue = (path: string, code: string, message: string, blocking = true, details?: Record<string, unknown>): Issue => ({ path, code, message, blocking, ...(details ? { details } : {}) });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatValues(value: unknown): value is StatValues {
  return isRecord(value) && statKeys.every((key) => typeof value[key] === 'number');
}

export type SetValidation = { set: CompetitiveSet | null; stats: StatValues | null; issues: Issue[]; pokemon?: CatalogPokemon };

const natureMultipliers: Record<string, Partial<Record<keyof StatValues, number>>> = {
  'nature:adamant': { atk: 1.1, spa: 0.9 },
  'nature:modest': { spa: 1.1, atk: 0.9 },
  'nature:timid': { spe: 1.1, atk: 0.9 },
  'nature:careful': { spd: 1.1, spa: 0.9 },
  'nature:quiet': { spa: 1.1, spe: 0.9 },
  'nature:bold': { def: 1.1, atk: 0.9 },
  'nature:jolly': { spe: 1.1, spa: 0.9 },
};

function deriveStats(pokemon: CatalogPokemon, set: CompetitiveSet): StatValues {
  return statKeys.reduce((result, stat) => {
    if (stat === 'hp') result[stat] = pokemon.baseStats[stat] + set.statPoints[stat] + 75;
    else result[stat] = Math.floor((pokemon.baseStats[stat] + set.statPoints[stat] + 20) * (natureMultipliers[set.natureId]?.[stat] ?? 1));
    return result;
  }, {} as StatValues);
}

export function validateSet(input: unknown, formatId: string): SetValidation {
  const issues: Issue[] = [];
  if (!isRecord(input)) return { set: null, stats: null, issues: [issue('/set', 'SET_OBJECT_REQUIRED', 'Set must be an object.')] };

  // Champions stores training as Stat Points. Legacy Showdown EV/IV fields
  // are never converted implicitly: callers must use the explicit import
  // policy before reaching set validation.
  for (const field of ['ev', 'evs', 'iv', 'ivs', 'EV', 'EVs', 'IV', 'IVs']) {
    if (field in input) issues.push(issue(`/set/${field}`, 'UNSUPPORTED_LEGACY_STAT_FIELD', 'EV/IV fields are not supported for Champions sets; provide Stat Points instead.'));
  }

  const speciesId = input.speciesId;
  const pokemon = typeof speciesId === 'string' ? findCatalogPokemon(speciesId) : undefined;
  if (!pokemon) issues.push(issue('/set/speciesId', 'UNKNOWN_SPECIES', 'Species is not present in the selected release.'));

  const level = input.level;
  if (level !== 50) issues.push(issue('/set/level', 'LEVEL_UNSUPPORTED', 'Champions sets must use level 50.'));

  const format = getFormat(formatId);
  if (!format) issues.push(issue('/formatId', 'UNKNOWN_FORMAT', 'Format is not available.'));
  else if (pokemon && pokemon.legalityStatus !== 'unknown' && !pokemon.legalFormats.includes(format.id)) issues.push(issue('/set/speciesId', 'FORMAT_INCOMPATIBLE', 'Species/form is not available in this format.'));

  const formId = input.formId;
  if (formId !== undefined && (typeof formId !== 'string' || !pokemon || formId !== pokemon.formId)) issues.push(issue('/set/formId', 'FORM_MISMATCH', 'Form does not belong to the selected species.'));

  const abilityId = input.abilityId;
  if (typeof abilityId !== 'string' || (pokemon && !pokemon.abilities.some((candidate) => candidate.id === abilityId))) issues.push(issue('/set/abilityId', 'ABILITY_FORM_MISMATCH', 'Ability is not available to this form.'));

  const itemId = input.itemId;
  if (itemId !== null && (typeof itemId !== 'string' || (pokemon && !pokemon.items.some((candidate) => candidate.id === itemId)))) issues.push(issue('/set/itemId', 'ITEM_UNAVAILABLE', 'Held item is not available in this preview catalog.'));
  const validItem = itemId === null || typeof itemId === 'string';

  const natureId = input.natureId;
  if (typeof natureId !== 'string') issues.push(issue('/set/natureId', 'NATURE_REQUIRED', 'Nature is required.'));
  else if (!natureOptions.some((candidate) => candidate.id === natureId)) issues.push(issue('/set/natureId', 'UNKNOWN_NATURE', 'Nature is not present in the selected release.'));

  if (input.teraTypeId !== undefined && !format?.capabilities.tera) issues.push(issue('/set/teraTypeId', 'UNSUPPORTED_FIELD', 'This format release does not expose Tera Type.', true, { field: 'teraTypeId' }));

  const statPoints = input.statPoints;
  if (!isStatValues(statPoints)) issues.push(issue('/set/statPoints', 'STAT_POINTS_OBJECT_REQUIRED', 'All six Stat Points are required.'));
  else {
    let total = 0;
    for (const stat of statKeys) {
      const value = statPoints[stat];
      total += value;
      if (!Number.isInteger(value) || value < 0 || value > 32) issues.push(issue(`/set/statPoints/${stat}`, 'STAT_POINTS_RANGE', 'Expected an integer from 0 to 32.'));
    }
    if (total > 66) issues.push(issue('/set/statPoints', 'STAT_POINTS_TOTAL', 'Total Stat Points cannot exceed 66.', true, { total, maximum: 66 }));
  }

  const moveIds = input.moveIds;
  if (!Array.isArray(moveIds) || moveIds.length < 1 || moveIds.length > 4 || moveIds.some((value) => typeof value !== 'string')) issues.push(issue('/set/moveIds', 'MOVE_COUNT', 'A set must contain one to four distinct move IDs.'));
  else {
    if (new Set(moveIds).size !== moveIds.length) issues.push(issue('/set/moveIds', 'DUPLICATE_MOVE', 'Moves must be distinct.'));
    if (pokemon) {
      const allowed = new Set(pokemon.learnableMoves.map((candidate) => candidate.id));
      moveIds.forEach((moveId, index) => {
        if (!allowed.has(moveId)) issues.push(issue(`/set/moveIds/${index}`, 'MOVE_NOT_LEARNABLE', 'Move is not available to this form.'));
      });
    }
  }

  if (issues.some((current) => current.blocking) || !pokemon || !isStatValues(statPoints) || typeof natureId !== 'string' || typeof abilityId !== 'string' || !validItem || !Array.isArray(moveIds)) return { set: null, stats: null, issues, pokemon };

  const normalized: CompetitiveSet = {
    speciesId: pokemon.speciesId,
    ...(typeof formId === 'string' ? { formId } : { formId: pokemon.formId }),
    ...(typeof input.teraTypeId === 'string' ? { teraTypeId: input.teraTypeId } : {}),
    itemId: itemId as string | null,
    abilityId: abilityId as string,
    natureId: natureId as string,
    level: 50,
    statPoints: { ...statPoints },
    moveIds: [...(moveIds as string[])],
  };
  return { set: normalized, stats: deriveStats(pokemon, normalized), issues, pokemon };
}

export function validateTeam(slots: unknown, formatId: string): { slots: Array<CompetitiveSet | null>; stats: Array<StatValues | null>; issues: Issue[]; complete: boolean } {
  const issues: Issue[] = [];
  const format = getFormat(formatId);
  if (!Array.isArray(slots) || slots.length !== 6) return { slots: [], stats: [], issues: [issue('/slots', 'SIX_SLOTS_REQUIRED', 'A team revision must contain exactly six slots.')], complete: false };
  const normalized: Array<CompetitiveSet | null> = [];
  const derived: Array<StatValues | null> = [];
  const species = new Set<string>();
  const items = new Set<string>();
  slots.forEach((value, index) => {
    if (value === null) { normalized.push(null); derived.push(null); return; }
    const result = validateSet(value, formatId);
    result.issues.forEach((current) => issues.push({ ...current, path: `/slots/${index}${current.path.replace('/set', '')}` }));
    normalized.push(result.set);
    derived.push(result.stats);
    if (result.set) {
      if (format?.speciesClause && species.has(result.set.speciesId)) issues.push(issue(`/slots/${index}/speciesId`, 'SPECIES_CLAUSE', 'A species can appear only once in a team.'));
      species.add(result.set.speciesId);
      if (format?.itemClause && result.set.itemId && items.has(result.set.itemId)) issues.push(issue(`/slots/${index}/itemId`, 'ITEM_CLAUSE', 'A held item can appear only once in a team.'));
      if (result.set.itemId) items.add(result.set.itemId);
    }
  });
  const complete = normalized.length === 6 && normalized.every(Boolean);
  return { slots: normalized, stats: derived, issues, complete };
}
