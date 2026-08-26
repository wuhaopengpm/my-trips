# Real Map and Google Maps Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a real Leaflet/OpenStreetMap basemap in My Trips, preserve the existing SVG offline fallback, and open ordered place or daily routes in Google Maps.

**Architecture:** Vendor Leaflet 1.9.4 so the application runtime does not depend on a CDN, while leaving OpenStreetMap tiles online-only. Put coordinate normalization, map view-model construction, fallback selection, and Google Maps URL construction in a testable UMD module; keep `map.js` responsible for DOM and Leaflet lifecycle only.

**Tech Stack:** Native HTML/CSS/JavaScript, Leaflet 1.9.4, OpenStreetMap standard tiles, Google Maps URLs API, Node.js built-in test runner, Service Worker, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-26-real-map-google-maps-design.md`

## Global Constraints

- Do not add a package manager, build framework, Google API key, geolocation, analytics, or tile bulk-download feature.
- Vendor the unmodified Leaflet 1.9.4 runtime and license under `vendor/leaflet/`.
- OpenStreetMap tiles require network and must not appear in the application precache list.
- In-app polylines represent stop order only; Google Maps computes the actual road route after handoff.
- Existing trip-pack JSON remains valid without migration.
- The existing SVG route map remains the offline and failure fallback.
- Every new pure behavior follows a witnessed RED-GREEN TDD cycle.
- All external navigation links use `target="_blank"` and `rel="noopener"`.
- Mobile map and actionable controls meet a 44-by-44-pixel minimum touch target.

---

### Task 1: Google Maps URL and map view-model utilities

**Files:**
- Create: `map-utils.js`
- Create: `tests/map-utils.test.cjs`

**Interfaces:**
- Consumes: itinerary places shaped as `[name, latitude, longitude]` and trip days containing `day`, `date`, `label`, `title`, and `places`.
- Produces: `MyTripsMapUtils.validMapPoint`, `googlePlaceUrl`, `googleDirectionsUrl`, `pointsForScope`, `routesForScope`, and `shouldUseRealMap`.

- [ ] **Step 1: Write failing tests for coordinate normalization and place URLs**

```js
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  validMapPoint,googlePlaceUrl,googleDirectionsUrl,
  pointsForScope,routesForScope,shouldUseRealMap
}=require('../map-utils.js');

test('normalizes one valid place and rejects unsafe coordinates',()=>{
  assert.deepEqual(validMapPoint(['Timbis Paragliding','-8.8437','115.1596']),{
    name:'Timbis Paragliding',lat:-8.8437,lng:115.1596
  });
  assert.equal(validMapPoint(['Broken',-91,115]),null);
  assert.equal(validMapPoint(['Broken',-8,181]),null);
  assert.equal(validMapPoint(['',-8,115]),null);
});

