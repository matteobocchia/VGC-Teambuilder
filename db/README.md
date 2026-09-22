# PostgreSQL data repository

`migrations/001_canonical_repository.sql` creates the append-only release
repository used by the backend plan. Release IDs are exact keys: the API must
resolve `format_id + data_release_id`, verify the stored checksum, and never
silently substitute the latest release.

Apply `migrations/002_catalog_legality_hardening.sql` after the initial
migration. It adds SHA-256/bundle identity checks, explicit format-context
checks and a legality entity-type allowlist. The checks are initially
`NOT VALID` to make an existing database auditable before validating historical
rows; new rows are checked immediately.

The importer requires every Champions format to declare an explicit `context`:
`ranked-battles` or `vgc-championship`. A fixture may use `fixture` only while
`dataStatus` is `unverified`. The context is persisted inside the format
`rules` JSONB together with the other format rules, so Ranked Battles and VGC
Championship legalities cannot be silently treated as the same format.

Apply migrations `001_canonical_repository.sql` and then
`002_catalog_legality_hardening.sql` with the PostgreSQL migration runner used
by the deployment:

```text
DATABASE_URL=postgres://... <migration-command> db/migrations
```

The application currently ships a six-entry bundled catalog only for local
development/preview. Set `DATABASE_URL` in a deployment to disable that
fallback; until the PostgreSQL route repository is enabled, the API returns an explicit
`POSTGRESQL_ADAPTER_NOT_CONFIGURED` error rather than serving demo data.

Release imports must be idempotent and transactional. The repository includes
`npm run db:import -- <bundle.json>`: it validates references, computes the
SHA-256 checksum over the canonical JSON payload (with `release.checksum`
omitted), inserts `data_releases` and all release-scoped rows in one
transaction, then commits. Use `--dry-run` in CI or before connecting to a
database. Existing release rows are protected by database triggers and can
only be superseded by a new `release_id`.

`npm run db:check` runs the same validation against the committed minimal
fixture without opening a database connection.

The import bundle shape is:

```json
{
  "release": {
    "releaseId": "champions-mb-2026-09-14.1",
    "schemaVersion": "1.0",
    "checksum": "<64 lowercase hex characters>",
    "source": "official-export",
    "dataStatus": "certified",
    "game": "pokemon-champions",
    "regulation": "M-B"
  },
  "formats": [{
    "formatId": "champions-mb-vgc-doubles",
    "game": "pokemon-champions",
    "context": "vgc-championship",
    "battleMode": "doubles",
    "level": 50,
    "labels": { "it": "Regolamento M-B · VGC Doppio", "en": "Regulation M-B · VGC Doubles" },
    "rules": {},
    "conversionPolicy": {},
    "capabilities": {}
  }],
  "species": [],
  "forms": [],
  "moves": [],
  "abilities": [],
  "items": [],
  "natures": [],
  "learnsets": [],
  "legalities": []
}
```

The checksum is intentionally part of the release envelope but excluded from
the hashed payload, so the importer can verify it without trusting a client
provided digest. Certified releases are also required to contain complete
entity tables, at least one learnset row for every form, and explicit legality
coverage for every form (directly or through its species) in every format.
Ambiguous or duplicate legality keys are rejected before the transaction.
