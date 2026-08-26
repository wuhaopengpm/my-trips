import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const require=createRequire(import.meta.url);
const offline=require('../offline-assets.js');

test('offline cache includes runtime and responsive cover assets',()=>{
  for(const asset of ['./utils.js','./map-utils.js','./vendor/leaflet/leaflet.js','./bali-kelingking-640.webp','./bali-kelingking-1280.webp','./bali-kelingking-fallback.jpg']){
    assert.ok(offline.CORE.includes(asset),`missing cached asset: ${asset}`);
  }
});

test('service worker does not hard-code the repository pathname',()=>{
  assert.doesNotMatch(sw,/\/my-trips\//);
});

test('overlays expose dialog semantics',()=>{
  assert.match(html,/id="orderModal"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html,/id="imageViewer"[^>]+role="dialog"[^>]+aria-modal="true"/);
});
