/* Forests & Waterfalls 2026 — renders data.js into the phone guide. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ext=(href,label,cls="")=>`<a class="btn ${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
/* Driving directions. Coordinates when we have them (exact), the place name otherwise. Google or Apple Maps, chosen in Info. */
const NAVKEY="fw2026-nav";let NAV="google";try{NAV=localStorage.getItem(NAVKEY)||"google"}catch(e){}
const driveURL=(ll,q)=>{const dest=ll?ll[0]+","+ll[1]:q;
  if(NAV==="apple")return"https://maps.apple.com/?daddr="+encodeURIComponent(dest)+"&dirflg=d";
  if(NAV==="waze")return"https://waze.com/ul?"+(ll?"ll="+encodeURIComponent(dest):"q="+encodeURIComponent(q))+"&navigate=yes";
  return"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(dest)+"&travelmode=driving"};
const drive=(ll,q,label="Drive there")=>`<a class="btn go" href="${driveURL(ll,q)}" target="_blank" rel="noopener">${IC.car}${esc(label)}</a>`;
const driveLink=(ll,q)=>`<a href="${driveURL(ll,q)}" target="_blank" rel="noopener">Drive there</a>`;
const img=(k,thumb)=>`img/${thumb?"t/":""}${k}.jpg`;
const IC={
 car:'<svg viewBox="0 0 24 24"><path d="M3 13.5l2-6h14l2 6V18h-2.5M6 18H3v-4.5h18"/><circle cx="7.5" cy="18" r="2"/><circle cx="16.5" cy="18" r="2"/></svg>',
 tent:'<svg viewBox="0 0 24 24"><path d="M2.5 20L12 4l9.5 16z"/><path d="M12 4v16M9 20l3-6 3 6"/></svg>',
 home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-6h4v6"/></svg>',
 l:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>', r:'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
 phone:'<svg viewBox="0 0 24 24"><path d="M5 3.5h3.5l1.8 4.6-2.3 1.4a11 11 0 006 6l1.4-2.3 4.6 1.8V18.5A2 2 0 0118 20.5 15.5 15.5 0 013.5 6 2 2 0 015 3.5z"/></svg>',
 moon:'<svg viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z"/></svg>',
 pin:'<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
};
const tel=(num,label)=>`<a class="btn tel" href="tel:${num}">${IC.phone}${esc(label)}</a>`;

/* ================= Dates ================= */
function todayISO(){
  const o=new URLSearchParams(location.search).get("date"); // ?date=2026-11-23 previews a trip day
  if(o&&/^\d{4}-\d\d-\d\d$/.test(o))return o;
  try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}catch(e){return new Date().toISOString().slice(0,10)}
}
const T=todayISO(), START=DAYS[0].date, END=DAYS[DAYS.length-1].date;
const diff=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);
const fd=iso=>{const d=new Date(iso+"T12:00:00Z");return{d:d.getUTCDate(),w:d.toLocaleDateString("en-GB",{weekday:"short",timeZone:"UTC"}),W:d.toLocaleDateString("en-GB",{weekday:"long",timeZone:"UTC"})}};
const kmOf=d=>d.hikes.filter(h=>!h.opt).reduce((a,h)=>a+h.km,0);
const TOTAL=DAYS.reduce((a,d)=>a+kmOf(d),0);
const baseLabel=b=>b==="gal"?"Galicia":b==="pen"?"Peneda-Gerês":"Road day";
const coverOf=d=>d.cover||((d.hikes.find(h=>!h.opt)||d.hikes[0]||{}).photo)||"razo";
const mainWalks=d=>d.hikes.filter(h=>!h.opt).map(h=>h.name.split(" · ")[0]).join(" + ")||"Drive day";

/* ================= Weather (Open-Meteo, no key) ================= */
const WXKEY="fw2026-wx", WX_MAX_AGE=3*36e5;
const SPOT={costa:COSTA.ll,lamas:LAMAS.ll};
const llOf=d=>Array.isArray(d.wx)?d.wx:SPOT[d.wx]||COSTA.ll;
const climateOf=d=>CLIMATE[d.base==="pen"||d.sleep===LAMAS?"lamas":"costa"];
const llKey=ll=>ll[0].toFixed(3)+","+ll[1].toFixed(3);
let WX=null;try{WX=JSON.parse(localStorage.getItem(WXKEY)||"null")}catch(e){}
function wxFor(d){
  const s=WX&&WX.data&&WX.data[llKey(llOf(d))];
  if(s){const i=s.time.indexOf(d.date);if(i>=0&&s.weather_code[i]!=null)return{fc:true,code:s.weather_code[i],hi:Math.round(s.temperature_2m_max[i]),lo:Math.round(s.temperature_2m_min[i]),pp:s.precipitation_probability_max[i],mm:s.precipitation_sum[i],wind:Math.round(s.wind_speed_10m_max[i]),gust:Math.round(s.wind_gusts_10m_max[i])}}
  const c=climateOf(d);return{fc:false,hi:c.hi,lo:c.lo,wet:c.wet,frost:c.frost,code:c.wet>50?61:3};
}
async function loadWeather(){
  if(WX&&Date.now()-WX.ts<WX_MAX_AGE)return;
  if(diff(T,START)>16||T>END)return; // forecast only reaches 16 days ahead
  const pts=[...new Map(DAYS.map(d=>[llKey(llOf(d)),llOf(d)])).values()];
  const u="https://api.open-meteo.com/v1/forecast?latitude="+pts.map(p=>p[0]).join(",")+"&longitude="+pts.map(p=>p[1]).join(",")+
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&timezone=auto&forecast_days=16";
  try{
    const r=await fetch(u);if(!r.ok)return;let j=await r.json();if(!Array.isArray(j))j=[j];
    const data={};pts.forEach((p,i)=>data[llKey(p)]=j[i].daily);
    WX={ts:Date.now(),data};try{localStorage.setItem(WXKEY,JSON.stringify(WX))}catch(e){}
    route(true);
  }catch(e){}
}
function wxKind(c){
  if(c<=1)return["sun","Clear"];if(c===2)return["part","Some sun"];if(c===3)return["cloud","Cloudy"];if(c<=48)return["fog","Fog"];
  if(c<=57)return["drizzle","Drizzle"];if(c<=67)return["rain","Rain"];if(c<=77)return["snow","Snow"];if(c<=82)return["shower","Showers"];if(c<=86)return["snow","Snow showers"];return["storm","Thunderstorms"];
}
function wxIcon(c){
  const k=wxKind(c)[0], cloud='<path d="M9 23h14a5 5 0 00.6-9.96A7 7 0 0010.2 15 4 4 0 009 23z"/>';
  const drops=n=>Array.from({length:n},(_,i)=>`<path class="rain" d="M${11+i*5} 26l-1.5 3.5"/>`).join("");
  const g={
   sun:'<circle class="sun" cx="16" cy="16" r="6"/><path class="sun" d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1"/>',
   part:'<circle class="sun" cx="12" cy="11" r="5"/><path class="sun" d="M12 2v2.5M3 11h2.5M5.6 4.6l1.8 1.8M18.4 4.6l-1.8 1.8"/>'+cloud,
   cloud:cloud, fog:'<path d="M5 12h22M3 17h22M7 22h20"/>',
   drizzle:'<path d="M9 20h14a5 5 0 00.6-9.96A7 7 0 0010.2 12 4 4 0 009 20z"/>'+drops(2),
   rain:'<path d="M9 20h14a5 5 0 00.6-9.96A7 7 0 0010.2 12 4 4 0 009 20z"/>'+drops(3),
   shower:'<circle class="sun" cx="10" cy="9" r="4"/><path d="M9 20h14a5 5 0 00.6-9.96A7 7 0 0010.2 12 4 4 0 009 20z"/>'+drops(3),
   snow:'<path d="M9 20h14a5 5 0 00.6-9.96A7 7 0 0010.2 12 4 4 0 009 20z"/><circle class="snow" cx="12" cy="26" r="1.4"/><circle class="snow" cx="17" cy="28" r="1.4"/><circle class="snow" cx="22" cy="26" r="1.4"/>',
   storm:'<path d="M9 20h14a5 5 0 00.6-9.96A7 7 0 0010.2 12 4 4 0 009 20z"/><path class="bolt" d="M17 20l-4 6h3l-1 5 5-7h-3l1-4z"/>'
  };
  return `<svg class="wi" viewBox="0 0 32 32" aria-hidden="true">${g[k]}</svg>`;
}
const placeName=d=>{const ll=llOf(d);return d.wx==="costa"?"Costa da Morte camp":d.wx==="lamas"?"Lamas de Mouro":(d.hikes.find(h=>h.ll&&h.ll[0]===ll[0])||{name:"the trailhead"}).name.split(" · ")[0]};
function wxCard(d){
  const w=wxFor(d);
  if(w.fc){const [,label]=wxKind(w.code);
    return `<div class="wxcard">${wxIcon(w.code)}<div class="big">${w.hi}°<span> / ${w.lo}°</span></div>
     <div class="det">${label}${w.pp!=null?` · ${w.pp}% chance of rain`:""}${w.mm>=0.5?` · ${w.mm.toFixed(0)} mm`:""} · wind ${w.wind} km/h${w.gust>=45?`, gusts ${w.gust}`:""}</div>
     <div class="src">Forecast for ${esc(placeName(d))}. Updated ${new Date(WX.ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}, refreshes every few hours when you're online.</div></div>`}
  return `<div class="wxcard typ">${wxIcon(w.code)}<div class="big">${w.hi}°<span> / ${w.lo}°</span></div>
   <div class="det">Typical for these dates: rain on ${Math.round(w.wet/10)} days in 10${w.frost?`, frost on about ${Math.round(w.frost)}% of nights`:""}.</div>
   <div class="src">The real forecast appears here about 16 days ahead. Typical figures are the 2016–2025 average for 20–29 November.</div></div>`;
}
function wxStrip(days){
  return `<div class="wx-strip" role="list">${days.map(d=>{const w=wxFor(d),f=fd(d.date);
    return `<a role="listitem" class="wxd${w.fc?"":" typ"}" href="#day${d.n}" aria-label="${f.W} ${f.d}: ${w.fc?wxKind(w.code)[1]:"typical"}, high ${w.hi}, low ${w.lo}"><i class="base base-${d.base==="gal"?"gal":d.base==="pen"?"pen":"road"}"></i>
     <span class="dw">${f.w}</span><span class="dn">${f.d}</span>${wxIcon(w.code)}<span class="t">${w.hi}°<span> ${w.lo}°</span></span><span class="p">${w.fc?(w.pp!=null?w.pp+"%":""):"typical"}</span></a>`}).join("")}</div>`;
}

