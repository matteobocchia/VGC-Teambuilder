import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { Pool } from 'pg';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bundlePath = args.find((arg) => !arg.startsWith('--'));

if (!bundlePath) {
  console.error('Usage: npm run db:import -- <bundle.json> [--dry-run]');
  process.exitCode = 1;
} else {
  try {
    const raw = JSON.parse(await readFile(bundlePath, 'utf8'));
    const bundle = validateBundle(raw);
    const checksum = sha256(withoutChecksum(bundle));
    if (bundle.release.checksum !== checksum) {
      throw new Error(`CHECKSUM_MISMATCH: expected ${bundle.release.checksum}, calculated ${checksum}`);
    }

    if (dryRun) {
      console.log(JSON.stringify({ ok: true, releaseId: bundle.release.releaseId, checksum, formats: bundle.formats.length }, null, 2));
    } else {
      const databaseUrl = process.env.DATABASE_URL?.trim();
      if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');
      await importBundle(bundle, databaseUrl);
      console.log(JSON.stringify({ ok: true, imported: true, releaseId: bundle.release.releaseId, checksum }, null, 2));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

async function importBundle(bundle, connectionString) {
  const pool = new Pool({ connectionString, max: 2, application_name: 'vgc-teambuilder-release-import' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const release = bundle.release;
    await client.query(
      `INSERT INTO data_releases (release_id, schema_version, checksum, source, data_status, bundle)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (release_id) DO NOTHING`,
      [release.releaseId, release.schemaVersion, release.checksum, release.source, release.dataStatus, JSON.stringify(bundle)],
    );
    const existing = await client.query('SELECT checksum FROM data_releases WHERE release_id = $1', [release.releaseId]);
    if (existing.rows[0]?.checksum !== release.checksum) throw new Error('RELEASE_CHECKSUM_CONFLICT');

    for (const format of bundle.formats) {
      const rules = { ...format.rules, context: format.context };
      await client.query(
        `INSERT INTO format_profiles
          (format_id, data_release_id, game, battle_mode, level, labels, rules, conversion_policy, capabilities)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
         ON CONFLICT (format_id, data_release_id) DO NOTHING`,
        [format.formatId, release.releaseId, format.game, format.battleMode, format.level, JSON.stringify(format.labels), JSON.stringify(rules), JSON.stringify(format.conversionPolicy ?? {}), JSON.stringify(format.capabilities ?? {})],
      );
    }
    for (const species of bundle.species) {
      await client.query(
        `INSERT INTO pokemon_species (species_id, data_release_id, labels)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (species_id, data_release_id) DO NOTHING`,
        [species.speciesId, release.releaseId, JSON.stringify(species.labels)],
      );
    }
    for (const form of bundle.forms) {
      await client.query(
        `INSERT INTO pokemon_forms (form_id, species_id, data_release_id, labels, role, types, base_stats)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::text[], $7::jsonb)
         ON CONFLICT (form_id, data_release_id) DO NOTHING`,
        [form.formId, form.speciesId, release.releaseId, JSON.stringify(form.labels), JSON.stringify(form.role ?? null), form.types, JSON.stringify(form.baseStats)],
      );
    }
    for (const entity of bundle.moves) await insertEntity(client, 'moves', 'move_id', entity.moveId, release.releaseId, entity);
    for (const entity of bundle.abilities) await insertEntity(client, 'abilities', 'ability_id', entity.abilityId, release.releaseId, entity);
    for (const entity of bundle.items) await insertEntity(client, 'items', 'item_id', entity.itemId, release.releaseId, entity);
    for (const entity of bundle.natures) await insertEntity(client, 'natures', 'nature_id', entity.natureId, release.releaseId, entity);
    for (const learnset of bundle.learnsets) {
      await client.query(
        `INSERT INTO learnsets (form_id, move_id, data_release_id, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (form_id, move_id, data_release_id) DO NOTHING`,
        [learnset.formId, learnset.moveId, release.releaseId, learnset.source],
      );
    }
    for (const legality of bundle.legalities) {
      await client.query(
        `INSERT INTO format_legalities
          (format_id, data_release_id, entity_type, entity_id, status, reason, conditions)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT (format_id, data_release_id, entity_type, entity_id) DO NOTHING`,
        [legality.formatId, release.releaseId, legality.entityType, legality.entityId, legality.status, legality.reason ?? null, JSON.stringify(legality.conditions ?? {})],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function insertEntity(client, table, idColumn, id, releaseId, entity) {
  await client.query(
    `INSERT INTO ${table} (${idColumn}, data_release_id, labels, payload)
     VALUES ($1, $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (${idColumn}, data_release_id) DO NOTHING`,
    [id, releaseId, JSON.stringify(entity.labels), JSON.stringify(entity.payload ?? {})],
  );
}

function validateBundle(value) {
  if (!isObject(value) || !isObject(value.release)) throw new Error('BUNDLE_OBJECT_REQUIRED');
  const release = value.release;
  for (const key of ['releaseId', 'schemaVersion', 'checksum', 'source', 'dataStatus', 'game', 'regulation']) {
    if (typeof release[key] !== 'string' || !release[key].trim()) throw new Error(`RELEASE_${key.toUpperCase()}_REQUIRED`);
  }
  if (release.game !== 'pokemon-champions') throw new Error('RELEASE_GAME_UNSUPPORTED');
  if (!/^[a-f0-9]{64}$/.test(release.checksum)) throw new Error('RELEASE_CHECKSUM_SHA256_REQUIRED');
  if (!['certified', 'provisional', 'unverified'].includes(release.dataStatus)) throw new Error('RELEASE_DATA_STATUS_INVALID');
  validateDateWindow(release);
  const arrays = ['formats', 'species', 'forms', 'moves', 'abilities', 'items', 'natures', 'learnsets', 'legalities'];
  for (const key of arrays) if (!Array.isArray(value[key])) throw new Error(`BUNDLE_${key.toUpperCase()}_ARRAY_REQUIRED`);
  if (!value.formats.length) throw new Error('BUNDLE_FORMAT_REQUIRED');
  assertUnique(value.formats, 'formatId');
  assertUnique(value.species, 'speciesId');
  assertUnique(value.forms, 'formId');
  assertUnique(value.moves, 'moveId');
  assertUnique(value.abilities, 'abilityId');
  assertUnique(value.items, 'itemId');
  assertUnique(value.natures, 'natureId');
  assertEntityLabels(value.species, 'speciesId');
  assertEntityLabels(value.moves, 'moveId');
  assertEntityLabels(value.abilities, 'abilityId');
  assertEntityLabels(value.items, 'itemId');
  assertEntityLabels(value.natures, 'natureId');
  value.formats.forEach((format) => validateFormat(format, release));
  const speciesIds = new Set(value.species.map((entry) => entry.speciesId));
  const formIds = new Set(value.forms.map((entry) => entry.formId));
  const moveIds = new Set(value.moves.map((entry) => entry.moveId));
  const abilityIds = new Set(value.abilities.map((entry) => entry.abilityId));
  const itemIds = new Set(value.items.map((entry) => entry.itemId));
  const natureIds = new Set(value.natures.map((entry) => entry.natureId));
  const formatIds = new Set(value.formats.map((entry) => entry.formatId));
  for (const form of value.forms) {
    validateForm(form, speciesIds, moveIds, abilityIds, itemIds, formatIds, release.dataStatus === 'certified');
  }
  assertUniqueComposite(value.learnsets, ['formId', 'moveId']);
  for (const learnset of value.learnsets) {
    if (!isNonEmptyString(learnset.formId) || !isNonEmptyString(learnset.moveId) || !isNonEmptyString(learnset.source)) throw new Error('LEARNSET_FIELDS_REQUIRED');
    if (!formIds.has(learnset.formId) || !moveIds.has(learnset.moveId)) throw new Error(`LEARNSET_REFERENCE_UNKNOWN:${learnset.formId}:${learnset.moveId}`);
  }
  assertUniqueComposite(value.legalities, ['formatId', 'entityType', 'entityId']);
  for (const legality of value.legalities) {
    validateLegality(legality, formatIds, speciesIds, formIds, moveIds, abilityIds, itemIds, natureIds);
  }
  if (release.dataStatus === 'certified') {
    validateCertifiedCompleteness(value, formIds, moveIds, abilityIds, itemIds, natureIds);
  }
  return value;
}

function validateDateWindow(release) {
  if (release.validFrom === undefined && release.validUntil === undefined) return;
  if (typeof release.validFrom !== 'string' || typeof release.validUntil !== 'string') throw new Error('RELEASE_DATE_WINDOW_INCOMPLETE');
  const from = Date.parse(release.validFrom);
  const until = Date.parse(release.validUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until) || until <= from) throw new Error('RELEASE_DATE_WINDOW_INVALID');
}

function validateFormat(format, release) {
  if (!isObject(format)) throw new Error('FORMAT_OBJECT_REQUIRED');
  for (const key of ['formatId', 'game', 'battleMode', 'context']) {
    if (!isNonEmptyString(format[key])) throw new Error(`FORMAT_${key.toUpperCase()}_REQUIRED`);
  }
  if (format.game !== release.game) throw new Error(`FORMAT_GAME_MISMATCH:${format.formatId}`);
  if (!['singles', 'doubles'].includes(format.battleMode)) throw new Error(`FORMAT_BATTLE_MODE_INVALID:${format.formatId}`);
  if (!['ranked-battles', 'vgc-championship', 'fixture'].includes(format.context)) throw new Error(`FORMAT_CONTEXT_INVALID:${format.formatId}`);
  if (format.context === 'fixture' && release.dataStatus === 'certified') throw new Error(`FORMAT_CONTEXT_FIXTURE_CERTIFIED:${format.formatId}`);
  if (!Number.isInteger(format.level) || format.level < 1 || format.level > 100) throw new Error(`FORMAT_LEVEL_INVALID:${format.formatId}`);
  validateLabels(format.labels, `FORMAT_LABELS_INVALID:${format.formatId}`);
  for (const key of ['rules', 'conversionPolicy', 'capabilities']) {
    if (format[key] !== undefined && !isObject(format[key])) throw new Error(`FORMAT_${key.toUpperCase()}_OBJECT_REQUIRED:${format.formatId}`);
  }
  if (isObject(format.rules) && format.rules.context !== undefined && format.rules.context !== format.context) throw new Error(`FORMAT_CONTEXT_CONFLICT:${format.formatId}`);
}

function validateForm(form, speciesIds, moveIds, abilityIds, itemIds, formatIds, certified) {
  if (!isObject(form) || !isNonEmptyString(form.formId) || !isNonEmptyString(form.speciesId)) throw new Error('FORM_ID_REQUIRED');
  if (!speciesIds.has(form.speciesId)) throw new Error(`FORM_SPECIES_UNKNOWN:${form.formId}`);
  validateLabels(form.labels, `FORM_LABELS_INVALID:${form.formId}`);
  if (!Array.isArray(form.types) || !form.types.length || form.types.some((type) => !isNonEmptyString(type)) || new Set(form.types).size !== form.types.length) throw new Error(`FORM_TYPES_INVALID:${form.formId}`);
  const stats = form.baseStats;
  if (!isObject(stats)) throw new Error(`FORM_BASE_STATS_INVALID:${form.formId}`);
  for (const key of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    if (!Number.isInteger(stats[key]) || stats[key] < 0 || stats[key] > 255) throw new Error(`FORM_BASE_STAT_INVALID:${form.formId}:${key}`);
  }
  validateReferenceArray(form.abilityIds ?? idsFromObjects(form.abilities, 'abilityId'), abilityIds, `FORM_ABILITY_REFERENCE_UNKNOWN:${form.formId}`);
  validateReferenceArray(form.itemIds ?? idsFromObjects(form.items, 'itemId'), itemIds, `FORM_ITEM_REFERENCE_UNKNOWN:${form.formId}`);
  validateReferenceArray(form.moveIds ?? idsFromObjects(form.learnableMoves, 'moveId'), moveIds, `FORM_MOVE_REFERENCE_UNKNOWN:${form.formId}`);
  validateReferenceArray(form.legalFormats, formatIds, `FORM_FORMAT_REFERENCE_UNKNOWN:${form.formId}`, false);
  if (certified && !Array.isArray(form.abilityIds) && !Array.isArray(form.abilities)) throw new Error(`CERTIFIED_FORM_ABILITIES_MISSING:${form.formId}`);
}

function validateLegality(legality, formatIds, speciesIds, formIds, moveIds, abilityIds, itemIds, natureIds) {
  if (!isObject(legality) || !isNonEmptyString(legality.formatId) || !isNonEmptyString(legality.entityType) || !isNonEmptyString(legality.entityId)) throw new Error('LEGALITY_FIELDS_REQUIRED');
  if (!formatIds.has(legality.formatId)) throw new Error(`LEGALITY_FORMAT_UNKNOWN:${legality.formatId}`);
  if (!['species', 'form', 'move', 'ability', 'item', 'nature'].includes(legality.entityType)) throw new Error(`LEGALITY_ENTITY_TYPE_INVALID:${legality.entityType}`);
  const ids = { species: speciesIds, form: formIds, move: moveIds, ability: abilityIds, item: itemIds, nature: natureIds };
  if (!ids[legality.entityType].has(legality.entityId)) throw new Error(`LEGALITY_ENTITY_UNKNOWN:${legality.entityType}:${legality.entityId}`);
  if (!['allowed', 'banned', 'conditional'].includes(legality.status)) throw new Error(`LEGALITY_STATUS_INVALID:${legality.entityId}`);
  if (legality.reason !== undefined && !isNonEmptyString(legality.reason)) throw new Error(`LEGALITY_REASON_INVALID:${legality.entityId}`);
  if (legality.conditions !== undefined && !isObject(legality.conditions)) throw new Error(`LEGALITY_CONDITIONS_INVALID:${legality.entityId}`);
  if (legality.status === 'conditional' && !isNonEmptyString(legality.reason) && !hasKeys(legality.conditions)) throw new Error(`LEGALITY_CONDITION_MISSING:${legality.entityId}`);
}

function validateCertifiedCompleteness(bundle, formIds, moveIds, abilityIds, itemIds, natureIds) {
  for (const key of ['species', 'forms', 'moves', 'abilities', 'items', 'natures']) {
    if (!bundle[key].length) throw new Error(`CERTIFIED_${key.toUpperCase()}_REQUIRED`);
  }
  for (const formId of formIds) {
    if (!bundle.learnsets.some((entry) => entry.formId === formId)) throw new Error(`CERTIFIED_LEARNSET_MISSING:${formId}`);
  }
  for (const format of bundle.formats) {
    if (!bundle.legalities.some((entry) => entry.formatId === format.formatId)) throw new Error(`CERTIFIED_LEGALITY_REQUIRED:${format.formatId}`);
    for (const form of bundle.forms) {
      const covered = bundle.legalities.some((entry) => entry.formatId === format.formatId && ((entry.entityType === 'form' && entry.entityId === form.formId) || (entry.entityType === 'species' && entry.entityId === form.speciesId)));
      if (!covered) throw new Error(`CERTIFIED_FORM_LEGALITY_MISSING:${format.formatId}:${form.formId}`);
    }
    const coveredEntities = { move: moveIds, ability: abilityIds, item: itemIds, nature: natureIds };
    for (const [entityType, ids] of Object.entries(coveredEntities)) {
      for (const entityId of ids) {
        if (!bundle.legalities.some((entry) => entry.formatId === format.formatId && entry.entityType === entityType && entry.entityId === entityId)) {
          throw new Error(`CERTIFIED_LEGALITY_MISSING:${format.formatId}:${entityType}:${entityId}`);
        }
      }
    }
  }
}

function assertEntityLabels(entries, key) {
  entries.forEach((entry) => {
    if (!isObject(entry)) throw new Error(`ENTITY_OBJECT_REQUIRED:${key}`);
    if (!isNonEmptyString(entry[key])) throw new Error(`ENTITY_ID_REQUIRED:${key}`);
    validateLabels(entry.labels, `ENTITY_LABELS_INVALID:${entry[key]}`);
  });
}

function validateLabels(value, code) {
  if (!isObject(value) || !isNonEmptyString(value.en) || (value.it !== null && value.it !== undefined && !isNonEmptyString(value.it))) throw new Error(code);
}

function validateReferenceArray(value, knownIds, code, required = true) {
  if (value === undefined) {
    if (required) return;
    return;
  }
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((entry) => !isNonEmptyString(entry)) || new Set(value).size !== value.length) throw new Error(code);
  value.forEach((entry) => {
    if (!knownIds.has(entry)) throw new Error(`${code}:${entry}`);
  });
}

function idsFromObjects(value, key) {
  return Array.isArray(value) ? value.map((entry) => isObject(entry) ? entry[key] ?? entry.id : entry) : undefined;
}

function hasKeys(value) {
  return isObject(value) && Object.keys(value).length > 0;
}

function assertUnique(entries, key) {
  const seen = new Set();
  for (const entry of entries) {
    if (typeof entry?.[key] !== 'string' || !entry[key].trim() || seen.has(entry[key])) throw new Error(`DUPLICATE_OR_MISSING_${key.toUpperCase()}`);
    seen.add(entry[key]);
  }
}

function assertUniqueComposite(entries, keys) {
  const seen = new Set();
  for (const entry of entries) {
    const values = keys.map((key) => entry?.[key]);
    if (values.some((value) => !isNonEmptyString(value))) throw new Error(`MISSING_COMPOSITE_KEY:${keys.join(':')}`);
    const composite = values.join('\u0000');
    if (seen.has(composite)) throw new Error(`DUPLICATE_COMPOSITE_KEY:${keys.map((key, index) => `${key}=${values[index]}`).join(':')}`);
    seen.add(composite);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function withoutChecksum(bundle) {
  return { ...bundle, release: { ...bundle.release, checksum: undefined } };
}

function sha256(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
