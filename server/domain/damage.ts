import type { DataMeta, FieldState, FormatProfile, Issue } from './types';
import { issue } from './validation';

export type DamageRequest = {
  formatId: string;
  dataReleaseId?: string;
  mode: 'singles' | 'doubles';
  attacker: Record<string, unknown>;
  defender: Record<string, unknown>;
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

export function validateDamageRequest(input: unknown): { request: DamageRequest | null; issues: Issue[] } {
  const issues: Issue[] = [];
  if (!isRecord(input)) return { request: null, issues: [issue('/', 'DAMAGE_REQUEST_OBJECT_REQUIRED', 'Damage request must be an object.')] };

  const formatId = input.formatId;
  if (typeof formatId !== 'string' || !formatId.trim()) issues.push(issue('/formatId', 'FORMAT_REQUIRED', 'formatId is required.'));
  const mode = input.mode;
  if (mode !== 'singles' && mode !== 'doubles') issues.push(issue('/mode', 'BATTLE_MODE_REQUIRED', 'mode must be singles or doubles.'));
  const moveId = input.moveId;
  if (typeof moveId !== 'string' || !moveId.trim()) issues.push(issue('/moveId', 'MOVE_REQUIRED', 'moveId is required.'));
  if (!isRecord(input.attacker)) issues.push(issue('/attacker', 'COMBATANT_REQUIRED', 'attacker must be an object.'));
  if (!isRecord(input.defender)) issues.push(issue('/defender', 'COMBATANT_REQUIRED', 'defender must be an object.'));
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
      attacker: input.attacker as Record<string, unknown>,
      defender: input.defender as Record<string, unknown>,
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