/* ================= State (checklists) ================= */
const KEY="fw2026-checks";
let checks={};try{checks=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){checks={}}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(checks))}catch(e){}};
/* Ticks are stored by item name, so reordering a list keeps them. Older ticks were stored by position: move those once. */
const tickKey=(l,t)=>l.id+":"+t;
(()=>{const old=Object.keys(checks).filter(k=>/^[a-z0-9]+:\d+$/.test(k));if(!old.length)return;
  LISTS.forEach(l=>l.items.forEach((it,i)=>{const from=it[2]||(l.keep?l.id+":"+i:"");if(from&&checks[from])checks[tickKey(l,it[0])]=1}));
  old.forEach(k=>delete checks[k]);save()})();
const doneOf=l=>l.items.filter(([t])=>checks[tickKey(l,t)]).length;

/* ================= Header ================= */
function renderTop(){
  const top=$("#top");
  top.className="bar";top.innerHTML=`<div class="wrap"><i class="wm" aria-hidden="true"></i><span>Forests &amp; Waterfalls</span><span>20–29 Nov</span></div>`;
}

/* ================= Day page ================= */
function credit(k){const c=CREDITS[k];return c?`<p class="ph-credit">Photo: <a href="${c[2]}" target="_blank" rel="noopener">${esc(c[0])}</a>, ${esc(c[1])}</p>`:""}
function hikeHTML(h,d,i){
  const links=[];
  if(h.wl)links.push(ext(h.wl,esc(h.wlLabel||"Wikiloc track")));
  if(h.src)links.push(ext(h.src,esc(h.srcLabel||"Official route sheet")));
  (h.warn||[]).forEach(([t,u])=>links.push(ext(u,esc(t),"warn")));
  links.unshift(drive(h.ll,h.mq));
  if(h.ll)links.push(`<a class="btn" href="#map/h-${d.n}-${i}">${IC.pin}On the map</a>`);
  return `<article class="hike"><div class="ph">${h.photo?`<img src="${img(h.photo)}" alt="" loading="lazy">`:""}${h.opt?`<span class="flag"><i class="wm-turn" aria-hidden="true"></i>${esc(h.opt)}</span>`:""}</div><div class="bd">
   <h4>${esc(h.name)}</h4>
   <div class="stats"><div><b>${h.km}</b><small>km</small></div><div><b>${h.gain===null?"–":h.gain}</b><small>m climb</small></div><div><b class="s">${esc(h.time)}</b><small>time</small></div><div><b class="s">${esc(h.type)}</b><small>type</small></div></div>
   <p>${esc(h.text)}</p><div class="btns">${links.join("")}</div>${credit(h.photo)}</div></article>`;
}
function extraHTML(x){
  return `<article class="hike"><div class="ph"><img src="${img(x.photo)}" alt="" loading="lazy"></div><div class="bd"><h4>${esc(x.name)}</h4><p>${esc(x.text)}</p>
   <div class="btns">${drive(x.ll,x.mq)}</div>${credit(x.photo)}</div></article>`;
}
const noteIcon=k=>k==="warn"?'<i class="wm-x" aria-hidden="true"></i>':'<i class="wm" aria-hidden="true"></i>';
function dayDetail(d,opts={}){
  const f=fd(d.date), i=DAYS.indexOf(d), prev=DAYS[i-1], next=DAYS[i+1], km=kmOf(d), cov=coverOf(d);
  const nav=opts.nav===false?"":`<div class="nav"><a class="chipnav" href="#day${prev?prev.n:d.n}" ${prev?"":'aria-disabled="true"'}>${IC.l}${prev?"Day "+prev.n:"Start"}</a>
    <a class="chipnav" href="#plan">All days</a>
    <a class="chipnav" href="#day${next?next.n:d.n}" ${next?"":'aria-disabled="true"'}>${next?"Day "+next.n:"End"}${IC.r}</a></div>`;
  const main=d.hikes.map((h,k)=>[h,k]).filter(([h])=>!h.opt), opt=d.hikes.map((h,k)=>[h,k]).filter(([h])=>h.opt);
  const bcls=d.base==="gal"?"gal":d.base==="pen"?"pen":"road";
  return `${opts.hero===false?"":`<div class="dayhero${opts.nav===false?" compact":""}"><img src="${img(cov)}" alt="">${nav}
    <div class="in"><span class="when">${d.date===T?'<i class="wm"></i>Today, ':""}${f.W} ${f.d} November · Day ${d.n} of 10</span><h2>${esc(d.title)}</h2></div></div>
  <div class="facts-row"><span class="fact ${bcls}">${baseLabel(d.base)}</span>${km?`<span class="fact">${km.toFixed(1)} km walking</span>`:""}${d.surf?'<span class="fact">Surf</span>':""}</div>`}
  <p class="lede">${esc(d.lede)}</p>
  ${opts.hero!==false&&d.n===1?gateCard():""}
  ${opts.hero===false?"":wxCard(d)}
  <div class="drive">${IC.car}<div><b>Driving</b>${esc(d.drive)}</div></div>
  <div class="stack"><h3 class="h3">The day</h3><ul class="tl">${d.timeline.map(([t,s])=>`<li><span class="t">${esc(t)}</span><span>${esc(s)}</span></li>`).join("")}</ul></div>
  ${main.length?`<div class="stack"><h3 class="h3">${main.length>1?"The walks":"The walk"}</h3>${main.map(([h,k])=>hikeHTML(h,d,k)).join("")}</div>`:""}
  ${d.surf&&opts.hero!==false?`<div class="stack"><h3 class="h3">Surf</h3><div class="tiles">${surfTile(d)}</div></div>`:""}
  ${d.extra?`<div class="stack"><h3 class="h3">Also today</h3>${d.extra.map(extraHTML).join("")}</div>`:""}
  ${opt.length?`<div class="stack"><h3 class="h3">If you want to swap</h3>${opt.map(([h,k])=>hikeHTML(h,d,k)).join("")}</div>`:""}
  ${d.notes.map(([k,t,s])=>`<div class="note ${k}">${noteIcon(k)}<b>${esc(t)}</b><span>${esc(s)}</span></div>`).join("")}
  ${d.shops?`<div class="stack"><h3 class="h3">Outlet stop, optional</h3><div class="note shop">${noteIcon()}<b>Gear deals</b><span>${esc(d.shops.intro)}</span></div><div class="cards">${d.shops.list.map(k=>outletCard(k)).join("")}</div></div>`:""}
  ${d.soak?`<div class="stack"><h3 class="h3">Hot springs, optional</h3><div class="note">${noteIcon()}<b>Warm water</b><span>${esc(d.soak.intro)}</span></div><div class="cards">${d.soak.list.map(soakCard).join("")}</div></div>`:""}
  ${d.sleep?`<div class="sleep">${IC.tent}<span><small>${esc(d.night)}</small>${esc(d.sleep.name)}</span>${drive(d.sleep.ll,d.sleep.q)}</div>`:`<div class="sleep">${IC.home}<span><small>Night 10</small>${esc(d.night)}</span></div>`}`;
}
function soakCard(k){return outletCard(k,SOAKS)}
function outletCard(k,src){const o=(src||OUTLETS)[k];return `<div class="card"><span class="k">${esc(o.tag)}</span><h3 class="h3">${esc(o.name)}</h3><p>${esc(o.addr)}</p><p style="color:var(--muted);font-size:15px">${esc(o.info)}</p>
  <div class="btns">${o.tel?tel(o.tel[1],o.tel[0]):""}${drive(o.ll,o.q)}${o.page?ext(o.page,"Store page"):""}</div></div>`}

