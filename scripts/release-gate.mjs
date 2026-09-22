import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const port = Number(process.env.RELEASE_GATE_PORT ?? 3000);
const baseUrl = `${process.env.RELEASE_GATE_BASE_URL ?? `http://localhost:${port}`}`;
const formatId = 'champions-regulation-mb-doubles';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = resolve(root, 'db/fixtures/minimal-release.json');

function assert(condition, message) {
  if (!condition) throw new Error(`RELEASE_GATE_FAILED: ${message}`);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fixtureChecksum(bundle) {
  const payload = { ...bundle, release: { ...bundle.release, checksum: undefined } };
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function runCommand(command, args) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolveResult({ code, stdout, stderr }));
  });
}

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`RELEASE_GATE_FAILED: ${path} returned non-JSON (${response.status})`);
  }
  return { response, body };
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { response } = await request('/api/v1/health');
      if (response.status < 500) return;
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('RELEASE_GATE_FAILED: dev server did not start in time');
}

let server;
let ownsServer = false;

try {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert(fixture.release?.dataStatus === 'unverified', 'minimal fixture remains non-certified');
  assert(/^[a-f0-9]{64}$/.test(fixture.release?.checksum ?? ''), 'minimal fixture has a SHA-256 checksum');
  assert(fixture.release.checksum === fixtureChecksum(fixture), 'minimal fixture checksum matches canonical JSON');
  const dbCheck = await runCommand(npmCommand, ['run', 'db:check']);
  assert(dbCheck.code === 0, `db:check failed: ${dbCheck.stderr || dbCheck.stdout}`);

  try {
    const existing = await fetch(`${baseUrl}/api/v1/health`);
    if (!existing.ok && existing.status >= 500) throw new Error('unhealthy');
  } catch {
    server = spawn(npmCommand, ['run', 'dev'], {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'ignore',
      shell: process.platform === 'win32',
      windowsHide: true,
    });
    ownsServer = true;
  }
  await waitForServer();

  const context = await request(`/api/v1/catalog/context?formatId=${formatId}`);
  assert(context.response.status === 200, `catalog context returned ${context.response.status}`);
  assert(context.body.data?.format?.id === formatId, 'context format id mismatch');
  assert(context.body.meta?.releaseId === context.body.data.format.dataReleaseId, 'context release metadata mismatch');
  assert(['certified', 'provisional', 'unverified'].includes(context.body.meta?.dataStatus), 'invalid data status');
  const coverage = context.body.meta?.coverage;
  assert(coverage && typeof coverage === 'object', 'coverage metadata missing');
  for (const key of ['catalog', 'legalities', 'learnsets', 'damageEngine', 'teamValidation']) {
    assert(Object.prototype.hasOwnProperty.call(coverage, key), `coverage.${key} is missing`);
  }

  const releaseId = context.body.meta.releaseId;
  const catalog = await request(`/api/v1/catalog/pokemon?formatId=${formatId}&dataReleaseId=${encodeURIComponent(releaseId)}&limit=100`);
  assert(catalog.response.status === 200, `catalog returned ${catalog.response.status}`);
  assert(Array.isArray(catalog.body.data?.pokemon), 'catalog pokemon array missing');
  assert(catalog.body.meta?.releaseId === releaseId, 'catalog release metadata mismatch');
  assert(catalog.body.data?.dataReleaseId === releaseId, 'catalog payload release mismatch');

  const calculator = await request('/api/v1/calculator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      formatId,
      dataReleaseId: releaseId,
      mode: 'doubles',
      attacker: { revisionId: 'revision:smoke', slot: 1 },
      defender: { revisionId: 'revision:smoke', slot: 2 },
      moveId: 'move:moonblast',
      field: { weather: 'clear', terrain: 'none', reflect: false, lightScreen: false, auroraVeil: false, safeguard: false, tailwind: false, trickRoom: false, gravity: false },
      critical: false,
      spread: false,
    }),
  });
  assert(calculator.response.status === 422, `calculator returned ${calculator.response.status}`);
  assert(calculator.body.issues?.[0]?.code === 'DATA_UNVERIFIED', 'calculator did not expose DATA_UNVERIFIED');
  assert(!calculator.body.data, 'calculator exposed numeric data while engine is unavailable');
  assert(calculator.body.meta?.releaseId === releaseId, 'calculator error release metadata mismatch');
  assert(calculator.body.meta?.checksum === context.body.meta?.checksum, 'calculator error checksum metadata mismatch');
  assert(calculator.body.meta?.coverage, 'calculator error coverage metadata missing');

  const malformedCalculator = await request('/api/v1/calculator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ formatId, dataReleaseId: releaseId }),
  });
  assert(malformedCalculator.response.status === 400, `malformed calculator returned ${malformedCalculator.response.status}`);
  assert(malformedCalculator.body.issues?.some((entry) => entry.code === 'BATTLE_MODE_REQUIRED'), 'malformed calculator did not expose request validation issues');

  const draftRevision = await request('/api/v1/teams/revisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ formatId, dataReleaseId: releaseId, locale: 'en', name: 'Share gate draft', slots: [null, null, null, null, null, null] }),
  });
  assert(draftRevision.response.status === 200, `draft revision returned ${draftRevision.response.status}`);
  const draftRevisionId = draftRevision.body.data?.revision?.id;
  assert(typeof draftRevisionId === 'string', 'draft revision id missing');
  const ownerCookie = draftRevision.response.headers.get('set-cookie')?.split(';', 1)[0];
  assert(ownerCookie, 'draft revision owner cookie missing');
  const shareDraft = await request(`/api/v1/teams/revisions/${encodeURIComponent(draftRevisionId)}/share`, {
    method: 'POST',
    headers: { Accept: 'application/json', Cookie: ownerCookie },
    body: JSON.stringify({}),
  });
  assert(shareDraft.response.status === 422, `draft share returned ${shareDraft.response.status}`);
  assert(shareDraft.body.issues?.[0]?.code === 'REVISION_NOT_SHAREABLE', 'draft share did not stay read-only blocked');
  const invalidShare = await request(`/api/v1/teams/revisions/${encodeURIComponent(draftRevisionId)}?shareToken=invalid-token`, { headers: { Accept: 'application/json' } });
  assert(invalidShare.response.status === 404, `invalid share token returned ${invalidShare.response.status}`);
  assert(invalidShare.body.issues?.[0]?.code === 'SHARE_TOKEN_INVALID', 'invalid share token error code mismatch');

  const showdownImport = await request('/api/v1/showdown/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ formatId, dataReleaseId: releaseId, text: 'Flutter Mane @ Choice Specs\nAbility: Protosynthesis\nEVs: 252 SpA / 252 Spe\nTimid Nature\n- Moonblast' }),
  });
  assert(showdownImport.response.status === 422, `Showdown import returned ${showdownImport.response.status}`);
  assert(showdownImport.body.issues?.some((entry) => entry.code === 'LEGACY_CONVERSION_POLICY_UNAVAILABLE'), 'Showdown import silently accepted legacy EVs');
  assert(showdownImport.body.issues?.some((entry) => entry.code === 'DATA_UNVERIFIED'), 'Showdown import did not enforce release status');
  assert(!showdownImport.body.issues?.some((entry) => entry.code === 'UNKNOWN_SHOWDOWN_NAME'), 'Showdown parser failed to split a valid Pokémon/item header');
  assert(!showdownImport.body.data, 'Showdown import exposed a converted team from unverified data');

  const showdownStatPointsImport = await request('/api/v1/showdown/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ formatId, dataReleaseId: releaseId, text: 'Mane (Flutter Mane) @ Choice Specs\nAbility: Protosynthesis\nLevel: 50\nStat Points: 26 SpA / 26 Spe\nTimid Nature\n- Moonblast' }),
  });
  assert(showdownStatPointsImport.response.status === 422, `Showdown Stat Points import returned ${showdownStatPointsImport.response.status}`);
  assert(showdownStatPointsImport.body.issues?.some((entry) => entry.code === 'DATA_UNVERIFIED'), 'Showdown Stat Points import did not enforce release status');
  assert(!showdownStatPointsImport.body.issues?.some((entry) => ['UNKNOWN_SHOWDOWN_NAME', 'UNKNOWN_NATURE', 'MOVE_NOT_LEARNABLE'].includes(entry.code)), 'Showdown Stat Points parser rejected valid release labels');
  assert(!showdownStatPointsImport.body.data, 'Showdown Stat Points import exposed a team from unverified data');

  const showdownExport = await request('/api/v1/showdown/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ formatId, dataReleaseId: releaseId, slots: [null, null, null, null, null, null] }),
  });
  assert(showdownExport.response.status === 422, `Showdown export returned ${showdownExport.response.status}`);
  assert(showdownExport.body.issues?.some((entry) => entry.code === 'DATA_UNVERIFIED'), 'Showdown export did not enforce release status');
  assert(!showdownExport.body.data?.text, 'Showdown export emitted text from unverified data');

  const unknownRelease = await request(`/api/v1/catalog/context?formatId=${formatId}&dataReleaseId=release-does-not-exist`);
  assert(unknownRelease.response.status === 404, `unknown release returned ${unknownRelease.response.status}`);
  assert(unknownRelease.body.issues?.[0]?.code === 'UNKNOWN_RELEASE', 'unknown release error code mismatch');

  const invalidPagination = await request(`/api/v1/catalog/pokemon?formatId=${formatId}&limit=101`);
  assert(invalidPagination.response.status === 400, `invalid pagination returned ${invalidPagination.response.status}`);
  assert(invalidPagination.body.issues?.[0]?.code === 'INVALID_PAGINATION', 'invalid pagination error code mismatch');

  console.log(JSON.stringify({
    ok: true,
    formatId,
    releaseId,
    dataStatus: context.body.meta.dataStatus,
    catalogCount: catalog.body.data.pokemon.length,
    checks: ['fixture-checksum', 'context-coverage', 'catalog', 'calculator-request-validation', 'calculator-unverified', 'revision-share-boundary', 'showdown-legacy-boundary', 'showdown-header-parser', 'showdown-stat-points-boundary', 'showdown-unverified', 'unknown-release', 'invalid-pagination'],
  }, null, 2));
} finally {
  if (ownsServer) server.kill('SIGTERM');
}
