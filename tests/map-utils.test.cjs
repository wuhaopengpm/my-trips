const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {
  validMapPoint,
  googlePlaceUrl,
  googleDirectionsUrl,
  pointsForScope,
  routesForScope,
  shouldUseRealMap
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

test('keeps the confirmed Bali Day 2 order in a Google Maps route',()=>{
  const trip=JSON.parse(fs.readFileSync(path.join(__dirname,'..','bali-2026-09.json'),'utf8'));
  const points=pointsForScope(trip.days,1);
  assert.deepEqual(points.map(point=>point.name),[
    'Gravity Eco Boutique Hotel',
    'Timbis Paragliding',
    'Melasti Beach',
    'Uluwatu Temple',
    'Kecak Uluwatu'
  ]);

  const url=new URL(googleDirectionsUrl(points));
  assert.equal(url.searchParams.get('origin'),'-8.8226,115.1285');
  assert.equal(url.searchParams.get('waypoints'),'-8.8355,115.1779|-8.8491,115.1629|-8.8291,115.0849');
  assert.equal(url.searchParams.get('destination'),'-8.8296,115.085');
});
