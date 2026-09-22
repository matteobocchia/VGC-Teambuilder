import type { CompetitiveSet, DataMeta, DamageSetInput, FieldState, FormatProfile, Issue, StatValues } from './types';
import { issue } from './validation';

export type DamageRequest = {
  formatId: string;
  dataReleaseId?: string;
  mode: 'singles' | 'doubles';
  attacker: DamageSetInput;
  defender: DamageSetInput;
  moveId: string;
  field: FieldState;
  critical: boolean;
  spread: boolean;
  teamRevisionId?: string;
  attackerSlot?: number;
};

export type DamageEngine = {
  mechanicsVersion: string;
  calculate(request: DamageRequest): Promise<DamageResponse>;
};

export type DamageOutcome = {
  damage: { min: number; max: number; rolls: number[] };
  koChance: number;
};

export type DamageResponse = {
  primary: DamageOutcome;
  alternatives: DamageOutcome[];
  ko: { chance: number; guaranteedHits: number | null };
  assumptions: { it: string; en: string }[];
  formatId: string;
  dataReleaseId: string;
  dataStatus: 'certified';
  mechanicsVersion: string;
  teamRevisionId?: string;
};

const weatherValues = new Set<FieldState['weather']>(['clear', 'sun', 'rain', 'sand', 'snow']);
const terrainValues = new Set<FieldState['terrain']>(['none', 'electric', 'grassy', 'psychic', 'misty']);
const fieldBooleanKeys: Array<keyof Omit<FieldState, 'weather' | 'terrain'>> = ['reflect', 'lightScreen', 'auroraVeil', 'safeguard', 'tailwind', 'trickRoom', 'gravity'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateSetInput(value: unknown, path: string, issues: Issue[]): DamageSetInput | null {
  if (!isRecord(value)) {
    issues.push(issue(path, 'COMBATANT_REQUIRED', 'Combatant must be an inline set or a revision slot reference.'));
    return null;
  }
  const initialIssueCount = issues.length;
  if (value.revisionId !== undefined || value.slot !== undefined) {
    if (typeof value.revisionId !== 'string' || !value.revisionId.trim()) issues.push(issue(`${path}/revisionId`, 'REVISION_ID_REQUIRED', 'A revision ID is required for a set reference.'));
    if (typeof value.slot !== 'number' || !Number.isInteger(value.slot) || value.slot < 1 || value.slot > 6) issues.push(issue(`${path}/slot`, 'REVISION_SLOT_INVALID', 'A revision slot must be an integer from 1 to 6.'));
    return issues.length === initialIssueCount ? { revisionId: value.revisionId as string, slot: value.slot as number } : null;
  }

  for (const key of ['speciesId', 'abilityId', 'natureId', 'itemId', 'level', 'statPoints', 'moveIds']) {
    if (value[key] === undefined) issues.push(issue(`${path}/${key}`, 'SET_FIELD_REQUIRED', `${key} is required for an inline set.`));
  }
  for (const key of ['speciesId', 'abilityId', 'natureId']) {
    if (typeof value[key] !== 'string' || !value[key]) issues.push(issue(`${path}/${key}`, 'SET_FIELD_INVALID', `${key} must be a canonical ID.`));
  }
  if (value.itemId !== null && (typeof value.itemId !== 'string' || !value.itemId)) issues.push(issue(`${path}/itemId`, 'SET_FIELD_INVALID', 'itemId must be a canonical ID or null.'));
  if (value.formId !== undefined && (typeof value.formId !== 'string' || !value.formId)) issues.push(issue(`${path}/formId`, 'SET_FIELD_INVALID', 'formId must be a canonical ID when provided.'));
  if (value.teraTypeId !== undefined && (typeof value.teraTypeId !== 'string' || !value.teraTypeId)) issues.push(issue(`${path}/teraTypeId`, 'SET_FIELD_INVALID', 'teraTypeId must be a canonical ID when provided.'));
  if (value.level !== 50) issues.push(issue(`${path}/level`, 'LEVEL_UNSUPPORTED', 'Champions calculator sets must use level 50.'));

  const statPoints = value.statPoints;
  if (!isRecord(statPoints)) issues.push(issue(`${path}/statPoints`, 'STAT_POINTS_OBJECT_REQUIRED', 'All six Stat Points are required.'));
  else {
    let total = 0;
    for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const) {
      const raw = statPoints[stat];
      const current = typeof raw === 'number' ? raw : Number.NaN;
      total += Number.isFinite(current) ? current : 0;
      if (!Number.isInteger(current) || current < 0 || current > 32) issues.push(issue(`${path}/statPoints/${stat}`, 'STAT_POINTS_RANGE', 'Stat Points must be integers from 0 to 32.'));
    }
    if (total > 66) issues.push(issue(`${path}/statPoints`, 'STAT_POINTS_TOTAL', 'Total Stat Points cannot exceed 66.', true, { total, maximum: 66 }));
  }
  const moveIds = value.moveIds;
  if (!Array.isArray(moveIds) || moveIds.length < 1 || moveIds.length > 4 || moveIds.some((moveId) => typeof moveId !== 'string' || !moveId)) issues.push(issue(`${path}/moveIds`, 'MOVE_COUNT', 'Inline sets must contain one to four canonical move IDs.'));
  else if (new Set(moveIds).size !== moveIds.length) issues.push(issue(`${path}/moveIds`, 'DUPLICATE_MOVE', 'Moves must be distinct.'));
  if (issues.length !== initialIssueCount || !isRecord(statPoints) || !Array.isArray(moveIds)) return null;

  return {
    speciesId: value.speciesId as string,
    ...(typeof value.formId === 'string' ? { formId: value.formId } : {}),
    ...(typeof value.teraTypeId === 'string' ? { teraTypeId: value.teraTypeId } : {}),
    itemId: value.itemId as string | null,
    abilityId: value.abilityId as string,
    natureId: value.natureId as string,
    level: 50,
    statPoints: statPoints as StatValues,
    moveIds: [...(moveIds as string[])],
  } satisfies CompetitiveSet;
}

