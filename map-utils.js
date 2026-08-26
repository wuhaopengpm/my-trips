(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MyTripsMapUtils=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function validMapPoint(place){
    if(!Array.isArray(place)||place.length<3)return null;
    const name=String(place[0]??'').trim(),lat=Number(place[1]),lng=Number(place[2]);
    if(!name||!Number.isFinite(lat)||lat < -90||lat > 90||lng < -180||lng > 180)return null;
    return{name,lat,lng};
  }

  function googlePlaceUrl(place){
    const point=validMapPoint(place);if(!point)return'';
    const url=new URL('https://www.google.com/maps/search/');
    url.search=new URLSearchParams({api:'1',query:`${point.lat},${point.lng}`});
    return url.toString();
  }

  function googleDirectionsUrl(places){
    const points=(places||[]).map(validMapPoint).filter(Boolean);if(points.length<2)return'';
    const coordinate=point=>`${point.lat},${point.lng}`;
    const params={
      api:'1',
      origin:coordinate(points[0]),
      destination:coordinate(points.at(-1)),
      travelmode:'driving'
    };
    if(points.length>2)params.waypoints=points.slice(1,-1).map(coordinate).join('|');
    const url=new URL('https://www.google.com/maps/dir/');
    url.search=new URLSearchParams(params);
    return url.toString();
  }

  function pointsForScope(days,dayIndex=-1){
    const source=Array.isArray(days)?days:[],out=[];
    source.forEach((day,index)=>{
      if(dayIndex>=0&&index!==dayIndex)return;
      (Array.isArray(day?.places)?day.places:[]).forEach((place,placeIndex)=>{
        const point=validMapPoint(place);if(!point)return;
        out.push({...point,dayIndex:index,placeIndex,day:day.day,date:day.date||''});
      });
    });
    return out;
  }

  function routesForScope(days,dayIndex=-1){
    const source=Array.isArray(days)?days:[],indices=dayIndex>=0?[dayIndex]:source.map((_,index)=>index);
    return indices.map(index=>({
      dayIndex:index,
      day:source[index]?.day,
      points:pointsForScope(source,index)
    })).filter(route=>route.points.length>=2);
  }

  function shouldUseRealMap({online=false,leafletAvailable=false,pointCount=0}={}){
    return online===true&&leafletAvailable===true&&Number(pointCount)>0;
  }

  return{validMapPoint,googlePlaceUrl,googleDirectionsUrl,pointsForScope,routesForScope,shouldUseRealMap};
});
