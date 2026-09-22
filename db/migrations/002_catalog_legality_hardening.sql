-- Catalog and legality invariants added after the initial repository boundary.
-- The checks are NOT VALID so an existing database can be inspected and
-- remediated before validation is made strict for every historical row. New
-- rows are checked immediately.

BEGIN;

ALTER TABLE data_releases
  DROP CONSTRAINT IF EXISTS data_releases_checksum_check;

ALTER TABLE data_releases
  ADD CONSTRAINT data_releases_checksum_sha256_check
  CHECK (checksum ~ '^[a-f0-9]{64}$') NOT VALID;

ALTER TABLE data_releases
  ADD CONSTRAINT data_releases_bundle_release_identity_check
  CHECK (
    bundle #>> '{release,releaseId}' = release_id
    AND bundle #>> '{release,checksum}' = checksum
  ) NOT VALID;

ALTER TABLE format_profiles
  ADD CONSTRAINT format_profiles_context_check
  CHECK (
    rules ? 'context'
    AND rules ->> 'context' IN ('ranked-battles', 'vgc-championship', 'fixture')
  ) NOT VALID;

ALTER TABLE format_legalities
  ADD CONSTRAINT format_legalities_entity_type_check
  CHECK (entity_type IN ('species', 'form', 'move', 'ability', 'item', 'nature')) NOT VALID;

-- A release checksum is only meaningful while every release-scoped row is
-- append-only. Corrections must be imported under a new release_id.
DROP TRIGGER IF EXISTS pokemon_species_immutable ON pokemon_species;
CREATE TRIGGER pokemon_species_immutable
  BEFORE UPDATE OR DELETE ON pokemon_species
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS pokemon_forms_immutable ON pokemon_forms;
CREATE TRIGGER pokemon_forms_immutable
  BEFORE UPDATE OR DELETE ON pokemon_forms
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS moves_immutable ON moves;
CREATE TRIGGER moves_immutable
  BEFORE UPDATE OR DELETE ON moves
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS abilities_immutable ON abilities;
CREATE TRIGGER abilities_immutable
  BEFORE UPDATE OR DELETE ON abilities
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS items_immutable ON items;
CREATE TRIGGER items_immutable
  BEFORE UPDATE OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS natures_immutable ON natures;
CREATE TRIGGER natures_immutable
  BEFORE UPDATE OR DELETE ON natures
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS learnsets_immutable ON learnsets;
CREATE TRIGGER learnsets_immutable
  BEFORE UPDATE OR DELETE ON learnsets
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

DROP TRIGGER IF EXISTS format_legalities_immutable ON format_legalities;
CREATE TRIGGER format_legalities_immutable
  BEFORE UPDATE OR DELETE ON format_legalities
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_release_mutation();

COMMIT;