test('builds a Google Maps place search using the exact coordinate',()=>{
  const url=new URL(googlePlaceUrl(['Tibumana Waterfall',-8.5028,115.3305]));
  assert.equal(url.origin,'https://www.google.com');
  assert.equal(url.pathname,'/maps/search/');
  assert.equal(url.searchParams.get('api'),'1');
  assert.equal(url.searchParams.get('query'),'-8.5028,115.3305');
  assert.equal(url.searchParams.get('query_place_id'),null);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/map-utils.test.cjs`

Expected: FAIL because `../map-utils.js` does not exist.

- [ ] **Step 3: Implement the UMD shell, `validMapPoint`, and `googlePlaceUrl`**

```js
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MyTripsMapUtils=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function validMapPoint(place){
    if(!Array.isArray(place)||place.length<3)return null;
    const name=String(place[0]??'').trim(),lat=Number(place[1]),lng=Number(place[2]);
    if(!name||!Number.isFinite(lat)||lat < -90||lat > 90||lng < -180||lng > 180)return null;
    return{name,lat,lng};
  }
  function googlePlaceUrl(place){
    const point=validMapPoint(place);if(!point)return'';
    const url=new URL('https://www.google.com/maps/search/');
    url.search=new URLSearchParams({api:'1',query:`${point.lat},${point.lng}`});
    return url.toString();
  }
  return{validMapPoint,googlePlaceUrl};
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/map-utils.test.cjs`

Expected: the first two tests PASS.

- [ ] **Step 5: Add failing tests for ordered daily directions**

```js
test('builds ordered Google directions with origin, waypoints and destination',()=>{
  const places=[
    ['Gravity',-8.821,115.154],
    ['Timbis',-8.8437,115.1596],
    ['Melasti',-8.8463,115.1609],
    ['Uluwatu Temple',-8.8291,115.0849]
  ];
  const url=new URL(googleDirectionsUrl(places));
  assert.equal(url.pathname,'/maps/dir/');
  assert.equal(url.searchParams.get('origin'),'-8.821,115.154');
  assert.equal(url.searchParams.get('waypoints'),'-8.8437,115.1596|-8.8463,115.1609');
  assert.equal(url.searchParams.get('destination'),'-8.8291,115.0849');
  assert.equal(url.searchParams.get('travelmode'),'driving');
});

test('omits invalid points and requires two valid route points',()=>{
  assert.equal(googleDirectionsUrl([['Only',-8,115]]),'');
  const url=new URL(googleDirectionsUrl([
    ['Start',-8,115],['Broken',-100,115],['End',-8.5,115.5]
  ]));
  assert.equal(url.searchParams.get('origin'),'-8,115');
  assert.equal(url.searchParams.get('destination'),'-8.5,115.5');
  assert.equal(url.searchParams.get('waypoints'),null);
});
```

- [ ] **Step 6: Run the test and verify RED**

Run: `node --test tests/map-utils.test.cjs`

Expected: FAIL because `googleDirectionsUrl` is not exported.

- [ ] **Step 7: Implement `googleDirectionsUrl` with `URLSearchParams`**

```js
function googleDirectionsUrl(places){
  const points=(places||[]).map(validMapPoint).filter(Boolean);if(points.length<2)return'';
  const coordinate=point=>`${point.lat},${point.lng}`;
  const params={api:'1',origin:coordinate(points[0]),destination:coordinate(points.at(-1)),travelmode:'driving'};
  if(points.length>2)params.waypoints=points.slice(1,-1).map(coordinate).join('|');
  const url=new URL('https://www.google.com/maps/dir/');url.search=new URLSearchParams(params);return url.toString();
}
```

- [ ] **Step 8: Add failing tests for the scoped view model and fallback decision**

```js
const days=[
  {day:1,date:'2026-09-11',places:[['A',-8.1,115.1],['B',-8.2,115.2]]},
  {day:2,date:'2026-09-12',places:[['C',-8.3,115.3],['Broken',-99,115]]}
];

test('builds all-trip and single-day scopes without losing order',()=>{
  assert.deepEqual(pointsForScope(days,1).map(point=>point.name),['C']);
  assert.deepEqual(pointsForScope(days,-1).map(point=>point.name),['A','B','C']);
  assert.deepEqual(routesForScope(days,0).map(route=>route.points.map(point=>point.name)),[['A','B']]);
});

test('uses the real map only when online, Leaflet exists and points exist',()=>{
  assert.equal(shouldUseRealMap({online:true,leafletAvailable:true,pointCount:2}),true);
  assert.equal(shouldUseRealMap({online:false,leafletAvailable:true,pointCount:2}),false);
  assert.equal(shouldUseRealMap({online:true,leafletAvailable:false,pointCount:2}),false);
  assert.equal(shouldUseRealMap({online:true,leafletAvailable:true,pointCount:0}),false);
});
```

- [ ] **Step 9: Run RED, implement the view-model functions, then verify all focused tests GREEN**

Run before implementation: `node --test tests/map-utils.test.cjs`

Expected: FAIL for missing `pointsForScope`, `routesForScope`, or `shouldUseRealMap`.

Implement points with stable `dayIndex`, `placeIndex`, `day`, `date`, `name`, `lat`, and `lng`; preserve array order; omit invalid points. Implement routes as one object per selected day with two or more valid points. Implement `shouldUseRealMap` as a strict conjunction of the three inputs.

Run after implementation: `node --test tests/map-utils.test.cjs`

Expected: all map utility tests PASS.

- [ ] **Step 10: Commit the utility boundary**

```bash
git add map-utils.js tests/map-utils.test.cjs
git commit -m "feat: add Google Maps route utilities"
```

---

### Task 2: Vendor Leaflet and make offline runtime assets testable

**Files:**
- Create: `vendor/leaflet/leaflet.css`
- Create: `vendor/leaflet/leaflet.js`
- Create: `vendor/leaflet/images/layers.png`
- Create: `vendor/leaflet/images/layers-2x.png`
- Create: `vendor/leaflet/images/marker-icon.png`
- Create: `vendor/leaflet/images/marker-icon-2x.png`
- Create: `vendor/leaflet/images/marker-shadow.png`
- Create: `vendor/leaflet/LICENSE`
- Create: `offline-assets.js`
- Create: `tests/runtime-assets.test.cjs`
- Modify: `index.html:11-14,47-50`
- Modify: `sw.js:1-19`
- Modify: `tests/sw-cache.test.mjs`

**Interfaces:**
- Consumes: Leaflet 1.9.4 upstream tag archive and all current service-worker core paths.
- Produces: `MY_TRIPS_OFFLINE.CACHE` and `MY_TRIPS_OFFLINE.CORE`, available through CommonJS tests and `importScripts()` in the service worker.

- [ ] **Step 1: Write the failing runtime-asset integration test**

The test must load `offline-assets.js`, verify every listed relative file exists, verify the Leaflet runtime/license and `map-utils.js` are present, verify no `tile.openstreetmap.org` URL is cached, and parse `index.html` to assert this order:

```js
[
  './utils.js',
  './map-utils.js',
  './app.js',
  './finance.js',
  './vendor/leaflet/leaflet.js',
  './map.js'
]
```

It must also assert that `./vendor/leaflet/leaflet.css` appears before `./styles.css`, so Leaflet supplies its required structural CSS and the product stylesheet can safely override presentation details.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/runtime-assets.test.cjs`

Expected: FAIL because `offline-assets.js`, `map-utils.js` integration, and vendored Leaflet files are absent.

- [ ] **Step 3: Download and copy the exact Leaflet 1.9.4 distribution**

Download the official release asset `https://github.com/Leaflet/Leaflet/releases/download/v1.9.4/leaflet.zip` and the matching tag archive `https://github.com/Leaflet/Leaflet/archive/refs/tags/v1.9.4.tar.gz` into a temporary directory. Copy `leaflet.css`, `leaflet.js`, and `images/*` from the release ZIP, plus `LICENSE` from the tag archive, into `vendor/leaflet/`. Preserve upstream content and filenames, normalizing text files to LF for repository consistency. Do not commit either archive or the temporary directory.

Verify version and license before continuing:

```bash
rg -n "1\.9\.4" vendor/leaflet/leaflet.js
head -20 vendor/leaflet/LICENSE
```

- [ ] **Step 4: Add `offline-assets.js` and consume it from `sw.js`**

`offline-assets.js` uses the same UMD pattern as `utils.js`, exports cache name `my-trips-v3-8-0-real-map-20260826`, and contains the complete existing core list plus:

```js
'./offline-assets.js',
'./map-utils.js',
'./vendor/leaflet/leaflet.css',
'./vendor/leaflet/leaflet.js',
'./vendor/leaflet/images/layers.png',
'./vendor/leaflet/images/layers-2x.png',
'./vendor/leaflet/images/marker-icon.png',
'./vendor/leaflet/images/marker-icon-2x.png',
'./vendor/leaflet/images/marker-shadow.png',
'./vendor/leaflet/LICENSE'
```

At the top of `sw.js`, call `importScripts('./offline-assets.js')` and destructure `CACHE` and `CORE` from `self.MY_TRIPS_OFFLINE`. Remove the duplicated inline constants.

- [ ] **Step 5: Load Leaflet and map utilities in `index.html`**

Add the local Leaflet CSS link immediately before the product stylesheet. Load `map-utils.js` after `utils.js`; load local Leaflet JavaScript after `finance.js` and before `map.js`.

- [ ] **Step 6: Update the existing service-worker test to assert exported behavior**

Require `offline-assets.js` from the test, assert each core asset exists, and keep the existing assertions that the service worker does not hard-code `/my-trips/`. Remove brittle extraction of the old inline `CORE` declaration.

- [ ] **Step 7: Run the focused and full suites and verify GREEN**

Run:

```bash
node --test tests/runtime-assets.test.cjs tests/sw-cache.test.mjs
node --test tests/*.test.*
```

Expected: runtime asset tests PASS and all existing tests remain green.

- [ ] **Step 8: Commit vendored runtime integration**

```bash
git add index.html sw.js offline-assets.js vendor/leaflet tests/runtime-assets.test.cjs tests/sw-cache.test.mjs
git commit -m "feat: vendor Leaflet runtime for offline app shell"
```

---

### Task 3: Render the real map and Google Maps actions

**Files:**
- Modify: `map.js:23-209`
- Modify: `styles.css:118-151,261-302`
- Modify: `tests/map-utils.test.cjs`

**Interfaces:**
- Consumes: `MyTripsMapUtils`, `window.L`, existing `TRIP`, existing check-in storage, existing day-color helper, and existing `routeSvg()` fallback.
- Produces: lifecycle functions `destroyRealMap`, `showMapFallback`, `initializeRealMap`, and the updated `renderTripMap` user flow.

- [ ] **Step 1: Add a failing test for confirmed Day 2 stop order and route URL**

Load `bali-2026-09.json`, call `pointsForScope(trip.days,1)`, and assert its place-name order is:

```text
Gravity Eco Boutique Hotel
Timbis Paragliding
Melasti Beach
Uluwatu Temple
Kecak Uluwatu
```

Then pass those normalized points to `googleDirectionsUrl` and assert the literal coordinate order from the JSON: Gravity is the origin; Timbis, Melasti, and Uluwatu Temple are ordered waypoints; Kecak is the destination. The test should fail until `googleDirectionsUrl` accepts normalized point objects. Extend that boundary rather than duplicating conversion in `map.js`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/map-utils.test.cjs`

Expected: FAIL at the new normalized-point route assertion.

- [ ] **Step 3: Extend the utility boundary minimally and verify GREEN**

Allow `validMapPoint` to accept either the original tuple or `{name,lat,lng}`. Keep the same range validation. Re-run the focused tests until all pass.

- [ ] **Step 4: Add the Leaflet lifecycle to `map.js`**

Maintain one module-level `leafletMap` and one tile-error counter. Before every map-page rerender, call `leafletMap.remove()` and reset both values.

`initializeRealMap(dayIndex)` must:

1. Read scoped points and routes from `MyTripsMapUtils`.
2. Return through `showMapFallback()` unless `shouldUseRealMap({online:navigator.onLine,leafletAvailable:!!window.L,pointCount:points.length})` is true.
3. Construct `L.map('realMap',{scrollWheelZoom:false})`.
4. Add `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with `maxZoom:19` and visible `© OpenStreetMap contributors` attribution.
5. Add accessible numbered `L.divIcon` markers, escaped popups, and one Google place link per popup.
6. Add per-day schematic `L.polyline` layers with `interactive:false`.
7. Fit bounds with mobile-safe padding, or use zoom 13 for one point.
8. Call `invalidateSize()` on the next animation frame.
9. Switch to fallback after three tile errors and remove the failed map instance.

- [ ] **Step 5: Render route and fallback actions**

Within `renderTripMap`:

- Render `#realMap` and a hidden `#mapFallback` containing the existing `routeSvg(dayIndex)`.
- Render an always-visible caption: `地图连线表示景点顺序；实际道路以 Google Maps 为准。`
- For a selected day with at least two valid points, render `在 Google Maps 查看当天路线` using `googleDirectionsUrl(points)`.
- In fallback state, show `真实地图需要网络，当前显示离线路线示意图。`
- When online, include `重试真实地图`; its handler reruns only the map initialization.
- Keep day filters, route legend, place list, and check-in handlers.
- Build every Google place link through `googlePlaceUrl(p)` instead of hand-written query strings.

- [ ] **Step 6: Add production-quality map styling**

Add styles for `.real-map`, `.map-fallback`, `.map-status`, `.map-caption`, `.map-route-action`, `.map-number-icon`, and Leaflet popup content. Use existing colors and radius tokens. Set map height to 440px and 360px at `max-width:520px`. Ensure route/place/retry controls have `min-height:44px`; add focus-visible styling for Leaflet controls and popup links. Avoid decorative motion and preserve `prefers-reduced-motion` behavior by adding no new animations.

- [ ] **Step 7: Run automated verification**

Run:

```bash
node --test tests/*.test.*
node scripts/validate-trip-data.mjs
node --check app.js
node --check finance.js
node --check map-utils.js
node --check map.js
node --check sw.js
node --check utils.js
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 8: Commit the real-map interface**

```bash
git add map.js styles.css tests/map-utils.test.cjs
git commit -m "feat: add real map and Google Maps handoff"
```

---

### Task 4: Browser acceptance and offline recovery

**Files:**
- Modify if defects are found: `map.js`, `styles.css`, `offline-assets.js`, `sw.js`
- Modify: `README.md:5-29`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the complete real-map feature from Tasks 1-3.
- Produces: verified online/mobile/offline behavior and user-facing documentation.

- [ ] **Step 1: Start a local static server and inspect desktop online mode**

Run `python3 -m http.server 8766` from the worktree. Open `http://127.0.0.1:8766/`, select the Bali trip, open Map, and verify:

- OpenStreetMap tiles and attribution render.
- Numbered markers match the selected scope.
- `全部` and every day filter update the map and place list.
- Day 2's Google route URL preserves Gravity → Timbis → Melasti → Uluwatu Temple → Kecak.
- Marker popup and place-row Google links open the correct coordinates.
- The console has no errors or warnings.

- [ ] **Step 2: Inspect the 390-by-844 mobile viewport**

Verify no horizontal overflow, map height is 360px, bottom navigation does not cover map actions, all actions are reachable by touch and keyboard, popup content fits, and the map does not trap page scrolling because scroll-wheel zoom is disabled.

- [ ] **Step 3: Verify offline fallback and recovery**

Load the app once online, switch the browser to offline, reload, reopen Map, and verify the SVG fallback, notice, place list, and check-ins work with no console errors. Restore connectivity, press `重试真实地图`, and verify Leaflet returns without reloading the page.

- [ ] **Step 4: Fix only observed defects and rerun relevant tests**

For each defect, first add or extend the smallest automated regression test when the behavior has a pure boundary. Then patch the implementation and rerun the focused test plus the full suite. Do not add unrelated refactors.

- [ ] **Step 5: Update documentation**

README must describe the real OpenStreetMap view, Google place/day-route handoff, online tile requirement, and SVG offline fallback. CHANGELOG must record Leaflet 1.9.4 vendoring, Google Maps URLs, accessibility changes, and the cache-version update.

- [ ] **Step 6: Run final fresh verification**

Run:

```bash
node --test tests/*.test.*
node scripts/validate-trip-data.mjs
node --check app.js
node --check finance.js
node --check map-utils.js
node --check map.js
node --check offline-assets.js
node --check sw.js
node --check utils.js
git diff --check origin/main...HEAD
git status --short
```

Expected: all tests pass, validation succeeds, syntax checks exit 0, diff check is clean, and only the intended documentation changes remain before the final commit.

- [ ] **Step 7: Commit documentation and browser-QA fixes**

```bash
git add README.md CHANGELOG.md map.js styles.css offline-assets.js sw.js tests
git commit -m "docs: document real map behavior"
```

- [ ] **Step 8: Review branch state before integration**

Run:

```bash
git status --short --branch
git log --oneline --decorate origin/main..HEAD
```

Expected: clean `feat/real-map` worktree with the design commit plus focused implementation commits, ready for local merge and GitHub Pages publication.
