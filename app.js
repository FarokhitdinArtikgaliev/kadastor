const routes = [
["Фергана","Фергана: город",["Фарғона шаҳар","Марғилон шаҳар","Тошлоқ тумани"],3719,29],
["Фергана","Фергана: восток",["Қува тумани","Қувасой шаҳар","Фарғона тумани"],1803,139],
["Фергана","Фергана: север",["Ёзёвон тумани","Қўштепа тумани"],1154,55],
["Фергана","Фергана: юго-запад",["Олтиариқ тумани","Бағдод тумани","Бувайда тумани"],1661,145],
["Коканд","Коканд: город и юг",["Қўқон шаҳар","Фурқат тумани","Ўзбекистон тумани"],1980,223],
["Коканд","Коканд: север",["Данғара тумани","Бешариқ тумани","Учкўприк тумани"],1592,255],
["Фергана","Фергана: Сох",["Риштон тумани","Сўх тумани"],906,205,"Проверить режим проезда"],
["Андижан","Андижан: запад",["Улуғнор тумани","Балиқчи тумани","Бўстон тумани"],1040,142],
["Андижан","Андижан: центр",["Шаҳрихон тумани","Олтинкўл тумани","Андижон тумани"],3264,165],
["Андижан","Андижан: город",["Андижон шаҳар","Избоскан тумани"],3770,181],
["Андижан","Андижан: юг",["Асака тумани","Марҳамат тумани","Булоқбоши тумани"],1638,186],
["Андижан","Андижан: восток",["Жалақудуқ тумани","Хўжаобод тумани","Пахтаобод тумани"],1556,253],
["Андижан","Андижан: дальний восток",["Қўрғонтепа тумани","Хонобод шаҳар"],899,276],
["Наманган","Наманган: запад",["Поп тумани","Мингбулоқ тумани","Чуст тумани"],2411,252],
["Наманган","Наманган: центр",["Наманган тумани","Наманган шаҳар","Тўрақўрғон тумани"],4805,185],
["Наманган","Наманган: восток",["Уйчи тумани","Чортоқ тумани","Янгиқўрғон тумани"],1651,214],
["Наманган","Наманган: дальний север",["Косонсой тумани","Учқўрғон тумани","Норин тумани"],1948,281]
].map(([region,title,stops,workload,km,note],i)=>({id:i+1,region,title,stops,workload,km,note}));
const state={activeRegion:"Все",today:Number(localStorage.getItem("kadastr-today")||1),mapRoute:Number(localStorage.getItem("kadastr-map-route")||1),map:null,mapLayer:null};
const getDone=()=>JSON.parse(localStorage.getItem("kadastr-done")||"[]");
const getDoneStops=()=>JSON.parse(localStorage.getItem("kadastr-done-stops")||"[]");
const setDoneStops=v=>localStorage.setItem("kadastr-done-stops",JSON.stringify(v));
const allStops=()=>routes.flatMap(r=>r.stops.map((stop,index)=>({key:`${r.id}:${index}`,routeId:r.id,route:r.title,region:r.region,stop,index})));
const getLogs=()=>JSON.parse(localStorage.getItem("kadastr-logs")||"[]");
const settings=()=>({price:Number(localStorage.getItem("fuel-price")||8500),consumption:Number(localStorage.getItem("fuel-consumption")||7)});
const money=n=>`${Math.round(n).toLocaleString("ru-RU")} сум`;
function mapsUrl(route){const points=route.stops.map(s=>`${s}, Uzbekistan`);const p=new URLSearchParams({api:"1",origin:"Kirgili, Fergana, Uzbekistan",destination:points.at(-1)});if(points.length>1)p.set("waypoints",points.slice(0,-1).join("|"));return `https://www.google.com/maps/dir/?${p}`}
function navigate(id){const r=routes.find(x=>x.id===id);window.open(mapsUrl(r),"_blank");}
function renderToday(){const r=routes.find(x=>x.id===state.today)||routes[0],done=getDone().includes(r.id),ds=getDoneStops();document.querySelector("#today-title").textContent=`День ${r.id} · ${r.title}`;document.querySelector("#todayRoute").innerHTML=`<div class="stop-list">${r.stops.map((stop,i)=>{const key=`${r.id}:${i}`,ok=ds.includes(key);return `<button class="stop-row ${ok?'is-done':''}" data-stop="${key}"><span class="stop-check">${ok?'✓':i+1}</span><span>${stop}</span></button>`}).join('')}</div><p class="muted">${r.stops.length} точки · ${r.km} км · ${r.workload.toLocaleString("ru-RU")} заявлений</p><div class="route-actions"><button class="map-button" data-map="${r.id}">🚗 Навигатор</button><button class="done-button ${done?"is-done":""}" data-done="${r.id}">${done?"✓ Маршрут выполнен":"Завершить маршрут"}</button></div>`}
function renderStats(){const done=getDone().length,total=routes.length,km=routes.reduce((s,r)=>s+r.km,0),s=settings();document.querySelector("#stats").innerHTML=`<div class="stat"><strong>${done}/${total}</strong><span>маршрутов</span></div><div class="stat"><strong>${km.toLocaleString("ru-RU")}</strong><span>км всего</span></div><div class="stat"><strong>${money(km/100*s.consumption*s.price)}</strong><span>топливо, оценка</span></div>`;document.querySelector("#fuelSummary").textContent=`${s.price.toLocaleString("ru-RU")} сум/л · расход ${s.consumption} л/100 км`}
function routeHtml(r){const done=getDone().includes(r.id);return `<article class="route-card ${done?"done-card":""}"><header><div><p class="eyebrow">День ${r.id} · ${r.region}</p><h3>${r.title}</h3></div><strong>${r.km} км</strong></header><p>${r.stops.join(" · ")}</p><p class="route-meta">${r.stops.length} точки · ${r.workload.toLocaleString("ru-RU")} заявлений ${done?"· ✓ выполнено":""}</p>${r.note?`<p class="route-note">⚠ ${r.note}</p>`:""}<button data-open-day="${r.id}">Подробнее</button></article>`}
function renderRoutes(){const visible=state.activeRegion==="Все"?routes:routes.filter(r=>r.region===state.activeRegion);document.querySelector("#regionFilters").innerHTML=["Все","Фергана","Коканд","Андижан","Наманган"].map(n=>`<button class="filter ${state.activeRegion===n?"is-active":""}" data-region="${n}">${n}</button>`).join("");document.querySelector("#routeList").innerHTML=visible.map(routeHtml).join("")}
function renderLog(){const logs=getLogs();document.querySelector("#logList").innerHTML=logs.length?logs.map(l=>`<article class="log-item"><strong>${l.branch}</strong><p>${l.issue}</p><small>${l.date} · ${l.status}</small></article>`).join(""):"<p class='empty'>Записей пока нет. Добавьте результат после выезда.</p>"}
function modal(html){const m=document.querySelector("#modal");m.innerHTML=html;m.showModal()}
function openDay(id){const r=routes.find(x=>x.id===id);modal(`<h2>${r.title}</h2><div class="form-grid"><p>${r.stops.map((s,i)=>`${i+1}. ${s}`).join("<br>")}</p><p class="muted">Нагрузка: ${r.workload.toLocaleString("ru-RU")} заявлений<br>Расстояние: около ${r.km} км</p></div><div class="modal-actions"><button class="cancel" data-close>Закрыть</button><button class="save" data-map="${r.id}">🚗 Навигатор</button></div>`)}
function openLog(){const opts=routes.flatMap(r=>r.stops).map(s=>`<option>${s}</option>`).join("");modal(`<h2>Новая запись</h2><form id="logForm" class="form-grid"><label>Филиал<select name="branch">${opts}</select></label><label>Работа / неисправность<textarea name="issue" required placeholder="Что сделали?"></textarea></label><label>Статус<select name="status"><option>Выполнено</option><option>Нужно запчасть</option><option>Повторный выезд</option></select></label><div class="modal-actions"><button class="cancel" data-close type="button">Отмена</button><button class="save">Сохранить</button></div></form>`)}
function openFuel(){const s=settings();modal(`<h2>Расходы на топливо</h2><form id="fuelForm" class="form-grid"><label>Цена пропана, сум/л<input type="number" name="price" min="0" value="${s.price}"></label><label>Расход автомобиля, л/100 км<input type="number" step="0.1" name="consumption" min="0" value="${s.consumption}"></label><div class="modal-actions"><button class="cancel" data-close type="button">Отмена</button><button class="save">Сохранить</button></div></form>`)}
function openChecklist(){modal(`<h2>Перед выездом</h2><div class="check-list">${["Топливо / пропан","Бумага и расходники","Лента / картриджи","Инструменты","Чистящие материалы","Телефон и пауэрбанк"].map(x=>`<label><input type="checkbox"> ${x}</label>`).join("")}</div><div class="modal-actions"><button class="save" data-close>Готово</button></div>`)}
function openPriority(){const top=[...routes].sort((a,b)=>b.workload-a.workload).slice(0,5);modal(`<h2>Приоритет</h2><div class="priority-list">${top.map((r,i)=>`<div><b>${i+1}. ${r.title}</b><span>${r.workload.toLocaleString("ru-RU")} заявлений</span></div>`).join("")}</div><div class="modal-actions"><button class="save" data-close>Закрыть</button></div>`)}
function openDayPicker(){modal(`<h2>Маршрут на сегодня</h2><label>Выберите день<select id="dayPicker">${routes.map(r=>`<option value="${r.id}" ${r.id===state.today?"selected":""}>День ${r.id}: ${r.title}</option>`).join("")}</select></label><div class="modal-actions"><button class="cancel" data-close>Отмена</button><button class="save" id="saveDay">Выбрать</button></div>`)}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.tab){document.querySelectorAll(".nav-item,.panel").forEach(x=>x.classList.remove("is-active"));b.classList.add("is-active");const panel=document.querySelector(`#${b.dataset.tab}`);panel.classList.add("is-active");if(b.dataset.tab==="mapPanel"){setTimeout(()=>{if(!state.map)initMap();else state.map.invalidateSize()},50)}window.scrollTo({top:0,behavior:"smooth"})}if(b.dataset.region){state.activeRegion=b.dataset.region;renderRoutes()}if(b.dataset.map)navigate(Number(b.dataset.map));if(b.dataset.openDay)openDay(Number(b.dataset.openDay));if(b.dataset.close!==undefined)document.querySelector("#modal").close();if(b.dataset.stop)toggleStop(b.dataset.stop);if(b.dataset.planRoute)navigate(Number(b.dataset.planRoute));if(b.id==="buildPlan")renderPlanner();if(b.dataset.planStop){let s=selectedStops();const k=b.dataset.planStop;if(s.includes(k))s=s.filter(x=>x!==k);else if(s.length<2)s=[...s,k];setSelectedStops(s);renderPlanner()}if(b.id==="optimizePlan")optimizePlan();if(b.id==="clearPlan"){setSelectedStops([]);renderPlanner()}if(b.id==="markSelectedDone"){let d=getDoneStops();for(const k of selectedStops())if(!d.includes(k))d.push(k);setDoneStops(d);setSelectedStops([]);renderPlanner();renderStats();renderToday()}if(b.id==="optimizedNav"&&b.dataset.url)window.open(b.dataset.url,"_blank");if(b.dataset.done){let d=getDone(),id=Number(b.dataset.done);d=d.includes(id)?d.filter(x=>x!==id):[...d,id];localStorage.setItem("kadastr-done",JSON.stringify(d));renderToday();renderRoutes();renderStats()}if(b.id==="newLog")openLog();if(b.id==="fuelButton")openFuel();if(b.id==="checklistButton")openChecklist();if(b.id==="priorityButton")openPriority();if(b.id==="changeDay")openDayPicker();if(b.id==="saveDay"){state.today=Number(document.querySelector("#dayPicker").value);localStorage.setItem("kadastr-today",state.today);document.querySelector("#modal").close();renderToday()};if(b.id==="locationButton")locate();if(b.id==="loadMapPoints")loadMapPoints();if(b.id==="mapRouteGo")mapGo()});
document.addEventListener("submit",e=>{e.preventDefault();if(e.target.id==="logForm"){const f=new FormData(e.target);const logs=getLogs();logs.unshift({branch:f.get("branch"),issue:f.get("issue"),status:f.get("status"),date:new Date().toLocaleDateString("ru-RU")});localStorage.setItem("kadastr-logs",JSON.stringify(logs));document.querySelector("#modal").close();renderLog()}if(e.target.id==="fuelForm"){const f=new FormData(e.target);localStorage.setItem("fuel-price",Number(f.get("price")));localStorage.setItem("fuel-consumption",Number(f.get("consumption")));document.querySelector("#modal").close();renderStats()}});

