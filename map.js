
// My Trips V3.4 — offline route map + check-ins
(function(){
  const previousRender = render;

  render = function(){
    if(state.view === 'map'){
      renderHeader();
      $$('.navbtn').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
      if(!TRIP){ state.view='library'; return previousRender(); }
      return renderTripMap();
    }
    return previousRender();
  };

  function checkinKey(){ return `checkins:${TRIP?.id||'none'}`; }
  function loadCheckins(){
    try { return JSON.parse(localStorage.getItem(checkinKey())||'{}'); }
    catch(e){ return {}; }
  }
  function saveCheckins(v){ localStorage.setItem(checkinKey(), JSON.stringify(v)); }

  function pointId(dayIndex, placeIndex, name){
    return `${dayIndex}:${placeIndex}:${name}`;
  }

  function allPoints(){
    const out=[];
    TRIP.days.forEach((d,di)=>{
      (d.places||[]).forEach((p,pi)=>{
        const [name,lat,lng]=p;
        if(Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))){
          out.push({
            dayIndex:di, day:d.day, date:d.date, label:d.label,
            placeIndex:pi, name, lat:Number(lat), lng:Number(lng),
            id:pointId(di,pi,name)
          });
        }
      });
    });
    return out;
  }

  function uniquePlaces(points){
    const map=new Map();
    points.forEach(p=>{
      const k=`${p.name}|${p.lat.toFixed(5)}|${p.lng.toFixed(5)}`;
      if(!map.has(k)) map.set(k,{...p,days:[p.day]});
      else{
        const x=map.get(k);
        if(!x.days.includes(p.day)) x.days.push(p.day);
      }
    });
    return [...map.values()];
  }

  function bounds(points){
    if(!points.length) return {minLat:-9,maxLat:-8,minLng:114.8,maxLng:115.8};
    let minLat=Math.min(...points.map(p=>p.lat)), maxLat=Math.max(...points.map(p=>p.lat));
    let minLng=Math.min(...points.map(p=>p.lng)), maxLng=Math.max(...points.map(p=>p.lng));
    let latPad=Math.max(.03,(maxLat-minLat)*.12);
    let lngPad=Math.max(.03,(maxLng-minLng)*.12);
    return {minLat:minLat-latPad,maxLat:maxLat+latPad,minLng:minLng-lngPad,maxLng:maxLng+lngPad};
  }

  function project(p,b,w=720,h=440,pad=34){
    const x=pad+(p.lng-b.minLng)/(b.maxLng-b.minLng)*(w-pad*2);
    const y=h-pad-(p.lat-b.minLat)/(b.maxLat-b.minLat)*(h-pad*2);
    return [x,y];
  }

  function dayColor(day){
    const colors=['#087e68','#2d6ea3','#8a6c2b','#7b5fa2','#b05c45','#3b7d52','#59646f'];
    return colors[(day-1)%colors.length];
  }

  function selectedDay(){
    const raw=sessionStorage.getItem(`mapday:${TRIP.id}`);
    if(raw===null) return -1;
    const v=Number(raw);
    return Number.isInteger(v) ? v : -1;
  }
  function setSelectedDay(v){ sessionStorage.setItem(`mapday:${TRIP.id}`, String(v)); }

  function visiblePoints(dayIndex){
    const pts=allPoints();
    return dayIndex<0 ? pts : pts.filter(p=>p.dayIndex===dayIndex);
  }

  function routeSvg(dayIndex){
    const pts=visiblePoints(dayIndex);
    if(!pts.length) return '<div class="route">当前攻略没有可用坐标。</div>';
    const b=bounds(dayIndex<0?allPoints():pts);
    const W=720,H=440;
    const bgLines=[.2,.4,.6,.8].map(fr=>{
      const x=34+fr*(W-68), y=34+fr*(H-68);
      return `<line x1="${x}" y1="34" x2="${x}" y2="${H-34}" class="map-grid-line"/><line x1="34" y1="${y}" x2="${W-34}" y2="${y}" class="map-grid-line"/>`;
    }).join('');

    let routes='';
    const days = dayIndex<0 ? TRIP.days.map((_,i)=>i) : [dayIndex];
    days.forEach(di=>{
      const d=TRIP.days[di], ps=(d.places||[]).map((p,pi)=>({
        name:p[0],lat:Number(p[1]),lng:Number(p[2]),day:d.day,dayIndex:di,placeIndex:pi,id:pointId(di,pi,p[0])
      })).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
      if(ps.length<2) return;
      const coords=ps.map(p=>project(p,b,W,H).join(',')).join(' ');
      routes += `<polyline points="${coords}" fill="none" stroke="${dayColor(d.day)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".76"/>`;
    });

    const checks=loadCheckins();
    const display=dayIndex<0?uniquePlaces(pts):pts;
    const nodes=display.map(p=>{
      const [x,y]=project(p,b,W,H);
      const checked=!!checks[p.id];
      const fill=checked?'#1f6c54':dayColor(p.day);
      const ring=checked?'#dff2e9':'#ffffff';
      return `<g class="map-node">
        <circle cx="${x}" cy="${y}" r="12" fill="${ring}" stroke="${fill}" stroke-width="3"/>
        <circle cx="${x}" cy="${y}" r="5" fill="${fill}"/>
        <text x="${x+15}" y="${y-11}" class="map-label">${escapeHTML(p.name)}</text>
        <text x="${x+15}" y="${y+4}" class="map-sublabel">D${p.day}${checked?' · 已打卡':''}</text>
      </g>`;
    }).join('');

    return `<div class="map-scroll">
      <svg class="route-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(TRIP.city)}旅行路线坐标图">
        <rect x="0" y="0" width="${W}" height="${H}" rx="20" class="map-bg"/>
        ${bgLines}
        ${routes}
        ${nodes}
      </svg>
    </div>`;
  }

  function routeSummary(dayIndex){
    if(dayIndex<0){
      return TRIP.days.map(d=>`<div class="route-chip"><i style="background:${dayColor(d.day)}"></i><span>D${d.day}</span><b>${escapeHTML(d.title)}</b></div>`).join('');
    }
    const d=TRIP.days[dayIndex];
    return `<div class="route-chip"><i style="background:${dayColor(d.day)}"></i><span>Day ${d.day}</span><b>${escapeHTML(d.route)}</b></div>`;
  }

  function renderPlaceList(dayIndex){
    const pts=dayIndex<0?uniquePlaces(allPoints()):visiblePoints(dayIndex);
    const checks=loadCheckins();
    return pts.map(p=>{
      const done=!!checks[p.id];
      return `<div class="map-place ${done?'checked':''}">
        <button class="map-check ${done?'done':''}" data-checkin="${escapeHTML(p.id)}" aria-label="${done?'取消打卡':'标记打卡'}">${done?'✓':''}</button>
        <div class="map-place-main">
          <div class="map-place-name">${escapeHTML(p.name)}</div>
          <div class="coords">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} · Day ${p.day}</div>
        </div>
        <div class="map-place-actions">
          <a class="btn" target="_blank" rel="noopener" href="https://maps.apple.com/?q=${encodeURIComponent(p.name)}&ll=${p.lat},${p.lng}">Apple</a>
          <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}">Google</a>
        </div>
      </div>`;
    }).join('');
  }

  function stats(){
    const pts=uniquePlaces(allPoints()),checks=loadCheckins();
    const done=pts.filter(p=>checks[p.id]).length;
    return {places:pts.length,done,days:TRIP.days.length};
  }

  window.renderTripMap=function(){
    renderDayStrip(false);
    const dayIndex=selectedDay();
    const st=stats();
    $('#main').innerHTML=`
      <section class="card hero map-hero">
        <span class="pill">${escapeHTML(TRIP.city)} · OFFLINE MAP</span>
        <h2>旅行路线地图</h2>
        <div class="route">基于攻略中真实经纬度生成的离线路线示意图。它不加载在线地图底图，所以无网络也能查看地点相对位置和每天路线；实际导航仍建议点击 Apple / Google Maps。</div>
        <div class="map-stat-grid">
          <div><b>${st.days}</b><span>旅行天数</span></div>
          <div><b>${st.places}</b><span>地图地点</span></div>
          <div><b>${st.done}</b><span>已打卡</span></div>
        </div>
      </section>

      <div class="section-head"><h3>按天筛选</h3><span class="hint">全部 / Day 1–Day ${TRIP.days.length}</span></div>
      <div class="map-filter" id="mapFilter">
        <button class="filter ${dayIndex<0?'active':''}" data-mapday="-1">全部</button>
        ${TRIP.days.map((d,i)=>`<button class="filter ${dayIndex===i?'active':''}" data-mapday="${i}">D${escapeHTML(d.day)} · ${escapeHTML(d.label.replace('月','/').replace('日',''))}</button>`).join('')}
      </div>

      <section class="card map-card">
        ${routeSvg(dayIndex)}
        <div class="map-legend">${routeSummary(dayIndex)}</div>
      </section>

      <div class="section-head"><h3>${dayIndex<0?'全部地点':'Day '+TRIP.days[dayIndex].day+' 地点'}</h3><span class="hint">点圆圈打卡</span></div>
      <section class="card map-place-list">${renderPlaceList(dayIndex)}</section>
    `;

    $$('#mapFilter [data-mapday]').forEach(b=>b.addEventListener('click',()=>{
      setSelectedDay(Number(b.dataset.mapday));
      renderTripMap();
    }));

    $$('[data-checkin]').forEach(b=>b.addEventListener('click',()=>{
      const c=loadCheckins(),id=b.dataset.checkin;
      c[id]=!c[id]; saveCheckins(c); renderTripMap();
    }));
  };
})();
