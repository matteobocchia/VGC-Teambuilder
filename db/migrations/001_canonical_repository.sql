-- VGC Teambuilder canonical repository
-- Apply this migration with a PostgreSQL migration runner. Release-scoped
-- rows are append-only: a new rules/data bundle gets a new release_id.

BEGIN;

CREATE TABLE IF NOT EXISTS data_releases (
  release_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  checksum TEXT NOT NULL CHECK (length(checksum) >= 16),
  source TEXT NOT NULL,
  data_status TEXT NOT NULL CHECK (data_status IN ('certified', 'provisional', 'unverified')),
  bundle JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (checksum)
);

CREATE TABLE IF NOT EXISTS format_profiles (
  format_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL REFERENCES data_releases (release_id),
  game TEXT NOT NULL,
  battle_mode TEXT NOT NULL CHECK (battle_mode IN ('singles', 'doubles')),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 100),
  labels JSONB NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversion_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (format_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS pokemon_species (
  species_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL REFERENCES data_releases (release_id),
  labels JSONB NOT NULL,
  PRIMARY KEY (species_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS pokemon_forms (
  form_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL,
  labels JSONB NOT NULL,
  role JSONB,
  types TEXT[] NOT NULL DEFAULT '{}',
  base_stats JSONB NOT NULL,
  PRIMARY KEY (form_id, data_release_id),
  FOREIGN KEY (species_id, data_release_id) REFERENCES pokemon_species (species_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS moves (
  move_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL REFERENCES data_releases (release_id),
  labels JSONB NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (move_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS abilities (
  ability_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL REFERENCES data_releases (release_id),
  labels JSONB NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (ability_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS items (
  item_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL REFERENCES data_releases (release_id),
  labels JSONB NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (item_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS natures (
  nature_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL REFERENCES data_releases (release_id),
  labels JSONB NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (nature_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS learnsets (
  form_id TEXT NOT NULL,
  move_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (form_id, move_id, data_release_id),
  FOREIGN KEY (form_id, data_release_id) REFERENCES pokemon_forms (form_id, data_release_id),
  FOREIGN KEY (move_id, data_release_id) REFERENCES moves (move_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS format_legalities (
  format_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('allowed', 'banned', 'conditional')),
  reason TEXT,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (format_id, data_release_id, entity_type, entity_id),
  FOREIGN KEY (format_id, data_release_id) REFERENCES format_profiles (format_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  format_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  share_token_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (format_id, data_release_id) REFERENCES format_profiles (format_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS team_revisions (
  revision_id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams (team_id),
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  format_id TEXT NOT NULL,
  data_release_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('it', 'en')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'blocked', 'legal')),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, revision_number),
  FOREIGN KEY (format_id, data_release_id) REFERENCES format_profiles (format_id, data_release_id)
);

CREATE TABLE IF NOT EXISTS team_slots (
  revision_id TEXT NOT NULL REFERENCES team_revisions (revision_id),
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 6),
  set_payload JSONB,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('empty', 'valid', 'invalid')),
  PRIMARY KEY (revision_id, slot)
);

CREATE OR REPLACE FUNCTION reject_immutable_release_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'release-scoped rows are immutable; create a new data_release_id'
    USING ERRCODE = '55006';
END;
$$;

DROP TRIGGER IF EXISTS data_releases_immutable ON data_releases;
CREATE TRIGGER data_releases_immutable
  BEFORE UPDATE OR DELETE ON data_releases
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS format_profiles_immutable ON format_profiles;
CREATE TRIGGER format_profiles_immutable
  BEFORE UPDATE OR DELETE ON format_profiles
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS team_revisions_immutable ON team_revisions;
CREATE TRIGGER team_revisions_immutable
  BEFORE UPDATE OR DELETE ON team_revisions
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS team_slots_immutable ON team_slots;
CREATE TRIGGER team_slots_immutable
  BEFORE UPDATE OR DELETE ON team_slots
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

COMMIT;
