# Bali Itinerary and Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the confirmed Bali itinerary and harden the static PWA for safe data rendering, fast mobile images, reliable offline use, and accessible navigation.

**Architecture:** Preserve the existing no-build static application. Add a small browser/Node-compatible utility module and Node built-in tests, keep trip content in JSON, render responsive images with optional metadata that remains backward-compatible, and centralize validation and cache metadata without adding production dependencies.

**Tech Stack:** HTML5, CSS, browser JavaScript, Service Worker/Cache API, localStorage, IndexedDB, Node.js built-in test runner, JSON Schema, bundled Sharp used only as a development-time image conversion tool.

**Spec:** `docs/superpowers/specs/2026-08-25-bali-itinerary-and-stability-design.md`

## Global Constraints

- Do not add a frontend framework, backend, cloud account, or production dependency.
- Keep the application deployable as static files on GitHub Pages.
- Preserve support for imported legacy trip packs that only contain a string `coverImage`.
- Preserve unrelated local changes and keep edits scoped to this design.
- All built-in trip resources required offline must appear in the Service Worker precache.

---

### Task 1: Validation and test foundation

**Files:**
- Create: `trip-pack.schema.json`
- Create: `scripts/validate-trip-data.mjs`
- Create: `tests/trip-data.test.mjs`
- Modify: `TRIP_PACK_SCHEMA.md`
- Modify: `trip-pack-template.json`

**Interfaces:**
- Produces: `validateTrip(trip, options) -> string[]` exported by `scripts/validate-trip-data.mjs`.
- Produces: command `node scripts/validate-trip-data.mjs` that validates all `trips.json` references, trip dates, IDs, coordinates, assets, and Service Worker precache entries.

- [ ] **Step 1: Write failing data tests**

Create tests using `node:test` and `node:assert/strict` that assert:

```js
assert.deepEqual(validateTrip(validTrip), []);
assert.match(validateTrip({...validTrip, days: []})[0], /days/);
assert.ok(validateTrip(tripWithDuplicateOrderIds).some(x => x.includes('duplicate order id')));
assert.ok(validateTrip(tripWithInvalidCoordinate).some(x => x.includes('coordinate')));
```

Also assert the built-in Bali pack, template, referenced assets, and cache manifest validate without errors.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/trip-data.test.mjs`

Expected: FAIL because `scripts/validate-trip-data.mjs` does not exist.

- [ ] **Step 3: Implement the validator and schema**

Implement pure validation with Node built-ins. Required checks:

```js
export function validateTrip(trip, {source = 'trip'} = {}) {
  const errors = [];
  // root id/city/meta/days, unique checklist/order IDs,
  // YYYY-MM-DD dates, HH:MM times, finite coordinates,
  // chronological days and start/end coverage.
  return errors;
}
```

The CLI reads `trips.json`, validates each referenced JSON file, verifies referenced cover assets, parses `trip-pack.schema.json`, and checks every `CORE` resource in `sw.js` exists.

- [ ] **Step 4: Align schema documentation and template**

Document all root fields and optional responsive image fields:

```json
{
  "coverImage": "./cover.jpg",
  "coverImageSrcset": "./cover-640.webp 640w, ./cover-1280.webp 1280w",
  "coverImageSizes": "(max-width: 780px) 100vw, 780px"
}
```

Ensure the template includes current hotel, order, guide, finance, emergency, theme, checklist, and cover properties.

- [ ] **Step 5: Run tests and validator**

Run:

```bash
node --test tests/trip-data.test.mjs
node scripts/validate-trip-data.mjs
```

Expected: PASS and `Trip data validation passed`.

- [ ] **Step 6: Commit**

```bash
git add trip-pack.schema.json scripts/validate-trip-data.mjs tests/trip-data.test.mjs TRIP_PACK_SCHEMA.md trip-pack-template.json
git commit -m "test: add trip pack validation"
```

### Task 2: Confirmed Bali itinerary

**Files:**
- Modify: `bali-2026-09.json`
- Modify: `trips.json`
- Modify: `tests/trip-data.test.mjs`

**Interfaces:**
- Consumes: `validateTrip()` from Task 1.
- Produces: the authoritative September 11–17 Bali pack consumed by `app.js`, `map.js`, and `finance.js`.

- [ ] **Step 1: Add failing itinerary assertions**

Assert the exact key outcomes:

```js
assert.equal(day(1).hotel, 'Metland Seva Seminyak');
assert.match(day(1).route, /Metland Seva.*水明漾冲浪/);
assert.equal(day(2).hotel, 'Gravity Eco Boutique Hotel');
assert.deepEqual(day(2).places.map(x => x[0]), [
  'Gravity Eco Boutique Hotel', 'Timbis Paragliding',
  'Melasti Beach', 'Uluwatu Temple', 'Kecak Uluwatu'
]);
assert.match(day(6).route, /ATV.*Waterfall.*机场酒店/);
assert.equal(day(7).hotel, '返程');
assert.equal(day(7).places[0][0], '机场酒店');
```

Assert order templates include Seminyak surfing, Gravity, ATV, airport hotel, and Ubud-to-airport-hotel transfer.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/trip-data.test.mjs`