function getCoords(){return JSON.parse(localStorage.getItem("kadastr-coords")||"{}");}
function setCoords(v){localStorage.setItem("kadastr-coords",JSON.stringify(v));}
function selectedStops(){return JSON.parse(localStorage.getItem("kadastr-selected")||"[]");}
function setSelectedStops(v){localStorage.setItem("kadastr-selected",JSON.stringify(v));}
function routeCost(km){const s=settings();return {fuelLiters:km*s.consumption/100,fuelCost:km*s.consumption/100*s.price,compensation:km*1000,net:km*1000-km*s.consumption/100*s.price};}
function renderPlanner(){
 const done=getDoneStops(), pending=allStops().filter(x=>!done.includes(x.key)), selected=selectedStops();
 const c=routeCost(0);
 document.querySelector('#plannerSummary').innerHTML=`<div class="planner-kpis"><strong>${done.length}/47</strong><span>выполнено</span><strong>${pending.length}</strong><span>осталось</span><strong>${selected.length}/2</strong><span>выбрано на день</span></div><p class="muted">Выбери максимум 2 объекта. Приложение найдёт координаты, сравнит порядок и посчитает реальный дорожный маршрут.</p>`;
 document.querySelector('#plannerList').innerHTML=pending.map(x=>`<button class="planner-stop ${selected.includes(x.key)?'is-selected':''}" data-plan-stop="${x.key}"><span>${selected.includes(x.key)?'✓':x.index+1}</span><div><b>${x.stop}</b><small>${x.region} · ${x.route}</small></div></button>`).join('')+
 `<div class="planner-actions"><button class="primary-button" id="optimizePlan" ${selected.length!==2?'disabled':''}>🧭 Оптимизировать 2 точки</button><button class="text-button" id="clearPlan">Сбросить выбор</button></div><div id="planResult"></div>`;
}
async function geocodeCached(stop){
 const cache=getCoords(); if(cache[stop]) return cache[stop];
 const u='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q='+encodeURIComponent(stop+', Fergana Valley, Uzbekistan');
 const r=await fetch(u,{headers:{'Accept':'application/json'}}); if(!r.ok) throw new Error('geocode'); const d=await r.json();
 if(!d[0]) return null; const g={lat:+d[0].lat,lon:+d[0].lon,name:d[0].display_name}; cache[stop]=g; setCoords(cache); return g;
}
async function roadRoute(a,b){
 const u=`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false&steps=false`;
 const r=await fetch(u); if(!r.ok) throw new Error('routing'); const d=await r.json(); if(d.code!=='Ok'||!d.routes?.[0]) throw new Error('routing'); return {km:d.routes[0].distance/1000,min:d.routes[0].duration/60};
}
async function optimizePlan(){
 const keys=selectedStops(), result=document.querySelector('#planResult'); if(keys.length!==2)return;
 const items=keys.map(k=>allStops().find(x=>x.key===k)).filter(Boolean); result.innerHTML='<div class="loading">⏳ Определяю координаты двух объектов…</div>';
 try{
  const a=await geocodeCached(items[0].stop), b=await geocodeCached(items[1].stop); if(!a||!b)throw new Error('Не удалось найти адрес одного из объектов');
  const r=await roadRoute(a,b), cost=routeCost(r.km);
  const origin='Kirgili, Fergana, Uzbekistan';
  const orderUrl=(first,second)=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(second.stop+', Uzbekistan')}&waypoints=${encodeURIComponent(first.stop+', Uzbekistan')}`;
  result.innerHTML=`<article class="optimized-card"><div class="optimized-head"><div><p class="eyebrow">Оптимальный порядок</p><h3>1. ${items[0].stop}<br>↓<br>2. ${items[1].stop}</h3></div><strong>${r.km.toFixed(1)} км</strong></div><div class="cost-grid"><div><b>${Math.round(r.min)} мин</b><small>в дороге</small></div><div><b>${cost.fuelLiters.toFixed(1)} л</b><small>пропан</small></div><div><b>${money(cost.fuelCost)}</b><small>топливо</small></div><div><b>${money(cost.compensation)}</b><small>компенсация</small></div><div><b>${money(cost.net)}</b><small>остаток</small></div></div><div class="route-actions"><button class="map-button" id="optimizedNav" data-url="${orderUrl(items[0],items[1])}">🚗 Открыть маршрут</button><button class="done-button" id="markSelectedDone">✓ Отметить 2 точки</button></div></article>`;
 }catch(e){result.innerHTML=`<div class="error-box">⚠ ${e.message||'Не удалось построить маршрут'}</div>`;}
}
function toggleStop(key){let d=getDoneStops();d=d.includes(key)?d.filter(x=>x!==key):[...d,key];setDoneStops(d);renderToday();renderPlanner();renderStats();}

function initMap(){
  const el=document.querySelector('#map');
  if(!el || typeof L==='undefined') return;
  state.map=L.map(el,{zoomControl:true}).setView([40.38,71.78],9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(state.map);
  state.mapLayer=L.layerGroup().addTo(state.map);
  renderMapSelect();
}
function renderMapSelect(){
  const sel=document.querySelector('#mapRouteSelect'); if(!sel)return;
  sel.innerHTML=routes.map(r=>`<option value="${r.id}" ${r.id===state.mapRoute?'selected':''}>День ${r.id}: ${r.title}</option>`).join('');
}
async function geocode(q){
  const u='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q='+encodeURIComponent(q);
  const r=await fetch(u,{headers:{'Accept':'application/json'}}); if(!r.ok) throw new Error('geocode');
  const d=await r.json(); return d[0]?{lat:+d[0].lat,lon:+d[0].lon,name:d[0].display_name}:null;
}
async function loadMapPoints(){
  if(!state.map) initMap(); if(!state.map)return;
  const id=Number(document.querySelector('#mapRouteSelect').value), route=routes.find(r=>r.id===id);
  state.mapRoute=id; localStorage.setItem('kadastr-map-route',id);
  state.mapLayer.clearLayers(); const status=document.querySelector('#mapStatus');
  status.textContent='Ищу координаты точек…'; const bounds=[];
  for(let i=0;i<route.stops.length;i++){
    try{
      if(i) await new Promise(x=>setTimeout(x,1100));
      const g=await geocode(route.stops[i]+', Fergana Region, Uzbekistan');
      if(g){const marker=L.marker([g.lat,g.lon]).addTo(state.mapLayer);marker.bindPopup(`<b>${i+1}. ${route.stops[i]}</b><br><small>${g.name}</small>`);bounds.push([g.lat,g.lon]);}
    }catch(e){}
  }
  if(bounds.length){state.map.fitBounds(bounds,{padding:[30,30]});status.textContent=`Найдено ${bounds.length} из ${route.stops.length} точек. Нажмите на маркер для адреса.`}
  else status.textContent='Не удалось найти точки. Проверьте интернет-соединение.';
}
function mapGo(){const id=Number(document.querySelector('#mapRouteSelect').value);navigate(id)}

function locate(){const el=document.querySelector("#locationStatus");if(!navigator.geolocation){el.textContent="Геолокация недоступна";return}el.textContent="Определяю местоположение…";navigator.geolocation.getCurrentPosition(p=>{el.textContent=`GPS: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`},()=>{el.textContent="Не удалось получить GPS"},{enableHighAccuracy:true,timeout:10000})}
renderToday();renderRoutes();renderLog();renderStats();renderPlanner();initMap();
