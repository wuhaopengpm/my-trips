
let INDEX=null, TRIP=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={view:'library',day:0,orderFilter:'全部'};
const DB_NAME='MyTripsDB',DB_VER=2;

function escapeHTML(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function localParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const o={};parts.forEach(p=>o[p.type]=p.value);return{date:`${o.year}-${o.month}-${o.day}`,hour:+o.hour,minute:+o.minute}
}
function diffDays(a,b){return Math.round((new Date(b+'T00:00:00+08:00')-new Date(a+'T00:00:00+08:00'))/86400000)}
function eventMins(t){const [h,m]=t.split(':').map(Number);return h*60+m}
function fmtDelta(m){m=Math.max(0,m);const h=Math.floor(m/60),mm=m%60;return h?`${h}小时${mm?mm+'分钟':''}`:`${mm}分钟`}
function checksKey(){return `checks:${TRIP?.id||'none'}`}
function loadChecks(){try{return JSON.parse(localStorage.getItem(checksKey())||'{}')}catch(e){return{}}}
function saveChecks(v){localStorage.setItem(checksKey(),JSON.stringify(v))}
function checklistKey(){return `checklist:${TRIP?.id||'none'}`}
function loadChecklist(){try{return JSON.parse(localStorage.getItem(checklistKey())||'{}')}catch(e){return{}}}
function saveChecklist(v){localStorage.setItem(checklistKey(),JSON.stringify(v))}
function completedCount(day){const c=loadChecks();return day.timeline.reduce((n,_,i)=>n+(c[`${day.date}-${i}`]?1:0),0)}
function checklistCount(trip=TRIP){
  if(!trip)return{done:0,total:0};let c={};
  try{c=JSON.parse(localStorage.getItem(`checklist:${trip.id}`)||'{}')}catch(e){}
  const list=trip.checklist||[];return{done:list.filter(x=>c[x.id]).length,total:list.length}
}
function tripDates(t){return{start:t.start||t.meta?.start,end:t.end||t.meta?.end}}
function tripState(t){
  const {start,end}=tripDates(t),today=localParts().date;
  if(today<start)return{kind:'upcoming',days:diffDays(today,start),rank:1};
  if(today>end)return{kind:'past',days:diffDays(end,today),rank:3};
  return{kind:'live',days:0,rank:0};
}
function stateLabel(t){
  const s=tripState(t);
  if(s.kind==='live')return{txt:'旅行中',cls:'live'};
  if(s.kind==='upcoming')return{txt:s.days===0?'今天出发':`${s.days} 天后出发`,cls:'warn'};
  return{txt:'已结束',cls:'past'}
}
function defaultDay(){
  if(!TRIP)return 0;const t=localParts().date,i=TRIP.days.findIndex(d=>d.date===t);
  if(i>=0)return i;if(t<TRIP.meta.start)return 0;return TRIP.days.length-1;
}
function temporal(day){
  const now=localParts(),today=now.date,mins=now.hour*60+now.minute,start=TRIP.meta.start,end=TRIP.meta.end;
  if(today<start)return{mode:'before',days:diffDays(today,start)};
  if(today>end)return{mode:'after'};
  if(day.date!==today)return{mode:'selected'};
  let current=-1,next=-1;day.timeline.forEach((x,i)=>{const m=eventMins(x[0]);if(m<=mins)current=i;if(next<0&&m>mins)next=i});
  if(current<0)return{mode:'pre-day',next:0,delta:eventMins(day.timeline[0][0])-mins};
  if(next<0)return{mode:'day-done',current};
  return{mode:'live',current,next,delta:eventMins(day.timeline[next][0])-mins};
}
function renderHeader(){
  $('#brand').textContent=INDEX?.app?.name||'My Trips';
  $('#brandSub').textContent=TRIP?(TRIP.meta.subtitle||`${TRIP.city}旅行助手`):(INDEX?.app?.subtitle||'离线旅行攻略助手');
  $('#statusPill').innerHTML=`<span class="dot" style="${navigator.onLine?'':'background:#a64035'}"></span>${navigator.onLine?'已联网':'离线可用'}`;
}
function setView(v){state.view=v;render()}
function renderDayStrip(show){
  const box=$('#daystrip');box.innerHTML='';box.style.display=show&&TRIP?'flex':'none';if(!show||!TRIP)return;
  TRIP.days.forEach((d,i)=>{const b=document.createElement('button');b.className='daybtn'+(i===state.day?' active':'');b.textContent=`D${d.day} · ${d.label.replace('月','/').replace('日','')}`;b.addEventListener('click',()=>{state.day=i;state.view='today';render()});box.appendChild(b)})
}
async function openTripByRef(ref){
  try{
    TRIP=await fetch(ref.data).then(r=>{if(!r.ok)throw new Error('load');return r.json()});
    state.day=defaultDay();state.view='today';localStorage.setItem('lastTripId',TRIP.id);render();
  }catch(e){alert('暂时无法打开该攻略包。首次使用该城市攻略需要联网加载一次。')}
}
function openImportedTrip(id){
  const raw=localStorage.getItem(`imported:${id}`);if(!raw)return;
  TRIP=JSON.parse(raw);state.day=defaultDay();state.view='today';localStorage.setItem('lastTripId',TRIP.id);render();
}
function importedTrips(){
  const arr=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('imported:')){try{const t=JSON.parse(localStorage.getItem(k));arr.push(t)}catch(e){}}}
  return arr;
}
function normalizedTrip(t,imported=false){
  return {...t,_imported:imported,start:t.start||t.meta?.start,end:t.end||t.meta?.end,route:t.route||t.meta?.route||'',dayCount:Array.isArray(t.days)?t.days.length:t.days}
}
function tripCardHTML(t){
  const city=t.city||'未命名城市',country=t.country||'',sl=stateLabel(t),theme=t.theme||'default';
  const cl=checklistCount(t),cover=t.coverImage||'';
  const coverStyle=cover?`style="background-image:linear-gradient(180deg,rgba(9,19,15,.03) 2%,rgba(9,19,15,.12) 45%,rgba(9,19,15,.88) 100%),url('${cover}');background-position:${t.coverPosition||'center center'}"`:'';
  return `<section class="card trip-card">
    <div class="trip-cover ${escapeHTML(theme)} ${cover?'has-photo':''}" ${coverStyle}>
      <div class="trip-cover-top"><div class="trip-country">${escapeHTML(country)}</div><span class="travel-edition">TRAVEL EDITION</span></div>
      <div class="trip-cover-bottom"><div><div class="trip-city">${escapeHTML(city)}</div><div class="trip-dates">${t.start} → ${t.end}</div></div><span class="cover-days">${t.dayCount} DAYS</span></div>
    </div>
    <div class="trip-body">
      <div class="trip-statusline"><span class="pill ${sl.cls}">${sl.txt}</span>${cl.total?`<span class="hint">行前准备 ${cl.done}/${cl.total}</span>`:''}</div>
      <p class="trip-route-copy">${escapeHTML(t.route)}</p>
      <div class="trip-actions"><button class="btn primary open-trip" data-id="${escapeHTML(t.id)}" data-imported="${t._imported?'1':'0'}">查看行程</button>${t._imported?`<button class="btn danger delete-import" data-id="${escapeHTML(t.id)}">删除导入</button>`:''}</div>
    </div>
  </section>`;
}
function renderLibrary(){
  renderDayStrip(false);TRIP=null;renderHeader();
  const all=[...INDEX.trips.map(t=>normalizedTrip(t,false)),...importedTrips().map(t=>normalizedTrip(t,true))];
  all.sort((a,b)=>{const sa=tripState(a),sb=tripState(b);if(sa.rank!==sb.rank)return sa.rank-sb.rank;if(sa.kind==='upcoming')return a.start.localeCompare(b.start);return b.end.localeCompare(a.end)});
  const upcoming=all.filter(t=>tripState(t).kind==='upcoming').length,live=all.filter(t=>tripState(t).kind==='live').length;
  $('#main').innerHTML=`<section class="card hero"><span class="pill">TRIP LIBRARY</span><h2>我的旅行</h2><div class="route">旅行中优先、即将出发按日期排序。每趟旅行的行程、订单、Checklist 和离线资料独立保存。</div></section>
    <div class="stats"><div class="stat"><b>${all.length}</b><span>旅行攻略</span></div><div class="stat"><b>${live}</b><span>旅行中</span></div><div class="stat"><b>${upcoming}</b><span>即将出发</span></div></div>
    <div class="section-head"><h3>攻略库</h3><span class="hint">自动按状态排序</span></div>
    <div id="tripCards">${all.map(tripCardHTML).join('')}</div>
    <div class="section-head"><h3>导入新城市</h3><span class="hint">无需重装 App</span></div>
    <div class="import-box"><h4>导入攻略包 JSON</h4><p>以后东京、香港、京都等攻略可以直接作为 JSON 导入到本机。</p>
      <label class="btn primary filebtn">选择攻略包<input id="tripImport" type="file" accept=".json,application/json"></label></div>`;
  $$('.open-trip').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id;if(b.dataset.imported==='1')openImportedTrip(id);else{const ref=INDEX.trips.find(x=>x.id===id);if(ref)openTripByRef(ref)}}));
  $$('.delete-import').forEach(b=>b.addEventListener('click',()=>{if(confirm('删除这个本机导入的攻略？')){localStorage.removeItem(`imported:${b.dataset.id}`);renderLibrary()}}));
  $('#tripImport').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;
    try{
      const t=JSON.parse(await f.text());
      if(!t.id||!t.city||!t.meta?.start||!Array.isArray(t.days))throw new Error('格式不完整');
      localStorage.setItem(`imported:${t.id}`,JSON.stringify(t));alert(`${t.city} 攻略已加入旅行库`);renderLibrary();
    }catch(err){alert('攻略包格式不正确：需要 id、city、meta.start 和 days。')}
  });
}
function scenicHero(day){
  if(!TRIP?.coverImage) return '';
  return `<section class="scenic-hero" style="background-image:linear-gradient(180deg,rgba(7,16,13,.04) 0%,rgba(7,16,13,.15) 44%,rgba(7,16,13,.90) 100%),url('${TRIP.coverImage}');background-position:${TRIP.coverPosition||'center center'}">
    <div class="scenic-top"><span>${escapeHTML(TRIP.country||'')}</span><span>DAY ${day.day} · ${day.label}</span></div>
    <div class="scenic-copy"><div class="scenic-kicker">${escapeHTML(TRIP.city)} JOURNEY</div><h2>${escapeHTML(day.title)}</h2><p>${escapeHTML(day.route)}</p></div>
  </section>`;
}

