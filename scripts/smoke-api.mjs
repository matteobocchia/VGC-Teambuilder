const baseUrl = new URL(process.env.SMOKE_BASE_URL ?? 'http://localhost:3000');
const formatId = process.env.SMOKE_FORMAT_ID ?? 'champions-regulation-mb-doubles';
const missingFormatId = '__vgc_smoke_missing_format__';

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function request(path, expectedStatus = 200) {
  const url = new URL(path, baseUrl);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`Cannot reach ${baseUrl.origin}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${url.pathname} returned non-JSON content (${response.status}).`);
  }

  check(response.status === expectedStatus, `${url.pathname} expected HTTP ${expectedStatus}, received ${response.status}.`);
  return { response, body };
}

function checkEnvelope(result, path) {
  check(result.body && typeof result.body === 'object', `${path} did not return an object.`);
  check(result.body?.data !== undefined, `${path} is missing data.`);
  check(result.body?.meta && typeof result.body.meta === 'object', `${path} is missing meta.`);
  check(['certified', 'provisional', 'unverified'].includes(result.body?.meta?.dataStatus), `${path} has an invalid meta.dataStatus.`);
}

async function run() {
  const contextPath = `/api/v1/catalog/context?formatId=${encodeURIComponent(formatId)}`;
  const context = await request(contextPath);
  checkEnvelope(context, contextPath);
  check(context.body.data?.format?.id === formatId, `${contextPath} returned a different format id.`);
  check(Array.isArray(context.body.data?.types), `${contextPath} data.types must be an array.`);
  check(Array.isArray(context.body.data?.natures), `${contextPath} data.natures must be an array.`);

  const pages = [];
  for (const locale of ['it', 'en']) {
    const catalogPath = `/api/v1/catalog/pokemon?formatId=${encodeURIComponent(formatId)}&locale=${locale}&limit=100`;
    const first = await request(catalogPath);
    checkEnvelope(first, catalogPath);
    check(Array.isArray(first.body.data?.pokemon), `${catalogPath} data.pokemon must be an array.`);
    check(Number.isInteger(first.body.data?.total), `${catalogPath} data.total must be an integer.`);
    check(first.body.data.pokemon.length <= first.body.data.total, `${catalogPath} returned more rows than data.total.`);

    let collected = first.body.data.pokemon.length;
    let cursor = first.body.data.nextCursor;
    const seenCursors = new Set();
    let pageCount = 1;
    while (cursor) {
      check(!seenCursors.has(cursor), `${catalogPath} repeated pagination cursor ${cursor}.`);
      if (seenCursors.has(cursor)) break;
      seenCursors.add(cursor);
      pageCount += 1;
      check(pageCount <= 100, `${catalogPath} exceeded the pagination safety limit.`);
      const pagePath = `${catalogPath}&offset=${encodeURIComponent(cursor)}`;
      const page = await request(pagePath);
      checkEnvelope(page, pagePath);
      check(Array.isArray(page.body.data?.pokemon), `${pagePath} data.pokemon must be an array.`);
      collected += page.body.data.pokemon.length;
      cursor = page.body.data.nextCursor;
    }
    check(collected === first.body.data.total, `${catalogPath} pagination collected ${collected} of ${first.body.data.total} rows.`);
    pages.push(`${locale}:${collected}`);
  }

  const missingPath = `/api/v1/catalog/context?formatId=${missingFormatId}`;
  const missing = await request(missingPath, 404);
  check(Array.isArray(missing.body?.issues) && missing.body.issues.length > 0, `${missingPath} must return a structured issues array.`);
  check(missing.body?.issues?.[0]?.code === 'UNKNOWN_FORMAT', `${missingPath} returned an unexpected issue code.`);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS API smoke: ${baseUrl.origin} · ${formatId} · ${pages.join(' · ')} · retry contract 404/UNKNOWN_FORMAT`);
}

run().catch((error) => {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
