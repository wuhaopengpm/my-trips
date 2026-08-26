# Real Map and Google Maps Handoff Design

## Goal

Replace the map page's primary schematic SVG with a real interactive map while preserving a reliable offline fallback. Let travelers open either one place or one day's ordered stops in Google Maps without changing the existing itinerary data format.

## Confirmed Product Decisions

- The in-app basemap uses Leaflet 1.9.4 with OpenStreetMap raster tiles.
- Leaflet runtime files and marker assets are vendored into this repository and precached by the service worker. No CDN is required at runtime.
- OpenStreetMap tiles are fetched only while online and are not bulk-downloaded or added to the application precache.
- A place opens Google Maps search using its verified stored coordinates.
- A selected day exposes one Google Maps directions link whose origin, ordered waypoints, and destination follow the day's `places` array.
- Google Maps computes the actual road route after handoff. The in-app line only communicates stop order and must be labeled as schematic.
- When tiles, the network, or Leaflet initialization are unavailable, the existing SVG route overview remains visible as the offline fallback.
- Existing trip JSON remains compatible; no schema migration is required.

## User Experience

### Default online state

The map view keeps the existing hero, statistics, day filters, legend, place list, and check-in behavior. The central map card contains a 360-pixel mobile-first Leaflet map with OpenStreetMap attribution. It fits its camera to the filtered points and renders numbered markers in itinerary order.

Selecting `全部` shows all valid places and daily schematic stop-order polylines. Selecting one day shows only that day's valid places, a single stop-order polyline, and a primary action labeled `在 Google Maps 查看当天路线` when at least two valid places exist.

Marker selection opens an accessible popup containing the place name, day, and `在 Google Maps 打开` link. The corresponding place row remains available below the map for a larger touch target and for offline use.

### Offline and failure state

If `navigator.onLine` is false, Leaflet is unavailable, the map cannot initialize, or the tile layer reports repeated failures, the card renders the current SVG overview and a notice: `真实地图需要网络，当前显示离线路线示意图。` The existing place list, check-ins, Apple Maps links, and Google Maps links remain visible. External navigation links are not described as offline-capable.

When connectivity returns while the map view is open, the user can use a `重试真实地图` button. The feature does not continuously retry or waste mobile data.

### Mobile and accessibility

- Map height: 360px below 520px viewport width, 440px otherwise.
- Map controls, retry action, route action, and place actions have at least 44-by-44-pixel touch targets.
- The map container has an accessible label describing the selected scope.
- Numbered markers have accessible titles. The same information is fully available in the semantic place list, so the canvas-like map is not the only path.
- Focus-visible styles use the existing design tokens.
- External links use `target="_blank"` and `rel="noopener"`.
- OpenStreetMap attribution remains visible and links to the copyright page.

## Architecture

### Vendored dependency

Add the unmodified Leaflet 1.9.4 distribution files under `vendor/leaflet/`, including CSS, JavaScript, marker images, and the Leaflet license. Load the stylesheet in `index.html` and the script before `map.js`. Add every runtime Leaflet asset to `sw.js`'s core cache.

This is the only new production dependency. No package manager or build framework is introduced.

### Pure map link utilities

Create `map-utils.js` as a UMD-style module consistent with `utils.js`. It exports:

- `validMapPoint(place)`: returns a normalized `{name, lat, lng}` or `null`.
- `googlePlaceUrl(place)`: returns a Google Maps search URL for one valid point or an empty string.
- `googleDirectionsUrl(places)`: returns an ordered Google Maps directions URL for two or more valid points or an empty string.

Directions URLs use `api=1`, `origin`, `destination`, ordered `waypoints`, and `travelmode=driving`. The UI tells travelers that they can change to the locally available motorcycle mode inside Google Maps. No unsupported motorcycle URL mode is invented.

### Map rendering

`map.js` retains trip-point extraction, check-in storage, day filtering, statistics, the existing `routeSvg()` fallback, and the semantic place list. It adds a small Leaflet lifecycle:

1. Destroy any previous map instance before replacing `#main`.
2. Render map shell, filters, route action, fallback shell, and place list.
3. If online and `window.L` exists, initialize Leaflet after the container is attached.
4. Add the OSM tile layer, numbered markers, popups, schematic polylines, and bounds.
5. Switch to the SVG fallback on initialization failure or repeated tile errors.
6. Re-render on day-filter or retry actions.

The route line uses the same per-day colors as the current SVG and is explicitly described as stop order, not provider-computed road geometry.

### Service worker behavior

Increment the cache version. Precache Leaflet runtime assets and `map-utils.js`. Continue using the existing network-first strategy for application code and JSON. Tile requests remain ordinary cross-origin Leaflet requests and are not intercepted because the service worker already ignores other origins.

## Error Handling

- Invalid coordinates are omitted from both map rendering and Google URLs.
- Zero valid points shows the existing empty-map message.
- One valid point supports place navigation but does not show a daily directions action.
- A Google URL is never rendered when its utility returns an empty string.
- Leaflet initialization errors produce the offline fallback rather than a blank rectangle.
- Tile failures show the fallback after a bounded threshold and expose one manual retry.
- Missing marker images cannot block map initialization; numbered HTML markers avoid dependence on default marker icons.

## Security and Privacy

- Only numeric coordinates and escaped names enter generated markup.
- Google URL parameters use `URLSearchParams`; no raw itinerary string is concatenated into a URL.
- The application sends tile requests to OpenStreetMap only while the map is online and visible.
- No Google API key, location tracking, geolocation permission, analytics, or background tile download is added.

## Testing

### Automated tests

- `map-utils` accepts valid numeric coordinates and rejects invalid or incomplete places.
- Place URLs preserve exact coordinates and encode the place name.
- Directions URLs preserve stop order, create origin/destination correctly, and include ordered waypoints.
- Directions URLs return empty for fewer than two valid points.
- Static integration checks confirm Leaflet CSS, Leaflet JavaScript, and `map-utils.js` load before `map.js`.
- Service-worker tests confirm all vendored runtime assets are precached and no OSM tile URL is hard-coded into the core cache.
- Existing trip, image, utility, and offline-cache tests remain green.

### Browser acceptance

- Online desktop and 390-pixel mobile views render OpenStreetMap tiles, numbered markers, day filters, and the correct Google route action.
- Clicking a marker and a place link produces a Google Maps URL with the expected coordinates.
- Selecting Day 2 preserves its confirmed order: Gravity, Timbis, Melasti, Uluwatu Temple, Kecak.
- Simulated offline mode displays the SVG fallback and offline notice with no console errors.
- Returning online and pressing retry restores the Leaflet map.
- No horizontal overflow occurs, and keyboard users can reach every route and place action.

## Non-goals

- Computing road geometry, travel time, or route optimization inside My Trips.
- Caching an offline basemap or a large region of OpenStreetMap tiles.
- Live GPS tracking, turn-by-turn navigation, traffic, weather, or geofencing.
- Replacing Apple Maps place links.
- Changing itinerary stop order or asserting that stored coordinates and travel times were live-provider verified as part of this feature.

## Attribution

- Leaflet 1.9.4 is vendored under its upstream license.
- The visible map retains `© OpenStreetMap contributors` attribution and its copyright link.