Expected: FAIL on the old Day 1, Day 2, Day 6, and Day 7 data.

- [ ] **Step 3: Update all affected trip sections**

Update timelines, routes, hotels, transport, booking, backup, places, hotel choices, orders, checklist, guides, budget copy, cover metadata, and index summary. Preserve Day 3–5 content where it remains valid, adjusting Day 3 departure hotel and Day 5 morning boat timing.

Use conservative timing:

- Day 1: airport → hotel luggage → Seminyak surf → Seminyak afternoon/evening.
- Day 2: Metland checkout → Gravity luggage/scooter → Timbis → Melasti → Uluwatu/Kecak → Gravity.
- Day 3: Gravity → Sanur → Banjar Nyuh → west route.
- Day 5: morning boat → Sanur → Ubud → light center activity/Spa.
- Day 6: morning ATV → one waterfall → collect luggage → depart about 17:00 → airport hotel.
- Day 7: airport hotel → DPS → 08:05 flight.

- [ ] **Step 4: Run data tests and validator**

Run:

```bash
node --test tests/trip-data.test.mjs
node scripts/validate-trip-data.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bali-2026-09.json trips.json tests/trip-data.test.mjs
git commit -m "feat: update Bali itinerary for September trip"
```

### Task 3: Safe rendering and resilient trip loading

**Files:**
- Create: `utils.js`
- Create: `tests/utils.test.cjs`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `finance.js`
- Modify: `map.js`

**Interfaces:**
- Produces global/CommonJS API `MyTripsUtils` with:
  - `escapeHTML(value) -> string`
  - `safeAssetPath(value) -> string`
  - `safeBackgroundPosition(value) -> string`
  - `finiteCoordinate(value, min, max) -> number | null`
  - `normalizeTripPack(raw) -> normalized trip object`
  - `pictureHTML(config) -> safe HTML string`

- [ ] **Step 1: Write failing unit tests**

Test script payloads, quote injection, JavaScript URLs, invalid positions, numeric coordinates, legacy cover strings, optional srcsets, and missing arrays:

```js
assert.equal(escapeHTML('<img onerror=1>'), '&lt;img onerror=1&gt;');
assert.equal(safeAssetPath('javascript:alert(1)'), '');
assert.equal(safeBackgroundPosition('center 62%'), 'center 62%');
assert.equal(safeBackgroundPosition('x; color:red'), 'center center');
assert.deepEqual(normalizeTripPack({id:'x', city:'X', meta:{start:'2026-01-01', end:'2026-01-01'}, days:[{}]}).days[0].places, []);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/utils.test.cjs`

Expected: FAIL because `utils.js` does not exist.

- [ ] **Step 3: Implement the utility module**

