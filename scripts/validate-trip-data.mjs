import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;

function duplicateIds(items,label,errors){
  const seen=new Set();
  for(const item of items||[]){
    if(!item?.id)continue;
    if(seen.has(item.id))errors.push(`duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
}

export function validateTrip(trip,{source='trip'}={}){
  const errors=[];
  const fail=message=>errors.push(`${source}: ${message}`);
  if(!trip||typeof trip!=='object'){fail('trip must be an object');return errors}
  if(!String(trip.id||'').trim())fail('id is required');
  if(!String(trip.city||'').trim())fail('city is required');
  if(!DATE_RE.test(trip.meta?.start||''))fail('meta.start must be YYYY-MM-DD');
  if(!DATE_RE.test(trip.meta?.end||''))fail('meta.end must be YYYY-MM-DD');
  if(!Array.isArray(trip.days)||trip.days.length===0){fail('days must contain at least one day');return errors}
  if(trip.meta.start>trip.meta.end)fail('meta.start must not be after meta.end');

  let previous='';
  trip.days.forEach((day,index)=>{
    const label=`day ${index+1}`;
    if(!DATE_RE.test(day?.date||''))fail(`${label} date must be YYYY-MM-DD`);
    if(previous&&day.date<previous)fail(`${label} date is before the previous day`);
    previous=day?.date||previous;
    for(const key of ['day','label','title','route','hotel','transport','booking','backup']){
      if(day?.[key]===undefined||day[key]===null)fail(`${label} missing ${key}`);
    }
    if(!Array.isArray(day?.timeline))fail(`${label} timeline must be an array`);
    else day.timeline.forEach((entry,itemIndex)=>{
      if(!Array.isArray(entry)||entry.length!==3)fail(`${label} timeline ${itemIndex+1} must have time, title and note`);
      else if(!TIME_RE.test(String(entry[0])))fail(`${label} timeline ${itemIndex+1} has invalid time`);
    });
    if(!Array.isArray(day?.places))fail(`${label} places must be an array`);
    else day.places.forEach((place,placeIndex)=>{
      const lat=Number(place?.[1]),lng=Number(place?.[2]);
      if(!Array.isArray(place)||place.length!==3||!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat > 90||lng < -180||lng > 180){
        fail(`${label} place ${placeIndex+1} has invalid coordinate`);
      }
    });
  });
  if(trip.days[0]?.date!==trip.meta.start)fail('first day must match meta.start');
  if(trip.days.at(-1)?.date!==trip.meta.end)fail('last day must match meta.end');
  duplicateIds(trip.orderTemplates,'order',errors);
  duplicateIds(trip.checklist,'checklist',errors);
  return errors;
}

function cleanRelative(value){
  if(typeof value!=='string'||!value.startsWith('./'))return null;
  return value.slice(2).split(/[?#]/,1)[0];
}

function srcsetPaths(value){
  if(typeof value!=='string')return[];
  return value.split(',').map(part=>part.trim().split(/\s+/,1)[0]).filter(Boolean);
}

export function validateRepository(root){
  const errors=[];
  const readJSON=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  let index;
  try{index=readJSON('trips.json')}catch(error){return[`trips.json: ${error.message}`]}
  for(const ref of index.trips||[]){
    const dataPath=cleanRelative(ref.data);
    if(!dataPath||!fs.existsSync(path.join(root,dataPath))){errors.push(`missing trip data: ${ref.data}`);continue}
    let trip;
    try{trip=readJSON(dataPath)}catch(error){errors.push(`${dataPath}: ${error.message}`);continue}
    errors.push(...validateTrip(trip,{source:dataPath}));
    const rawAssets=[ref.coverImage,trip.coverImage,...srcsetPaths(ref.coverImageSrcset),...srcsetPaths(trip.coverImageSrcset)];
    for(const raw of new Set(rawAssets)){
      const asset=cleanRelative(raw);
      if(asset&&!fs.existsSync(path.join(root,asset)))errors.push(`missing asset: ${asset}`);
    }
  }
  try{readJSON('trip-pack.schema.json')}catch(error){errors.push(`trip-pack.schema.json: ${error.message}`)}
  const swPath=path.join(root,'sw.js');
  if(fs.existsSync(swPath)){
    const sw=fs.readFileSync(swPath,'utf8');
    for(const match of sw.matchAll(/['"]\.\/([^'"]+)['"]/g)){
      const file=match[1];
      if(file&&!fs.existsSync(path.join(root,file)))errors.push(`missing cached asset: ${file}`);
    }
  }
  return errors;
}

const isCLI=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isCLI){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const errors=validateRepository(root);
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
  else console.log('Trip data validation passed');
}
