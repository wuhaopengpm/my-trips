(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MyTripsUtils=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function escapeHTML(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }
  function safeAssetPath(value){
    const text=String(value??'').trim();
    if(!text)return'';
    if(/^\.{0,2}\//.test(text)||/^https?:\/\//i.test(text)||/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(text))return text.replace(/["'<>\s]/g,encodeURIComponent);
    return'';
  }
  function safeBackgroundPosition(value){
    const text=String(value??'').trim();
    return /^(?:left|right|center|top|bottom|\d{1,3}%)(?:\s+(?:left|right|center|top|bottom|\d{1,3}%))?$/.test(text)?text:'center center';
  }
  function finiteCoordinate(value,min,max){
    const number=Number(value);return Number.isFinite(number)&&number>=min&&number<=max?number:null;
  }
  function normalizeTripPack(raw){
    const trip=raw&&typeof raw==='object'?{...raw}:{};
    trip.meta={start:'',end:'',route:'',...(trip.meta||{})};
    trip.days=Array.isArray(trip.days)?trip.days.map((day,index)=>({
      day:index+1,date:'',label:'',title:'',route:'',hotel:'',transport:'',booking:'',backup:'',
      ...(day||{}),timeline:Array.isArray(day?.timeline)?day.timeline:[],places:Array.isArray(day?.places)?day.places:[]
    })):[];
    for(const key of ['hotels','orderTemplates','checklist'])trip[key]=Array.isArray(trip[key])?trip[key]:[];
    trip.guides=trip.guides&&typeof trip.guides==='object'?trip.guides:{};
    return trip;
  }
  function safeSrcset(value){
    return String(value??'').split(',').map(part=>{
      const [url,descriptor]=part.trim().split(/\s+/,2),safe=safeAssetPath(url);
      return safe&&/^\d+(?:w|x)$/.test(descriptor||'')?`${safe} ${descriptor}`:'';
    }).filter(Boolean).join(', ');
  }
  function pictureHTML({src='',srcset='',sizes='(max-width: 780px) 100vw, 780px',alt='',priority=false,className='cover-media'}={}){
    const safeSrc=safeAssetPath(src),set=safeSrcset(srcset),loading=priority?'eager':'lazy',fetch=priority?' fetchpriority="high"':'';
    if(!safeSrc)return'';
    return `<picture class="${escapeHTML(className)}">${set?`<source type="image/webp" srcset="${escapeHTML(set)}" sizes="${escapeHTML(sizes)}">`:''}<img src="${escapeHTML(safeSrc)}"${set?` srcset="${escapeHTML(set)}" sizes="${escapeHTML(sizes)}"`:''} alt="${escapeHTML(alt)}" loading="${loading}"${fetch} decoding="async"></picture>`;
  }
  return{escapeHTML,safeAssetPath,safeBackgroundPosition,finiteCoordinate,normalizeTripPack,pictureHTML};
});