Use a small UMD wrapper so the same pure functions work in the browser and Node. Restrict asset paths to relative/HTTP(S)/data-image sources as appropriate; never allow arbitrary markup in `srcset` or style values.

- [ ] **Step 4: Integrate normalization and escaping**

Load `utils.js` before `app.js`. Normalize built-in and imported trips at the boundary. Replace raw JSON interpolation in day, overview, hotels, orders, checklist, guides, map labels, finance categories, URLs, and attributes with the utility functions.

Handle missing/empty timelines and places with explicit empty states. Replace load-only alerts with an in-page error card containing a retry button. Add `rel="noopener"` to all external links. Guard asynchronous `renderOrders()` with the active trip/view identity before assigning `#main`.

- [ ] **Step 5: Run unit and syntax tests**

Run:

```bash
node --test tests/utils.test.cjs tests/trip-data.test.mjs
node --check utils.js
node --check app.js
node --check finance.js
node --check map.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add utils.js tests/utils.test.cjs index.html app.js finance.js map.js
git commit -m "fix: safely render and normalize trip packs"
```

### Task 4: Responsive cover images

**Files:**
- Create: `bali-kelingking-640.webp`
- Create: `bali-kelingking-1280.webp`
- Create: `bali-kelingking-fallback.jpg`
- Create: `scripts/build-images.mjs`
- Create: `tests/image-assets.test.mjs`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `trips.json`
- Modify: `bali-2026-09.json`

**Interfaces:**
- Consumes: `pictureHTML(config)` from Task 3.
- Produces: responsive cover fields `coverImage`, `coverImageSrcset`, and `coverImageSizes`.
- Produces: development command using bundled Sharp through `NODE_PATH` to regenerate the three optimized assets.

- [ ] **Step 1: Write failing image tests**

Test that optimized files exist, WebP dimensions are at most 640/1280 wide, fallback is at most 1280 wide, each optimized file is smaller than the original, and the 640px file is below 180KB.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/image-assets.test.mjs`

Expected: FAIL because optimized files do not exist.

- [ ] **Step 3: Add reproducible image generation**

Use Sharp from the bundled workspace runtime, not a project dependency:

```js
await sharp(input).resize({width:640, withoutEnlargement:true}).webp({quality:76}).toFile(small);
await sharp(input).resize({width:1280, withoutEnlargement:true}).webp({quality:80}).toFile(large);
await sharp(input).resize({width:1280, withoutEnlargement:true}).jpeg({quality:78, mozjpeg:true}).toFile(fallback);
```

- [ ] **Step 4: Render responsive images**

Replace CSS background-only covers with a positioned `<picture>` and overlay. First library cover uses `loading="eager" fetchpriority="high"`; later covers use `loading="lazy"`. Day Hero reuses the responsive sources. Keep legacy string-only `coverImage` working.

- [ ] **Step 5: Run image, unit, and visual structure tests**

Run:

```bash
NODE_PATH=/Users/wuhaopeng1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/build-images.mjs
node --test tests/image-assets.test.mjs tests/utils.test.cjs
```

Expected: PASS and the small WebP below 180KB.

- [ ] **Step 6: Commit**

```bash
git add bali-kelingking-640.webp bali-kelingking-1280.webp bali-kelingking-fallback.jpg scripts/build-images.mjs tests/image-assets.test.mjs app.js styles.css trips.json bali-2026-09.json
git commit -m "perf: add responsive Bali cover images"
```

### Task 5: Navigation, PWA, local data, and accessibility

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `sw.js`
- Modify: `README.md`
- Remove: `V3.6.1_CHANGELOG.md`
- Remove: `V3.6.3_CHANGELOG.md`
- Remove: `V3.6.4_MERGED_README.md`
- Create: `CHANGELOG.md`
- Create: `tests/sw-cache.test.mjs`

**Interfaces:**
- Produces reachable `overview` view from the Today quick actions.
- Produces `exportAllLocalData() -> downloadable JSON` excluding no trip-owned data.
- Produces `compressOrderImage(file, {maxDimension:1600, quality:0.82}) -> Promise<string>`.

- [ ] **Step 1: Write failing cache and structure tests**

Assert `sw.js` precaches `utils.js`, all trip JSON, 640/1280 WebP and fallback JPEG; no fetch rule contains a hard-coded `/my-trips/` pathname; `index.html` has dialog attributes; and the Today view source contains an overview trigger.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/sw-cache.test.mjs`