function smartCard(day){
  const t=temporal(day),done=completedCount(day),total=day.timeline.length;let main='',sub='',rLabel='',r='';
  if(t.mode==='before'){main=`距${TRIP.city}出发还有 ${t.days} 天`;sub=`第一天：${TRIP.days[0].label} · ${TRIP.days[0].title}`;rLabel='行程日期';r=`${TRIP.meta.start.slice(5)}–${TRIP.meta.end.slice(5)}`}
  else if(t.mode==='after'){main=`${TRIP.city}行程已结束`;sub='仍可查看行程、订单和离线资料。';rLabel='今日完成';r=`${done}/${total}`}
  else if(t.mode==='selected'){main=`正在查看 Day ${day.day}`;sub=`${day.label} · ${day.title}`;rLabel='住宿';r=day.hotel}
  else if(t.mode==='pre-day'){main=`今天 Day ${day.day} · 即将开始`;sub=`首项 ${day.timeline[0][0]} ${day.timeline[0][1]}`;rLabel='距首项';r=fmtDelta(t.delta)}
  else if(t.mode==='day-done'){main='今天已到最后一项';sub=`最近：${day.timeline[t.current][0]} ${day.timeline[t.current][1]}`;rLabel='今日完成';r=`${done}/${total}`}
  else{const c=day.timeline[t.current],n=day.timeline[t.next];main=`现在 · ${c[0]} ${c[1]}`;sub=`下一站 ${n[0]} ${n[1]}`;rLabel='距下一站';r=fmtDelta(t.delta)}
  const pct=Math.round(done/total*100);
  return `<section class="card smart"><div class="smart-label">${escapeHTML(TRIP.city)} SMART TRIP</div><div class="smart-main">${main}</div><div class="smart-sub">${sub}</div>
  <div class="smart-grid"><div class="smart-mini"><b>完成进度</b><span>${done}/${total}</span></div><div class="smart-mini"><b>${rLabel}</b><span>${escapeHTML(r)}</span></div></div>
  <div class="progress-wrap"><div class="progress-head"><span>Day ${day.day} 完成度</span><span>${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div></section>`;
}
function tomorrowCard(){
  if(!TRIP)return'';
  const idx=state.day+1;if(idx>=TRIP.days.length)return'';
  const d=TRIP.days[idx],items=d.timeline.slice(0,3);
  return `<section class="card tomorrow"><div class="section-head" style="margin:0 0 6px"><h3 style="font-size:16px">明天提前准备</h3><span class="hint">Day ${d.day} · ${d.label}</span></div>
    <div class="route">${d.title}<br><strong>住宿：</strong>${d.hotel}<br><strong>预订：</strong>${d.booking}</div>
    <div class="tomorrow-grid">${items.map(x=>`<div class="tomorrow-item"><b>${x[0]} ${x[1]}</b><span>${x[2]}</span></div>`).join('')}</div></section>`;
}
function goToday(){
  state.day=defaultDay();state.view='today';render();
}
function renderToday(){
  renderDayStrip(true);const d=TRIP.days[state.day],checks=loadChecks(),t=temporal(d),realDay=defaultDay();
  $('#main').innerHTML=`<div class="quickrow"><button class="btn soft" id="goLibrary">← 旅行库</button><button class="btn ${state.day===realDay?'primary':'soft'}" id="goToday">◎ 回到今天</button><button class="btn soft" id="goChecklist">✓ Checklist</button></div>`+
    scenicHero(d)+smartCard(d)+`<section class="card day-detail-card">
    <div class="day-detail-title"><span>DAY ${d.day} DETAILS</span><b>${d.hotel}</b></div>
    <div class="meta-grid"><div class="meta"><b>交通安排</b><span>${d.transport}</span></div><div class="meta"><b>预订重点</b><span>${d.booking}</span></div><div class="meta"><b>今日时间点</b><span>${d.timeline.length} 个</span></div><div class="meta"><b>行程日期</b><span>${d.label}</span></div></div></section>
    <div class="notice"><b>备用方案</b>${d.backup}</div>${tomorrowCard()}
    <div class="section-head"><h3>当天时间轴</h3><span class="hint">点击圆圈标记完成</span></div><section class="card timeline" id="timeline"></section>
    <div class="section-head"><h3>地点与导航</h3><span class="hint">坐标可离线查看</span></div><section class="card" id="places"></section>`;
  $('#goLibrary').addEventListener('click',()=>setView('library'));$('#goToday').addEventListener('click',goToday);$('#goChecklist').addEventListener('click',()=>setView('tools'));
  let current=-1;if(['live','day-done'].includes(t.mode))current=t.current;
  d.timeline.forEach((x,i)=>{const key=`${d.date}-${i}`,done=!!checks[key],row=document.createElement('div');row.className='item'+(i===current?' current':'');row.innerHTML=`<div class="time">${x[0]}</div><button class="check ${done?'done':''}"></button><div class="item-body ${done?'done':''}">${i===current?'<div class="current-tag">现在 / 最近一项</div>':''}<h4>${x[1]}</h4><p>${x[2]}</p></div>`;row.querySelector('.check').addEventListener('click',()=>{checks[key]=!checks[key];saveChecks(checks);renderToday()});$('#timeline').appendChild(row)});
  d.places.forEach(([name,lat,lng])=>{const div=document.createElement('div');div.className='place';div.innerHTML=`<div><div class="place-name">${name}</div><div class="coords">${lat}, ${lng}</div></div><div class="actions"><a class="btn" href="https://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}" target="_blank">Apple 地图</a><a class="btn" href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank">Google Maps</a></div>`;$('#places').appendChild(div)})
}
function renderOverview(){
  renderDayStrip(false);$('#main').innerHTML=`<section class="card hero"><span class="pill">${TRIP.city}</span><h2>整趟路线</h2><div class="route">${TRIP.meta.route}<br>${TRIP.meta.start} → ${TRIP.meta.end}</div></section><section class="card" id="overview"></section>
    <div class="section-head"><h3>酒店候选</h3><span class="hint">当前攻略包</span></div><section class="card" id="hotels"></section>`;
  TRIP.days.forEach((d,i)=>{const row=document.createElement('button');row.className='overview-day';row.innerHTML=`<div class="daynum">D${d.day}</div><div><h4>${d.label} · ${d.title}</h4><p>${d.route}</p></div><div class="chev">${completedCount(d)}/${d.timeline.length} ›</div>`;row.addEventListener('click',()=>{state.day=i;setView('today')});$('#overview').appendChild(row)});
  $('#hotels').innerHTML=(TRIP.hotels||[]).map(a=>`<div style="margin-bottom:16px"><div class="section-head" style="margin:0 0 6px"><h3 style="font-size:15px">${a.area}</h3><span class="hint">${a.night}</span></div>${a.choices.map(h=>`<div style="padding:11px 0;border-top:1px solid var(--line)"><b style="font-size:14px">${h.name}</b><span class="pill" style="font-size:10px;padding:4px 7px;margin-left:6px">${h.tag}</span><p class="route" style="font-size:12px;margin:5px 0 0">${h.why}</p></div>`).join('')}</div>`).join('')||'<div class="route">此攻略包暂无酒店候选。</div>';
}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VER);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('orders'))db.createObjectStore('orders',{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function getOrders(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('orders').objectStore('orders').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putOrder(v){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('orders','readwrite').objectStore('orders').put(v);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function delOrder(key){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction('orders','readwrite').objectStore('orders').delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(file)})}
function openViewer(title,image){
  $('#viewerTitle').textContent=title;$('#viewerImg').src=image;$('#imageViewer').classList.add('open');
}
async function renderOrders(){
  renderDayStrip(false);const all=await getOrders().catch(()=>[]),saved=all.filter(x=>x.tripId===TRIP.id),map=new Map(saved.map(x=>[x.orderId,x]));
  const templates=TRIP.orderTemplates||[],types=['全部',...new Set(templates.map(x=>x.type))];
  $('#main').innerHTML=`<section class="card hero"><span class="pill">${TRIP.city} · OFFLINE WALLET</span><h2>订单与二维码</h2><div class="route">点订单截图可全屏放大；重要订单可置顶。</div></section><div class="order-filter">${types.map(t=>`<button class="filter ${t===state.orderFilter?'active':''}" data-type="${t}">${t}</button>`).join('')}</div><div id="orders"></div>`;
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.orderFilter=b.dataset.type;renderOrders()}));
  const list=templates.filter(t=>state.orderFilter==='全部'||t.type===state.orderFilter);
  list.sort((a,b)=>(map.get(b.id)?.pinned?1:0)-(map.get(a.id)?.pinned?1:0));
  list.forEach(t=>{const s=map.get(t.id),c=document.createElement('section');c.className='card order-card'+(s?.pinned?' pinned':'');c.innerHTML=`<div class="order-head"><div><div class="order-type">${t.type}${s?.pinned?' · ★ 重要':''}</div><h4>${t.title}</h4><div class="order-status">${s?'已保存到本机':'尚未添加'}</div></div><button class="btn edit">${s?'编辑':'添加'}</button></div>${s?.image?`<div class="order-preview" title="点按全屏"><img src="${s.image}" alt="${t.title}"></div>`:''}${s?.note?`<div class="order-note">${escapeHTML(s.note)}</div>`:''}${s?`<div class="actions" style="margin-top:10px"><button class="btn soft pin">${s.pinned?'取消置顶':'★ 设为重要'}</button><button class="btn danger del">删除本机副本</button></div>`:''}`;
    c.querySelector('.edit').addEventListener('click',()=>openOrderSheet(t,s));
    const prev=c.querySelector('.order-preview');if(prev)prev.addEventListener('click',()=>openViewer(t.title,s.image));
    const pin=c.querySelector('.pin');if(pin)pin.addEventListener('click',async()=>{await putOrder({...s,pinned:!s.pinned});renderOrders()});
    const d=c.querySelector('.del');if(d)d.addEventListener('click',async()=>{if(confirm('删除这个本机凭证？')){await delOrder(`${TRIP.id}:${t.id}`);renderOrders()}});
    $('#orders').appendChild(c)})
}
function openOrderSheet(t,s){
  $('#orderModal').classList.add('open');$('#orderSheetTitle').textContent=t.title;$('#orderNote').value=s?.note||'';$('#orderFile').value='';$('#orderCurrent').innerHTML=s?.image?`<div class="order-preview" id="sheetPreview"><img src="${s.image}"></div>`:'<div class="hint">未保存图片</div>';
  const sp=$('#sheetPreview');if(sp)sp.addEventListener('click',()=>openViewer(t.title,s.image));
  $('#orderSave').onclick=async()=>{const f=$('#orderFile').files[0];let image=s?.image||'';if(f){if(f.size>6*1024*1024){alert('请选择 6MB 以下截图');return}image=await readFile(f)}await putOrder({key:`${TRIP.id}:${t.id}`,tripId:TRIP.id,orderId:t.id,image,note:$('#orderNote').value.trim(),pinned:s?.pinned||false,updatedAt:Date.now()});$('#orderModal').classList.remove('open');renderOrders()}
}
function contactsKey(){return `contacts:${TRIP.id}`}
function loadContacts(){try{return JSON.parse(localStorage.getItem(contactsKey())||'{}')}catch(e){return{}}}
function saveContacts(c){localStorage.setItem(contactsKey(),JSON.stringify(c))}
function renderChecklist(){
  const list=TRIP.checklist||[],doneMap=loadChecklist(),groups=[...new Set(list.map(x=>x.group||'其他'))],cnt=checklistCount();
  const pct=cnt.total?Math.round(cnt.done/cnt.total*100):0;
  return `<div class="section-head"><h3>行前 Checklist</h3><span class="hint">本机自动保存</span></div>
    <section class="card"><div class="checklist-summary"><div><div class="checklist-num">${cnt.done}/${cnt.total}</div><div class="route">出发前准备完成</div></div><span class="pill">${pct}%</span></div>
    ${groups.map(g=>`<div class="checkgroup"><div class="checkgroup-title">${g}</div>${list.filter(x=>(x.group||'其他')===g).map(x=>`<div class="checkrow ${doneMap[x.id]?'done':''}"><button class="check ${doneMap[x.id]?'done':''}" data-checkid="${x.id}"></button><div><h4>${x.title}</h4><p>${x.note||''}</p></div></div>`).join('')}</div>`).join('')||'<div class="route">这个攻略包暂时没有 Checklist。</div>'}
    </section>`;
}
function renderTools(){
  renderDayStrip(false);const contacts=loadContacts(),guides=TRIP.guides||{};
  $('#main').innerHTML=`${renderChecklist()}
  <section class="card emergency"><span class="pill" style="background:#f9e7e3;color:#a64035">${TRIP.city} · EMERGENCY</span><div class="emergency-num">${TRIP.emergency?.general||'—'}</div><div class="route">${TRIP.emergency?.note||'请提前保存当地紧急电话。'}</div>
  <div>${[['driver','司机'],['hotel','酒店'],['insurance','保险'],['consulate','领馆']].map(([k,n])=>`<div class="contact-row"><b>${n}</b><input data-key="${k}" value="${escapeHTML(contacts[k]||'')}" placeholder="填写后本机保存"></div>`).join('')}</div></section>
  ${Object.entries(guides).map(([k,v])=>`<div class="section-head"><h3>${k}</h3></div><section class="card"><ul class="guide-list">${v.map(x=>`<li>${x}</li>`).join('')}</ul></section>`).join('')}
  <section class="card"><button class="btn wide" id="backLibrary">← 返回旅行库</button></section>`;
  $$('#main [data-checkid]').forEach(b=>b.addEventListener('click',()=>{const c=loadChecklist();c[b.dataset.checkid]=!c[b.dataset.checkid];saveChecklist(c);renderTools()}));
  $$('#main .contact-row input').forEach(inp=>inp.addEventListener('change',()=>{const c=loadContacts();c[inp.dataset.key]=inp.value.trim();saveContacts(c)}));$('#backLibrary').addEventListener('click',()=>setView('library'))
}
function render(){
  renderHeader();$$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  if(state.view==='library'){renderLibrary();return}
  if(!TRIP){renderLibrary();return}
  if(state.view==='today')renderToday();
  if(state.view==='overview')renderOverview();
  if(state.view==='orders')renderOrders();
  if(state.view==='tools')renderTools();
}
async function init(){
  INDEX=await fetch('./trips.json').then(r=>r.json());
  $$('.navbtn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('#orderClose').addEventListener('click',()=>$('#orderModal').classList.remove('open'));
  $('#orderModal').addEventListener('click',e=>{if(e.target.id==='orderModal')e.currentTarget.classList.remove('open')});
  $('#viewerClose').addEventListener('click',()=>$('#imageViewer').classList.remove('open'));
  $('#imageViewer').addEventListener('click',e=>{if(e.target.id==='imageViewer')e.currentTarget.classList.remove('open')});
  window.addEventListener('online',renderHeader);window.addEventListener('offline',renderHeader);

  // Only auto-open a trip when it is actively happening. Otherwise start at the library.
  const candidates=[...INDEX.trips.map(t=>normalizedTrip(t,false)),...importedTrips().map(t=>normalizedTrip(t,true))];
  const active=candidates.find(t=>tripState(t).kind==='live');
  if(active){
    if(active._imported){TRIP=JSON.parse(localStorage.getItem(`imported:${active.id}`))}
    else{const ref=INDEX.trips.find(x=>x.id===active.id);try{TRIP=await fetch(ref.data).then(r=>r.json())}catch(e){}}
    if(TRIP){state.day=defaultDay();state.view='today'}
  }
  render();
  setInterval(()=>{if(state.view==='today'&&TRIP)renderToday()},60000);
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
