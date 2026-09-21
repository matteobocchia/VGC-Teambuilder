# PostgreSQL data repository

`migrations/001_canonical_repository.sql` creates the append-only release
repository used by the backend plan. Release IDs are exact keys: the API must
resolve `format_id + data_release_id`, verify the stored checksum, and never
silently substitute the latest release.

Apply migrations with the PostgreSQL migration runner used by the deployment:

```text
DATABASE_URL=postgres://... <migration-command> db/migrations
```

The application currently ships a six-entry bundled catalog only for local
development/preview. Set `DATABASE_URL` in a deployment to disable that
fallback; until the PostgreSQL adapter is enabled, the API returns an explicit
`POSTGRESQL_ADAPTER_NOT_CONFIGURED` error rather than serving demo data.

Release imports must be idempotent and transactional: validate the bundle,
compute its checksum, insert `data_releases` and all release-scoped rows in one
transaction, then commit. Existing release rows are protected by database
triggers and can only be superseded by a new `release_id`.
