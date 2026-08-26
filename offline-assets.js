(function(root,factory){
  const config=factory();
  if(typeof module==='object'&&module.exports)module.exports=config;
  root.MY_TRIPS_OFFLINE=config;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  return{
    CACHE:'my-trips-v3-8-0-real-map-20260826',
    CORE:[
      './',
      './index.html',
      './styles.css',
      './utils.js',
      './map-utils.js',
      './app.js',
      './finance.js',
      './map.js',
      './offline-assets.js',
      './trips.json',
      './manifest.webmanifest',
      './icon-192.png',
      './icon-512.png',
      './bali-2026-09.json',
      './trip-pack.schema.json',
      './bali-kelingking-640.webp',
      './bali-kelingking-1280.webp',
      './bali-kelingking-fallback.jpg',
      './vendor/leaflet/leaflet.css',
      './vendor/leaflet/leaflet.js',
      './vendor/leaflet/images/layers.png',
      './vendor/leaflet/images/layers-2x.png',
      './vendor/leaflet/images/marker-icon.png',
      './vendor/leaflet/images/marker-icon-2x.png',
      './vendor/leaflet/images/marker-shadow.png',
      './vendor/leaflet/LICENSE'
    ]
  };
});
