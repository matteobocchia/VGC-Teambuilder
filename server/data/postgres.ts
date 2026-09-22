import { isNodePostgresRuntime } from './source';
import type { CatalogPokemon, DataMeta, FormatProfile, Labels, Option, StatValues } from '../domain/types';

type QueryResult<Row> = { rows: Row[] };
type Pool = {
  query<Row>(text: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  end(): Promise<void>;
};

type PgModule = { Pool: new (options: Record<string, unknown>) => Pool };
type JsonObject = Record<string, unknown>;

type ReleaseRow = {
  release_id: string;
  schema_version: string;
  checksum: string;
  source: string;
  data_status: DataMeta['dataStatus'];
  bundle: unknown;
};

type ContextRow = ReleaseRow & {
  format_id: string;
  game: string;
  battle_mode: FormatProfile['battleMode'];
  level: number;
  labels: unknown;
  rules: unknown;
  capabilities: unknown;
};

export type RuntimeContext = {
  meta: DataMeta;
  format: FormatProfile;
  bundle: JsonObject;
};

export class PostgresRepositoryError extends Error {
  constructor(
    public readonly code:
      | 'DATABASE_URL_REQUIRED'
      | 'POSTGRESQL_RUNTIME_UNSUPPORTED'
      | 'POSTGRESQL_ADAPTER_NOT_CONFIGURED'
      | 'POSTGRESQL_UNAVAILABLE'
      | 'DATA_RELEASE_CORRUPT',
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PostgresRepositoryError';
  }
}

let poolPromise: Promise<Pool> | undefined;

async function loadPg(): Promise<PgModule> {
  if (!isNodePostgresRuntime()) throw new PostgresRepositoryError('POSTGRESQL_RUNTIME_UNSUPPORTED', 'The Node PostgreSQL adapter is unavailable in this runtime.');
  try {
    // Keep pg out of the static import graph so Cloudflare builds do not pull
    // Node TCP modules into Worker bundles. The configured Worker adapter can
    // replace this loader when PostgreSQL-over-HTTP is introduced.
    const moduleName = 'pg';
    const importedPg = await import(moduleName) as unknown as { default?: PgModule } & PgModule;
    return importedPg.default ?? importedPg;
  } catch (error) {
    throw new PostgresRepositoryError('POSTGRESQL_ADAPTER_NOT_CONFIGURED', 'The PostgreSQL adapter could not be loaded.', { cause: error });
  }
}

async function getPool(): Promise<Pool> {
  if (poolPromise) return poolPromise;
  const databaseUrl = typeof process !== 'undefined' ? process.env.DATABASE_URL?.trim() : '';
  if (!databaseUrl) throw new PostgresRepositoryError('DATABASE_URL_REQUIRED', 'DATABASE_URL is required for the PostgreSQL repository.');
  poolPromise = loadPg().then(({ Pool }) => new Pool({
    connectionString: databaseUrl,
    max: numberEnv('PG_POOL_MAX', 5),
    idleTimeoutMillis: numberEnv('PG_IDLE_TIMEOUT_MS', 30_000),
    connectionTimeoutMillis: numberEnv('PG_CONNECTION_TIMEOUT_MS', 5_000),
    application_name: 'vgc-teambuilder-api',
    ...(process.env.PG_SSL === 'true' ? { ssl: { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {}),
  })).catch((error) => {
    poolPromise = undefined;
    if (error instanceof PostgresRepositoryError) throw error;
    throw new PostgresRepositoryError('POSTGRESQL_UNAVAILABLE', 'The PostgreSQL pool could not be created.', { cause: error });
  });
  return poolPromise;
}

function numberEnv(name: string, fallback: number): number {
  const value = typeof process !== 'undefined' ? Number(process.env[name]) : NaN;
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function query<Row>(text: string, values: readonly unknown[] = []): Promise<Row[]> {
  try {
    return (await (await getPool()).query<Row>(text, values)).rows;
  } catch (error) {
    if (error instanceof PostgresRepositoryError) throw error;
    throw new PostgresRepositoryError('POSTGRESQL_UNAVAILABLE', 'The PostgreSQL repository query failed.', { cause: error });
  }
}

export async function closePostgresPool(): Promise<void> {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = undefined;
  await pool.end();
}

export async function pingPostgres(): Promise<void> {
  await query<{ ok: number }>('SELECT 1 AS ok');
}

export async function getPostgresContext(formatId: string, releaseId: string): Promise<RuntimeContext | undefined> {
  const rows = await query<ContextRow>(
    `SELECT r.release_id, r.schema_version, r.checksum, r.source, r.data_status, r.bundle,
            f.format_id, f.game, f.battle_mode, f.level, f.labels, f.rules, f.capabilities
       FROM data_releases r
       JOIN format_profiles f ON f.data_release_id = r.release_id
      WHERE r.release_id = $1
        AND f.format_id = $2
        AND r.bundle #>> '{release,releaseId}' = r.release_id
        AND r.bundle #>> '{release,checksum}' = r.checksum
      LIMIT 1`,
    [releaseId, formatId],
  );
  if (!rows[0]) return undefined;
  return mapContext(rows[0]);
}

export async function getPostgresRelease(releaseId: string): Promise<DataMeta | undefined> {
  const rows = await query<ReleaseRow>(
    `SELECT release_id, schema_version, checksum, source, data_status, bundle
       FROM data_releases
      WHERE release_id = $1
        AND bundle #>> '{release,releaseId}' = release_id
        AND bundle #>> '{release,checksum}' = checksum
      LIMIT 1`,
    [releaseId],
  );
  return rows[0] ? mapMeta(rows[0]) : undefined;
}

export async function getPostgresFormats(releaseId?: string): Promise<Array<FormatProfile & { checksum: string; dataStatus: DataMeta['dataStatus'] }>> {
  const rows = await query<ContextRow>(
    `SELECT r.release_id, r.schema_version, r.checksum, r.source, r.data_status, r.bundle,
            f.format_id, f.game, f.battle_mode, f.level, f.labels, f.rules, f.capabilities
       FROM data_releases r
       JOIN format_profiles f ON f.data_release_id = r.release_id
      WHERE ($1::text IS NULL OR r.release_id = $1)
        AND r.bundle #>> '{release,releaseId}' = r.release_id
        AND r.bundle #>> '{release,checksum}' = r.checksum
      ORDER BY f.format_id`,
    [releaseId ?? null],
  );
  return rows.map((row) => {
    const context = mapContext(row);
    return { ...context.format, checksum: context.meta.checksum, dataStatus: context.meta.dataStatus };
  });
}

export async function getPostgresCatalog(context: RuntimeContext): Promise<CatalogPokemon[]> {
  const forms = arrayOf(context.bundle.forms);
  const species = new Map(arrayOf(context.bundle.species).map((entry) => [stringValue(entry.speciesId), entry]));
  const formats = arrayOf(context.bundle.formats);
  const legalities = arrayOf(context.bundle.legalities);
  const formatIds = formats.map((entry) => stringValue(entry.formatId)).filter(Boolean);
  return forms
    .map((form) => mapPokemon(form, species.get(stringValue(form.speciesId)), context.bundle, context.format.id, formatIds, legalities))
    .filter((entry): entry is CatalogPokemon => entry !== undefined)
    .filter((entry) => entry.legalFormats.includes(context.format.id) || entry.legalFormats.length === 0);
}

export async function getPostgresPokemon(context: RuntimeContext, id: string, speciesId?: string): Promise<CatalogPokemon | undefined> {
  const catalog = await getPostgresCatalog(context);
  return catalog.find((entry) => (entry.id === id || entry.speciesId === id || entry.formId === id) && (!speciesId || entry.speciesId === speciesId));
}

export async function getPostgresContextOptions(context: RuntimeContext): Promise<{
  types: Option[];
  natures: Option[];
  roles: Option[];
  abilities: Option[];
}> {
  const catalog = await getPostgresCatalog(context);
  const unique = (values: Option[]) => Array.from(new Map(values.map((value) => [value.id, value])).values());
  const typeValues = catalog.flatMap((pokemon) => pokemon.types);
  const roleValues = catalog.map((pokemon) => pokemon.role);
  const abilityValues = catalog.flatMap((pokemon) => pokemon.abilities);
  const natures = arrayOf(context.bundle.natures).map((entry) => optionValue(entry, stringValue(entry.natureId) || 'nature:unknown', 'Nature', 'Natura'));
  return { types: unique(typeValues), natures: unique(natures), roles: unique(roleValues), abilities: unique(abilityValues) };
}

function mapContext(row: ContextRow): RuntimeContext {
  const bundle = objectValue(row.bundle);
  if (!bundle) throw new PostgresRepositoryError('DATA_RELEASE_CORRUPT', `Release ${row.release_id} does not contain a JSON object bundle.`);
  return {
    meta: mapMeta(row),
    format: mapFormat(row),
    bundle,
  };
}

function mapMeta(row: ReleaseRow): DataMeta {
  if (!/^[a-f0-9]{64}$/.test(row.checksum)) throw new PostgresRepositoryError('DATA_RELEASE_CORRUPT', `Release ${row.release_id} has an invalid checksum.`);
  if (!['certified', 'provisional', 'unverified'].includes(row.data_status)) throw new PostgresRepositoryError('DATA_RELEASE_CORRUPT', `Release ${row.release_id} has an invalid data status.`);
  return {
    apiVersion: 'v1',
    schemaVersion: row.schema_version as '1.0',
    releaseId: row.release_id,
    checksum: row.checksum,
    dataStatus: row.data_status,
    source: 'postgresql',
    gaps: row.data_status === 'certified' ? [] : ['OFFICIAL_REVIEW_PENDING'],
  };
}

function mapFormat(row: ContextRow): FormatProfile {
  const rules = objectValue(row.rules) ?? {};
  const capabilities = objectValue(row.capabilities) ?? {};
  const statPoints = objectValue(rules.statPoints) ?? {};
  const context = stringValue(rules.context);
  const level = integerValue(row.level, 50);
  if (level !== 50) throw new PostgresRepositoryError('DATA_RELEASE_CORRUPT', `Format ${row.format_id} has unsupported level ${level}.`);
  if (!['ranked-battles', 'vgc-championship', 'fixture'].includes(context)) throw new PostgresRepositoryError('DATA_RELEASE_CORRUPT', `Format ${row.format_id} has an invalid competition context.`);
  return {
    id: row.format_id,
    labels: labelsValue(row.labels, row.format_id),
    game: row.game as FormatProfile['game'],
    context: context as FormatProfile['context'],
    battleMode: row.battle_mode,
    level: 50,
    dataReleaseId: row.release_id,
    statPoints: {
      perStatMax: integerValue(statPoints.perStatMax, 32) as 32,
      totalMax: integerValue(statPoints.totalMax, 66) as 66,
    },
    speciesClause: booleanValue(rules.speciesClause, true),
    itemClause: booleanValue(rules.itemClause, true),
    capabilities: {
      tera: booleanValue(capabilities.tera, false),
      damageEngine: booleanValue(capabilities.damageEngine, false),
    },
  };
}

function mapPokemon(form: JsonObject, species: JsonObject | undefined, bundle: JsonObject, formatId: string, formatIds: string[], legalities: JsonObject[]): CatalogPokemon | undefined {
  const formId = stringValue(form.formId);
  const speciesId = stringValue(form.speciesId);
  if (!formId || !speciesId) return undefined;
  const formLabels = labelsValue(form.labels, formId);
  const speciesLabels = labelsValue(species?.labels, speciesId);
  const entityLabels = formLabels.en !== formId ? formLabels : speciesLabels;
  const baseStats = statValues(form.baseStats);
  if (!baseStats) return undefined;
  const formatLegality = legalities.filter((entry) => {
    if (stringValue(entry.formatId) !== formatId) return false;
    const entityId = stringValue(entry.entityId);
    return entityId === formId || entityId === speciesId;
  });
  const explicitStatus = stringValue(
    formatLegality.find((entry) => stringValue(entry.entityId) === formId)?.status
      ?? formatLegality.find((entry) => stringValue(entry.entityId) === speciesId)?.status,
  );
  const legalityStatus = explicitStatus === 'allowed' || explicitStatus === 'banned' || explicitStatus === 'conditional' ? explicitStatus : 'unknown';
  const legalFormats = legalityStatus === 'allowed' ? [formatId] : [];
  const role = optionValue(form.role, `role:${formId}`, 'Role', 'Ruolo');
  return {
    id: formId,
    speciesId,
    formId,
    legalityStatus,
    labels: entityLabels,
    role,
    types: optionArray(form.types, 'type', bundle),
    baseStats,
    abilities: optionArray(form.abilities ?? form.abilityIds, 'ability', bundle),
    items: optionArray(form.items ?? form.itemIds, 'item', bundle),
    learnableMoves: optionArray(form.learnableMoves ?? form.moveIds, 'move', bundle),
    legalFormats: legalFormats.length ? legalFormats : formatIds,
    ...(objectValue(form.initialSet) ? { initialSet: objectValue(form.initialSet) as CatalogPokemon['initialSet'] } : {}),
  };
}

function optionArray(value: unknown, prefix: string, bundle: JsonObject): Option[] {
  const entities = arrayOf(bundle[`${prefix}s`]);
  const lookup = new Map(entities.map((entry) => [stringValue(entry[`${prefix}Id`] ?? entry.id), entry]));
  const values = Array.isArray(value) ? value : [];
  return values.map((entry) => {
    const id = typeof entry === 'string' ? entry : stringValue(entry?.id ?? entry?.[`${prefix}Id`]);
    const source = id ? lookup.get(id) : undefined;
    return optionValue(typeof entry === 'string' ? source : entry, id || `${prefix}:unknown`, prefix, prefix);
  }).filter((entry): entry is Option => entry !== undefined);
}

function optionValue(value: unknown, fallbackId: string, enFallback: string, itFallback: string): Option {
  const object = objectValue(value);
  const id = stringValue(object?.id ?? object?.abilityId ?? object?.itemId ?? object?.moveId) || fallbackId;
  return { id, labels: labelsValue(object?.labels, id, enFallback, itFallback) };
}

function labelsValue(value: unknown, fallback: string, enFallback = fallback, itFallback: string | null = enFallback): Labels {
  const object = objectValue(value);
  return {
    en: stringValue(object?.en) || stringValue(object?.english) || enFallback,
    it: stringValue(object?.it) || stringValue(object?.italian) || itFallback,
  };
}

function statValues(value: unknown): StatValues | undefined {
  const object = objectValue(value);
  if (!object) return undefined;
  const keys: Array<keyof StatValues> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const stats = Object.fromEntries(keys.map((key) => [key, integerValue(object[key], -1)])) as StatValues;
  return keys.every((key) => stats[key] >= 0) ? stats : undefined;
}

function arrayOf(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(objectValue).filter((entry): entry is JsonObject => entry !== undefined) : [];
}

function objectValue(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function integerValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
