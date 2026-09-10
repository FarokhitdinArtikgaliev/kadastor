/* Kadastr Route v18 — choose one point on main screen, then suggest nearest cadastral points */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const getJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch{return d;}};
  const setJSON=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const done=()=>getJSON('kadastr-done-stops',[]);
  const all=()=> (window.routes||[]).flatMap(r=>r.stops.map((stop,i)=>{const p=window.stopCoords?.[stop];return p?{key:`${r.id}:${i}`,stop,route:r.title,region:r.region,lat:p[0],lon:p[1]}:null}).filter(Boolean));
  const pending=()=>all().filter(x=>!done().includes(x.key));
  const hav=(a,b)=>{const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180,la1=a.lat*Math.PI/180,la2=b.lat*Math.PI/180;const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
  const base=()=>window.START_POINT||{lat:40.4409166667,lon:71.7560277778,label:'Точка старта / возврата'};
  const selectedKey=()=>localStorage.getItem('kadastr-primary-point-v18')||'';
  const selected=()=>all().find(x=>x.key===selectedKey())||null;
  const setSelected=k=>{if(k)localStorage.setItem('kadastr-primary-point-v18',k);else localStorage.removeItem('kadastr-primary-point-v18');};
  const selectedSecond=()=>getJSON('kadastr-secondary-points-v18',[]).filter(k=>pending().some(x=>x.key===k));
  const setSecond=v=>setJSON('kadastr-secondary-points-v18',v.slice(0,2));
  const cost=km=>{const s={price:Number(localStorage.getItem('fuel-price')||8500),consumption:Number(localStorage.getItem('fuel-consumption')||7),rate:Number(localStorage.getItem('compensation-rate')||1000)};const lit=km*s.consumption/100,fuel=lit*s.price,comp=km*s.rate;return {lit,fuel,comp,net:comp-fuel};};
  async function osrmTable(points){const coords=points.map(p=>`${p.lon},${p.lat}`).join(';');const r=await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`);if(!r.ok)throw Error('network');const d=await r.json();if(d.code!=='Ok')throw Error('OSRM');return d;}
  function routeUrl(points){const q=new URLSearchParams({api:'1',origin:`${points[0].lat},${points[0].lon}`,destination:`${points[points.length-1].lat},${points[points.length-1].lon}`});if(points.length>2)q.set('waypoints',points.slice(1,-1).map(p=>`${p.lat},${p.lon}`).join('|'));return `https://www.google.com/maps/dir/?${q}`;}
  function renderHome(){
    const host=$('#routes');if(!host)return;
    let box=$('#smartHome18');
    if(!box){box=document.createElement('section');box.id='smartHome18';box.className='card smart-home18';host.insertBefore(box,host.firstChild);}
    const p=selected(), sec=selectedSecond();
    box.innerHTML=`<div class="smart18-head"><div><p class="eyebrow">УМНЫЙ ВЫБОР · 47 ТОЧЕК</p><h2>Куда ехать?</h2><p class="muted">Выбери основную точку. Приложение найдёт ближайшие кадастровые точки по дорожному расстоянию, без разделения на дни.</p></div><span class="smart18-badge">${pending().length} осталось</span></div><div class="smart18-actions"><button type="button" class="primary-button" id="choosePrimary18">📍 Выбрать точку</button>${p?`<button type="button" class="secondary-button" id="clearPrimary18">Сбросить</button>`:''}</div>${p?`<div class="primary-point18"><div><small>Основная точка</small><strong>${esc(p.stop)}</strong><span>${esc(p.region)} · ${esc(p.route)}</span></div><button type="button" class="map-button" id="primaryNav18">🧭 Навигация</button></div><div id="nearest18" class="nearest18"><p class="muted">⏳ Ищу ближайшие точки по дорогам…</p></div><div id="selectedPair18" class="selected-pair18"></div>`:'<div class="smart18-empty">Сначала выбери одну точку — затем появятся ближайшие к ней филиалы.</div>'}`;
    if(p)setTimeout(()=>findNearest(p),0);
    $('#choosePrimary18')?.addEventListener('click',openPrimaryPicker);
    $('#clearPrimary18')?.addEventListener('click',()=>{setSelected('');setSecond([]);renderHome();});
    $('#primaryNav18')?.addEventListener('click',()=>{window.open(routeUrl([base(),p,base()]),'_blank');});
  }
  async function findNearest(p){
    const out=$('#nearest18');if(!out)return;
    const candidates=pending().filter(x=>x.key!==p.key).sort((a,b)=>hav(p,a)-hav(p,b)).slice(0,10);
    if(!candidates.length){out.innerHTML='<div class="smart18-empty">Других невыполненных точек нет.</div>';return;}
    try{
      const pts=[p,...candidates],d=await osrmTable(pts), ranked=candidates.map((x,i)=>({x,km:Number(d.distances[0][i+1]||0)/1000,min:Number(d.durations?.[0]?.[i+1]||0)/60})).sort((a,b)=>a.km-b.km).slice(0,6);
      out.innerHTML=`<div class="nearest-head"><h3>📍 Ближайшие кадастровые точки</h3><small>По дорожному расстоянию от «${esc(p.stop)}»</small></div><div class="nearest-list18">${ranked.map((r,i)=>`<article class="nearest-item18"><div class="near-num">${i+1}</div><div class="near-info"><strong>${esc(r.x.stop)}</strong><span>${esc(r.x.region)} · ${esc(r.x.route)}</span><small>🚗 ${r.km.toFixed(1)} км${r.min?` · ${Math.round(r.min)} мин`:''}</small></div><button type="button" class="secondary-button" data-add-near18="${esc(r.x.key)}">Добавить</button></article>`).join('')}</div>`;
    }catch(e){
      const ranked=candidates.slice(0,6).map(x=>({x,km:hav(p,x)}));
      out.innerHTML=`<div class="nearest-head"><h3>📍 Ближайшие точки</h3><small>Дорожный сервер временно недоступен, показана географическая близость.</small></div><div class="nearest-list18">${ranked.map((r,i)=>`<article class="nearest-item18"><div class="near-num">${i+1}</div><div class="near-info"><strong>${esc(r.x.stop)}</strong><span>${esc(r.x.region)} · ${esc(r.x.route)}</span><small>≈ ${r.km.toFixed(1)} км по прямой</small></div><button type="button" class="secondary-button" data-add-near18="${esc(r.x.key)}">Добавить</button></article>`).join('')}</div>`;
    }
    out.querySelectorAll('[data-add-near18]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.addNear18;let s=selectedSecond();if(!s.includes(k))s.push(k);setSecond(s);renderPair(p);}));
    renderPair(p);
  }
  async function bestOrder(p,items){
    if(items.length<2)return {items,km:null};
    const B=base(),pts=[B,p,items[0],items[1]],d=await osrmTable(pts);
    const a=d.distances[0][1]+d.distances[1][2]+d.distances[2][3]+d.distances[3][0];
    const b=d.distances[0][1]+d.distances[1][3]+d.distances[3][2]+d.distances[2][0];
    return a<=b?{items,km:a/1000}:{items:[items[1],items[0]],km:b/1000};
  }
  async function renderPair(p){
    const box=$('#selectedPair18');if(!box)return;const s=selectedSecond(),items=s.map(k=>all().find(x=>x.key===k)).filter(Boolean);
    if(!items.length){box.innerHTML='<p class="muted">Можно добавить до 2 ближайших точек.</p>';return;}
    box.innerHTML='<p class="muted">⏳ Оптимизирую порядок выбранных точек…</p>';
    let ordered=items,km=null;try{const z=await bestOrder(p,items);ordered=z.items;km=z.km;}catch(e){}
    const route=[base(),p,...ordered,base()];
    box.innerHTML=`<div class="pair18-head"><h3>🚗 Выбранный маршрут</h3><button type="button" class="text-button" id="clearPair18">Очистить</button></div><div class="pair18-route">🏁 Старт → <b>${esc(p.stop)}</b>${ordered.map(x=>` → <b>${esc(x.stop)}</b>`).join('')} → 🏁 Старт</div>${km!=null?`<p class="muted">Оптимальный порядок по дорогам: <b>${km.toFixed(1)} км</b> от базы с возвратом.</p>`:''}<div class="pair18-actions"><button type="button" class="map-button" id="pairNav18">🧭 Открыть маршрут</button><button type="button" class="done-button" id="pairDone18">✓ Выполнить выбранные</button></div>`;
    $('#clearPair18')?.addEventListener('click',()=>{setSecond([]);renderPair(p);});
    $('#pairNav18')?.addEventListener('click',()=>window.open(routeUrl(route),'_blank'));
    $('#pairDone18')?.addEventListener('click',()=>{const keys=[p.key,...ordered.map(x=>x.key)],d=done();const next=[...new Set([...d,...keys])];setJSON('kadastr-done-stops',next);setSecond([]);if(window.renderToday)window.renderToday();if(window.renderRoutes)window.renderRoutes();if(window.renderStats)window.renderStats();renderHome();alert(`Отмечено выполнено: ${keys.length} точек.`);});
  }
  function openPrimaryPicker(){
    const dlg=$('#modal');if(!dlg)return;const ps=pending(),cur=selectedKey();
    dlg.innerHTML=`<form method="dialog" id="primaryPicker18"><h2>📍 Выбрать основную точку</h2><p class="muted">Выбери любую невыполненную точку. После выбора приложение автоматически найдёт ближайшие точки по дорогам.</p><input id="primarySearch18" class="input" placeholder="🔎 Поиск филиала или региона"><div id="primaryList18" class="primary-list18">${ps.map(x=>`<label class="primary-item18"><input type="radio" name="point" value="${esc(x.key)}" ${x.key===cur?'checked':''}><span><b>${esc(x.stop)}</b><small>${esc(x.region)} · ${esc(x.route)}</small></span></label>`).join('')||'<p class="empty">Все точки выполнены.</p>'}</div><div class="modal-actions"><button type="button" class="cancel" value="cancel">Отмена</button><button type="submit" class="save">Выбрать</button></div></form>`;
    dlg.showModal?.();
    const search=$('#primarySearch18'),list=$('#primaryList18');search?.addEventListener('input',()=>{const q=search.value.toLowerCase();list.querySelectorAll('.primary-item18').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none');});
    dlg.querySelector('.cancel')?.addEventListener('click',()=>dlg.close());
    $('#primaryPicker18')?.addEventListener('submit',e=>{e.preventDefault();const k=new FormData(e.target).get('point');if(!k)return;setSelected(String(k));setSecond([]);dlg.close();renderHome();});
  }
  function hideOldPlanner(){
    const p=$('#planner'),n=document.querySelector('.nav-item[data-tab="planner"]');
    if(p)p.style.display='none';if(n)n.style.display='none';
  }
  function inject(){hideOldPlanner();renderHome();}
  const mo=new MutationObserver(inject);mo.observe(document.body,{childList:true,subtree:true});
  setTimeout(inject,150);
  window.kadastrV18={renderHome,findNearest,openPrimaryPicker};
})();
