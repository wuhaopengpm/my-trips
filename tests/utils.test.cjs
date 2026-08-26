const test=require('node:test');
const assert=require('node:assert/strict');
const {escapeHTML,safeAssetPath,safeBackgroundPosition,finiteCoordinate,normalizeTripPack,pictureHTML}=require('../utils.js');

test('escapes imported markup and rejects unsafe asset URLs',()=>{
  assert.equal(escapeHTML('<img onerror="1">'),'&lt;img onerror=&quot;1&quot;&gt;');
  assert.equal(safeAssetPath('javascript:alert(1)'),'');
  assert.equal(safeAssetPath('./cover.webp'),'./cover.webp');
});

test('normalizes positions, coordinates and missing trip arrays',()=>{
  assert.equal(safeBackgroundPosition('center 62%'),'center 62%');
  assert.equal(safeBackgroundPosition('x; color:red'),'center center');
  assert.equal(finiteCoordinate('115.2',-180,180),115.2);
  assert.equal(finiteCoordinate('999',-180,180),null);
  const trip=normalizeTripPack({id:'x',city:'X',meta:{start:'2026-01-01',end:'2026-01-01'},days:[{}]});
  assert.deepEqual(trip.days[0].places,[]);
  assert.deepEqual(trip.days[0].timeline,[]);
});

test('renders responsive picture markup while supporting a legacy image',()=>{
  const html=pictureHTML({src:'./fallback.jpg',srcset:'./small.webp 640w, ./large.webp 1280w',alt:'巴厘岛',priority:true});
  assert.match(html,/<picture/);assert.match(html,/fetchpriority="high"/);assert.match(html,/small\.webp 640w/);
  assert.match(pictureHTML({src:'./legacy.jpg',alt:'Legacy'}),/src="\.\/legacy\.jpg"/);
});