export function validateDamageRequest(input: unknown): { request: DamageRequest | null; issues: Issue[] } {
  const issues: Issue[] = [];
  if (!isRecord(input)) return { request: null, issues: [issue('/', 'DAMAGE_REQUEST_OBJECT_REQUIRED', 'Damage request must be an object.')] };

  const formatId = input.formatId;
  if (typeof formatId !== 'string' || !formatId.trim()) issues.push(issue('/formatId', 'FORMAT_REQUIRED', 'formatId is required.'));
  const mode = input.mode;
  if (mode !== 'singles' && mode !== 'doubles') issues.push(issue('/mode', 'BATTLE_MODE_REQUIRED', 'mode must be singles or doubles.'));
  const moveId = input.moveId;
  if (typeof moveId !== 'string' || !moveId.trim()) issues.push(issue('/moveId', 'MOVE_REQUIRED', 'moveId is required.'));
  const attacker = validateSetInput(input.attacker, '/attacker', issues);
  const defender = validateSetInput(input.defender, '/defender', issues);
  const field = input.field;
  if (!isRecord(field)) issues.push(issue('/field', 'FIELD_REQUIRED', 'field conditions are required.'));
  else {
    if (!weatherValues.has(field.weather as FieldState['weather'])) issues.push(issue('/field/weather', 'WEATHER_INVALID', 'weather must be clear, sun, rain, sand, or snow.'));
    if (!terrainValues.has(field.terrain as FieldState['terrain'])) issues.push(issue('/field/terrain', 'TERRAIN_INVALID', 'terrain must be none, electric, grassy, psychic, or misty.'));
    for (const key of fieldBooleanKeys) if (typeof field[key] !== 'boolean') issues.push(issue(`/field/${key}`, 'FIELD_FLAG_INVALID', `${key} must be boolean.`));
  }
  if (typeof input.critical !== 'boolean') issues.push(issue('/critical', 'CRITICAL_REQUIRED', 'critical must be boolean.'));
  if (typeof input.spread !== 'boolean') issues.push(issue('/spread', 'SPREAD_REQUIRED', 'spread must be boolean.'));
  if (input.teamRevisionId !== undefined && (typeof input.teamRevisionId !== 'string' || !input.teamRevisionId.trim())) issues.push(issue('/teamRevisionId', 'TEAM_REVISION_INVALID', 'teamRevisionId must be a non-empty string.'));
  const attackerSlot = input.attackerSlot;
  if (attackerSlot !== undefined && (typeof attackerSlot !== 'number' || !Number.isInteger(attackerSlot) || attackerSlot < 1 || attackerSlot > 6)) issues.push(issue('/attackerSlot', 'ATTACKER_SLOT_INVALID', 'attackerSlot must be between 1 and 6.'));

  if (issues.length) return { request: null, issues };
  return {
    request: {
      formatId: formatId as string,
      ...(typeof input.dataReleaseId === 'string' ? { dataReleaseId: input.dataReleaseId } : {}),
      mode: mode as DamageRequest['mode'],
      attacker: attacker as DamageSetInput,
      defender: defender as DamageSetInput,
      moveId: moveId as string,
      field: field as FieldState,
      critical: input.critical as boolean,
      spread: input.spread as boolean,
      ...(typeof input.teamRevisionId === 'string' ? { teamRevisionId: input.teamRevisionId } : {}),
      ...(typeof attackerSlot === 'number' ? { attackerSlot } : {}),
    },
    issues: [],
  };
}

/**
 * Resolves only a certified, format-compatible engine. The current repository
 * intentionally has no implementation; returning null is safer than emitting
 * a number from a different mechanics version or an unverified release.
 */
export function resolveDamageEngine(context: { meta?: DataMeta; format?: FormatProfile }): DamageEngine | null {
  if (!context.meta || !context.format) return null;
  if (context.meta.dataStatus !== 'certified') return null;
  if (context.meta.coverage.damageEngine !== 'available' || !context.format.capabilities.damageEngine) return null;
  return null;
}
