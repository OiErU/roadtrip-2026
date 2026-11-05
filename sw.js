// Offline support: app, photos and map library cached on install; the page itself refreshes from the network when online.
// Map tiles are cached as you view them, so areas you've looked at online also work offline.
const CACHE="forests-2026-v7", TILES="forests-tiles-v1";
const SHELL=["./","index.html","app.js","data.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png",
 "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js","https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
 "img/albergaria.jpg","img/barosa.jpg","img/belelle.jpg","img/bucaco.jpg","img/castro.jpg","img/cecebre.jpg","img/colon.jpg","img/eume.jpg","img/eumeRiver.jpg","img/ezaro.jpg","img/laboreiro.jpg","img/lamas.jpg","img/mandeo.jpg","img/peneda.jpg","img/razo.jpg","img/sanpaio.jpg","img/t/albergaria.jpg","img/t/barosa.jpg","img/t/belelle.jpg","img/t/bucaco.jpg","img/t/castro.jpg","img/t/cecebre.jpg","img/t/colon.jpg","img/t/eume.jpg","img/t/eumeRiver.jpg","img/t/ezaro.jpg","img/t/laboreiro.jpg","img/t/lamas.jpg","img/t/mandeo.jpg","img/t/peneda.jpg","img/t/razo.jpg","img/t/sanpaio.jpg","img/t/verdes.jpg","img/verdes.jpg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// cache:"no-cache" skips the browser's 10-minute HTTP cache, so a new deploy shows up on the next open
const fresh=(r,key)=>fetch(r.mode==="navigate"?r.url:r,{cache:"no-cache"}).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(key||r,c))}return res}).catch(()=>caches.match(key||r));
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const u=new URL(r.url);
  if(u.origin===location.origin&&(r.mode==="navigate"||/\.(html|js)$/.test(u.pathname)||u.pathname.endsWith("/"))){
    e.respondWith(fresh(r,r.mode==="navigate"?"index.html":undefined));return; // network first for code, so updates show up
  }
  if(u.host.endsWith("tile.opentopomap.org")){
    e.respondWith(caches.open(TILES).then(c=>c.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}))));return;
  }
  if(u.origin===location.origin||u.host.endsWith("fonts.googleapis.com")||u.host.endsWith("fonts.gstatic.com")||u.host==="cdnjs.cloudflare.com"){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c));return res})));
  }
});
