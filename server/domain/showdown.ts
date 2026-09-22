import type { CatalogPokemon, CompetitiveSet, FormatProfile, Issue, Option, StatKey, StatValues } from './types';
import { natureOptions, typeOptions } from './repository';
import { statKeys } from './types';
import { issue, validateTeam, type ValidationCatalog } from './validation';

const statAliases: Record<string, StatKey> = { hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe' };
const emptyPoints = (): StatValues => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
const key = (value: string) => value.toLocaleLowerCase('en').replace(/[^a-z0-9]/g, '');

function resolveOption(name: string, options: Option[], path: string, issues: Issue[]): Option | undefined {
  const matches = options.filter((option) => option.labels.en !== option.id && key(option.labels.en) === key(name));
  if (matches.length !== 1) issues.push(issue(path, matches.length ? 'AMBIGUOUS_SHOWDOWN_NAME' : 'UNKNOWN_SHOWDOWN_NAME', `Could not resolve Showdown name: ${name}.`));
  return matches[0];
}

function parsePoints(value: string, path: string, issues: Issue[]): StatValues | null {
  const points = emptyPoints();
  const seen = new Set<StatKey>();
  for (const segment of value.split('/')) {
    const match = segment.trim().match(/^(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)$/i);
    if (!match) {
      issues.push(issue(path, 'STAT_POINTS_SYNTAX', 'Use Stat Points: 4 HP / 32 SpA / 30 Spe.'));
      return null;
    }
    const stat = statAliases[key(match[2])];
    if (seen.has(stat)) issues.push(issue(path, 'DUPLICATE_STAT_POINT', `Stat Points includes ${match[2]} more than once.`));
    seen.add(stat);
    points[stat] = Number(match[1]);
  }
  for (const stat of statKeys) if (!Number.isInteger(points[stat]) || points[stat] > 32) issues.push(issue(`${path}/${stat}`, 'STAT_POINTS_RANGE', 'Stat Points must be integers from 0 to 32.'));
  if (statKeys.reduce((total, stat) => total + points[stat], 0) > 66) issues.push(issue(path, 'STAT_POINTS_TOTAL', 'Total Stat Points cannot exceed 66.'));
  return points;
}

/** Strict Champions paste: names are technical English labels from the selected release. */
export function parseShowdownTeam(text: string, catalog: ValidationCatalog): { slots: Array<CompetitiveSet | null>; issues: Issue[] } {
  const issues: Issue[] = [];
  const blocks = text.replace(/\r\n?/g, '\n').trim().split(/\n\s*\n+/).filter(Boolean);
  if (blocks.length > 6) issues.push(issue('/text', 'TOO_MANY_SETS', 'A Champions team may contain at most six sets.'));
  const slots = blocks.slice(0, 6).map((block, index): CompetitiveSet | null => {
    const path = `/slots/${index}`;
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const header = lines[0]?.match(/^([^@]+?)(?:\s+@\s+(.+))?$/);
    if (!header) { issues.push(issue(path, 'SHOWDOWN_HEADER_REQUIRED', 'A Pokémon header is required.')); return null; }
    const rawPokemonName = header[1].trim();
    const nicknameSpecies = rawPokemonName.match(/^.+\s+\(([^()]+)\)$/)?.[1]?.trim();
    const pokemon = resolveOption(nicknameSpecies ?? rawPokemonName, catalog.pokemon, `${path}/speciesId`, issues) as CatalogPokemon | undefined;
    const item = header[2] ? resolveOption(header[2].trim(), pokemon?.items ?? [], `${path}/itemId`, issues) : undefined;
    let ability: Option | undefined;
    let nature: Option | undefined;
    let tera: Option | undefined;
    let points: StatValues | null = null;
    const moves: string[] = [];
    let level = 50;
    const seen = new Set<string>();
    lines.slice(1).forEach((line, lineIndex) => {
      const linePath = `${path}/text/${lineIndex + 2}`;
      if (/^(?:EVs?|IVs?):/i.test(line)) { issues.push(issue(linePath, 'LEGACY_CONVERSION_POLICY_UNAVAILABLE', 'EVs and IVs require an explicit, verified Champions conversion policy.')); return; }
      const field = line.match(/^([^:]+):\s*(.*)$/);
      if (field) {
        const label = key(field[1]);
        if (seen.has(label)) issues.push(issue(linePath, 'DUPLICATE_SHOWDOWN_FIELD', `${field[1]} appears more than once.`));
        seen.add(label);
        if (label === 'ability') ability = resolveOption(field[2], pokemon?.abilities ?? [], `${path}/abilityId`, issues);
        else if (label === 'teratype') tera = resolveOption(field[2], catalog.types ?? typeOptions, `${path}/teraTypeId`, issues);
        else if (label === 'level') {
          level = Number(field[2]);
          if (level !== 50) issues.push(issue(`${path}/level`, 'LEVEL_UNSUPPORTED', 'Champions sets must use level 50.'));
        } else if (label === 'statpoints') points = parsePoints(field[2], `${path}/statPoints`, issues);
        else issues.push(issue(linePath, 'UNSUPPORTED_SHOWDOWN_FIELD', `Unsupported Showdown field: ${field[1]}.`));
        return;
      }
      const natureLine = line.match(/^(.+) Nature$/);
      if (natureLine) { nature = resolveOption(natureLine[1], catalog.natures ?? natureOptions, `${path}/natureId`, issues); return; }
      if (line.startsWith('- ')) { const move = resolveOption(line.slice(2), pokemon?.learnableMoves ?? [], `${path}/moveIds/${moves.length}`, issues); if (move) moves.push(move.id); return; }
      issues.push(issue(linePath, 'UNSUPPORTED_SHOWDOWN_LINE', `Unsupported Showdown line: ${line}.`));
    });
    if (!ability) issues.push(issue(`${path}/abilityId`, 'ABILITY_REQUIRED', 'Ability is required.'));
    if (!nature) issues.push(issue(`${path}/natureId`, 'NATURE_REQUIRED', 'Nature is required.'));
    if (!points) issues.push(issue(`${path}/statPoints`, 'STAT_POINTS_REQUIRED', 'Stat Points line is required; no training defaults are inferred.'));
    if (moves.length < 1 || moves.length > 4) issues.push(issue(`${path}/moveIds`, 'MOVE_COUNT', 'A set requires one to four moves.'));
    if (!pokemon || !ability || !nature || !points || moves.length < 1 || moves.length > 4 || level !== 50) return null;
    return { speciesId: pokemon.speciesId, formId: pokemon.formId, ...(tera ? { teraTypeId: tera.id } : {}), itemId: item?.id ?? null, abilityId: ability.id, natureId: nature.id, level: 50, statPoints: points, moveIds: moves };
  });
  while (slots.length < 6) slots.push(null);
  const validated = validateTeam(slots, catalog.format.id, catalog);
  validated.slots.forEach((set, index) => {
    if (!set) return;
    const pokemon = catalog.pokemon.find((entry) => entry.formId === set.formId && entry.speciesId === set.speciesId);
    if (pokemon?.legalityStatus !== 'allowed') issues.push(issue(`/slots/${index}/speciesId`, 'LEGALITY_NOT_VERIFIED', 'This form is not explicitly allowed in the selected format.'));
  });
  return { slots: validated.slots, issues: [...issues, ...validated.issues] };
}

export function serializeShowdownTeam(slots: Array<CompetitiveSet | null>, catalog: ValidationCatalog, format: FormatProfile): { text: string | null; issues: Issue[] } {
  const validated = validateTeam(slots, format.id, catalog);
  if (validated.issues.some((entry) => entry.blocking)) return { text: null, issues: validated.issues };
  const issues: Issue[] = [];
  if (!validated.slots.some(Boolean)) issues.push(issue('/slots', 'TEAM_EMPTY', 'At least one set is required for Showdown export.'));
  const sets = validated.slots.map((set, index) => {
    if (!set) return null;
    const pokemon = catalog.pokemon.find((entry) => entry.formId === set.formId && entry.speciesId === set.speciesId);
    if (!pokemon) return null;
    if (pokemon.legalityStatus !== 'allowed') issues.push(issue(`/slots/${index}/speciesId`, 'LEGALITY_NOT_VERIFIED', 'This form is not explicitly allowed in the selected format.'));
    if (pokemon.labels.en === pokemon.id) issues.push(issue(`/slots/${index}/speciesId`, 'SHOWDOWN_ALIAS_MISSING', `No English Showdown name for ${pokemon.id}.`));
    const find = (id: string | null, options: Option[], path: string) => {
      const option = options.find((entry) => entry.id === id);
      if ((!option || option.labels.en === option.id) && id) issues.push(issue(path, 'SHOWDOWN_ALIAS_MISSING', `No English Showdown name for ${id}.`));
      return option?.labels.en;
    };
    const item = find(set.itemId, pokemon.items, `/slots/${index}/itemId`);
    const ability = find(set.abilityId, pokemon.abilities, `/slots/${index}/abilityId`);
    const nature = find(set.natureId, catalog.natures ?? natureOptions, `/slots/${index}/natureId`);
    const tera = set.teraTypeId ? find(set.teraTypeId, catalog.types ?? typeOptions, `/slots/${index}/teraTypeId`) : undefined;
    const pointNames: Record<StatKey, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
    const pointText = statKeys.filter((stat) => set.statPoints[stat] > 0).map((stat) => `${set.statPoints[stat]} ${pointNames[stat]}`).join(' / ') || '0 HP';
    const moves = set.moveIds.map((id, moveIndex) => find(id, pokemon.learnableMoves, `/slots/${index}/moveIds/${moveIndex}`));
    return [
      `${pokemon.labels.en}${item ? ` @ ${item}` : ''}`,
      `Ability: ${ability ?? ''}`,
      ...(tera ? [`Tera Type: ${tera}`] : []),
      'Level: 50',
      `Stat Points: ${pointText}`,
      `${nature ?? ''} Nature`,
      ...moves.map((move) => `- ${move ?? ''}`),
    ].join('\n');
  }).filter((value): value is string => value !== null);
  return { text: issues.length ? null : sets.join('\n\n'), issues };
}