/* ================= Plan ================= */
function stopHTML(d){
  const f=fd(d.date), km=kmOf(d), w=wxFor(d);
  return `<li><a class="stop${d.date===T?" is-today":""}${d.date<T?" is-past":""}" href="#day${d.n}">
   <span class="date"><span>${f.w}</span><b>${f.d}</b><i class="wm" aria-hidden="true"></i></span>
   <span class="mid"><h3>${esc(d.title)}</h3><span class="walks">${esc(mainWalks(d))}</span>
    <span class="facts">${km?`<span>${km.toFixed(1)} km</span>`:`<span>Drive</span>`}<span class="w">${wxIcon(w.code)}${w.hi}°${w.fc?"":" typical"}</span></span></span>
   <img class="thumb" src="${img(coverOf(d),1)}" alt="" loading="lazy"></a></li>`;
}
function chart(){
  const W=360,H=190,P={l:24,r:4,t:22,b:40},iw=W-P.l-P.r,ih=H-P.t-P.b,max=12,bw=iw/DAYS.length,y=v=>P.t+ih-(v/max)*ih;
  let g="";
  [0,6,12].forEach(v=>{g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)" stroke-dasharray="${v?"2 3":"0"}"/><text x="${P.l-6}" y="${y(v)+3.5}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`});
  DAYS.forEach((d,i)=>{
    const km=kmOf(d), x=P.l+i*bw+bw*.18, w=bw*.64, f=fd(d.date);
    const col=d.base==="gal"?"var(--atl)":d.base==="pen"?"var(--moss)":"var(--earth)";
    if(km)g+=`<rect x="${x}" y="${y(km)}" width="${w}" height="${y(0)-y(km)}" rx="2" fill="${col}"/>`;
    g+=`<text x="${x+w/2}" y="${(km?y(km):y(0))-6}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink)">${km?km.toFixed(1):""}</text>`;
    g+=`<text x="${x+w/2}" y="${H-P.b+15}" text-anchor="middle" font-size="9.5" fill="var(--muted)">${f.w.slice(0,2)}</text><text x="${x+w/2}" y="${H-P.b+29}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${f.d}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Walking kilometres per day">${g}</svg>`;
}
function renderPlan(){
  const gal=DAYS.slice(0,5), pen=DAYS.slice(5);
  $("#v-plan").innerHTML=`<div class="sec-head"><h2 class="title">The plan</h2>
   <p class="sub">About ${Math.round(TOTAL)} km of walking over ten days, never two long days in a row, and the longest day can be cut short. Tap a day for its page.</p></div>
   <div class="leg"><div class="leg-head"><h2 class="h2">Costa da Morte</h2><span class="sub">5 nights at Camping Costa da Morte, Zas</span></div><ol class="trail">${gal.map(stopHTML).join("")}</ol></div>
   <div class="leg"><div class="leg-head"><h2 class="h2">Peneda-Gerês</h2><span class="sub">4 nights at Lamas de Mouro, then home through Buçaco</span></div><ol class="trail">${pen.map(stopHTML).join("")}</ol></div>
   <div class="panel"><h3 class="h3">Walking per day</h3>${chart()}
    <div class="legend"><span><i style="background:var(--atl)"></i>Galicia</span><span><i style="background:var(--moss)"></i>Peneda-Gerês</span><span><i style="background:var(--earth)"></i>Road days</span></div></div>
   <details class="fold"><summary><span class="h3">What changed from the first plan</span></summary>
    <div>${CHOICES.map(([k,t,s])=>`<div class="choice"><span class="tag ${k}">${{keep:"Kept",move:"Moved",new:"New",opt:"Optional"}[k]}</span><div><h4>${esc(t)}</h4><p>${esc(s)}</p></div></div>`).join("")}</div></details>`;
}

/* ================= Today ================= */
function progBlock(l,label){
  const d=doneOf(l);
  return `<div class="prog"><div class="prog-top"><h3 class="h3">${label}</h3><span class="lbl num">${d} of ${l.items.length} done</span></div>
   <div class="meter"><i style="width:${100*d/l.items.length}%"></i></div><div class="btns"><a class="btn solid" href="#lists" data-open="${l.id}">Open the list</a></div></div>`;
}
/* Sun times (NOAA approximation): first light, sunrise, sunset, last light, as minutes in the day's local time */
const tzOf=d=>d.base==="gal"||d.wx==="costa"?"Europe/Madrid":"Europe/Lisbon";
function locMin(date,tz){
  try{const p={};new Intl.DateTimeFormat("en-GB",{timeZone:tz,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).forEach(x=>p[x.type]=x.value);return +p.hour*60+ +p.minute}
  catch(e){return date.getUTCHours()*60+date.getUTCMinutes()+(tz==="Europe/Madrid"?60:0)}
}
function sunOf(d){
  const [lat,lon]=llOf(d), base=Date.parse(d.date+"T00:00:00Z"), n=Math.round((base-Date.UTC(+d.date.slice(0,4),0,0))/864e5), r=Math.PI/180;
  const g=2*Math.PI/365*(n-.5), eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const at=alt=>{const ha=Math.acos(Math.cos((90-alt)*r)/(Math.cos(lat*r)*Math.cos(dec))-Math.tan(lat*r)*Math.tan(dec))/r;return[720-4*(lon+ha)-eq,720-4*(lon-ha)-eq]};
  const tz=tzOf(d), m=x=>locMin(new Date(base+Math.round(x)*6e4),tz), [rise,set]=at(-.833), [dawn,dusk]=at(-6);
  return{tz,first:m(dawn),rise:m(rise),set:m(set),last:m(dusk)};
}
const firstSentence=s=>{const m=String(s).match(/^.*?[.!?](\s|$)/);return(m?m[0]:s).trim()};
function lightTile(d,s,now){
  const a=Math.floor((s.first-30)/60)*60, b=Math.ceil((s.last+30)/60)*60, pc=m=>(Math.max(0,Math.min(1,(m-a)/(b-a)))*100).toFixed(1)+"%", w=(x,y)=>`left:${pc(x)};width:calc(${pc(y)} - ${pc(x)})`;
  let head;
  if(now==null)head=dur(s.set-s.rise)+" of sun";
  else if(now<s.rise)head="Sunrise in "+dur(s.rise-now);
  else if(now<s.set)head="Sunset in "+dur(s.set-now);
  else if(now<s.last)head="Last light in "+dur(s.last-now);
  else head="Dark now";
  const out=d.outBy?toMin(d.outBy):null, bands=[];
  if(d.band)bands.push([toMin(d.band[0]),toMin(d.band[1]),d.band[2]]);
  if(d.surf){const st=surfInfo(d).start;bands.push([st,st+SLOT,"surf"])}
  return `<div class="tile wide light${now!=null&&now>=s.set?" late":""}"><div class="row"><span class="lab">Light ${now==null?"that day":"today"}</span><b class="num">${head}</b></div>
   <div class="strip" role="img" aria-label="First light ${clock(s.first)}, sunrise ${clock(s.rise)}, sunset ${clock(s.set)}, last light ${clock(s.last)}${out?`. Out by ${d.outBy}`:""}">
    <i class="nt"></i><i class="tw" style="${w(s.first,s.rise)}"></i><i class="dy" style="${w(s.rise,s.set)}"></i><i class="tw" style="${w(s.set,s.last)}"></i>
    ${bands.map(bd=>`<i class="band" style="${w(bd[0],bd[1])}"></i><span class="ml band-l" style="left:${pc(bd[0])}">${esc(bd[2])}</span>`).join("")}
    ${out?`<i class="mk out" style="left:${pc(out)}"></i><span class="ml out-l" style="left:${pc(out)}">out ${d.outBy}</span>`:""}
    ${now!=null&&now>a&&now<b?`<i class="mk now" style="left:${pc(now)}"></i><span class="ml now-l" style="left:${pc(now)}">now</span>`:""}
   </div>
   <div class="sunrow num"><span><b>${clock(s.first)}</b>first light</span><span><b>${clock(s.rise)}</b>sunrise</span><span><b>${clock(s.set)}</b>sunset</span><span><b>${clock(s.last)}</b>last light</span></div></div>`;
}
function weatherTile(d){
  const w=wxFor(d), wet=w.fc?w.pp>=50:w.wet>=50, cold=w.lo<=3, camp=d.sleep===LAMAS?" at camp":"";
  const title=cold&&wet?"Cold &amp; wet":cold?"Cold":wet?"Wet":w.fc?wxKind(w.code)[1]:"Typical weather";
  const bits=[w.fc?(w.pp!=null?w.pp+"% rain":wxKind(w.code)[1]):`Rain on ${Math.round(w.wet/10)} days in 10`];
  if(w.lo<=2)bits.push("frost likely"+camp+" tonight");else if(w.lo<=4)bits.push("near freezing"+camp+" tonight");else if(!w.fc&&w.frost>=5)bits.push(`frost ${Math.round(w.frost)}% of nights`);
  if(w.fc&&w.gust>=45)bits.push("gusts "+w.gust+" km/h");
  return `<div class="tile${cold||wet?" cool":""}"><span class="lab">${title}</span><span class="big num">${wxIcon(w.code)}${w.hi}° <small>${w.lo}°</small></span><span class="sm">${bits.join(" · ")}${w.fc?"":" (forecast not out yet)"}</span></div>`;
}
/* ================= Surf (Open-Meteo marine + wind, no key) ================= */
const SURFKEY="fw2026-surf", SLOT=70; // 70 min: changing plus an hour in the water
let SURFWX=null;try{SURFWX=JSON.parse(localStorage.getItem(SURFKEY)||"null")}catch(e){}
const surfDays=()=>DAYS.filter(d=>d.surf);
async function loadSurf(){
  const days=surfDays(),first=days[0].date,last=days[days.length-1].date;
  if(SURFWX&&Date.now()-SURFWX.ts<WX_MAX_AGE)return;
  if(diff(T,first)>14||T>last)return;
  const keys=[...new Set(days.map(d=>d.surf.b))], ll=keys.map(k=>SURF[k].ll);
  const q=`latitude=${ll.map(p=>p[0]).join(",")}&longitude=${ll.map(p=>p[1]).join(",")}&start_date=${first}&end_date=${last}&timezone=Europe%2FMadrid&hourly=`;
  try{
    const [m,w]=await Promise.all([
      fetch("https://marine-api.open-meteo.com/v1/marine?"+q+"swell_wave_height,swell_wave_period,swell_wave_direction,sea_level_height_msl,sea_surface_temperature").then(r=>r.ok?r.json():null),
      fetch("https://api.open-meteo.com/v1/forecast?"+q+"wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,temperature_2m").then(r=>r.ok?r.json():null)]);
    if(!m||!w)return;
    const ma=[].concat(m),wa=[].concat(w),data={};
    keys.forEach((k,i)=>data[k]=Object.assign({},ma[i].hourly,wa[i].hourly));
    SURFWX={ts:Date.now(),data};try{localStorage.setItem(SURFKEY,JSON.stringify(SURFWX))}catch(e){}
    route(true);
  }catch(e){}
}
const angDiff=(a,b)=>{const x=((a-b)%360+360)%360;return x>180?360-x:x};
const COMPASS=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"], compass=a=>COMPASS[Math.round(a/22.5)%16];
function windClass(face,from,speed){ // face = where the beach looks out to sea; offshore wind blows from the land
  if(speed<8)return"light";
  const x=angDiff(from,(face+180)%360);
  return x<=30?"offshore":x<=60?"cross-offshore":x<=120?"cross-shore":x<=150?"cross-onshore":"onshore";
}
const WSCORE={light:2.6,offshore:3,"cross-offshore":2.4,"cross-shore":1.2,"cross-onshore":.4,onshore:-.6};
/* Breaking face height, roughly: swell height × a period factor × how squarely the swell hits the beach × shelter */
function faceOf(b,H,Tp,dir){
  if(H==null)return null;
  const k=.7+.05*Math.max(5,Math.min(16,Tp||8)), af=.4+.6*Math.max(0,Math.cos(angDiff(dir==null?b.face:dir,b.face)*Math.PI/180));
  return H*k*af*b.shelter;
}
const r1=x=>(Math.round(x*10)/10).toFixed(1), faceRange=c=>[r1(c*.85),r1(c*1.15)];
const faceWords=c=>c<.5?"knee to waist high":c<.8?"waist high":c<1.1?"chest high":c<1.4?"chest to head high":c<1.8?"head high":c<2.3?"head high to overhead":"well overhead";
const TIDEPREF={any:"Works at all tides.",high:"Best around high tide.",rising:"Best on the push towards high.",falling:"Best on a falling mid-tide."};
function surfInfo(d){
  const s=d.surf, b=SURF[s.b], sun=sunOf(d), win=[toMin(s.win[0]),toMin(s.win[1])], base={d,s,b,sun,win,plan:s.plan,live:false,start:toMin(s.plan.slot)};
  const h=SURFWX&&SURFWX.data&&SURFWX.data[s.b], i0=h?h.time.indexOf(d.date+"T00:00"):-1;
  if(i0<0)return base;
  const at=(k,m)=>{const x=m/60,i=Math.floor(x),f=x-i,a=h[k][i0+i],c=h[k][i0+i+1];return a==null?c:c==null?a:a+(c-a)*f};
  const near=(k,m)=>h[k][i0+Math.round(m/60)];
  const sl=h.sea_level_height_msl.slice(i0,i0+24), ok=sl.filter(v=>v!=null);
  if(ok.length<20)return base;
  const lo=Math.min(...ok),hi=Math.max(...ok),ext=[];
  for(let i=1;i<23;i++){const a=sl[i-1],c=sl[i],e=sl[i+1];if(a==null||c==null||e==null)continue;
    if((c>=a&&c>e)||(c<=a&&c<e)){const den=a-2*c+e;ext.push({hi:c>a,m:Math.round((i+(den?(a-e)/(2*den):0))*60)})}}
  const cond=m=>{const ws=at("wind_speed_10m",m),wd=near("wind_direction_10m",m),lvl=at("sea_level_height_msl",m);
    return{H:at("swell_wave_height",m),Tp:at("swell_wave_period",m),c:faceOf(b,at("swell_wave_height",m),at("swell_wave_period",m),near("swell_wave_direction",m)),
      ws,wd,g:at("wind_gusts_10m",m),pp:at("precipitation_probability",m),wc:windClass(b.face,wd,ws),
      h01:(lvl-lo)/((hi-lo)||1),slope:at("sea_level_height_msl",m+30)-at("sea_level_height_msl",m-30)}};
  const score=x=>{let sc=WSCORE[x.wc]-(x.ws>25?1.5:x.ws>18?.7:0)-x.ws/40-(x.g>50?1:0)-(x.pp||0)/100;
    sc+=b.tide==="high"?1.5*x.h01:b.tide==="rising"?(x.slope>0?1+x.h01:0):b.tide==="falling"?(x.slope<0?1.5*(1-Math.abs(x.h01-.5)*2):0):.5;
    return sc+(x.c!=null&&x.c>=.6&&x.c<=2.2?1:-1)};
  const latest=Math.max(win[0],Math.min(win[1],sun.set-30)-SLOT);
  let best=null;
  for(let m=win[0];m<=latest;m+=10){const x=cond(m+SLOT/2),sc=score(x);if(!best||sc>best.sc+.05)best={m,sc,x}}
  const start=best.m;
  return Object.assign(base,{live:true,start,x:best.x,ext,lo,hi,sl,cond,sst:at("sea_surface_temperature",start),air:at("temperature_2m",start)});
}
function surfAlerts(I){
  if(!I.live)return{major:false,list:[]};
  const x=I.x,[pl,ph]=I.plan.faces,pm=(pl+ph)/2,list=[];let major=false;
  if(x.c!=null&&Math.abs(x.c-pm)/pm>=.35){major=true;const fr=faceRange(x.c);list.push(`Waves ${x.c>pm?"bigger":"smaller"} than planned: ${fr[0]}–${fr[1]} m faces (planned ${pl.toFixed(1)}–${ph.toFixed(1)} m).`)}
  if(WSCORE[x.wc]<WSCORE[I.plan.wind]-1){major=true;list.push(`Wind now ${x.wc} (planned ${I.plan.wind}).`)}
  if(x.c!=null&&x.c<.4){major=true;list.push("Close to flat.")}
  if(x.c!=null&&x.c>2.6){major=true;list.push("Big. Only if you feel confident.")}
  if(Math.abs(I.start-toMin(I.plan.slot))>=60)list.push(`Best time moved to ${clock(I.start)} (planned ${I.plan.slot}).`);
  if(x.g>=50)list.push(`Gusts up to ${Math.round(x.g)} km/h.`);
  if(x.pp>=70)list.push(`${Math.round(x.pp)}% chance of rain.`);
  return{major,list};
}
function tideText(I){
  if(!I.live)return TIDEPREF[I.b.tide];
  const mid=I.start+SLOT/2, hiNear=I.ext.filter(e=>e.hi).sort((a,c)=>Math.abs(a.m-mid)-Math.abs(c.m-mid))[0];
  if(hiNear&&Math.abs(hiNear.m-mid)<=45)return`High ~${clock(hiNear.m)}, right in your hour. ${TIDEPREF[I.b.tide]}`;
  return`Tide ${I.x.slope>0?"rising":"falling"}${hiNear?` (high ~${clock(hiNear.m)})`:""}. ${TIDEPREF[I.b.tide]}`;
}
const hhmm=ts=>new Date(ts).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
let HERE={};
function fromText(I){const r=HERE[I.s.b];if(r&&Date.now()-r.ts<36e5)return`<b>${r.min} min</b> · ${r.km} km from you`;const f=I.s.from;return`About <b>${f[1]} min</b> · ${f[2]} km from ${esc(f[0])}`}
function routeFromHere(k,btn){
  if(!navigator.geolocation)return;
  if(btn){btn.disabled=true;btn.textContent="Finding you…"}
  navigator.geolocation.getCurrentPosition(async p=>{
    const b=SURF[k];
    try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${p.coords.longitude},${p.coords.latitude};${b.ll[1]},${b.ll[0]}?overview=false`).then(x=>x.json());
      const rt=r.routes&&r.routes[0];if(rt){HERE[k]={min:Math.round(rt.duration/60*1.1),km:Math.round(rt.distance/1000),ts:Date.now()};route(true)}}
    catch(e){if(btn){btn.disabled=false;btn.textContent="Couldn't get a route, try again"}}
  },()=>{if(btn){btn.disabled=false;btn.textContent="Location not allowed"}},{maximumAge:6e5,timeout:15000});
}
const IC_WIND='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h7"/></svg>';
const IC_TIDE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15c3-5 6-5 9 0s6 5 9 0"/><path d="M3 20c3-5 6-5 9 0s6 5 9 0"/></svg>';
function surfTile(d){
  const I=surfInfo(d), x=I.x, al=surfAlerts(I), fr=x&&x.c!=null?faceRange(x.c):I.plan.faces.map(v=>v.toFixed(1)), mid=(+fr[0]+ +fr[1])/2;
  const cap=s=>s[0].toUpperCase()+s.slice(1);
  return `<div class="tile wide surf">
   <span class="row"><span class="lab">Surf · ${clock(I.start)}–${clock(I.start+SLOT)}</span><span class="sm">1 h in the water + changing</span></span>
   <b class="mid">${esc(I.b.name)}</b>
   <span class="sgrid"><span class="span2"><b class="big num">${fr[0]}–${fr[1]} m</b><small>faces · ${faceWords(mid)}</small></span><span><b class="big num">${x?Math.round(x.Tp)+" s":"–"}</b><small>period</small></span><span><b class="big num">${I.live&&I.sst!=null?Math.round(I.sst)+"°":"–"}</b><small>water</small></span></span>
   <span class="line">${IC_WIND}<span>${x?`<b>${cap(x.wc)}</b>, ${Math.round(x.ws)} km/h${x.g>=40?`, gusts ${Math.round(x.g)}`:""}`:`Planned: <b>${esc(I.plan.wind)}</b>`}</span></span>
   <span class="line">${IC_TIDE}<span>${tideText(I)}</span></span>
   ${I.live?"":`<span class="alert">Planned figures. The live forecast appears about two weeks ahead.</span>`}
   ${al.list.length?`<span class="alert${al.major?" major":""}">${al.major?"Changed since planning: ":""}${esc(al.list[0])}${al.list.length>1?` (+${al.list.length-1} more)`:""}</span>`:""}
   <span class="sm num">${fromText(I)}${I.live?" · updated "+hhmm(SURFWX.ts):""}</span>
   <span class="acts"><a class="sbtn go" href="${driveURL(I.b.ll,I.b.q)}" target="_blank" rel="noopener">${IC.car}Drive there</a><a class="sbtn" href="#surf${d.n}">Details ${IC.r}</a></span></div>`;
}
function tideChart(I,now){
  const a=8*60,b=20*60,W=350,H=140,x=m=>10+(m-a)/(b-a)*330,lo=Math.min(...I.sl.slice(8,21)),hi=Math.max(...I.sl.slice(8,21)),y=v=>14+(hi-v)/((hi-lo)||1)*100;
  const pts=[];for(let hr=8;hr<=20;hr++)if(I.sl[hr]!=null)pts.push([x(hr*60),y(I.sl[hr])]);
  const line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ");
  const ticks=[8,10,12,14,16,18,20].map(hr=>`<text x="${x(hr*60)}" y="134" font-size="11" fill="currentColor" opacity=".7" text-anchor="middle">${String(hr).padStart(2,"0")}</text>`).join("");
  const ex=I.ext.filter(e=>e.m>=a&&e.m<=b).map(e=>`<text x="${Math.max(32,Math.min(318,x(e.m)))}" y="${e.hi?10:126}" font-size="10.5" font-weight="700" fill="var(--atl)" text-anchor="middle">${e.hi?"high":"low"} ${clock(e.m)}</text>`).join("");
  return `<svg class="tidechart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tide from 08:00 to 20:00. ${I.ext.map(e=>(e.hi?"High ":"Low ")+clock(e.m)).join(", ")}. Your session ${clock(I.start)} to ${clock(I.start+SLOT)}.">
   <rect x="${x(I.start)}" y="14" width="${x(I.start+SLOT)-x(I.start)}" height="104" rx="5" class="tc-you"></rect>
   <path d="${line} L${pts[pts.length-1][0]},118 L${pts[0][0]},118 Z" class="tc-fill"></path><path d="${line}" class="tc-line"></path>
   ${now!=null&&now>a&&now<b?`<line x1="${x(now)}" x2="${x(now)}" y1="14" y2="118" class="tc-now"></line>`:""}
   ${I.sun.set<b?`<line x1="${x(I.sun.set)}" x2="${x(I.sun.set)}" y1="14" y2="118" class="tc-sun"></line>`:""}
   <line x1="10" x2="340" y1="118" y2="118" class="tc-axis"></line>${ticks}${ex}</svg>`;
}
function renderSurf(d){
  const I=surfInfo(d), b=I.b, x=I.x, al=surfAlerts(I), fr=x&&x.c!=null?faceRange(x.c):I.plan.faces.map(v=>v.toFixed(1)), f=fd(d.date), c=CREDITS[b.photo];
  const now=d.date===T?nowIn("es").min:null, after=I.sun.set-(I.start+SLOT);
  let hours="";
  if(I.live){for(let hr=Math.floor(I.start/60)-1;hr<=Math.floor((I.start+SLOT-1)/60);hr++){const z=I.cond(hr*60),zr=faceRange(z.c),inn=hr*60+59>=I.start&&hr*60<I.start+SLOT;
    hours+=`<tr${inn?' class="in"':""}><th class="num">${String(hr).padStart(2,"0")}:00</th><td class="num">${zr[0]}–${zr[1]} m</td><td>${z.wc} · ${Math.round(z.ws)} km/h</td><td class="num">${Math.round(z.pp||0)}%</td></tr>`}}
  $("#v-surf").innerHTML=`<a class="back" href="${d.date===T?"#today":"#day"+d.n}">${IC.l}${d.date===T?"Today":"Day "+d.n}</a>
   <div class="surfhero"><img src="${img(b.photo)}" alt="${esc(b.name)}"><div class="in"><span class="lab">Surf · ${f.W} ${f.d} Nov · ${clock(I.start)}–${clock(I.start+SLOT)}</span><h2>${esc(b.name)}</h2></div>${c?`<a class="credit" href="${c[2]}" target="_blank" rel="noopener">Photo: ${esc(c[0])}</a>`:""}</div>
   <p class="surfsub num">${esc(b.area)} · faces ${compass(b.face)} · ${fromText(I)}${I.live?" · updated "+hhmm(SURFWX.ts):""}</p>
   ${I.live?`<div class="surfstatus${al.major?" chg":""}"><b>${al.major?"Changed since planning.":"On."}</b> ${al.list.length?esc(al.list.join(" ")):`${fr[0]}–${fr[1]} m faces, ${x.wc} wind.`}</div>`
     :`<div class="surfstatus"><b>Planned.</b> The live forecast for this day isn't out yet. It appears here about two weeks ahead and refreshes every few hours when you're online.</div>`}
   ${I.live?`<div class="panel tidepanel"><div class="row"><span class="lab">Tide</span><span class="num">${tideText(I)}</span></div>${tideChart(I,now)}</div>
   <div class="panel"><table class="hrs"><thead><tr><th>Hour</th><th>Faces</th><th>Wind</th><th>Rain</th></tr></thead><tbody>${hours}</tbody></table></div>`:""}
   <div class="sfacts"><span><b class="num">${fr[0]}–${fr[1]} m</b>faces · ${faceWords((+fr[0]+ +fr[1])/2)}</span><span><b class="num">${x?Math.round(x.Tp)+" s":"–"}</b>period</span><span><b class="num">${I.live&&I.sst!=null?Math.round(I.sst)+"°":"–"}</b>water</span><span><b class="num">${after>0?dur(after):"–"}</b>light after</span></div>
   <div class="note"><i class="wm" aria-hidden="true"></i><b>From your Gemini plan</b><span>${esc(b.why)} Parking: ${esc(b.park[0].toLowerCase()+b.park.slice(1))}</span></div>
   <p class="wx-note">Faces are an estimate from the swell height and period, and how squarely the swell hits this beach. Wind is labelled from the direction the beach faces (${compass(b.face)}).</p>
   <div class="btns">${drive(b.ll,b.q)}<button class="btn" type="button" data-here="${d.surf.b}">Drive time from here</button></div>`;
}
function dayTiles(d){
  const s=sunOf(d), live=d.date===T, now=live?nowIn(s.tz==="Europe/Lisbon"?"pt":"es").min:null, f=fd(d.date);
  const main=d.hikes.filter(h=>!h.opt), km=kmOf(d), t0=d.timeline[0]||["",""], leave=/^Leave/i.test(t0[1]);
  const walkLine=main.length?`${km.toFixed(1)} km · ${main.length>1?main.length+" walks":esc(main[0].time)}${main.length===1&&main[0].gain?` · ${main[0].gain} m up`:""}`:esc(d.drive.split(" · ").slice(0,2).map((x,i)=>i?x.split(",")[0]:x).join(" · ").replace(/\.$/,""));
  const dest=main.length?[main[0].ll,main[0].mq,main[0].name]:d.sleep?[d.sleep.ll,d.sleep.q,d.sleep.name]:null;
  const hero=`<a class="tile wide photo" href="${dest?driveURL(dest[0],dest[1]):"#day"+d.n}"${dest?' target="_blank" rel="noopener"':""} aria-label="${dest?"Drive to "+esc(dest[2]):"Day "+d.n+" details"}">
    <img src="${img(coverOf(d))}" alt=""><span class="row end"><span class="col"><span class="lab">${main.length?"The walk · "+esc(main[0].name.split(" · ")[0]):"Drive day"}</span><span class="sm">${walkLine}</span>${dest?`<span class="pill">${IC.car}Drive there</span>`:""}</span>
    ${t0[0]?`<span class="col r"><span class="lab">${leave?"Leave":"Starts"}</span><b class="big num">${esc(t0[0])}</b></span>`:""}</span></a>`;
  const second=d.clock?`<div class="tile dark"><span class="lab">Clock</span><b class="big num">${esc(d.clock[0])}</b><span class="sm">${esc(d.clock[1])}</span></div>`
    :d.sleep?`<a class="tile" href="${driveURL(d.sleep.ll,d.sleep.q)}" target="_blank" rel="noopener"><span class="lab">Tonight · ${esc(d.night.toLowerCase())}</span><b class="mid">${esc(d.sleep.name)}</b><span class="pill">${IC.car}Drive there</span></a>`
    :`<div class="tile"><span class="lab">Tonight</span><b class="mid">Home</b><span class="sm">${esc(d.night)}</span></div>`;
  const place=(src,list,intro)=>list.slice(0,2).map(k=>{const o=src[k];return `<a class="tile wide place" href="${driveURL(o.ll,o.q)}" target="_blank" rel="noopener"><span class="lab">${esc(o.tag)}</span><b class="mid">${esc(o.name)}</b><span class="sm">${esc(firstSentence(intro))}</span><span class="pill">${IC.car}Drive there</span></a>`}).join("");
  const warn=d.notes.find(n=>n[0]==="warn");
  return `<div class="tiles" id="tiles">
   <div class="t-head wide"><span class="lab">${f.W} ${f.d} Nov · Day ${d.n} of 10${d.clock?"":" · "+(s.tz==="Europe/Madrid"?"Spain":"Portugal")}</span><h1>${esc(d.title)}</h1></div>
   ${hero}${d.surf?surfTile(d):""}${lightTile(d,s,now)}${second}${weatherTile(d)}
   ${d.soak?place(SOAKS,d.soak.list,d.soak.intro):""}${d.shops?place(OUTLETS,d.shops.list,d.shops.intro):""}
   ${warn?`<div class="tile wide warn"><span class="lab">Watch out</span><b class="mid">${esc(warn[1])}</b><span class="sm">${esc(firstSentence(warn[2]))}</span></div>`:""}
  </div>`;
}
function refreshTiles(){const el=document.getElementById("tiles");if(!el)return;const d=T<START?DAYS[0]:DAYS.find(z=>z.date===T);if(d)el.outerHTML=dayTiles(d)}
const gateCard=()=>`<div class="gate" role="region" aria-label="Campsite gate code"><span class="gate-k">${IC.pin}Camping Costa da Morte · gate code</span><b class="gate-code num">${esc(GATE.code)}</b><span class="gate-p">${esc(GATE.pitch)}</span><span class="gate-s">${esc(GATE.opens)}. ${esc(GATE.valid)}</span></div>`;
const gateDay=t=>t>=GATE.from&&t<=GATE.to;
function renderToday(){
  let h;
  const outlookNote=`<p class="wx-note">Live forecast from Open-Meteo where it reaches. Dashed days show what's typical for late November until the forecast covers them.</p>`;
  if(T<START){
    const n=diff(T,START);
    h=`<p class="when-line">${n===1?"Leaving <b>tomorrow</b>, Friday 20 November after lunch.":`Leaving in <b>${n} days</b>, Friday 20 November after lunch.`}</p>
     ${progBlock(LISTS[0],"Before you go")}
     <div class="stack"><h2 class="h2">Friday at a glance</h2>${dayTiles(DAYS[0])}</div>
     <div class="stack"><h2 class="h2">The ten days ahead</h2>${wxStrip(DAYS)}${outlookNote}</div>
     <div class="stack"><h2 class="h2">How Friday goes</h2></div>${dayDetail(DAYS[0],{nav:false,hero:false})}`;
  }else if(T<=END){
    const i=DAYS.findIndex(z=>z.date===T), rest=DAYS.slice(i);
    h=`${dayTiles(DAYS[i])}
     ${progBlock(LISTS.find(l=>l.id==="hikeday"),"Every hike morning")}
     <div class="stack"><h2 class="h2">The full day</h2></div>${dayDetail(DAYS[i],{nav:false,hero:false})}
     ${DAYS[i+1]?`<div class="stack"><h2 class="h2">Tomorrow</h2><ol class="trail">${stopHTML(DAYS[i+1])}</ol></div>`:""}
     ${rest.length>1?`<div class="stack"><h2 class="h2">Days left</h2>${wxStrip(rest)}</div>`:""}`;
  }else{
    h=`<div class="sec-head"><h2 class="title">Welcome home</h2><p class="sub">The after-trip list keeps the gear ready for next time.</p></div>${progBlock(LISTS.find(l=>l.id==="after"),"After the trip")}
     <div class="btns"><a class="btn" href="#plan">Look back at the plan</a></div>`;
  }
  $("#v-today").innerHTML=(gateDay(T)?gateCard():"")+h;
}

