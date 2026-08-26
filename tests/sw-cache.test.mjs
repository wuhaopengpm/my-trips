import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('offline cache includes runtime and responsive cover assets',()=>{
  for(const asset of ['utils.js','bali-kelingking-640.webp','bali-kelingking-1280.webp','bali-kelingking-fallback.jpg']){
    assert.match(sw,new RegExp(asset.replaceAll('.','\\.')));
  }
});

test('service worker does not hard-code the repository pathname',()=>{
  assert.doesNotMatch(sw,/\/my-trips\//);
});

test('overlays expose dialog semantics',()=>{
  assert.match(html,/id="orderModal"[^>]+role="dialog"[^>]+aria-modal="true"/);
  assert.match(html,/id="imageViewer"[^>]+role="dialog"[^>]+aria-modal="true"/);
});
