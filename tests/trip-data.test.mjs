import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateRepository, validateTrip} from '../scripts/validate-trip-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function validTrip(){
  return {
    id:'demo-2026-01', city:'示例', country:'示例国',
    meta:{title:'Demo', subtitle:'Demo trip', start:'2026-01-01', end:'2026-01-01', route:'A → B'},
    days:[{
      day:1, date:'2026-01-01', label:'1月1日', title:'抵达', route:'A → B', hotel:'酒店',
      transport:'步行', booking:'无', backup:'休息',
      timeline:[['09:00','出发','说明']], places:[['Place',10,110]]
    }],
    checklist:[{id:'passport',group:'出发前',title:'护照',note:'确认有效期'}],
    orderTemplates:[{id:'hotel',type:'酒店',title:'酒店订单'}]
  };
}

test('accepts a complete trip pack', () => {
  assert.deepEqual(validateTrip(validTrip()), []);
});

test('rejects a trip with no days', () => {
  const trip=validTrip();trip.days=[];
  assert.ok(validateTrip(trip).some(x=>x.includes('days')));
});

test('rejects duplicate order ids and invalid coordinates', () => {
  const trip=validTrip();
  trip.orderTemplates.push({...trip.orderTemplates[0]});
  trip.days[0].places[0]=['Broken',-95,200];
  const errors=validateTrip(trip);
  assert.ok(errors.some(x=>x.includes('duplicate order id')));
  assert.ok(errors.some(x=>x.includes('coordinate')));
});

test('validates all repository trip packs and cached assets', () => {
  assert.deepEqual(validateRepository(ROOT), []);
  assert.doesNotThrow(()=>JSON.parse(fs.readFileSync(path.join(ROOT,'trip-pack.schema.json'),'utf8')));
});