/* ================= Map ================= */
let MAP=null, MARK={}, GROUPS={};
function loadLeaflet(){
  if(window.L)return Promise.resolve();
  return new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});
}
function renderMapShell(){
  $("#v-map").innerHTML=`<div class="mapwrap"><div id="map" role="application" aria-label="Trip map"></div>
   <div class="mapfilters" role="group" aria-label="Map view">
    <button type="button" data-fit="all" aria-pressed="true">Whole trip</button><button type="button" data-fit="gal" aria-pressed="false">Costa da Morte</button>
    <button type="button" data-fit="pen" aria-pressed="false">Peneda-Gerês</button><button type="button" data-fit="vet" aria-pressed="false">Vets</button></div></div>`;
}
function divPin(cls,html,size=30){return L.divIcon({className:"",html:`<div class="pin ${cls}">${html}</div>`,iconSize:[size,size],iconAnchor:[size/2,size/2],popupAnchor:[0,-size/2]})}
function popup(title,sub,links){return `<b>${esc(title)}</b>${sub?`<span>${sub}</span>`:""}<div class="pl">${links}</div>`}
async function initMap(){
  if(MAP)return;
  try{await loadLeaflet()}catch(e){$("#map").innerHTML=`<div class="map-off">The map needs a connection the first time it opens. Once it has loaded online, it works offline for the places you've viewed.</div>`;return}
  MAP=L.map("map",{zoomControl:false,attributionControl:true});L.control.zoom({position:"bottomright"}).addTo(MAP);
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,subdomains:"abc",
    attribution:'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM · Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'}).addTo(MAP);
  const all=[], gal=[], pen=[], vet=[];
  Object.values(ROUTES).forEach(line=>{L.polyline(line,{color:"#1D2320",weight:7,opacity:.85,interactive:false}).addTo(MAP);L.polyline(line,{color:"#EDB81C",weight:3,opacity:1,interactive:false}).addTo(MAP)});
  [[COSTA,"20–25 Nov · 5 nights",gal],[LAMAS,"25–29 Nov · 4 nights",pen]].forEach(([c,s,grp])=>{
    const m=L.marker(c.ll,{icon:divPin("camp",IC.moon,34),zIndexOffset:300}).bindPopup(()=>popup(c.name,s,driveLink(c.ll,c.q))).addTo(MAP);
    all.push(c.ll);grp.push(c.ll);
  });
  DAYS.forEach(d=>{
    const cls=d.base==="gal"?"gal":d.base==="pen"?"pen":"road", f=fd(d.date);
    const add=(x,key,isOpt)=>{if(!x.ll)return;
      const m=L.marker(x.ll,{icon:divPin(cls+(isOpt?" opt":""),d.n),zIndexOffset:isOpt?0:500})
       .bindPopup(()=>popup(x.name,`Day ${d.n}, ${f.W} ${f.d}${isOpt?" · option":""}${x.km?` · ${x.km} km`:""}`,`<a href="#day${d.n}">Day page</a>${driveLink(x.ll,x.mq)}`)).addTo(MAP);
      MARK[key]=m;all.push(x.ll);if(d.n<=5)gal.push(x.ll);else if(d.base==="pen")pen.push(x.ll);
    };
    d.hikes.forEach((h,i)=>add(h,`h-${d.n}-${i}`,!!h.opt));
    (d.extra||[]).forEach((x,i)=>add(x,`x-${d.n}-${i}`,false));
    (d.soak?d.soak.list:[]).forEach((k,i)=>{const o=SOAKS[k];add({name:o.name,ll:o.ll,mq:o.q},`s-${d.n}-${i}`,true)});
  });
  PLACES.forEach(([k,name,ll,q,note])=>{
    L.marker(ll,{icon:divPin("dot "+k,"",18)}).bindPopup(()=>popup(name,esc(note),driveLink(ll,q))).addTo(MAP);
  });
  Object.values(VETS).forEach(v=>{
    L.marker(v.ll,{icon:divPin("vet"+(is24(v)?"":v.kind==="oncall"?" oncall":" day"),"+",28)})
     .bindPopup(()=>popup(v.name,esc((v.chain?v.chain+" · ":"")+hoursText(v)),`<a href="tel:${v.tel[0][0]}">Call</a>${driveLink(v.ll,v.q)}`)).addTo(MAP);
    vet.push(v.ll);
  });
  surfDays().forEach(d=>{const b=SURF[d.surf.b];L.marker(b.ll,{icon:divPin("dot surf","",18)}).bindPopup(()=>popup(b.name,`Surf · ${fd(d.date).w} ${fd(d.date).d}`,`<a href="#surf${d.n}">Session</a>${driveLink(b.ll,b.q)}`)).addTo(MAP)});
  Object.values(OUTLETS).forEach(o=>o.ll&&L.marker(o.ll,{icon:divPin("dot","",18)}).bindPopup(()=>popup(o.name,"Outlet, optional",driveLink(o.ll,o.q))).addTo(MAP));
  GROUPS={all:all.concat([[39.36195,-9.15715]]),gal,pen,vet};
}
function fitTo(k){
  if(!MAP)return;
  document.querySelectorAll("[data-fit]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.fit===k));
  MAP.fitBounds(L.latLngBounds(GROUPS[k]),{padding:[40,40],paddingTopLeft:[30,70]});
}
async function showMap(arg){
  if(!$("#map"))renderMapShell();
  await initMap();
  if(!MAP)return;
  MAP.invalidateSize();
  if(arg&&MARK[arg]){const m=MARK[arg];MAP.setView(m.getLatLng(),14);setTimeout(()=>m.openPopup(),150);document.querySelectorAll("[data-fit]").forEach(b=>b.setAttribute("aria-pressed","false"))}
  else if(!showMap.done)fitTo("all");
  showMap.done=true;
}

/* ================= Lists ================= */
function listHTML(l){
  const done=doneOf(l);
  return `<details class="list" id="list-${l.id}"><summary><span class="lt">${esc(l.title)}</span><span class="count">${done}/${l.items.length}</span><span class="ls">${esc(l.sub)}</span><span class="meter"><i style="width:${100*done/l.items.length}%"></i></span></summary>
   <div class="items">${l.items.map(([t,s],i)=>`<label class="item" for="c-${l.id}-${i}"><input type="checkbox" id="c-${l.id}-${i}" data-key="${esc(tickKey(l,t))}"${checks[tickKey(l,t)]?" checked":""}><span>${esc(t)}${s?`<small>${esc(s)}</small>`:""}</span></label>`).join("")}</div>
   <div class="list-foot"><button class="reset" type="button" data-reset="${l.id}">Clear list</button></div></details>`;
}
function renderLists(){
  $("#v-lists").innerHTML=`<div class="sec-head"><h2 class="title">Checklists</h2><p class="sub">Ticks are saved on this phone. Clear "Every hike morning" at the end of each day.</p></div><div class="stack">${LISTS.map(listHTML).join("")}</div>`;
}
function refreshList(id){
  const l=LISTS.find(z=>z.id===id),el=document.getElementById("list-"+id);if(!l||!el)return;
  const done=doneOf(l);
  el.querySelector(".count").textContent=done+"/"+l.items.length;
  el.querySelector(".meter i").style.width=(100*done/l.items.length)+"%";
}

/* ================= Vets ================= */
const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const toMin=t=>+t.slice(0,2)*60+ +t.slice(3,5);
const dur=m=>m<60?m+" min":Math.floor(m/60)+" h"+(m%60?" "+String(m%60).padStart(2,"0"):"");
function nowIn(tz){ // weekday and minutes in the clinic's local time; ?date=…&time=HH:MM previews a moment
  const q=new URLSearchParams(location.search),od=q.get("date"),ot=q.get("time");
  if(od&&/^\d{4}-\d\d-\d\d$/.test(od))return{dow:new Date(od+"T12:00:00Z").getUTCDay(),min:ot&&/^\d\d:\d\d$/.test(ot)?toMin(ot):12*60};
  try{const p={};new Intl.DateTimeFormat("en-GB",{timeZone:tz==="pt"?"Europe/Lisbon":"Europe/Madrid",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);
    return{dow:DOW.indexOf(p.weekday),min:+p.hour*60+ +p.minute}}
  catch(e){const d=new Date();return{dow:d.getDay(),min:d.getHours()*60+d.getMinutes()}}
}
const clock=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const is24=v=>v.kind==="h24"||v.kind==="er";
function hoursText(v){
  if(v.kind==="h24")return"Open 24 h, every day";
  const days=v.hrs.map((h,i)=>h&&[i,h.join("–")]).filter(Boolean), out=[];
  days.forEach(([i,h])=>{const last=out[out.length-1];if(last&&last.h===h&&last.to===i-1)last.to=i;else out.push({from:i,to:i,h})});
  const txt=out.map(o=>(o.from===o.to?DOW[o.from]:DOW[o.from]+"–"+DOW[o.to])+" "+o.h).join(" · ");
  return txt+(v.kind==="er"?" · emergencies 24 h":v.kind==="oncall"?" · on-call vet 24 h":"");
}
function vetStatus(v,drive){
  if(v.kind==="h24")return{ok:true,cls:"on",txt:"Open 24 h"};
  const {dow,min}=nowIn(v.tz), h=v.hrs[dow], open=!!h&&min>=toMin(h[0])&&min<toMin(h[1]);
  if(open&&(v.kind!=="clinic"||min+drive<=toMin(h[1])))return{ok:true,cls:"on",txt:"Open until "+h[1]};
  if(v.kind==="er")return{ok:true,cls:"on",txt:"Emergencies only now"};
  if(v.kind==="oncall")return{ok:true,cls:"call",txt:"On-call vet, phone first"};
  if(open)return{ok:false,cls:"off",txt:"Closes "+h[1]+", before you'd arrive"};
  for(let i=0;i<8;i++){const d=(dow+i)%7,x=v.hrs[d];if(x&&(i>0||min<toMin(x[0])))return{ok:false,cls:"off",txt:"Closed · opens "+(i===0?"at":i===1?"tomorrow":DOW[d])+" "+x[0]}}
  return{ok:false,cls:"off",txt:"Closed"};
}
let VFROM=null;
function vetFromDefault(){ // where you probably are, from the trip day and the hour
  const d=DAYS.find(x=>x.date===T), h=nowIn("es").min/60, day=h>=9&&h<17;
  if(!d)return T>END?"lamas":"costa";
  if(d.n===4&&day)return"eume"; if(d.n===5&&day)return"ezaro"; if(d.n===8&&day)return"albergaria";
  if(d.n===6)return h<10?"costa":h<15?"barosa":"lamas";
  return d.n<=5?"costa":"lamas";
}
const vetTags=v=>(is24(v)?`<span class="vtag h">24 h</span>`:v.kind==="oncall"?`<span class="vtag k">24 h on call</span>`:`<span class="vtag k">Clinic hours</span>`)+(v.chain?`<span class="vtag c">${v.chain}</span>`:"");
const vetTels=(v,first)=>v.tel.map(([n,l],i)=>`<a class="btn tel${first&&i===0?" solid":""}" href="tel:${n}">${IC.phone}${esc(l)}</a>`).join("");
function vetsHTML(){
  const from=VFROM||vetFromDefault(), fromLabel=VET_FROM.find(f=>f[0]===from)[1];
  const L=Object.values(VETS).map(v=>({v,m:v.dr[from],s:vetStatus(v,v.dr[from])})).sort((a,b)=>a.m-b.m);
  const open=L.filter(x=>x.s.ok), best=open[0], best24=L.find(x=>is24(x.v)), now=nowIn("es");
  const others=open.filter(x=>x!==best).slice(0,2);
  return `<div class="vnow">
   <div class="vnow-k">Nearest open now · ${DOW[now.dow]} ${clock(now.min)} in Spain</div>
   <h3 class="h3">${esc(best.v.name)}</h3><div>${vetTags(best.v)}</div>
   <p>${esc(best.v.town)} · about <b>${dur(best.m)}</b> from ${esc(fromLabel)} · <span class="st-${best.s.cls}">${best.s.txt}</span></p>
   ${best.v.kind==="oncall"?`<p>${esc(best.v.note)}</p>`:""}
   <div class="btns">${vetTels(best.v,true)}${drive(best.v.ll,best.v.q)}</div>
   ${!is24(best.v)&&best24?`<p class="vnext">Nearest 24 h hospital: <b>${esc(best24.v.name)}</b>, ${dur(best24.m)}</p>`:""}
   ${others.length?`<p class="vnext">Also open: ${others.map(x=>`${esc(x.v.name)}, ${dur(x.m)}`).join(" · ")}</p>`:""}
  </div>
  <label class="vfrom">Drive times from <select data-vfrom aria-label="Drive times from">${VET_FROM.map(([k,l])=>`<option value="${k}"${k===from?" selected":""}>${esc(l)}</option>`).join("")}</select></label>
  <div class="vlist">${L.map(({v,m,s})=>`<details class="vrow"><summary><span class="vdot ${is24(v)?"r":v.kind==="oncall"?"o":""}" aria-hidden="true"></span>
    <span class="vn"><b>${esc(v.name)}</b>${v.chain?`<span class="vtag c">${v.chain}</span>`:""}<small>${esc(v.town)} · <span class="st-${s.cls}">${s.txt}</span></small></span><span class="vt">${dur(m)}</span></summary>
    <div class="vbody"><p>${hoursText(v)}</p><p class="mut">${esc(v.addr)}</p>${v.note?`<p>${esc(v.note)}</p>`:""}
    <div class="btns">${vetTels(v,false)}${drive(v.ll,v.q)}${v.web?ext(v.web,"Website"):""}</div></div></details>`).join("")}</div>
  <p class="foot"><span class="vdot r"></span> 24 h emergencies <span class="vdot o"></span> on-call vet <span class="vdot"></span> clinic hours only. Hours are local time (Spain is an hour ahead). Drive times are estimates, so check Maps.</p>`;
}
function refreshVets(){const el=document.getElementById("vets");if(el)el.innerHTML=vetsHTML()}

/* ================= Info ================= */
function renderInfo(){
  $("#v-info").innerHTML=`<div class="sec-head"><h2 class="title">Field notes</h2><p class="sub">Campsites, vets, insurance, power and the practical details.</p></div>
  <div class="panel navpick"><div><h3 class="h3">Drive there opens in</h3><p class="sub">Every Drive there button in the app uses this. Apple Maps is always on the iPhone. Google Maps and Waze open their app if you have it installed, otherwise the website or the App Store. Waze also warns about police, hazards and traffic reported by other drivers.</p></div>
   <div class="seg" role="group" aria-label="Maps app for directions"><button type="button" data-nav="google" aria-pressed="${NAV==="google"}">Google</button><button type="button" data-nav="apple" aria-pressed="${NAV==="apple"}">Apple</button><button type="button" data-nav="waze" aria-pressed="${NAV==="waze"}">Waze</button></div></div>
  <div class="stack"><h2 class="h2">Campsites</h2><div class="cards">
   <div class="card"><span class="k">20–25 Nov, 5 nights</span><h3 class="h3">Camping Costa da Morte</h3>
    <dl class="kv"><dt>Address</dt><dd>Lugar de Andregalla 1, Lamas, 15851 Zas (A Coruña)</dd><dt>GPS</dt><dd class="num">43.11553, -8.92816</dd><dt>Contact</dt><dd>Lucia (by phone, 20 Nov). Email tudiras@campingcostadamorte.com</dd><dt>Your pitch</dt><dd>Pitch 8, caravan/camper area 2 (gravel). Ask whether the tent can go on the grass area instead.</dd><dt>Gate code</dt><dd><b class="num" style="font-size:22px">${esc(GATE.code)}</b></dd><dt>Access</dt><dd>The e-key link is in the booking email ("Códigos de acceso"). They open the entrance and exit sliding gates, the main pedestrian gate and river gates 1 and 2. The email only gives access from 20 Nov 16:00 to 21 Nov 11:00, so check that it gets extended.</dd><dt>Open</dt><dd>All year. Low-season reception 14:30–18:30. Check-in from 16:00, check-out by 11:00. Quiet hours 23:00–08:00.</dd><dt>Pitch</dt><dd>Tent area of over 1,000 m² beside the Río de Lamas. Low-season tent pack €25 a night: up to 4 people, 1 tent, 1 car and electricity included.</dd><dt>Dog walks</dt><dd>Mostly flat farm tracks start about 30 m from camp, with the river beside them. A good 10–15 min morning loop. For a longer forest walk, Ruta da Auga (PR-G 250) is 15 min away: see Sunday.</dd><dt>Dogs</dt><dd>€5 each a night. The rate card says max 2 pets, so check that all four are OK.</dd><dt>On site</dt><dd>Hot showers, laundry, small shop, vending area with microwave and coffee machine, washing-up sinks, dog wash, Wi-Fi. Bread delivered daily. The food truck only opens in summer.</dd><dt>Nearby</dt><dd>Baio 7 min (Gadis, Dia). Vimianzo 18 min. Carballo 30 min. Santiago about 45 min.</dd></dl>
    <div class="btns">${tel("+34608425750","+34 608 425 750")}${drive(COSTA.ll,COSTA.q)}${ext("https://campingcostadamorte.com","Website")}</div></div>
   <div class="card"><span class="k">25–29 Nov, 4 nights</span><h3 class="h3">Lamas de Mouro</h3>
    <dl class="kv"><dt>Address</dt><dd>Veigas de Lama, 4960-170 Lamas de Mouro, Melgaço</dd><dt>GPS</dt><dd class="num">42.03582, -8.19608</dd><dt>Altitude</dt><dd>About 900 m, so frost is likely</dd><dt>Open</dt><dd>All year. Dogs allowed, dog park on site.</dd><dt>Park gate</dt><dd>Porta de Lamas de Mouro (trails and info)</dd></dl>
    <div class="btns">${tel("+351251466041","Campsite 251 466 041")}${tel("+351251465010","Park gate 251 465 010")}${drive(LAMAS.ll,LAMAS.q)}${ext("https://www.pitchup.com/en-au/campsites/portugal/viana_do_castelo/melgaco/lamas_de_mouro/parque-de-campismo-lamas-de-mouro","Pitchup")}</div></div>
  </div></div>
  <div class="stack"><div class="sec-head"><h2 class="h2">Vets</h2><p class="sub">Spain or Portugal, whichever is faster. Phone first so they're ready for you. Emergency in either country: 112.</p></div>
  <div class="btns">${tel("112","Call 112")}<a class="btn" href="#map/vet" data-fit-vet>${IC.pin}Vets on the map</a></div>
  <div id="vets">${vetsHTML()}</div>
  <div class="card"><span class="k">Peneda, something minor</span><h3 class="h3">Ask locally</h3><p>Melgaço has no vet listed. The nearest clinics are in Monção (about 35 min). For a non-urgent problem, ask campsite reception or the park gate which vet locals use.</p>
    <div class="btns">${tel("+351251465010","Park gate 251 465 010")}</div></div></div>
  <div class="card"><span class="k">Your pet insurance</span><h3 class="h3">Fidelidade Pets</h3><ul class="tight">
   <li><b>Spain is covered</b> for Vetcare, surgery and civil liability ("Na Europa"). Pay the Spanish vet, keep the itemised invoice, and claim reimbursement: Fidelidade pays 70% up to your cover limits.</li>
   <li><b>Portugal only:</b> Telepet (vet video/phone advice, daily 07:00–22:00), Pet Assistance, vaccines and check-ups.</li>
   <li>Network vets are at <a href="https://www.mypets.pt" target="_blank" rel="noopener">mypets.pt</a>. Check for one near Monção or Melgaço before you go.</li>
   <li>Support (working days 09:00–20:00) and English line (Mon–Fri 09:00–18:00):<div class="btns" style="margin-top:8px">${tel("+351217948701","217 94 87 01")}${tel("+351217948745","English 217 94 87 45")}</div></li>
   <li>Your own policy wording is what counts. Confirm Vetcare is on your plan.</li></ul></div>
  <div class="stack"><h2 class="h2">Power and cold nights</h2><div class="cards">
   <div class="card"><h3 class="h3">Hook-up</h3><ul class="tight"><li>Ask both campsites for an electric pitch and <b>how many amps</b>.</li><li>Rough total for the whole pitch: <span class="num">6 A ≈ 1,380 W, 10 A ≈ 2,300 W, 16 A ≈ 3,680 W</span>.</li><li>Blue CEE 17 cable, 25 m, fully unrolled when in use. A coiled cable heats up.</li><li>Socket box with RCD. Keep connections off wet ground.</li></ul></div>
   <div class="card"><h3 class="h3">At 900 m in November</h3><ul class="tight"><li>Lift the dogs' beds off the tent floor with insulated mats. Coats for the older two at night.</li><li>Leave a vent open to cut condensation. Wipe the inner each morning.</li><li>Keep drinking water inside so it doesn't freeze. Drive slowly on frosty mornings.</li><li>Typical nights here in late November are around ${CLIMATE.lamas.lo}°C, colder than the Galicia camp (${CLIMATE.costa.lo}°C).</li></ul></div>
  </div></div>
  <div class="stack"><div class="sec-head"><h2 class="h2">Outlet shopping</h2><p class="sub">El Corte Inglés outlets: Porriño on Friday's drive north, then two near A Coruña, about 55 min from the Galicia camp. Spanish shops close on Sunday, so go to those on Saturday 21 or Tuesday 24.</p></div>
  <div class="cards">${outletCard("porrino")}${outletCard("altamira")}${outletCard("coruna")}</div></div>
  <div class="stack"><div class="sec-head"><h2 class="h2">Daylight</h2><p class="sub">Walks are planned to finish by about 16:30.</p></div>
  <div class="panel"><div class="tbl"><table><thead><tr><th>Place</th><th>Date</th><th>Sunrise</th><th>Sunset</th><th>Last light</th></tr></thead><tbody>
   <tr><td>Costa da Morte (ES)</td><td>20 Nov</td><td>08:35</td><td>18:07</td><td>18:38</td></tr>
   <tr><td>Costa da Morte (ES)</td><td>25 Nov</td><td>08:40</td><td>18:04</td><td>18:36</td></tr>
   <tr><td>Lamas de Mouro (PT)</td><td>25 Nov</td><td>07:34</td><td>17:04</td><td>17:35</td></tr>
   <tr><td>Lamas de Mouro (PT)</td><td>29 Nov</td><td>07:39</td><td>17:02</td><td>17:34</td></tr></tbody></table></div></div></div>
  <div class="cards">
   <div class="card"><span class="k">Food</span><h3 class="h3">Supermarkets</h3><dl class="kv"><dt>Galicia</dt><dd>Gadis and Dia in Baio, 7 min from camp. Eroski and Gadis in Vimianzo, 18 min (Mon–Sat 09:00–21:00). Carrefour Oca in Coristanco, 25 min, open Sunday 10:00–22:00.</dd><dt>Peneda</dt><dd>Intermarché Melgaço, Lugar do Galvão, 25 min from camp</dd><dt>Note</dt><dd>Spanish shops often close or open briefly on Sundays. Do the big shop on Saturday.</dd></dl>
    <div class="btns">${drive([43.14996,-8.95305],"Gadis Baio Zas","Gadis Baio")}${drive([43.19572,-8.72394],"Carrefour Oca Coristanco","Carrefour Oca")}${drive([42.10934,-8.26153],"Intermarché Melgaço","Intermarché Melgaço")}</div></div>
   <div class="card"><span class="k">Check each evening</span><h3 class="h3">Forecasts and trails</h3><div class="btns">${ext("https://www.meteogalicia.gal","MeteoGalicia")}${ext("https://www.ipma.pt","IPMA")}${ext("https://patrimonionatural.xunta.gal/es/node/46","Eume route status")}${ext("https://discovermelgaco.pt/trilhos/","Melgaço trails")}</div><p style="font-size:15px;color:var(--muted)">On high fire-risk days, trails in the national park can be closed. That's unlikely in November, but it's in the rules.</p></div>
   <div class="card"><span class="k">Four dogs</span><h3 class="h3">Trail rules of thumb</h3><ul class="tight"><li>Leads on in the national park and near livestock. Cattle and working dogs roam freely around Castro Laboreiro.</li><li>Avoid swollen rivers, cliff edges and wet granite slabs.</li><li>Galician beaches: check the signs. Many don't allow dogs.</li><li>Check for ticks every evening. Towel off paws before the tent.</li></ul></div>
  </div>
  <div class="stack"><h2 class="h2">Sources</h2>
   <p class="foot">Trail stats come from the Wikiloc tracks in your earlier plan and the official Melgaço PR route sheets. Drive times are estimates, so check Maps on the day. Weather: Open-Meteo. Map: OpenTopoMap and OpenStreetMap, with driving lines from OSRM.</p>
   <div class="credits"><span>Photos from Wikimedia Commons:</span>${Object.entries(CREDITS).map(([k,[a,l,u]])=>`<span><a href="${u}" target="_blank" rel="noopener">${esc(a)}</a>, ${esc(l)}</span>`).join("")}<span>Verdes and Buçaco photos from your original page.</span></div></div>`;
}

/* ================= Routing ================= */
let lastView=null;
function route(keep){
  const h=decodeURIComponent((location.hash||"").slice(1));
  let v="today", day=null, mapArg=null;
  if(["today","plan","lists","info","map"].includes(h))v=h;
  const m=h.match(/^day(\d+)$/);if(m){day=DAYS.find(d=>d.n===+m[1]);if(day)v="day"}
  const mm=h.match(/^map\/(.+)$/);if(mm){v="map";mapArg=mm[1]}
  const ms=h.match(/^surf(\d+)$/);let sday=null;if(ms){sday=DAYS.find(d=>d.n===+ms[1]&&d.surf);if(sday)v="surf"}
  if(keep===true){renderToday();renderPlan()}
  if(v==="day")$("#v-day").innerHTML=dayDetail(day);
  if(v==="surf")renderSurf(sday);
  renderTop(v);
  document.querySelectorAll("[data-view]").forEach(s=>s.hidden=s.dataset.view!==v);
  const tab=v==="day"?"plan":v==="surf"?(sday.date===T?"today":"plan"):v;
  document.querySelectorAll("[data-tab]").forEach(a=>{if(a.dataset.tab===tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  if(keep!==true)window.scrollTo(0,0);
  if(v==="map")showMap(mapArg).then(()=>{if(mapArg==="vet")fitTo("vet")});
  lastView=v;
}

/* ================= Events ================= */
document.addEventListener("change",e=>{if(e.target.matches("[data-vfrom]")){VFROM=e.target.value;refreshVets();document.querySelector("[data-vfrom]").focus();return}const k=e.target.dataset&&e.target.dataset.key;if(!k)return;if(e.target.checked)checks[k]=1;else delete checks[k];save();refreshList(k.split(":")[0]);renderToday()});
document.addEventListener("click",e=>{
  const f=e.target.closest("[data-fit]");if(f){fitTo(f.dataset.fit);return}
  const hb=e.target.closest("[data-here]");if(hb){routeFromHere(hb.dataset.here,hb);return}
  const nv=e.target.closest("[data-nav]");if(nv){NAV=nv.dataset.nav;try{localStorage.setItem(NAVKEY,NAV)}catch(err){}renderInfo();route(true);const b=document.querySelector(`[data-nav="${NAV}"]`);if(b)b.focus();return}
  const r=e.target.closest("[data-reset]");
  if(r){if(!r.hasAttribute("data-armed")){r.setAttribute("data-armed","");r.textContent="Tap again to clear";setTimeout(()=>{r.removeAttribute("data-armed");r.textContent="Clear list"},3000);return}
    const id=r.dataset.reset;Object.keys(checks).forEach(k=>{if(k.startsWith(id+":"))delete checks[k]});save();
    document.querySelectorAll(`#list-${id} input`).forEach(i=>i.checked=false);refreshList(id);renderToday();r.removeAttribute("data-armed");r.textContent="Clear list";return}
  const o=e.target.closest("[data-open]");if(o)setTimeout(()=>{const d=document.getElementById("list-"+o.dataset.open);if(d){d.open=true;d.scrollIntoView({block:"start"})}},40);
});
window.addEventListener("hashchange",()=>route());
window.addEventListener("online",()=>{loadWeather();loadSurf()});
setInterval(()=>{loadWeather();loadSurf()},30*60000);
setInterval(()=>{refreshVets();refreshTiles()},60000);document.addEventListener("visibilitychange",()=>{if(!document.hidden){refreshVets();refreshTiles()}});

/* ================= Boot ================= */
renderToday();renderPlan();renderLists();renderInfo();
route();
loadWeather();loadSurf();
if(navigator.permissions&&navigator.permissions.query)navigator.permissions.query({name:"geolocation"}).then(st=>{if(st.state!=="granted")return;const d=DAYS.find(z=>z.date===T&&z.surf);if(d)routeFromHere(d.surf.b)}).catch(()=>{});
})();