Expected: FAIL on missing assets/entry and hard-coded path handling.

- [ ] **Step 3: Implement navigation and accessibility**

Add an “整趟路线” quick button. Add labels and pressed/checked state to timeline, Checklist, and check-in buttons. Give modal/viewer `role="dialog"`, `aria-modal="true"`, labelled titles, Esc close, focus placement on open, and focus restoration on close.

- [ ] **Step 4: Implement order image compression and export**

Decode uploads through an object URL, resize on canvas to a maximum dimension of 1600px, export JPEG/WebP around quality 0.82, revoke object URLs, and fall back to the original Data URL only if already under the size limit. Add a Tools button that exports checks, checklist, contacts, finance, imported trips, map check-ins, and IndexedDB orders to one JSON file; do not add destructive restore behavior.

- [ ] **Step 5: Generalize and version the Service Worker**

Use request URL equality relative to `self.registration.scope` instead of `/my-trips/` path suffixes. Precache all app, data, and responsive image assets. Keep navigation/app-data network-first and image cache-first. Update version strings consistently to V3.7.0.

Update the status pill from the ambiguous “已联网” to “网络可用”; when an index or trip fetch fails despite `navigator.onLine`, show “网络异常 · 已使用离线内容” in the page-level load state rather than claiming the server is reachable.

- [ ] **Step 6: Consolidate documentation**

Rewrite README as the current project overview and deployment guide. Replace fragmented V3.6 files with a single `CHANGELOG.md` containing prior summarized history and V3.7.0 changes.

- [ ] **Step 7: Run tests**

Run:

```bash
node --test tests/*.test.*
node scripts/validate-trip-data.mjs
node --check app.js
node --check finance.js
node --check map.js
node --check sw.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: harden offline travel app experience"
```

### Task 6: Browser and offline acceptance

**Files:**
- Modify only files required to correct failures discovered by acceptance testing.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified mobile-ready, offline-capable V3.7.0 static application.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
node --test tests/*.test.*
node scripts/validate-trip-data.mjs
for file in app.js finance.js map.js sw.js utils.js; do node --check "$file"; done
git diff --check HEAD~5..HEAD
```

Expected: all commands exit 0.

- [ ] **Step 2: Start a local static server and inspect desktop flows**

Open the app and verify Library → Trip → Today → Overview → Map → Orders → Finance → Tools. Confirm there are no console errors and all updated Day 1, 2, 3, 5, 6, and 7 summaries appear.

- [ ] **Step 3: Inspect a 390×844 mobile viewport**

Verify the small WebP is selected for the first cover, navigation labels are usable, no main content overflows, dialogs fit the viewport, and the route map/place actions remain usable.

- [ ] **Step 4: Verify offline behavior**

Load once online, stop the local server, reload, then open the Bali trip, Today, Overview, Map, Orders, Finance, and Tools. Confirm the responsive cover and all built-in content still render.

- [ ] **Step 5: Correct any acceptance failures with focused tests**

For every defect found, add or strengthen the smallest applicable test before changing implementation, rerun it to confirm RED, implement the fix, then rerun the complete suite.

- [ ] **Step 6: Final verification and status**

Run:

```bash
node --test tests/*.test.*
node scripts/validate-trip-data.mjs
git status --short
git log --oneline -8
```

Expected: tests and validation pass; status is clean; commits show the design plus Tasks 1–5 and any focused acceptance fix.
