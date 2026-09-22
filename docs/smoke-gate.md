# Smoke gate: catalog and UI release states

The smoke gate is deliberately split into a dependency-free API check and a
small browser checklist. It asserts the user-visible contract without tying
the release to CSS selectors, screenshots, network timing, or a specific
browser automation vendor.

## API contract

Start the app, then run:

```powershell
npm run dev
npm run smoke:api
```

The script checks:

- catalog context envelope and Champions format identity;
- IT and EN catalog responses;
- `meta.dataStatus` (`certified`, `provisional`, or `unverified`);
- catalog pagination until `nextCursor` is exhausted;
- structured `404` error handling for an unknown format, used by the UI retry state.

Use a different local server or format with environment variables when needed:

```powershell
$env:SMOKE_BASE_URL = 'http://localhost:3001'
$env:SMOKE_FORMAT_ID = 'champions-regulation-mb-doubles'
npm run smoke:api
```

## Browser contract

Run the browser smoke against the same server. Prefer semantic locators or
accessible snapshots, not generated class names.

1. Open `/` and wait for either the catalog-ready state or the visible
   catalog error/retry state. During loading, the page must expose a loading
   message and must not present the catalog as certified.
2. In the builder, confirm the banner communicates the returned release state:
   unverified, provisional, or certified. If an error is shown, `Riprova` /
   `Retry` is a real button and the local draft save control remains available.
3. Toggle IT and EN. Confirm `document.documentElement.lang` changes to `it`
   and `en`, the primary navigation labels change, and the catalog search can
   find a result using the active language.
4. Open `/calculator`. Wait for the same ready/error state. On an unverified
   release, the interface must keep the result marked as a UI preset; it must
   not present the damage output as certified.
5. When the API is unavailable, confirm the error copy is localized and the
   retry action can be activated. Do not assert a fixed delay or a particular
   loading animation.

The API script is the CI gate. The browser checklist is the release smoke
until a browser runner is added; if Playwright or another runner is introduced,
keep these assertions semantic and reuse the same API fixture/format ID.
