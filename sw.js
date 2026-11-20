// Offline support: app, photos and map library cached on install; the page itself refreshes from the network when online.
// Map tiles are cached as you view them, so areas you've looked at online also work offline.
const CACHE="forests-2026-v24", TILES="forests-tiles-v1", SLOW_MS=3000;
const SHELL=["./","index.html","app.js","data.js","manifest.webmanifest","icon-180.png","icon-192.png","icon-512.png",
 "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js","https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
 "img/areamaior.jpg","img/bastiagueiro.jpg","img/caion.jpg","img/sabon.jpg","img/albergaria.jpg","img/barosa.jpg","img/belelle.jpg","img/bucaco.jpg","img/castro.jpg","img/cecebre.jpg","img/colon.jpg","img/ecominho.jpg","img/eume.jpg","img/eumeRiver.jpg","img/ezaro.jpg","img/fervenza.jpg","img/laboreiro.jpg","img/lagarto.jpg","img/lamas.jpg","img/mandeo.jpg","img/meadinha.jpg","img/melgaco.jpg","img/peneda.jpg","img/razo.jpg","img/sanpaio.jpg","img/sistelo.jpg","img/t/areamaior.jpg","img/t/bastiagueiro.jpg","img/t/caion.jpg","img/t/sabon.jpg","img/t/albergaria.jpg","img/t/barosa.jpg","img/t/belelle.jpg","img/t/bucaco.jpg","img/t/castro.jpg","img/t/cecebre.jpg","img/t/colon.jpg","img/t/ecominho.jpg","img/t/eume.jpg","img/t/eumeRiver.jpg","img/t/ezaro.jpg","img/t/fervenza.jpg","img/t/laboreiro.jpg","img/t/lagarto.jpg","img/t/lamas.jpg","img/t/mandeo.jpg","img/t/meadinha.jpg","img/t/melgaco.jpg","img/t/peneda.jpg","img/t/razo.jpg","img/t/sanpaio.jpg","img/t/sistelo.jpg","img/t/tambre.jpg","img/t/verdes.jpg","img/tambre.jpg","img/verdes.jpg"];
// cache:"reload" so the offline copy is the newest deploy, not the browser's 10-minute HTTP cache
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:"reload"})).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// Network first, so a new deploy shows up on the next open (cache:"no-cache" skips the browser's 10-minute HTTP cache).
// On a weak signal, use the saved copy after SLOW_MS and let the download finish in the background to update it.
// Once one request has given up on the network, the rest of that page load uses saved copies straight away.
let slowUntil=0;
const fresh=(r,key)=>{
  const net=fetch(r.mode==="navigate"?r.url:r,{cache:"no-cache"}).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(key||r,c))}return res});
  const saved=()=>caches.match(key||r);
  const wait=Date.now()<slowUntil?0:SLOW_MS;
  const slow=new Promise(ok=>setTimeout(ok,wait)).then(saved).then(hit=>{if(!hit)return net;slowUntil=Date.now()+30000;return hit});
  return Promise.race([net,slow]).catch(()=>saved().then(hit=>hit||net));
};
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
