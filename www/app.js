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
const stopCoords = {"Андижон шаҳар":[40.7598055556,72.3589166667],"Хонобод шаҳар":[40.8019166667,72.9846666667],"Олтинкўл тумани":[40.7964722222,72.1648611111],"Андижон тумани":[40.8565277778,72.3088888889],"Балиқчи тумани":[40.9039444444,71.8457222222],"Бўстон тумани":[40.6897222222,71.9488055556],"Булоқбоши тумани":[40.6391111111,72.4958333333],"Жалақудуқ тумани":[40.7160833333,72.64375],"Избоскан тумани":[40.8970833333,72.2558888889],"Улуғнор тумани":[40.7561666667,71.7048333333],"Қўрғонтепа тумани":[40.7288055556,72.758],"Асака тумани":[40.6405833333,72.2477777778],"Марҳамат тумани":[40.5058055556,72.3438888889],"Шаҳрихон тумани":[40.7208333333,72.0372777778],"Пахтаобод тумани":[40.9358611111,72.5051388889],"Хўжаобод тумани":[40.6677777778,72.5654444444],"Наманган шаҳар":[41.0074805556,71.6675305556],"Мингбулоқ тумани":[40.8611583333,71.4582666667],"Косонсой тумани":[41.2571388889,71.5414166667],"Наманган тумани":[40.9234416667,71.5836777778],"Норин тумани":[40.9159222222,72.1189],"Поп тумани":[40.8693666667,71.11695],"Тўрақўрғон тумани":[41.0038638889,71.5094583333],"Уйчи тумани":[41.0308944444,71.8445444444],"Учқўрғон тумани":[41.1188833333,72.0744833333],"Чортоқ тумани":[41.0777222222,71.8151666667],"Чуст тумани":[40.9871388889,71.2310277778],"Янгиқўрғон тумани":[41.1915555556,71.7222777778],"Қувасой шаҳар":[40.2946388889,71.9883611111],"Қўқон шаҳар":[40.5348888889,70.9241111111],"Марғилон шаҳар":[40.4654166667,71.7166388889],"Фарғона шаҳар":[40.3946111111,71.7683888889],"Бешариқ тумани":[40.4358888889,70.6157777778],"Бағдод тумани":[40.4607777778,71.2116388889],"Бувайда тумани":[40.56025,71.1409444444],"Данғара тумани":[40.5779166667,70.9204166667],"Ёзёвон тумани":[40.5033888889,71.8544722222],"Қува тумани":[40.5376388889,72.0701944444],"Олтиариқ тумани":[40.3895277778,71.4743888889],"Қўштепа тумани":[40.5383333333,71.6454444444],"Риштон тумани":[40.3609444444,71.2942222222],"Сўх тумани":[39.9568055556,71.12925],"Тошлоқ тумани":[40.4850833333,71.754],"Ўзбекистан тумани":[40.3731111111,70.8192222222],"Учкўприк тумани":[40.5443611111,71.0540833333],"Фарғона тумани":[40.1719166667,71.7305833333],"Фурқат тумани":[40.4856666667,70.7906388889]};
const branchPhones = {"Андижон шаҳар":"98-577-24-25","Хонобод шаҳар":"94-384-42-42","Олтинкўл тумани":"94-668-31-90","Андижон тумани":"99-003-21-11","Балиқчи тумани":"97-990-50-51","Бўстон тумани":"93-426-85-85","Булоқбоши тумани":"99-037-19-17","Жалақудуқ тумани":"94-987-57-67","Избоскан тумани":"88-161-60-00","Улуғнор тумани":"94-427-13-31","Қўрғонтепа тумани":"90-256-92-96","Асака тумани":"93-784-72-00","Марҳамат тумани":"93-062-02-10","Шаҳрихон тумани":"93-277-90-09","Пахтаобод тумани":"90-144-48-55","Хўжаобод тумани":"99-431-80-93","Наманган шаҳар":"93-916-76-76","Мингбулоқ тумани":"93-126-70-70","Косонсой тумани":"90-260-07-79","Наманган тумани":"93-694-44-47","Норин тумани":"99-975-67-14","Поп тумани":"88-903-41-14","Тўрақўрғон тумани":"93-675-94-15","Уйчи тумани":"93-403-57-57","Учқўрғон тумани":"94-157-77-87","Чортоқ тумани":"93-000-50-03","Чуст тумани":"97-102-09-02","Янгиқўрғон тумани":"97-254-07-04","Қувасой шаҳар":"972143080","Қўқон шаҳар":"985580258","Марғилон шаҳар":"972147084","Фарғона шаҳар":"","Бешариқ тумани":"974161510","Бағдод тумани":"912042685","Бувайда тумани":"999195032","Данғара тумани":"944427117","Ёзёвон тумани":"907750266","Қува тумани":"773510203","Олтиариқ тумани":"886290079","Қўштепа тумани":"999940282","Риштон тумани":"906334234","Сўх тумани":"996014022","Тошлоқ тумани":"936430010","Ўзбекистан тумани":"916898183","Учкўприк тумани":"872847717","Фарғона тумани":"939765289","Фурқат тумани":"975900588"};
const staffPhones = {"Андижон шаҳар":"98-577-24-25","Хонобод шаҳар":"93-250-88-98","Олтинкўл тумани":"99-604-55-22","Андижон тумани":"99-003-21-11","Балиқчи тумани":"97-990-50-51","Бўстон тумани":"93-241-99-29","Булоқбоши тумани":"90-060-02-84","Жалақудуқ тумани":"97-995-33-28","Избоскан тумани":"77-000-01-62","Улуғнор тумани":"99-646-10-19","Қўрғонтепа тумани":"97-339-36-00","Асака тумани":"94-387-09-09","Марҳамат тумани":"94-425-50-55","Шаҳрихон тумани":"93-277-90-09","Пахтаобод тумани":"90-144-48-55","Хўжаобод тумани":"94-566-09-91","Наманган шаҳар":"97-255-05-30","Мингбулоқ тумани":"94-905-20-20","Косонсой тумани":"90-260-07-79","Наманган тумани":"94-172-77-07","Норин тумани":"97-251-36-96","Поп тумани":"94-893-12-34","Тўрақўрғон тумани":"93-372-83-84","Уйчи тумани":"88-470-57-00","Учқўрғон тумани":"93-406-13-03","Чортоқ тумани":"93-490-25-89","Чуст тумани":"97-102-09-02","Янгиқўрғон тумани":"95-110-86-00","Қувасой шаҳар":"99-994-78-27","Қўқон шаҳар":"98-558-02-58","Марғилон шаҳар":"97-215-95-70","Фарғона шаҳар":"90-230-46-04","Бешариқ тумани":"97-814-06-81","Бағдод тумани":"91-695-19-25","Бувайда тумани":"91-200-16-14","Данғара тумани":"91-698-00-11","Ёзёвон тумани":"90-272-64-65","Қува тумани":"91-479-89-89","Олтиариқ тумани":"91-105-91-91","Қўштепа тумани":"90-274-20-60","Риштон тумани":"90-633-42-34","Сўх тумани":"99-514-85-78","Тошлоқ тумани":"90-531-55-85","Ўзбекистан тумани":"91-397-85-85","Учкўприк тумани":"97-206-43-33","Фарғона тумани":"91-105-30-32","Фурқат тумани":"91-286-30-78"};
const START_POINT={lat:40.4409166667,lon:71.7560277778,label:"Точка старта / возврата"};
const state={activeRegion:"Все",today:Number(localStorage.getItem("kadastr-today")||1),mapRoute:Number(localStorage.getItem("kadastr-map-route")||1),map:null,mapLayer:null};
const getDone=()=>JSON.parse(localStorage.getItem("kadastr-done")||"[]");
const getDoneStops=()=>JSON.parse(localStorage.getItem("kadastr-done-stops")||"[]");
const setDoneStops=v=>localStorage.setItem("kadastr-done-stops",JSON.stringify(v));
const allStops=()=>routes.flatMap(r=>r.stops.map((stop,index)=>({key:`${r.id}:${index}`,routeId:r.id,route:r.title,region:r.region,stop,index})));
const getLogs=()=>JSON.parse(localStorage.getItem("kadastr-logs")||"[]");
const settings=()=>({price:Number(localStorage.getItem("fuel-price")||8500),consumption:Number(localStorage.getItem("fuel-consumption")||7),rate:Number(localStorage.getItem("compensation-rate")||1000)});
function distanceKm(p1,p2){const R=6371,dLat=(p2.lat-p1.lat)*Math.PI/180,dLon=(p2.lon-p1.lon)*Math.PI/180,a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(p1.lat*Math.PI/180)*Math.cos(p2.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);return 2*R*Math.asin(Math.sqrt(a));}
function money(v){return new Intl.NumberFormat("ru-RU",{style:"currency",currency:"UZS",minimumFractionDigits:0}).format(v);}
function pointForStop(q){for(let [name,coords] of Object.entries(stopCoords)){if(name===q)return {lat:coords[0],lon:coords[1]};} return null;}
function modal(html,onClose){const d=document.querySelector("#modal");if(!d)return;d.innerHTML=html;d.showModal?.();d.querySelector(".cancel")?.addEventListener("click",()=>{d.close();onClose?.();});d.addEventListener("cancel",()=>onClose?.(),{once:true});}
function selectedStops(){return JSON.parse(localStorage.getItem("selected-stops")||"[]");}
function setSelectedStops(a){localStorage.setItem("selected-stops",JSON.stringify(a));}
function renderToday(){const r=routes[state.today-1];if(!r)return;const e=document.querySelector("#todayRoute"),d=getDone(),s=r.stops.filter(x=>!d.includes(x));e.innerHTML=`<div class="route-card"><div class="route-info"><h3>${r.region}</h3><p>${r.title}</p><p class="muted">${r.stops.length} остановок · ${r.workload} мин · ${r.km} км</p></div><div class="route-actions"><button class="primary-button" id="startDayBtn" data-action="navigate">🚗 Начать день</button></div></div><div class="progress-bar"><div class="progress" style="width:${100*(1-s.length/r.stops.length)}%"></div></div><p class="progress-label">${r.stops.length-s.length} из ${r.stops.length} выполнено</p>`;}
function renderRoutes(){const f=document.querySelector("#regionFilters"),l=document.querySelector("#routeList");if(!f||!l)return;const rs=["Все",...new Set(routes.map(x=>x.region))];f.innerHTML=rs.map(r=>`<button class="filter-btn ${r===state.activeRegion?"is-active":""}" data-region="${r}">${r}</button>`).join("");routes.filter(x=>state.activeRegion==="Все"||x.region===state.activeRegion).forEach(r=>{const d=getDone(),s=r.stops.filter(x=>!d.includes(x)),done=!s.length;l.innerHTML+=`<article class="route-card ${done?"is-done":""}"><div><h4>${r.title}</h4><p class="muted">${s.length}/${r.stops.length} остановок · ${r.workload} мин · ${r.km} км</p></div><button class="small-btn ${done?"is-done":""}" data-navigate="${r.id}">${done?"✓":"→"}</button></article>`});f.querySelectorAll("[data-region]").forEach(b=>b.addEventListener("click",()=>{state.activeRegion=b.dataset.region;renderRoutes();}));l.querySelectorAll("[data-navigate]").forEach(b=>b.addEventListener("click",()=>navigate(Number(b.dataset.navigate))));}
function renderLog(){const e=document.querySelector("#logList");if(!e)return;const l=getLogs();e.innerHTML=l.length?l.slice(0,10).map((x,i)=>`<article class="log-item"><span class="log-idx">${i+1}</span><div><strong>${x.title}</strong><p>${x.text}</p><small>${x.time}</small></div></article>`).join(""):"<p class='empty'>Журнал пуст</p>";}
function renderStats(){const e=document.querySelector("#stats");if(!e)return;const d=getDone(),t=routes.length,s=allStops().length,c=getDoneStops().length;e.innerHTML=`<article><h3>📍 ${c}</h3><small>кадастров выполнено</small></article><article><h3>${s-c}</h3><small>осталось</small></article><article><h3>${Math.round(100*c/s)}%</h3><small>готовности</small></article>`;}
function addLog(title,text){const t=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}),e=[{title,text,time:t},...getLogs()];localStorage.setItem("kadastr-logs",JSON.stringify(e.slice(0,50)));}
function navigate(id){const r=routes.find(x=>x.id===id);if(!r)return;const e=r.stops.map(s=>stopCoords[s]).filter(Boolean);if(!e.length){alert("Координаты маршрута не найдены.");return;}const u=`https://www.google.com/maps/dir/?api=1&origin=${START_POINT.lat},${START_POINT.lon}&destination=${START_POINT.lat},${START_POINT.lon}&waypoints=${e.map(p=>`${p[0]},${p[1]}`).join("|")}`;window.open(u,"_blank");}
function openFuelSetting(){const s=settings(),m=(t)=>`<input type="number" name="${t}" value="${s[t]}" min="0" step="100">`;modal(`<h2>⛽ Топливо и компенсация</h2><form id="fuelForm" class="form-grid"><label>Цена пропана, сум/л${m("price")}</label><label>Расход, л/100км${m("consumption")}</label><label>Компенсация, сум/км${m("rate")}</label><div class="modal-actions"><button type="button" class="cancel" data-close>Отмена</button><button type="submit" class="save">Сохранить</button></div></form>`);}
function renderPlanner(){const p=document.querySelector("#plannerSummary");if(!p)return;const d=getDoneStops(),a=allStops().filter(x=>!d.includes(x.key));p.innerHTML=`<p class="muted">Осталось: <b>${a.length}</b> кадастров из 47</p>`;}
function renderCompletedSummary(){const e=document.querySelector("#completedSummary");if(!e)return;const d=getDoneStops(),t=allStops().length;e.innerHTML=d.length>0?`<div class="completed-info"><p class="muted">Выполнено <b>${d.length}/${t}</b> кадастров</p><button class="text-button" id="clearAllBtn">Очистить всё</button></div>`:'<p class="empty">Ещё не выполнено.</p>';}
function trips(){return JSON.parse(localStorage.getItem("kadastr-trips")||"[]");}
function renderTripHistory(){const el=document.querySelector("#tripHistory");if(!el)return;const x=trips();el.innerHTML=x.length?x.slice(0,10).map(t=>`<article class="log-item"><strong>${new Date(t.date).toLocaleDateString("ru-RU")} · ${t.km.toFixed(1)} км</strong><p>🏁 База → ${t.stops.join(" → ")} → 🏁 База</p><small>${Math.round(t.min)} мин · топливо ${money(t.fuelCost)}</small></article>`).join(""):"<p class='empty'>Сохранённых поездок пока нет.</p>";}
function exportBackup(){const data={version:2,exportedAt:new Date().toISOString(),done:getDone(),doneStops:getDoneStops(),logs:getLogs(),trips:trips(),settings:settings()};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`kadastr-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importBackup(file){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(Array.isArray(d.done))localStorage.setItem("kadastr-done",JSON.stringify(d.done));if(Array.isArray(d.doneStops))localStorage.setItem("kadastr-done-stops",JSON.stringify(d.doneStops));if(Array.isArray(d.logs))localStorage.setItem("kadastr-logs",JSON.stringify(d.logs));if(Array.isArray(d.trips))localStorage.setItem("kadastr-trips",JSON.stringify(d.trips));if(d.settings){localStorage.setItem("fuel-price",d.settings.price);localStorage.setItem("fuel-consumption",d.settings.consumption);if(d.settings.rate!=null)localStorage.setItem("compensation-rate",d.settings.rate)}renderToday();renderRoutes();renderLog();renderStats();renderPlanner();renderTripHistory();alert("Резервная копия восстановлена.")}catch(e){alert("Не удалось прочитать резервную копию.")}};r.readAsText(file);}
function openBackup(){modal(`<h2>Резервная копия</h2><p class="muted">Сохраните историю посещений, журнал, поездки и настройки в JSON-файл.</p><div class="modal-actions"><button class="cancel" data-close>Закрыть</button><button class="save" id="exportBackup">Экспорт</button></div><label style="margin-top:12px">Восстановить из файла<input id="backupFile" type="file" accept="application/json"></label>`);}
async function suggestNearest(){const result=document.querySelector('#planResult');const pending=allStops().filter(x=>!getDoneStops().includes(x.key));const ranked=pending.map(x=>{const p=stopCoords[x.stop];return p?{...x,distance:distanceKm(START_POINT,{lat:p[0],lon:p[1]})}:null}).filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,2);if(ranked.length<2){result.innerHTML='<div class="error-box">Все доступные точки уже выполнены.</div>';return}setSelectedStops(ranked.map(x=>x.key));renderPlanner();setTimeout(optimizePlan,0);}
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
async function geocode(q){const exact=pointForStop(q);if(exact)return {...exact,name:"Точная координата из базы"};const u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=ru&q="+encodeURIComponent(q);const r=await fetch(u,{headers:{"Accept":"application/json"}});if(!r.ok)throw new Error("geocode");const d=await r.json();return d[0]?{lat:+d[0].lat,lon:+d[0].lon,name:d[0].display_name}:null;}
async function loadMapPoints(){if(!state.map)initMap();if(!state.map)return;const id=Number(document.querySelector("#mapRouteSelect").value),route=routes.find(r=>r.id===id);state.mapRoute=id;localStorage.setItem("kadastr-map-route",id);state.mapLayer.clearLayers();const status=document.querySelector("#mapStatus");status.textContent="Показываю точные координаты и базу…";const bounds=[[START_POINT.lat,START_POINT.lon]],pts=[[START_POINT.lat,START_POINT.lon]];const base=L.marker([START_POINT.lat,START_POINT.lon]).addTo(state.mapLayer);base.bindPopup(`<b>🏁 ${START_POINT.label}</b><br><small>${START_POINT.lat.toFixed(6)}, ${START_POINT.lon.toFixed(6)}</small>`);route.stops.forEach((stop,i)=>{const p=pointForStop(stop);if(!p)return;pts.push([p.lat,p.lon]);const marker=L.marker([p.lat,p.lon]).addTo(state.mapLayer);marker.bindPopup(`<b>${i+1}. ${stop}</b><br><small>Точная координата из предоставленного списка</small><br><small>${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}</small>`);bounds.push([p.lat,p.lon]);});pts.push([START_POINT.lat,START_POINT.lon]);if(pts.length>2){try{const u=`https://router.project-osrm.org/route/v1/driving/${pts.map(p=>`${p[1]},${p[0]}`).join(";")}?overview=full&geometries=geojson&steps=false`;const rr=await fetch(u);const rd=await rr.json();if(rd.code==="Ok"&&rd.routes?.[0]?.geometry)L.geoJSON(rd.routes[0].geometry,{style:{weight:5}}).addTo(state.mapLayer);}catch(e){}}if(bounds.length){state.map.fitBounds(bounds,{padding:[30,30]});status.textContent=`🏁 База → ${route.stops.length} точек → 🏁 база. Показано ${bounds.length-1} точек.`}else status.textContent="Не удалось загрузить точки."}
function mapGo(){const id=Number(document.querySelector('#mapRouteSelect').value);navigate(id)}

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ GPS С ПРАВИЛЬНОЙ ОБРАБОТКОЙ РАЗРЕШЕНИЙ
async function locate(){
  const el=document.querySelector("#locationStatus");
  if(!el) return;
  el.textContent="🔄 Запрашиваю GPS…";
  
  try {
    // Проверяем наличие функции askGPS из v18-gps-and-ui.js
    if(window.kadastrGPSv18?.askGPS){
      const permissionOk = await window.kadastrGPSv18.askGPS();
      if(!permissionOk) {
        el.textContent="❌ GPS запрещён. Разреши в настройках.";
        return;
      }
      
      // Пытаемся получить позицию
      const p = await window.kadastrGPSv18.getPosition();
      el.textContent=`✅ GPS: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} (±${Math.round(p.coords.accuracy||0)}м)`;
      return;
    }
    
    // Fallback: проверяем Capacitor напрямую (если v18 не загружена)
    const geo = window.Capacitor?.Plugins?.Geolocation;
    if(geo){
      try{
        let perm = await geo.checkPermissions();
        if(perm.location !== 'granted' && perm.location !== 'limited'){
          perm = await geo.requestPermissions({permissions:['location']});
          if(perm.location !== 'granted' && perm.location !== 'limited'){
            el.textContent="❌ GPS запрещён. Разреши в настройках Android.";
            return;
          }
        }
        const p = await geo.getCurrentPosition({enableHighAccuracy:true,timeout:15000});
        el.textContent=`✅ GPS: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} (±${Math.round(p.coords.accuracy||0)}м)`;
        return;
      }catch(e){
        throw e;
      }
    }
    
    // Fallback: используем browser Geolocation API
    if(!navigator.geolocation){
      throw new Error("NO_GPS");
    }
    
    navigator.geolocation.getCurrentPosition(
      p => {
        el.textContent=`✅ GPS: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} (±${Math.round(p.coords.accuracy||0)}м)`;
      },
      err => {
        el.textContent="❌ Не удалось получить GPS. Проверь разрешение.";
      },
      {enableHighAccuracy:true,timeout:15000,maximumAge:3000}
    );
    
  }catch(e){
    const msg = String(e?.message||e||'');
    if(/permission|denied/i.test(msg)){
      el.textContent="❌ GPS запрещён. Открой: Настройки → Приложения → Кадастр Маршрут → Разрешения → Местоположение.";
    } else if(/timeout/i.test(msg)){
      el.textContent="⏱ Истекло время ожидания GPS. Убедись, что GPS включён.";
    } else {
      el.textContent="❌ Не удалось получить GPS. Включи GPS и разреши доступ.";
    }
  }
}

function openCalculator(){const s=settings();modal(`<h2>Калькулятор поездки</h2><form id="calcForm" class="form-grid"><label>Километраж, км<input type="number" name="km" min="0" step="0.1" placeholder="Например, 185" required></label><p class="muted">Сейчас: ${s.rate.toLocaleString("ru-RU")} сум/км · ${s.consumption} л/100 км · ${s.price.toLocaleString("ru-RU")} сум/л</p><div id="calcResult" class="calc-result"></div><div class="modal-actions"><button class="cancel" data-close type="button">Закрыть</button><button class="save">Рассчитать</button></div></form>`);}
function openMonthSummary(){const now=new Date(),y=now.getFullYear(),m=now.getMonth(),items=trips().filter(t=>{const d=new Date(t.date);return d.getFullYear()===y&&d.getMonth()===m});const km=items.reduce((a,t)=>a+Number(t.km||0),0),fuel=items.reduce((a,t)=>a+Number(t.fuelCost||0),0),comp=items.reduce((a,t)=>a+Number(t.compensation??(t.km*settings().rate)),0),net=comp-fuel;modal(`<h2>Итог за ${now.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</h2><div class="month-grid"><div><b>${items.length}</b><small>поездок</small></div><div><b>${km.toFixed(1)} км</b><small>километраж</small></div><div><b>${money(comp)}</b><small>компенсация</small></div><div><b>${money(fuel)}</b><small>топливо</small></div><div><b>${money(net)}</b><small>остаток</small></div></div><p class="muted">В расчёт входят сохранённые поездки из планировщика.</p><div class="modal-actions"><button class="save" data-close type="button">Готово</button></div>`)}

window.routes=routes; window.stopCoords=stopCoords; window.START_POINT=START_POINT;
renderToday();renderRoutes();renderLog();renderStats();renderPlanner();renderTripHistory();initMap();
