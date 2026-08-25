import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const size=name=>fs.statSync(path.join(root,name)).size;

test('mobile cover variants are present and materially smaller',()=>{
  const original=size('bali-kelingking.jpg');
  assert.ok(size('bali-kelingking-640.webp')<180*1024);
  assert.ok(size('bali-kelingking-1280.webp')<original);
  assert.ok(size('bali-kelingking-fallback.jpg')<original);
});

test('built-in trip advertises responsive cover sources',()=>{
  for(const file of ['trips.json','bali-2026-09.json']){
    const value=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
    const trip=file==='trips.json'?value.trips[0]:value;
    assert.equal(trip.coverImage,'./bali-kelingking-fallback.jpg');
    assert.match(trip.coverImageSrcset,/640\.webp 640w.*1280\.webp 1280w/);
  }
});
