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
      await client.query(
        `INSERT INTO format_profiles
          (format_id, data_release_id, game, battle_mode, level, labels, rules, conversion_policy, capabilities)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb)
         ON CONFLICT (format_id, data_release_id) DO NOTHING`,
        [format.formatId, release.releaseId, format.game, format.battleMode, format.level, JSON.stringify(format.labels), JSON.stringify(format.rules ?? {}), JSON.stringify(format.conversionPolicy ?? {}), JSON.stringify(format.capabilities ?? {})],
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
  for (const key of ['releaseId', 'schemaVersion', 'checksum', 'source', 'dataStatus']) {
    if (typeof release[key] !== 'string' || !release[key].trim()) throw new Error(`RELEASE_${key.toUpperCase()}_REQUIRED`);
  }
  if (!/^[a-f0-9]{64}$/.test(release.checksum)) throw new Error('RELEASE_CHECKSUM_SHA256_REQUIRED');
  if (!['certified', 'provisional', 'unverified'].includes(release.dataStatus)) throw new Error('RELEASE_DATA_STATUS_INVALID');
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
  const speciesIds = new Set(value.species.map((entry) => entry.speciesId));
  const formIds = new Set(value.forms.map((entry) => entry.formId));
  const moveIds = new Set(value.moves.map((entry) => entry.moveId));
  const formatIds = new Set(value.formats.map((entry) => entry.formatId));
  for (const form of value.forms) {
    if (!speciesIds.has(form.speciesId)) throw new Error(`FORM_SPECIES_UNKNOWN:${form.formId}`);
    if (!Array.isArray(form.types) || !isObject(form.baseStats)) throw new Error(`FORM_PAYLOAD_INVALID:${form.formId}`);
  }
  for (const learnset of value.learnsets) {
    if (!formIds.has(learnset.formId) || !moveIds.has(learnset.moveId)) throw new Error(`LEARNSET_REFERENCE_UNKNOWN:${learnset.formId}:${learnset.moveId}`);
  }
  for (const legality of value.legalities) {
    if (!formatIds.has(legality.formatId)) throw new Error(`LEGALITY_FORMAT_UNKNOWN:${legality.formatId}`);
    if (!['allowed', 'banned', 'conditional'].includes(legality.status)) throw new Error(`LEGALITY_STATUS_INVALID:${legality.entityId}`);
  }
  return value;
}

function assertUnique(entries, key) {
  const seen = new Set();
  for (const entry of entries) {
    if (typeof entry?.[key] !== 'string' || !entry[key].trim() || seen.has(entry[key])) throw new Error(`DUPLICATE_OR_MISSING_${key.toUpperCase()}`);
    seen.add(entry[key]);
  }
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
