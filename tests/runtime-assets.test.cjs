const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');

test('offline runtime lists existing local assets without caching OSM tiles',()=>{
  const offline=require('../offline-assets.js');
  assert.match(offline.CACHE,/real-map/);
  for(const asset of offline.CORE){
    assert.match(asset,/^\.\//,`asset must stay deployment-relative: ${asset}`);
    const file=asset==='./'?'index.html':asset.slice(2);
    assert.ok(fs.existsSync(path.join(ROOT,file)),`missing offline asset: ${asset}`);
  }
  for(const required of [
    './map-utils.js',
    './vendor/leaflet/leaflet.css',
    './vendor/leaflet/leaflet.js',
    './vendor/leaflet/LICENSE'
  ])assert.ok(offline.CORE.includes(required),`missing required runtime asset: ${required}`);
  assert.equal(offline.CORE.some(asset=>asset.includes('tile.openstreetmap.org')),false);
});

test('browser loads map utilities and Leaflet before the map feature',()=>{
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(scripts,[
    './utils.js',
    './map-utils.js',
    './app.js',
    './finance.js',
    './vendor/leaflet/leaflet.js',
    './map.js'
  ]);
  assert.ok(
    html.indexOf('./vendor/leaflet/leaflet.css')<html.indexOf('./styles.css'),
    'Leaflet structural CSS must load before product overrides'
  );
});
