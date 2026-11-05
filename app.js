/* Forests & Waterfalls 2026 — renders data.js into the phone guide. */
(function(){
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const maps=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
const ext=(href,label,cls="")=>`<a class="btn ${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
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
const SPOT={nevedas:NEVEDAS.ll,lamas:LAMAS.ll};
const llOf=d=>Array.isArray(d.wx)?d.wx:SPOT[d.wx]||NEVEDAS.ll;
const climateOf=d=>CLIMATE[d.base==="pen"||d.sleep===LAMAS?"lamas":"nevedas"];
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
const placeName=d=>{const ll=llOf(d);return d.wx==="nevedas"?"As Nevedas":d.wx==="lamas"?"Lamas de Mouro":(d.hikes.find(h=>h.ll&&h.ll[0]===ll[0])||{name:"the trailhead"}).name.split(" · ")[0]};
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
const doneOf=l=>l.items.filter((_,i)=>checks[l.id+":"+i]).length;

/* ================= Header ================= */
function renderTop(view){
  const top=$("#top");
  if(view!=="today"){top.className="bar";top.innerHTML=`<div class="wrap"><i class="wm" aria-hidden="true"></i><span>Forests &amp; Waterfalls</span><span>20–29 Nov</span></div>`;return}
  let photo="eumeRiver", line;
  if(T<START){const n=diff(T,START);line=n===1?`Leaving <b>tomorrow</b>, Friday 20 November after lunch.`:`Leaving in <b>${n} days</b>, Friday 20 November after lunch.`}
  else if(T<=END){const d=DAYS.find(z=>z.date===T);line=`Day <b>${d.n}</b> of 10: ${esc(d.title)}.`}
  else line=`Home again. <b>Dry the tent.</b>`;
  const c=CREDITS[photo];
  top.className="hero";
  top.innerHTML=`<img src="${img(photo)}" alt="">${c?`<a class="credit" href="${c[2]}" target="_blank" rel="noopener">Photo: ${esc(c[0])}</a>`:""}
   <div class="wrap"><h1><span>Forests &amp;</span><span>Waterfalls</span></h1>
   <div class="route"><span>Óbidos</span><i class="wm"></i><span>Costa da Morte</span><i class="wm"></i><span>Peneda-Gerês</span><i class="wm"></i><span>Óbidos</span></div>
   <p class="when">${line}</p></div>`;
}

/* ================= Day page ================= */
function credit(k){const c=CREDITS[k];return c?`<p class="ph-credit">Photo: <a href="${c[2]}" target="_blank" rel="noopener">${esc(c[0])}</a>, ${esc(c[1])}</p>`:""}
function hikeHTML(h,d,i){
  const links=[];
  if(h.wl)links.push(ext(h.wl,esc(h.wlLabel||"Wikiloc track")));
  if(h.src)links.push(ext(h.src,esc(h.srcLabel||"Official route sheet")));
  (h.warn||[]).forEach(([t,u])=>links.push(ext(u,esc(t),"warn")));
  links.push(ext(maps(h.mq),"Trailhead in Maps"));
  if(h.ll)links.push(`<a class="btn" href="#map/h-${d.n}-${i}">${IC.pin}On the map</a>`);
  return `<article class="hike"><div class="ph">${h.photo?`<img src="${img(h.photo)}" alt="" loading="lazy">`:""}${h.opt?`<span class="flag"><i class="wm-turn" aria-hidden="true"></i>${esc(h.opt)}</span>`:""}</div><div class="bd">
   <h4>${esc(h.name)}</h4>
   <div class="stats"><div><b>${h.km}</b><small>km</small></div><div><b>${h.gain===null?"–":h.gain}</b><small>m climb</small></div><div><b class="s">${esc(h.time)}</b><small>time</small></div><div><b class="s">${esc(h.type)}</b><small>type</small></div></div>
   <p>${esc(h.text)}</p><div class="btns">${links.join("")}</div>${credit(h.photo)}</div></article>`;
}
function extraHTML(x){
  return `<article class="hike"><div class="ph"><img src="${img(x.photo)}" alt="" loading="lazy"></div><div class="bd"><h4>${esc(x.name)}</h4><p>${esc(x.text)}</p>
   <div class="btns">${ext(maps(x.mq),"Directions")}</div>${credit(x.photo)}</div></article>`;
}
const noteIcon=k=>k==="warn"?'<i class="wm-x" aria-hidden="true"></i>':'<i class="wm" aria-hidden="true"></i>';
function dayDetail(d,opts={}){
  const f=fd(d.date), i=DAYS.indexOf(d), prev=DAYS[i-1], next=DAYS[i+1], km=kmOf(d), cov=coverOf(d);
  const nav=opts.nav===false?"":`<div class="nav"><a class="chipnav" href="#day${prev?prev.n:d.n}" ${prev?"":'aria-disabled="true"'}>${IC.l}${prev?"Day "+prev.n:"Start"}</a>
    <a class="chipnav" href="#plan">All days</a>
    <a class="chipnav" href="#day${next?next.n:d.n}" ${next?"":'aria-disabled="true"'}>${next?"Day "+next.n:"End"}${IC.r}</a></div>`;
  const main=d.hikes.map((h,k)=>[h,k]).filter(([h])=>!h.opt), opt=d.hikes.map((h,k)=>[h,k]).filter(([h])=>h.opt);
  const bcls=d.base==="gal"?"gal":d.base==="pen"?"pen":"road";
  return `<div class="dayhero"><img src="${img(cov)}" alt="">${nav}
    <div class="in"><span class="when">${d.date===T?'<i class="wm"></i>Today, ':""}${f.W} ${f.d} November · Day ${d.n} of 10</span><h2>${esc(d.title)}</h2></div></div>
  <div class="facts-row"><span class="fact ${bcls}">${baseLabel(d.base)}</span>${km?`<span class="fact">${km.toFixed(1)} km walking</span>`:""}${d.notes.some(n=>n[0]==="surf")?'<span class="fact">Surf slot</span>':""}</div>
  <p class="lede">${esc(d.lede)}</p>
  ${wxCard(d)}
  <div class="drive">${IC.car}<div><b>Driving</b>${esc(d.drive)}</div></div>
  <div class="stack"><h3 class="h3">The day</h3><ul class="tl">${d.timeline.map(([t,s])=>`<li><span class="t">${esc(t)}</span><span>${esc(s)}</span></li>`).join("")}</ul></div>
  ${main.length?`<div class="stack"><h3 class="h3">${main.length>1?"The walks":"The walk"}</h3>${main.map(([h,k])=>hikeHTML(h,d,k)).join("")}</div>`:""}
  ${d.extra?`<div class="stack"><h3 class="h3">Also today</h3>${d.extra.map(extraHTML).join("")}</div>`:""}
  ${opt.length?`<div class="stack"><h3 class="h3">If you want to swap</h3>${opt.map(([h,k])=>hikeHTML(h,d,k)).join("")}</div>`:""}
  ${d.notes.map(([k,t,s])=>`<div class="note ${k}">${noteIcon(k)}<b>${esc(t)}</b><span>${esc(s)}</span></div>`).join("")}
  ${d.shops?`<div class="stack"><h3 class="h3">Outlet stop, optional</h3><div class="note shop">${noteIcon()}<b>Gear deals</b><span>${esc(d.shops.intro)}</span></div><div class="cards">${d.shops.list.map(outletCard).join("")}</div></div>`:""}
  ${d.sleep?`<div class="sleep">${IC.tent}<span><small>${esc(d.night)}</small><a href="${maps(d.sleep.q)}" target="_blank" rel="noopener">${esc(d.sleep.name)}</a></span></div>`:`<div class="sleep">${IC.home}<span><small>Night 10</small>${esc(d.night)}</span></div>`}`;
}
function outletCard(k){const o=OUTLETS[k];return `<div class="card"><span class="k">${esc(o.tag)}</span><h3 class="h3">${esc(o.name)}</h3><p>${esc(o.addr)}</p><p style="color:var(--muted);font-size:15px">${esc(o.info)}</p>
  <div class="btns">${o.tel?tel(o.tel[1],o.tel[0]):""}${ext(maps(o.q),"Directions")}${o.page?ext(o.page,"Store page"):""}</div></div>`}

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
   <div class="leg"><div class="leg-head"><h2 class="h2">Costa da Morte</h2><span class="sub">5 nights at Camping As Nevedas, Carballo</span></div><ol class="trail">${gal.map(stopHTML).join("")}</ol></div>
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
function renderToday(){
  let h;
  const outlookNote=`<p class="wx-note">Live forecast from Open-Meteo where it reaches. Dashed days show what's typical for late November until the forecast covers them.</p>`;
  if(T<START){
    h=`<div class="stack"><h2 class="h2">The ten days ahead</h2>${wxStrip(DAYS)}${outlookNote}</div>
     ${progBlock(LISTS[0],"Before you go")}
     <div class="stack"><h2 class="h2">How Friday goes</h2></div>${dayDetail(DAYS[0],{nav:false})}`;
  }else if(T<=END){
    const i=DAYS.findIndex(z=>z.date===T), rest=DAYS.slice(i);
    h=`${rest.length>1?`<div class="stack"><h2 class="h2">Days left</h2>${wxStrip(rest)}</div>`:""}
     ${progBlock(LISTS.find(l=>l.id==="hikeday"),"Every hike morning")}
     ${dayDetail(DAYS[i],{nav:false})}
     ${DAYS[i+1]?`<div class="stack"><h2 class="h2">Tomorrow</h2><ol class="trail">${stopHTML(DAYS[i+1])}</ol></div>`:""}`;
  }else{
    h=`<div class="sec-head"><h2 class="title">Welcome home</h2><p class="sub">The after-trip list keeps the gear ready for next time.</p></div>${progBlock(LISTS.find(l=>l.id==="after"),"After the trip")}
     <div class="btns"><a class="btn" href="#plan">Look back at the plan</a></div>`;
  }
  $("#v-today").innerHTML=h;
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
  [[NEVEDAS,"20–25 Nov · 5 nights",gal],[LAMAS,"25–29 Nov · 4 nights",pen]].forEach(([c,s,grp])=>{
    const m=L.marker(c.ll,{icon:divPin("camp",IC.moon,34),zIndexOffset:300}).bindPopup(popup(c.name,s,`<a href="${maps(c.q)}" target="_blank" rel="noopener">Directions</a>`)).addTo(MAP);
    all.push(c.ll);grp.push(c.ll);
  });
  DAYS.forEach(d=>{
    const cls=d.base==="gal"?"gal":d.base==="pen"?"pen":"road", f=fd(d.date);
    const add=(x,key,isOpt)=>{if(!x.ll)return;
      const m=L.marker(x.ll,{icon:divPin(cls+(isOpt?" opt":""),d.n),zIndexOffset:isOpt?0:500})
       .bindPopup(popup(x.name,`Day ${d.n}, ${f.W} ${f.d}${isOpt?" · option":""}${x.km?` · ${x.km} km`:""}`,`<a href="#day${d.n}">Day page</a><a href="${maps(x.mq)}" target="_blank" rel="noopener">Trailhead</a>`)).addTo(MAP);
      MARK[key]=m;all.push(x.ll);if(d.n<=5)gal.push(x.ll);else if(d.base==="pen")pen.push(x.ll);
    };
    d.hikes.forEach((h,i)=>add(h,`h-${d.n}-${i}`,!!h.opt));
    (d.extra||[]).forEach((x,i)=>add(x,`x-${d.n}-${i}`,false));
  });
  PLACES.forEach(([k,name,ll,q,note])=>{
    const icon=k==="vet"?divPin("vet","+",28):divPin("dot "+k,"",18);
    L.marker(ll,{icon}).bindPopup(popup(name,esc(note),`<a href="${maps(q)}" target="_blank" rel="noopener">Directions</a>`)).addTo(MAP);
    if(k==="vet")vet.push(ll);
  });
  Object.values(OUTLETS).forEach(o=>o.ll&&L.marker(o.ll,{icon:divPin("dot","",18)}).bindPopup(popup(o.name,"Outlet, optional",`<a href="${maps(o.q)}" target="_blank" rel="noopener">Directions</a>`)).addTo(MAP));
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
   <div class="items">${l.items.map(([t,s],i)=>`<label class="item" for="c-${l.id}-${i}"><input type="checkbox" id="c-${l.id}-${i}" data-key="${l.id}:${i}"${checks[l.id+":"+i]?" checked":""}><span>${esc(t)}${s?`<small>${esc(s)}</small>`:""}</span></label>`).join("")}</div>
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

/* ================= Info ================= */
function renderInfo(){
  $("#v-info").innerHTML=`<div class="sec-head"><h2 class="title">Field notes</h2><p class="sub">Campsites, vets, insurance, power and the practical details.</p></div>
  <div class="stack"><h2 class="h2">Campsites</h2><div class="cards">
   <div class="card"><span class="k">20–25 Nov, 5 nights</span><h3 class="h3">Camping As Nevedas</h3>
    <dl class="kv"><dt>Address</dt><dd>Carretera Rapadoiro–Noicela, 15105 Carballo (A Coruña)</dd><dt>GPS</dt><dd class="num">43.29319, -8.62229</dd><dt>Open</dt><dd>All year. Dogs allowed (microchipped).</dd><dt>Nearby</dt><dd>Razo, Baldaio and Caión beaches. Carballo 15 min, A Coruña about 25 min.</dd><dt>Power</dt><dd>Optional. Ask on arrival.</dd></dl>
    <div class="btns">${tel("+34657064733","+34 657 06 47 33")}${ext(maps(NEVEDAS.q),"Directions")}${ext("https://www.pitchup.com/es/campsites/spain/galicia/la-coruna/carballo/camping-as-nevedas/","Pitchup")}</div></div>
   <div class="card"><span class="k">25–29 Nov, 4 nights</span><h3 class="h3">Lamas de Mouro</h3>
    <dl class="kv"><dt>Address</dt><dd>Veigas de Lama, 4960-170 Lamas de Mouro, Melgaço</dd><dt>GPS</dt><dd class="num">42.03582, -8.19608</dd><dt>Altitude</dt><dd>About 900 m, so frost is likely</dd><dt>Open</dt><dd>All year. Dogs allowed, dog park on site.</dd><dt>Park gate</dt><dd>Porta de Lamas de Mouro (trails and info)</dd></dl>
    <div class="btns">${tel("+351251466041","Campsite 251 466 041")}${tel("+351251465010","Park gate 251 465 010")}${ext(maps(LAMAS.q),"Directions")}${ext("https://www.pitchup.com/en-au/campsites/portugal/viana_do_castelo/melgaco/lamas_de_mouro/parque-de-campismo-lamas-de-mouro","Pitchup")}</div></div>
  </div></div>
  <div class="stack"><div class="sec-head"><h2 class="h2">Vets</h2><p class="sub">Phone first so they're ready for you. Emergency in either country: 112.</p></div>
  <div class="btns">${tel("112","Call 112")}<a class="btn" href="#map/vet" data-fit-vet>${IC.pin}Vets on the map</a></div>
  <div class="cards">
   <div class="card"><span class="k">Galicia, nearest</span><h3 class="h3">Hospital Vet. Atlántico<span class="h24">24 h</span></h3><p>Rúa Zaragoza 1, Arteixo (A Coruña). Open 24 h, 365 days a year. Roughly 25–30 min from As Nevedas.</p>
    <div class="btns">${tel("+34881081991","+34 881 081 991")}${ext(maps("Hospital Veterinario Atlántico Rúa Zaragoza 1 Arteixo"),"Directions")}</div></div>
   <div class="card"><span class="k">Galicia, backup</span><h3 class="h3">Hospital Vet. Abeiro<span class="h24">24 h</span></h3><p>Marqués de Amboage 24, A Coruña. Clinic Mon–Fri 10:30–20:00, Sat 10:30–14:00. Emergencies 24 h.</p>
    <div class="btns">${tel("+34981153232","+34 981 153 232")}${ext(maps("Hospital Veterinario Abeiro Marqués de Amboage 24 A Coruña"),"Directions")}</div></div>
   <div class="card"><span class="k">Peneda, nearest 24 h hospital</span><h3 class="h3">Hospital Vet. de Braga<span class="h24">24 h</span></h3><p>Rua de Abraão 63, Maximinos, Braga. Staffed 24 h every day. Roughly 1 h 30 from Lamas de Mouro.</p>
    <div class="btns">${tel("+351253693121","253 693 121")}${ext(maps("Hospital Veterinário de Braga Rua de Abraão 63"),"Directions")}</div></div>
   <div class="card"><span class="k">Peneda, something minor</span><h3 class="h3">Ask locally</h3><p>Melgaço has no vet listed. The nearest clinics are in Monção (about 35 min). For a non-urgent problem, ask campsite reception or the park gate which vet locals use.</p>
    <div class="btns">${tel("+351251465010","Park gate 251 465 010")}</div></div>
  </div></div>
  <div class="card"><span class="k">Your pet insurance</span><h3 class="h3">Fidelidade Pets</h3><ul class="tight">
   <li><b>Spain is covered</b> for Vetcare, surgery and civil liability ("Na Europa"). Pay the Spanish vet, keep the itemised invoice, and claim reimbursement: Fidelidade pays 70% up to your cover limits.</li>
   <li><b>Portugal only:</b> Telepet (vet video/phone advice, daily 07:00–22:00), Pet Assistance, vaccines and check-ups.</li>
   <li>Network vets are at <a href="https://www.mypets.pt" target="_blank" rel="noopener">mypets.pt</a>. Check for one near Monção or Melgaço before you go.</li>
   <li>Support (working days 09:00–20:00) and English line (Mon–Fri 09:00–18:00):<div class="btns" style="margin-top:8px">${tel("+351217948701","217 94 87 01")}${tel("+351217948745","English 217 94 87 45")}</div></li>
   <li>Your own policy wording is what counts. Confirm Vetcare is on your plan.</li></ul></div>
  <div class="stack"><h2 class="h2">Power and cold nights</h2><div class="cards">
   <div class="card"><h3 class="h3">Hook-up</h3><ul class="tight"><li>Ask both campsites for an electric pitch and <b>how many amps</b>.</li><li>Rough total for the whole pitch: <span class="num">6 A ≈ 1,380 W, 10 A ≈ 2,300 W, 16 A ≈ 3,680 W</span>.</li><li>Blue CEE 17 cable, 25 m, fully unrolled when in use. A coiled cable heats up.</li><li>Socket box with RCD. Keep connections off wet ground.</li></ul></div>
   <div class="card"><h3 class="h3">At 900 m in November</h3><ul class="tight"><li>Lift the dogs' beds off the tent floor with insulated mats. Coats for the older two at night.</li><li>Leave a vent open to cut condensation. Wipe the inner each morning.</li><li>Keep drinking water inside so it doesn't freeze. Drive slowly on frosty mornings.</li><li>Typical nights here in late November are around ${CLIMATE.lamas.lo}°C, colder than the coast (${CLIMATE.nevedas.lo}°C).</li></ul></div>
  </div></div>
  <div class="stack"><div class="sec-head"><h2 class="h2">Outlet shopping</h2><p class="sub">El Corte Inglés outlets near the Galicia base. Spanish shops close on Sunday, so go on Saturday 21 or Tuesday 24.</p></div>
  <div class="cards">${outletCard("altamira")}${outletCard("coruna")}</div></div>
  <div class="stack"><div class="sec-head"><h2 class="h2">Daylight</h2><p class="sub">Walks are planned to finish by about 16:30.</p></div>
  <div class="panel"><div class="tbl"><table><thead><tr><th>Place</th><th>Date</th><th>Sunrise</th><th>Sunset</th><th>Last light</th></tr></thead><tbody>
   <tr><td>As Nevedas (ES)</td><td>20 Nov</td><td>08:34</td><td>18:05</td><td>18:37</td></tr>
   <tr><td>As Nevedas (ES)</td><td>25 Nov</td><td>08:40</td><td>18:02</td><td>18:34</td></tr>
   <tr><td>Lamas de Mouro (PT)</td><td>25 Nov</td><td>07:34</td><td>17:04</td><td>17:35</td></tr>
   <tr><td>Lamas de Mouro (PT)</td><td>29 Nov</td><td>07:39</td><td>17:02</td><td>17:34</td></tr></tbody></table></div></div></div>
  <div class="cards">
   <div class="card"><span class="k">Food</span><h3 class="h3">Supermarkets</h3><dl class="kv"><dt>Galicia</dt><dd>Lidl Carballo, Avda. Bértoa s/n. Gadis Hiper, Avda. Razo s/n.</dd><dt>Peneda</dt><dd>Intermarché Melgaço, Lugar do Galvão, 25 min from camp</dd><dt>Note</dt><dd>Spanish shops often close or open briefly on Sundays. Do the big shop on Saturday.</dd></dl>
    <div class="btns">${ext(maps("Lidl Carballo"),"Lidl Carballo")}${ext(maps("Intermarché Melgaço"),"Intermarché Melgaço")}</div></div>
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
  if(keep===true){renderToday();renderPlan()}
  if(v==="day")$("#v-day").innerHTML=dayDetail(day);
  renderTop(v);
  document.querySelectorAll("[data-view]").forEach(s=>s.hidden=s.dataset.view!==v);
  const tab=v==="day"?"plan":v;
  document.querySelectorAll("[data-tab]").forEach(a=>{if(a.dataset.tab===tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  if(keep!==true)window.scrollTo(0,0);
  if(v==="map")showMap(mapArg).then(()=>{if(mapArg==="vet")fitTo("vet")});
  lastView=v;
}

/* ================= Events ================= */
document.addEventListener("change",e=>{const k=e.target.dataset&&e.target.dataset.key;if(!k)return;if(e.target.checked)checks[k]=1;else delete checks[k];save();refreshList(k.split(":")[0]);renderToday()});
document.addEventListener("click",e=>{
  const f=e.target.closest("[data-fit]");if(f){fitTo(f.dataset.fit);return}
  const r=e.target.closest("[data-reset]");
  if(r){if(!r.hasAttribute("data-armed")){r.setAttribute("data-armed","");r.textContent="Tap again to clear";setTimeout(()=>{r.removeAttribute("data-armed");r.textContent="Clear list"},3000);return}
    const id=r.dataset.reset;Object.keys(checks).forEach(k=>{if(k.startsWith(id+":"))delete checks[k]});save();
    document.querySelectorAll(`#list-${id} input`).forEach(i=>i.checked=false);refreshList(id);renderToday();r.removeAttribute("data-armed");r.textContent="Clear list";return}
  const o=e.target.closest("[data-open]");if(o)setTimeout(()=>{const d=document.getElementById("list-"+o.dataset.open);if(d){d.open=true;d.scrollIntoView({block:"start"})}},40);
});
window.addEventListener("hashchange",()=>route());
window.addEventListener("online",loadWeather);

/* ================= Boot ================= */
renderToday();renderPlan();renderLists();renderInfo();
route();
loadWeather();
})();
