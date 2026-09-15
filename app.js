(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money=n=>`${Math.round(Number(n)||0).toLocaleString('ru-RU')} сум`;
  const num=n=>Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:1});
  const dateFmt=d=>new Date(d).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const key=s=>`k2-${s}`;
  const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(key(k))||JSON.stringify(f))}catch{return f}};
  const save=(k,v)=>localStorage.setItem(key(k),JSON.stringify(v));
  async function fileToDataUrl(file,maxSide=1600,quality=.82){
    if(!file)return null;
    return await new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,maxSide/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',quality));};img.onerror=reject;img.src=r.result};
      r.onerror=reject;r.readAsDataURL(file);
    });
  }
  function photoFile(dataUrl,filename){try{const [head,b64]=dataUrl.split(',');const bin=atob(b64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new File([bytes],filename,{type:(head.match(/data:([^;]+)/)||[])[1]||'image/jpeg'});}catch{return null}}
  const branchByName=name=>{const c=COORDS[name]||[];return {name,lat:c[0],lon:c[1],phone:BRANCH_PHONES[name]||'',staffPhone:STAFF_PHONES[name]||'',...(BRANCH_INFO[name]||{})}};
  const allBranches=()=>Object.keys(COORDS).map(branchByName);
  const settings=()=>{
    const d={rate:1000,fuelPrice:5200,consumption:9,fuel:'Метан',tankLiters:100,fullFillCost:105000,fullRangeKm:225,navigation:'yandex'};
    const v=load('settings',d);
    if(v.fuel==='Пропан' && Number(v.fuelPrice)===8500 && Number(v.consumption)===7){const migrated={...v,fuel:'Метан',fuelPrice:5200,consumption:9,tankLiters:100,fullFillCost:105000,fullRangeKm:225,navigation:v.navigation||'yandex'};save('settings',migrated);return migrated}
    if(!v.navigation){const migrated={...v,navigation:'yandex'};save('settings',migrated);return migrated}
    return {...d,...v};
  };
  const visits=()=>load('visits',[]);
  const trips=()=>load('trips',[]);
  const refuels=()=>load('refuels',[]);
  const expenses=()=>load('expenses',[]);
  let tab='home';
  let planner={origin:null,points:[],suggestions:[],busy:false,includeHomeReturn:true};
  let lastGps=null,activeTrip=load('activeTrip',null);
  const MapsLauncher=window.Capacitor?.registerPlugin ? window.Capacitor.registerPlugin('MapsLauncher') : null;

  function hav(a,b){const R=6371, p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLon=(b.lon-a.lon)*p;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
  async function osrmDistance(a,b){
    try{const u=`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;const r=await fetch(u);if(!r.ok)throw 0;const j=await r.json();if(j.routes?.[0])return {km:j.routes[0].distance/1000,min:j.routes[0].duration/60,road:true};}catch{}
    const km=hav(a,b);return {km:km*1.18,min:km*1.18/45*60,road:false};
  }
  async function osrmRoute(points){
    if(points.length<2)return {km:0,min:0};
    try{const u=`https://router.project-osrm.org/route/v1/driving/${points.map(p=>`${p.lon},${p.lat}`).join(';')}?overview=false&steps=false`;const r=await fetch(u);if(!r.ok)throw 0;const j=await r.json();if(j.routes?.[0])return {km:j.routes[0].distance/1000,min:j.routes[0].duration/60,road:true};}catch{}
    let km=0;for(let i=1;i<points.length;i++)km+=hav(points[i-1],points[i])*1.18;return {km,min:km/45*60,road:false};
  }
  function googleMapsUrl(points){
    const p=points.filter(Boolean);
    if(p.length<2)return '#';
    const origin=`${p[0].lat},${p[0].lon}`;
    const destination=`${p[p.length-1].lat},${p[p.length-1].lon}`;
    const waypoints=p.length>2?p.slice(1,-1).map(x=>`${x.lat},${x.lon}`).join('|'):'';
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate${waypoints?`&waypoints=${encodeURIComponent(waypoints)}`:''}`;
  }
  function yandexNavigatorUrl(points){
    const p=points.filter(Boolean);
    if(p.length<2)return '#';
    const q=new URLSearchParams();
    q.set('lat_from',p[0].lat);q.set('lon_from',p[0].lon);
    q.set('lat_to',p[p.length-1].lat);q.set('lon_to',p[p.length-1].lon);
    p.slice(1,-1).forEach((x,i)=>{q.set(`lat_via_${i}`,x.lat);q.set(`lon_via_${i}`,x.lon)});
    return `yandexnavi://build_route_on_map?${q.toString()}`;
  }
  function yandexWebUrl(points){
    const p=points.filter(Boolean);
    if(p.length<2)return '#';
    return `https://yandex.com/maps/?rtext=${encodeURIComponent(p.map(x=>`${x.lat},${x.lon}`).join('~'))}&rtt=auto`;
  }
  async function openNavigation(points){
    const nav=settings().navigation||'yandex';
    const url=nav==='google'?googleMapsUrl(points):yandexNavigatorUrl(points);
    const pkg=nav==='google'?'com.google.android.apps.maps':'ru.yandex.yandexnavi';
    if(url==='#')return false;
    try{
      const plugin=MapsLauncher || window.Capacitor?.Plugins?.MapsLauncher;
      if(plugin?.openRoute){ await plugin.openRoute({url,packageName:pkg,fallbackUrl:nav==='google'?googleMapsUrl(points):yandexWebUrl(points)}); return true; }
    }catch(e){}
    if(nav==='google'){
      try{ window.open(url,'_blank'); return true; }catch{}
      try{ window.location.href=url; return true; }catch{}
    }else{
      try{ window.location.href=url; return true; }catch{}
      try{ window.open(yandexWebUrl(points),'_blank'); return true; }catch{}
    }
    return false;
  }
  function routePoints(){const out=[];if(planner.origin)out.push(planner.origin);for(const n of planner.points)out.push(branchByName(n));if(planner.includeHomeReturn && planner.points.length)out.push({name:'Дом',...START_POINT});return out;}
  function pendingBranches(){const done=new Set(visits().filter(v=>v.status!=='Отменено').map(v=>v.branch));return allBranches().filter(b=>!done.has(b.name));}
  function lastPoint(){if(planner.points.length)return branchByName(planner.points.at(-1));return planner.origin;}

  function render(){
    $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    if(tab==='home')renderHome();if(tab==='branches')renderBranches();if(tab==='reports')renderReports();if(tab==='finance')renderFinance();if(tab==='settings')renderSettings();
    updateWorkStatus();
  }
  function updateWorkStatus(){const s=$('#workStatus');if(!s)return;s.textContent=activeTrip?`В работе · ${num(activeTrip.km)} км`:'Работа не начата';s.classList.toggle('on',!!activeTrip)}

  function renderHome(){
    const s=settings(), ts=trips(), vs=visits(), rs=refuels();
    const km=ts.reduce((a,t)=>a+Number(t.km||0),0)+visits().filter(v=>v.source==='manual').reduce((a,v)=>a+Number(v.km||0),0), compensation=km*s.rate, fuelSpent=rs.reduce((a,r)=>a+Number(r.total||0),0), estimated=km/100*s.consumption*s.fuelPrice;
    const net=compensation-fuelSpent;
    $('#screen').innerHTML=`<section class="page home"><div class="hero"><div><div class="eyebrow">Полевой помощник</div><h1>Ваш рабочий маршрут</h1><p>Выбирайте точку, стройте маршрут до 4 филиалов и ведите фактический пробег.</p></div><div class="hero-mark">⌖</div></div>
      <div class="stats"><div><span>Пробег</span><b>${num(km)} км</b><small>по дорожному маршруту</small></div><div><span>Заправки</span><b>${money(fuelSpent)}</b><small>${rs.length} записей</small></div><div><span>Компенсация</span><b>${money(compensation)}</b><small>${s.rate.toLocaleString('ru-RU')} сум/км</small></div><div><span>Чистыми</span><b>${money(net)}</b><small>компенсация − заправки</small></div></div>
      <div class="quick"><div><b>${vs.length}</b><span>посещено</span></div><div><b>${47-vs.length}</b><span>осталось</span></div><div><b>${num(estimated)} ${s.fuel==='Метан'?'м³':'л'}</b><span>расчётное топливо</span></div></div>
      ${activeTrip?activeTripCard():`<button class="start-work" id="startWork">▶ Начать работу</button>`}
      <div class="section-head"><h2>Что дальше</h2></div><div class="tips"><article><b>1</b><span>Выберите дом или филиал как старт.</span></article><article><b>2</b><span>Добавьте до 4 ближайших филиалов.</span></article><article><b>3</b><span>Нажмите «Навигация» — пробег рассчитается по дорожному маршруту.</span></article></div>
      </section>`;
    $('#startWork')?.addEventListener('click',openPlanner);
    $('#finishWork')?.addEventListener('click',finishTrip);
    $('#resumeNavigation')?.addEventListener('click',resumeActiveNavigation);
    $('#homeNavigation')?.addEventListener('click',resumeActiveNavigation);
    $('#activeVisit')?.addEventListener('click',()=>{
      const done=activeTrip?.completed||[], next=(activeTrip?.points||[]).find(n=>!done.includes(n));
      if(next) openActiveVisitForm(next);
    });

  }
  function activeTripCard(){
    const done=activeTrip.completed||[], remaining=(activeTrip.points||[]).filter(n=>!done.includes(n));
    const next=remaining[0];
    const route=(activeTrip.routeNames&&activeTrip.routeNames.length?activeTrip.routeNames:(activeTrip.includeHomeReturn?[activeTrip.origin,...(activeTrip.points||[]),'Дом']:[activeTrip.origin,...(activeTrip.points||[])])); const routeText=route.join(' → '); const homePending=!next&&activeTrip.includeHomeReturn&&!activeTrip.homeNavigationStarted; const homeStarted=!next&&activeTrip.includeHomeReturn&&activeTrip.homeNavigationStarted; return `<div class="active-card"><div><div class="eyebrow">Активная поездка</div><h2>${esc(routeText||'Маршрут')}</h2><p>Расчётный дорожный пробег · ${num(activeTrip.km)} км${activeTrip.plannedMin?` · ${activeTrip.plannedMin} мин`:''}</p><p><b>Посещено: ${done.length}/${(activeTrip.points||[]).length}</b>${next?` · следующий: ${esc(next)}`:homeStarted?' · возвращение домой начато':homePending?' · филиалы завершены':' · маршрут завершён'}</p></div><div class="actions">${next?`<button class="primary" id="resumeNavigation">🧭 Продолжить к следующему</button><button class="ghost" id="activeVisit">✓ Отчёт о посещении</button>`:homePending?`<button class="primary" id="homeNavigation">⌂ Навигация домой</button>`:homeStarted?`<button class="primary" id="homeNavigation">🧭 Продолжить домой</button>`:''}<button class="danger" id="finishWork">${homeStarted?'Я дома — завершить':'Завершить'}</button></div></div>`
  }

  function openPlanner(){
    planner={origin:null,points:[],suggestions:[],busy:false,includeHomeReturn:true};
    showModal(`<h2>Начать работу</h2><p class="muted">С какой точки начинаем маршрут?</p><div class="origin-grid"><button class="origin" data-origin="home"><strong>⌂ Дом</strong><span>Точка старта / возврата</span></button><button class="origin" data-origin="branch"><strong>▦ Филиал</strong><span>Выберите филиал из списка</span></button></div><div id="plannerStep"></div>`);
    $$('.origin').forEach(b=>b.addEventListener('click',()=>chooseOrigin(b.dataset.origin)));
  }
  function chooseOrigin(type){
    if(type==='home'){planner.origin={name:'Дом',...START_POINT};planner.includeHomeReturn=false;renderPlannerStep();refreshSuggestions();}
    else{
      const opts=allBranches().map(b=>`<option value="${esc(b.name)}">${esc(b.name)} · ${esc(b.region||'')}</option>`).join('');
      $('#plannerStep').innerHTML=`<label class="field">Стартовый филиал<select id="originSelect"><option value="">Выберите...</option>${opts}</select></label>`;
      $('#originSelect').addEventListener('change',e=>{if(e.target.value){planner.origin=branchByName(e.target.value);renderPlannerStep();refreshSuggestions();}});
    }
  }
  function renderPlannerStep(){
    const o=planner.origin;if(!o)return;
    const fromHome=o.name==='Дом';
    $('#plannerStep').innerHTML=`<div class="origin-picked"><span>Старт</span><b>${esc(o.name)}</b></div><div id="routeSummary" class="route-summary"><span>Подсчитываем...</span></div><div class="field"><label>Возврат домой <input id="returnHome" type="checkbox" ${planner.includeHomeReturn?'checked':''}> <span class="switch-text">${fromHome?'вернуться домой после последнего филиала':'добавить Дом в конец маршрута'}</span></label></div><div class="field"><input id="plannerSearch" class="search" placeholder="🔎 Поиск филиала…" autocomplete="off"></div><div class="section-head compact"><h3>Ближайшие филиалы</h3><small>${fromHome?'От Дома · сортировка по расстоянию':'От текущей точки · по дороге'}</small></div><div id="suggestions" class="suggestions"><div class="loading">Рассчитываем расстояние и время…</div></div><div class="selected-box"><div class="section-head compact"><h3>Маршрут <span id="routeCount">${planner.points.length}/4</span></h3><small id="routeHint">${planner.points.length?'точки выбраны':'можно ограничиться одной'}</small></div><div id="selectedPoints"></div><div class="planner-actions"><button class="primary" id="navigatePlan" ${planner.points.length?'':'disabled'}>🧭 Навигация</button><button class="ghost" id="clearPlan">Сбросить</button></div></div>`;
    if($('#returnHome')) $('#returnHome').addEventListener('change',e=>{planner.includeHomeReturn=e.target.checked;updateRouteSummary()});
    $('#plannerSearch')?.addEventListener('input',()=>renderSuggestionList());
    $('#navigatePlan').addEventListener('click',startNavigation);
    $('#clearPlan').addEventListener('click',()=>{planner.points=[];renderPlannerStep();refreshSuggestions()});
    updateSelected();updateRouteSummary();
  }
  function updateSelected(){
    const el=$('#selectedPoints');if(!el)return;
    el.innerHTML=planner.points.length?planner.points.map((n,i)=>`<div class="selected-row"><span>${i+1}</span><b>${esc(n)}</b><button data-remove="${esc(n)}">×</button></div>`).join(''):'<div class="empty">Пока ни одного филиала. Нажмите «Добавить».</div>';
    const count=$('#routeCount');if(count)count.textContent=`${planner.points.length}/4`;
    const hint=$('#routeHint');if(hint)hint.textContent=planner.points.length?'точки выбраны':'можно ограничиться одной';
    const nav=$('#navigatePlan');if(nav)nav.disabled=planner.points.length===0;
    $$('[data-remove]').forEach(b=>b.addEventListener('click',()=>{planner.points=planner.points.filter(x=>x!==b.dataset.remove);updateSelected();updateRouteSummary();refreshSuggestions()}));
  }
  async function refreshSuggestions(){
    const el=$('#suggestions');if(!el||!planner.origin)return;
    const base=lastPoint()||planner.origin;
    el.innerHTML='<div class="loading">Рассчитываем ближайшие филиалы…</div>';
    const excluded=new Set([planner.origin.name,...planner.points]);
    const all=pendingBranches().filter(b=>!excluded.has(b.name));
    all.sort((a,b)=>hav(base,a)-hav(base,b));
    // Keep every branch searchable, while calculating exact road distance for the nearest candidates.
    const results=all.map(b=>({...b,km:hav(base,b)*1.18,min:hav(base,b)*1.18/45*60,road:false}));
    for(const b of all.slice(0,14)){
      const d=await osrmDistance(base,b);
      const i=results.findIndex(x=>x.name===b.name);
      if(i>=0)results[i]={...results[i],...d};
    }
    results.sort((a,b)=>a.km-b.km);
    planner.suggestions=results;
    renderSuggestionList();
  }
  function renderSuggestionList(){
    const el=$('#suggestions');if(!el)return;
    const q=($('#plannerSearch')?.value||'').trim().toLowerCase();
    const list=planner.suggestions.filter(b=>!q||b.name.toLowerCase().includes(q)||(b.region||'').toLowerCase().includes(q));
    el.innerHTML=list.length?list.map((b,i)=>{const visited=visits().some(v=>v.branch===b.name&&v.status!=='Отменено');return `<article class="suggestion"><div class="rank">${i+1}</div><div class="suggestion-main"><b>${esc(b.name)}</b><span>${b.region?esc(b.region):''}${visited?' · уже посещён':''}</span><small>🚗 ${b.km.toFixed(1)} км · ⏱ ${Math.round(b.min)} мин${b.road?'':' · ориентир'}</small></div><button class="add" data-add="${esc(b.name)}" ${planner.points.length>=4?'disabled':''}>Добавить</button></article>`}).join(''):'<div class="empty">Ничего не найдено.</div>';
    bindSuggestionButtons();
  }
  function bindSuggestionButtons(){
    $$('[data-add]').forEach(b=>b.addEventListener('click',()=>{
      const item=planner.suggestions.find(x=>x.name===b.dataset.add);
      if(item?.isHome){planner.includeHomeReturn=true;const rh=$('#returnHome');if(rh)rh.checked=true;updateRouteSummary();return;}
      if(planner.points.length>=4)return;
      planner.points.push(b.dataset.add);
      updateSelected();updateRouteSummary();refreshSuggestions();
    }));
  }
  async function updateRouteSummary(){const el=$('#routeSummary');if(!el||!planner.origin)return;const pts=routePoints();el.innerHTML='<span>Считаем маршрут…</span>';const d=await osrmRoute(pts);if($('#routeSummary'))$('#routeSummary').innerHTML=`<b>${d.km.toFixed(1)} км</b><span>⏱ ${Math.round(d.min)} мин · ${d.road?'по дорогам':'ориентировочно'}</span>`;}

  async function startNavigation(){
    const pts=routePoints();
    if(planner.points.length===0)return;
    const btn=$('#navigatePlan');
    if(btn){btn.disabled=true;btn.textContent='⏳ Считаем маршрут…';}
    const d=await osrmRoute(pts);
    const trip={id:crypto.randomUUID?.()||String(Date.now()),startedAt:new Date().toISOString(),points:planner.points.slice(),routeNames:pts.map(p=>p.name),origin:planner.origin.name,includeHomeReturn:planner.includeHomeReturn,km:Number(d.km.toFixed(1)),plannedMin:Math.round(d.min),samples:0,calculation:'Дорожный маршрут',completed:[],currentFrom:planner.origin.name,homeNavigationStarted:false};
    activeTrip=trip;
    save('activeTrip',trip);
    // No GPS is required: the trip mileage is the road distance of the selected route.
    closeModal();
    render();
    const opened=await openNavigation(pts);
    if(!opened)alert(`Не удалось открыть ${settings().navigation==='google'?'Google Maps':'Яндекс.Навигатор'}. Проверьте, что приложение установлено.`);
  }

  async function resumeActiveNavigation(){
    if(!activeTrip)return;
    const done=activeTrip.completed||[];
    const remaining=(activeTrip.points||[]).filter(n=>!done.includes(n));
    let pts=[];
    const fromName=done.length?done[done.length-1]:activeTrip.origin;
    const from=fromName==='Дом'?{name:'Дом',...START_POINT}:branchByName(fromName);
    if(remaining.length){
      pts=[from,...remaining.map(branchByName)];
    }else if(activeTrip.includeHomeReturn && fromName!=='Дом'){
      pts=[from,{name:'Дом',...START_POINT}];
      activeTrip={...activeTrip,homeNavigationStarted:true}; save('activeTrip',activeTrip);
    }else{
      alert('Все точки маршрута уже отмечены.');
      return;
    }
    const opened=await openNavigation(pts);
    if(!opened)alert(`Не удалось открыть ${settings().navigation==='google'?'Google Maps':'Яндекс.Навигатор'}. Проверьте, что приложение установлено.`);
  }

  function openActiveVisitForm(branch){
    const done=activeTrip?.completed||[];
    const from=done.length?done[done.length-1]:activeTrip?.origin||'Дом';
    openVisitForm(null,branch,from,true);
  }

    function getGeo(){return null}
  function startGps(){}
  function stopGps(){}
  function handleGps(){}
  function autoVisit(){}
  function toggleWatch(){return}
  function finishTrip(){
    if(!activeTrip)return;
    const names=activeTrip.points||[];
    const previous=new Map(visits().filter(v=>names.includes(v.branch)).map(v=>[v.branch,v]));
    const rows=names.map((n,i)=>{const v=previous.get(n)||{};return `<div class="finish-visit-row"><div class="finish-visit-head"><b>${i+1}. ${esc(n)}</b><label class="finish-status">Статус<select data-visit-status="${esc(n)}"><option ${!v.status||v.status==='Посещено'?'selected':''}>Посещено</option><option ${v.status==='Частично выполнено'?'selected':''}>Частично выполнено</option><option ${v.status==='Нужно повторно'?'selected':''}>Нужно повторно</option><option ${v.status==='Проблема'?'selected':''}>Проблема</option></select></label></div><textarea data-visit-note="${esc(n)}" placeholder="Результат визита, что сделано, что осталось…">${esc(v.notes||'')}</textarea></div>`}).join('');
    showModal(`<h2>Завершение маршрута</h2><p class="muted">Расчётный пробег: <b>${num(activeTrip.km)} км</b>. Укажите результат по каждому филиалу.</p><div class="finish-visits">${rows}</div><label class="field">📸 Фото из Яндекс.Навигатора с фактическим километражом<input id="tripNavPhoto" type="file" accept="image/*"></label><p class="hint">Сделайте скриншот Яндекс.Навигатора после поездки и прикрепите его к отчёту.</p><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="finishTripSave">Сохранить поездку и посещения</button></div>`);
    $('#finishTripSave').onclick=async()=>{
      const btn=$('#finishTripSave');btn.disabled=true;btn.textContent='Сохраняем…';
      const now=new Date().toISOString(),old=visits(),result=[];
      names.forEach(n=>{const q=`[data-visit-status="${CSS.escape(n)}"]`,qn=`[data-visit-note="${CSS.escape(n)}"]`,status=$(q)?.value||'Посещено',notes=$(qn)?.value?.trim()||'';result.push({branch:n,status,notes});old.unshift({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),branch:n,status,notes,date:now,tripId:activeTrip.id,routeKm:Number(activeTrip.km||0)})});
      save('visits',old.slice(0,2000));
      let navPhoto=activeTrip.navPhoto||null;const photo=$('#tripNavPhoto')?.files?.[0];if(photo){try{navPhoto=await fileToDataUrl(photo)}catch{}}
      const t={...activeTrip,finishedAt:now,date:now,visited:names.slice(),visitResults:result,routeNames:activeTrip.routeNames||[activeTrip.origin,...names,...(activeTrip.includeHomeReturn?['Дом']:[])],navPhoto};
      const a=trips();a.unshift(t);save('trips',a);save('activeTrip',null);activeTrip=null;lastGps=null;closeModal();render();
    };
  }

  function renderBranches(){
    const vs=visits();
    const latest=new Map();
    vs.forEach(v=>{if(!latest.has(v.branch))latest.set(v.branch,v)});
    const html=allBranches().map((b,i)=>{
      const x=branchByName(b.name),v=latest.get(b.name);
      return `<button class="branch-line" data-detail="${esc(b.name)}"><span class="branch-num">${i+1}</span><span class="branch-line-main"><b>${esc(b.name)}</b><small>${esc(x.region||'Филиал')} · ${v?`Последнее посещение: ${dateFmt(v.date)}`:'Не посещён'}</small></span><span class="branch-chevron">›</span></button>`;
    }).join('');
    $('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">47 объектов</div><h1>Филиалы</h1><p>Нажмите на филиал, чтобы открыть полную карточку.</p></div></div><input id="branchSearch" class="search" placeholder="Поиск филиала…"><div class="branch-list compact-list">${html}</div></section>`;
    $('#branchSearch').addEventListener('input',e=>{$$('.branch-line').forEach(x=>x.style.display=x.innerText.toLowerCase().includes(e.target.value.toLowerCase())?'':'none')});
    $$('[data-detail]').forEach(b=>b.addEventListener('click',()=>branchDetail(b.dataset.detail)));
  }
  function branchDetail(name){
    const b=branchByName(name),c=COORDS[name]||[],v=visits().find(x=>x.branch===name);
    showModal(`<div class="branch-modal-title"><div class="eyebrow">${esc(b.region||'Филиал')}</div><h2>${esc(name)}</h2><div class="coords">📍 ${c.length?c[0].toFixed(6)+', '+c[1].toFixed(6):'—'}</div></div><div class="branch-person"><div class="person-icon">👨‍💼</div><div><b>${esc(b.staff||'Не указан')}</b><span>Бош муҳандис / Ответственный</span><span class="branch-phone">📞 ${esc(b.staffPhone||'—')}</span></div></div><div class="branch-person"><div class="person-icon">💼</div><div><b>${esc(b.head||'Не указан')}</b><span>Филиал бошлиғи / Руководитель</span><span class="branch-phone">📞 ${esc(b.phone||'—')}</span></div></div><div class="detail-extra"><div><span>Адрес</span><b>${esc(b.address||'—')}</b></div><div><span>Email</span><b>${esc(b.email||'—')}</b></div><div><span>Последнее посещение</span><b>${v?dateFmt(v.date):'Не посещён'}</b></div></div><div class="branch-modal-actions"><button class="primary" id="branchNav">🧭 Навигация</button><button class="ghost" id="visitNow">✓ Посетить</button></div><div class="modal-actions"><button class="ghost" data-close>Закрыть</button></div>`);
    $('#branchNav').onclick=()=>{closeModal();singleNav(name)};
    $('#visitNow').onclick=()=>openVisitForm(null,name);
  }
  async function singleNav(name){
    planner={origin:{name:'Дом',...START_POINT},points:[name],suggestions:[],busy:false,includeHomeReturn:true};
    await startNavigation();
  }

  function reportPeriodMatch(date,period){const d=new Date(date),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());if(period==='today')return d>=today;if(period==='week')return d>=new Date(today.getTime()-6*86400000);if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();return true}
  function reportTrips(period){return trips().filter(t=>reportPeriodMatch(t.date||t.finishedAt||t.startedAt,period)).sort((a,b)=>new Date(b.date||b.finishedAt||b.startedAt)-new Date(a.date||a.finishedAt||a.startedAt))}
  function reportVisits(period){return visits().filter(v=>reportPeriodMatch(v.date,period)).sort((a,b)=>new Date(b.date)-new Date(a.date))}
  function buildReportText(period){const ts=reportTrips(period),vs=reportVisits(period),s=settings();const km=ts.reduce((a,t)=>a+Number(t.km||0),0)+vs.filter(v=>v.source==='manual').reduce((a,v)=>a+Number(v.km||0),0);const comp=km*s.rate;const lines=[`КАДАСТР МАРШРУТ — ОТЧЁТ`,`Период: ${period==='today'?'Сегодня':period==='week'?'Последние 7 дней':period==='month'?'Текущий месяц':'За всё время'}`,`Общий километраж: ${num(km)} км`,`Компенсация: ${money(comp)}`,`Филиалов посещено: ${new Set(vs.map(v=>v.branch)).size}`,``,...ts.map((t,i)=>`${i+1}. ${dateFmt(t.date||t.finishedAt||t.startedAt)} · ${num(t.km)} км · ${(t.routeNames||[]).join(' → ')}`),``,`Посещения:`,...vs.map(v=>`• ${v.branch} — ${dateFmt(v.date)} — ${v.status}${v.routeKm?` — маршрут ${num(v.routeKm)} км`:''}${v.notes?` — ${v.notes}`:''}`)];return lines.join('\n')}
  function openReportBuilder(){
    const period=load('reportPeriod','all');const ts=reportTrips(period),vs=reportVisits(period);const km=ts.reduce((a,t)=>a+Number(t.km||0),0)+vs.filter(v=>v.source==='manual').reduce((a,v)=>a+Number(v.km||0),0);
    const tripCards=ts.map((t,i)=>`<article class="report-trip"><div class="report-trip-head"><div><b>Поездка ${i+1}</b><span>${dateFmt(t.date||t.finishedAt||t.startedAt)}</span></div><strong>${num(t.km)} км</strong></div><div class="report-route">${esc((t.routeNames||[]).join(' → '))}</div><div class="report-trip-meta">Компенсация: ${money(Number(t.km||0)*settings().rate)} · посещено ${(t.visited||t.points||[]).length}/${(t.points||[]).length}</div>${t.navPhoto?`<img class="report-photo" src="${t.navPhoto}" alt="Скриншот Яндекс.Навигатора">`:''}<label class="photo-label">${t.navPhoto?'📷 Заменить фото':'📷 Добавить фото Яндекс.Навигатора'}<input type="file" accept="image/*" data-trip-photo="${esc(t.id)}"></label></article>`).join('');
    const visitRows=vs.map(v=>`<div class="report-detail-row"><div><b>${esc(v.branch)}</b><span>${dateFmt(v.date)} · ${esc(v.status)}</span>${v.notes?`<small>${esc(v.notes)}</small>`:''}</div><strong>${v.routeKm?num(v.routeKm)+' км':'—'}</strong></div>`).join('');
    showModal(`<h2>Создать отчёт</h2><p class="muted">Отчёт для руководителя: километраж, даты посещений, маршруты, результаты и фото из Яндекс.Навигатора с фактическим пробегом.</p><div class="report-builder-summary"><b>${num(km)} км</b><span>${ts.length} поездок · ${new Set(vs.map(v=>v.branch)).size} филиалов</span></div><div class="section-head compact"><h3>Поездки и фото</h3></div><div class="report-trip-list">${tripCards||'<div class="empty">Поездок за период нет.</div>'}</div><div class="section-head compact"><h3>Посещения</h3></div><div class="report-detail-list">${visitRows||'<div class="empty">Посещений нет.</div>'}</div><div class="modal-actions"><button class="ghost" data-close>Закрыть</button><button class="primary" id="shareReport">Поделиться отчётом</button></div>`);
    $$('[data-trip-photo]').forEach(inp=>inp.onchange=async e=>{const id=e.target.dataset.tripPhoto,file=e.target.files?.[0];if(!file)return;try{const photo=await fileToDataUrl(file);const a=trips(),i=a.findIndex(t=>t.id===id);if(i>=0){a[i]={...a[i],navPhoto:photo};save('trips',a);openReportBuilder()}}catch{alert('Не удалось сохранить фото.')}});
    $('#shareReport').onclick=()=>shareReport(period);
  }
  async function shareReport(period){const text=buildReportText(period),ts=reportTrips(period),photos=ts.map(t=>t.navPhoto).filter(Boolean).slice(0,5);try{if(navigator.share){const files=photos.map((p,i)=>photoFile(p,`yandex-${i+1}.jpg`)).filter(Boolean);if(files.length&&navigator.canShare?.({files}))await navigator.share({title:'Отчёт Кадастр Маршрут',text,files});else await navigator.share({title:'Отчёт Кадастр Маршрут',text});return}}catch(e){if(e?.name==='AbortError')return}try{await navigator.clipboard?.writeText(text);alert('Текст отчёта скопирован. Его можно отправить руководителю. Фото остаются в карточках поездок.')}catch{alert(text)}}
  function renderReports(){
    const allVs=reportVisits('all'),ts=trips(),period=load('reportPeriod','all'),filtered=reportVisits(period),unique=new Set(allVs.map(v=>v.branch).filter(Boolean));
    const repeat=allVs.filter(v=>v.status==='Нужно повторно').length,problems=allVs.filter(v=>v.status==='Проблема').length;
    const tripKm=ts.reduce((a,t)=>a+Number(t.km||0),0),manualKm=allVs.filter(v=>v.source==='manual').reduce((a,v)=>a+Number(v.km||0),0),km=tripKm+manualKm;
    const rows=filtered.map(v=>`<article class="report-row"><div><b>${esc(v.branch)}</b><span class="status-${esc(v.status).replace(/ /g,'-')}">${esc(v.status)}</span><small>${dateFmt(v.date)}${v.from?` · ${esc(v.from)} → ${esc(v.branch)}`:''}${v.routeKm?` · 🚗 ${num(v.routeKm)} км`:v.km?` · 🚗 ${num(v.km)} км`:''}</small>${v.notes?`<p>${esc(v.notes)}</p>`:''}</div><button class="ghost small" data-editvisit="${esc(v.id||v.date)}">Изменить</button></article>`).join('');
    $('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">Журнал работы</div><h1>Отчёты</h1><p>Посещения, результаты, километраж и отчёт для руководителя.</p></div><div class="actions"><button class="primary small" id="createReport">📄 Создать отчёт</button><button class="ghost small" id="addVisit">+ Посещение</button></div></div><div class="report-summary"><div><b>${unique.size}</b><span>филиалов посещено</span></div><div><b>${Math.max(0,47-unique.size)}</b><span>осталось</span></div><div><b>${repeat}</b><span>повторных</span></div><div><b>${problems}</b><span>проблем</span></div><div><b>${num(km)} км</b><span>общий километраж</span></div></div><div class="periods"><button class="period ${period==='all'?'active':''}" data-period="all">Все</button><button class="period ${period==='today'?'active':''}" data-period="today">Сегодня</button><button class="period ${period==='week'?'active':''}" data-period="week">7 дней</button><button class="period ${period==='month'?'active':''}" data-period="month">Месяц</button></div><div class="section-head compact"><h2>Посещения</h2><span>${filtered.length}</span></div><div id="reportList" class="report-list">${rows||'<div class="empty">Посещений за выбранный период нет.</div>'}</div><div class="card"><div class="section-head"><h2>История поездок</h2><span>${ts.length}</span></div>${ts.slice(0,30).map(t=>`<div class="trip-row"><div><b>${num(t.km)} км</b><span>${esc((t.routeNames&&t.routeNames.length?t.routeNames:[t.origin,...(t.points||[]),...(t.includeHomeReturn?['Дом']:[])]).join(' → '))}</span><small>${dateFmt(t.date)} · посещено ${(t.visited||[]).length}/${(t.points||[]).length}${t.navPhoto?' · 📷 Фото есть':''}</small></div><strong>${money(Number(t.km||0)*settings().rate)}</strong></div>`).join('')||'<div class="empty">Поездок пока нет.</div>'}</div></section>`;
    $('#createReport').onclick=openReportBuilder;$('#addVisit').onclick=()=>openManualTripForm();$$('[data-editvisit]').forEach(b=>b.onclick=()=>{const item=visits().find(v=>(v.id||v.date)===b.dataset.editvisit);if(item)openVisitForm(item)});$$('.period').forEach(b=>b.onclick=()=>{save('reportPeriod',b.dataset.period);renderReports()});
  }

  async function openManualTripForm(){
    const branches=allBranches();
    const opts=(sel='')=>branches.map(b=>`<option ${sel===b.name?'selected':''}>${esc(b.name)}</option>`).join('');
    const fromOpts=`<option value="Дом" selected>Дом</option>`+opts();
    showModal(`<h2>Добавить поездку</h2><p class="muted">Если забыли внести поездку, добавьте сразу несколько посещений в одну поездку. Километраж считается по всему маршруту, включая возврат домой.</p><form id="manualTripForm"><label class="field">Откуда<select id="manualTripFrom" name="from">${fromOpts}</select></label><label class="field">Дата и время поездки<input name="date" type="datetime-local" value="${new Date(new Date().getTime()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}" required></label><div class="section-head compact"><h3>Точки посещения</h3><span id="manualPointCount">1/4</span></div><div id="manualTripPoints"></div><button type="button" class="ghost" id="addTripPoint">+ Добавить ещё филиал</button><label class="check" style="margin-top:12px"><input id="manualReturnHome" name="returnHome" type="checkbox" checked> Вернуться домой</label><div id="manualTripSummary" class="route-summary"><span>🚗 Добавьте точки для расчёта маршрута</span></div><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary" id="saveManualTrip">Сохранить поездку</button></div></form>`);
    const pointsEl=$('#manualTripPoints'),fromEl=$('#manualTripFrom'),returnEl=$('#manualReturnHome'),summary=$('#manualTripSummary'),count=$('#manualPointCount');
    let pointData=[{branch:'',status:'Посещено',notes:''}];
    function renderPoints(){
      count.textContent=`${pointData.length}/4`;
      pointsEl.innerHTML=pointData.map((x,i)=>`<div class="card manual-point" data-point="${i}"><div class="section-head compact"><h3>Филиал ${i+1}</h3>${pointData.length>1?`<button type="button" class="ghost small" data-remove-point="${i}">Удалить</button>`:''}</div><label class="field">Куда<select data-point-branch="${i}"><option value="">Выберите филиал</option>${opts(x.branch)}</select></label><label class="field">Статус<select data-point-status="${i}"><option ${x.status==='Посещено'?'selected':''}>Посещено</option><option ${x.status==='Частично выполнено'?'selected':''}>Частично выполнено</option><option ${x.status==='Нужно повторно'?'selected':''}>Нужно повторно</option><option ${x.status==='Проблема'?'selected':''}>Проблема</option></select></label><label class="field">Что делал / результат<textarea data-point-notes="${i}" placeholder="Что сделали на этом филиале…">${esc(x.notes)}</textarea></label></div>`).join('');
      $$('[data-point-branch]').forEach(e=>e.onchange=()=>{pointData[Number(e.dataset.pointBranch)].branch=e.value;recalc()});
      $$('[data-point-status]').forEach(e=>e.onchange=()=>pointData[Number(e.dataset.pointStatus)].status=e.value);
      $$('[data-point-notes]').forEach(e=>e.oninput=()=>pointData[Number(e.dataset.pointNotes)].notes=e.value);
      $$('[data-remove-point]').forEach(e=>e.onclick=()=>{pointData.splice(Number(e.dataset.removePoint),1);renderPoints();recalc()});
    }
    function routeNodes(){
      const from=fromEl.value;const a=from==='Дом'?{...START_POINT,name:'Дом'}:branchByName(from);
      const valid=pointData.map(x=>x.branch).filter(Boolean).map(branchByName);
      const out=[a,...valid];
      if(returnEl.checked)out.push({...START_POINT,name:'Дом'});
      return out;
    }
    async function recalc(){
      const pts=routeNodes();
      if(pts.length<2){summary.innerHTML='<span>🚗 Добавьте хотя бы один филиал</span>';return null}
      summary.innerHTML='<span>🚗 Рассчитываем весь маршрут…</span>';
      const d=await osrmRoute(pts);if(!d){summary.innerHTML='<span>⚠️ Не удалось рассчитать маршрут</span>';return null}
      summary.innerHTML=`<b>${num(d.km)} км</b><span> · ⏱ ${Math.round(d.min)} мин · ${pts.map(x=>esc(x.name||'')).join(' → ')}</span>`;return d;
    }
    fromEl.onchange=recalc;returnEl.onchange=recalc;$('#addTripPoint').onclick=()=>{if(pointData.length>=4)return;pointData.push({branch:'',status:'Посещено',notes:''});renderPoints();recalc()};
    renderPoints();recalc();
    $('#saveManualTrip').onclick=async e=>{
      e.preventDefault();const btn=e.currentTarget;btn.disabled=true;
      const chosen=pointData.filter(x=>x.branch);if(!chosen.length){alert('Добавьте хотя бы один филиал.');btn.disabled=false;return}
      const d=await recalc();if(!d){btn.disabled=false;return}
      const f=new FormData($('#manualTripForm')),date=new Date(f.get('date')).toISOString(),from=f.get('from'),returnHome=returnEl.checked;
      const tripId=crypto.randomUUID?.()||String(Date.now()+Math.random());
      const nodes=routeNodes();let visitsArr=visits();
      for(let i=0;i<chosen.length;i++){
        const prev=nodes[i],kmLeg=await osrmRoute([prev,nodes[i+1]]);
        visitsArr.unshift({id:crypto.randomUUID?.()||String(Date.now()+Math.random()+i),branch:chosen[i].branch,from:prev.name||from,status:chosen[i].status,notes:(chosen[i].notes||'').trim(),date,km:Number((kmLeg?.km||0).toFixed(1)),source:'manual-trip',tripId});
      }
      save('visits',visitsArr.slice(0,2000));
      const trip={id:tripId,date,source:'manual',origin:from,points:chosen.map(x=>x.branch),visited:chosen.map(x=>x.branch),routeNames:nodes.map(x=>x.name||'Дом'),includeHomeReturn:returnHome,km:Number(d.km.toFixed(1)),plannedMin:Math.round(d.min),visitResults:chosen};
      const ts=trips();ts.unshift(trip);save('trips',ts.slice(0,1000));
      closeModal();render();
    };
  }

  async function openVisitForm(existing,preselectedBranch,preselectedFrom,activeMode=false){
    const branches=allBranches();
    const branchOpts=branches.map(b=>`<option ${existing?.branch===b.name||(!existing&&preselectedBranch===b.name)?'selected':''}>${esc(b.name)}</option>`).join('');
    const selectedFrom=existing?.from||preselectedFrom||'Дом';
    const fromOpts=[`<option value="Дом" ${selectedFrom==='Дом'?'selected':''}>Дом</option>`,...branches.map(b=>`<option ${selectedFrom===b.name?'selected':''}>${esc(b.name)}</option>`)].join('');
    const dt=existing?.date?new Date(existing.date):new Date();
    const local=new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
    showModal(`<h2>${activeMode?'Отчёт о посещении':(existing?'Изменить':'Добавить')+' посещение'}</h2><p class="muted">${activeMode?'Зафиксируйте, что сделали в филиале. После сохранения можно сразу продолжить путь к следующему филиалу.':'Если поездка была забыта, укажите откуда ехали, какой филиал посетили, дату и результат. Километраж будет добавлен в общий пробег.'}</p><form id="visitForm"><input type="hidden" name="activeFrom" value="${esc(selectedFrom)}"><input type="hidden" name="activeBranch" value="${esc(preselectedBranch||existing?.branch||'')}"><label class="field">Откуда<select name="from" ${activeMode?'disabled':''}>${fromOpts}</select></label><label class="field">Куда / филиал<select name="branch" ${activeMode?'disabled':''}>${branchOpts}</select></label><label class="field">Когда<input name="date" type="datetime-local" value="${local}" required></label><label class="field">Статус<select name="status"><option ${!existing||existing.status==='Посещено'?'selected':''}>Посещено</option><option ${existing?.status==='Частично выполнено'?'selected':''}>Частично выполнено</option><option ${existing?.status==='Нужно повторно'?'selected':''}>Нужно повторно</option><option ${existing?.status==='Проблема'?'selected':''}>Проблема</option></select></label><label class="field">Что делал / результат<textarea name="notes" placeholder="Например: передал документы, проверил оборудование, решил вопрос…">${esc(existing?.notes||'')}</textarea></label><div id="visitDistance" class="route-summary"><span>🚗 Километраж будет рассчитан по дороге</span></div><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary" id="saveManualVisit">${activeMode?'Сохранить':' '+(existing?'Сохранить изменения':'Добавить посещение')}</button>${activeMode?'<button type="button" class="ghost" id="saveAndContinue">Сохранить и продолжить путь</button>':''}</div></form>`);
    const form=$('#visitForm'),distEl=$('#visitDistance');
    async function recalc(){
      const from=form.elements.from.value,branch=form.elements.branch.value;if(!from||!branch||from===branch){distEl.innerHTML='<span>🚗 Укажите разные точки для расчёта километража</span>';return null;}
      const a=from==='Дом'?START_POINT:{lat:COORDS[from]?.[0],lon:COORDS[from]?.[1],label:from},b={lat:COORDS[branch]?.[0],lon:COORDS[branch]?.[1],label:branch};
      if(!a.lat||!b.lat){distEl.innerHTML='<span>🚗 Координаты недоступны</span>';return null;}
      distEl.innerHTML='<span>🚗 Рассчитываем дорожный пробег…</span>';
      const d=await osrmRoute([a,b]);
      if(!d){distEl.innerHTML='<span>⚠️ Не удалось рассчитать маршрут</span>';return null;}
      distEl.innerHTML=`<b>${num(d.km)} км</b><span> · ⏱ ${Math.round(d.min)} мин · будет добавлено в общий километраж</span>`;return d.km;
    }
    form.elements.from.onchange=recalc;form.elements.branch.onchange=recalc;recalc();
    async function saveForm(continueAfter){
      const btn=$('#saveManualVisit');if(btn)btn.disabled=true;
      const km=await recalc();if(km==null){if(btn)btn.disabled=false;return;}
      const f=new FormData(form),branch=activeMode?f.get('activeBranch'):f.get('branch'),from=activeMode?f.get('activeFrom'):f.get('from');
      const item={id:existing?.id||crypto.randomUUID?.()||String(Date.now()),branch,from,status:f.get('status'),notes:(f.get('notes')||'').trim(),date:new Date(f.get('date')).toISOString(),km:Number(km.toFixed(1)),source:activeMode?'trip':'manual',tripId:activeMode?activeTrip?.id:undefined};
      const arr=visits(),i=arr.findIndex(v=>v.id===item.id);if(i>=0)arr[i]=item;else arr.unshift(item);save('visits',arr.slice(0,2000));
      if(activeMode&&activeTrip){
        const completed=[...(activeTrip.completed||[])];if(!completed.includes(branch))completed.push(branch);
        activeTrip={...activeTrip,completed,currentFrom:branch};save('activeTrip',activeTrip);
      }
      closeModal();render();
      if(activeMode&&continueAfter) setTimeout(resumeActiveNavigation,120);
    }
    form.onsubmit=e=>{e.preventDefault();saveForm(false)};
    $('#saveAndContinue')?.addEventListener('click',()=>saveForm(true));
  }

  function saveVisit(v){const arr=visits();arr.unshift({...v,id:v.id||crypto.randomUUID?.()||String(Date.now())});save('visits',arr.slice(0,1000));}

  function renderFinance(){const s=settings(),km=trips().reduce((a,t)=>a+Number(t.km||0),0)+visits().filter(v=>v.source==='manual').reduce((a,v)=>a+Number(v.km||0),0),comp=km*s.rate,rf=refuels(),fuel=rf.reduce((a,r)=>a+Number(r.total||0),0),exp=expenses(),other=exp.reduce((a,r)=>a+Number(r.amount||0),0);$('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">Доходы и расходы</div><h1>Финансы</h1><p>Заправки и расчёт компенсации по маршрутам.</p></div></div><div class="finance-total"><span>Расчётный результат</span><b>${money(comp-fuel-other)}</b><small>${num(km)} км × ${s.rate.toLocaleString('ru-RU')} − ${money(fuel)} заправки − ${money(other)} прочее</small></div><div class="finance-actions"><button class="primary" id="addFuel">+ Заправка</button><button class="ghost" id="addExpense">+ Расход</button></div><div class="card"><div class="section-head"><h2>Заправки</h2><b>${money(fuel)}</b></div>${rf.slice(0,20).map(r=>`<div class="money-row"><div><b>${esc(r.fuel)}</b><span>${num(r.amount ?? r.liters)} ${r.unit || (r.fuel==='Метан'?'м³':'л')} · ${dateFmt(r.date)}</span></div><strong>${money(r.total)}</strong></div>`).join('')||'<div class="empty">Заправок пока нет.</div>'}</div><div class="card"><div class="section-head"><h2>Прочие расходы</h2><b>${money(other)}</b></div>${exp.slice(0,20).map(r=>`<div class="money-row"><div><b>${esc(r.title)}</b><span>${dateFmt(r.date)}</span></div><strong>${money(r.amount)}</strong></div>`).join('')||'<div class="empty">Других расходов нет.</div>'}</div></section>`;$('#addFuel').onclick=openFuel;$('#addExpense').onclick=openExpense;}
  function openFuel(){const s=settings();showModal(`<h2>Заправка</h2><form id="fuelForm"><label class="field">Топливо<select name="fuel" id="fuelFormType"><option ${s.fuel==='Бензин'?'selected':''}>Бензин</option><option ${s.fuel==='Пропан'?'selected':''}>Пропан</option><option ${s.fuel==='Метан'?'selected':''}>Метан</option></select></label><label class="field"><span id="fuelAmountLabel">${s.fuel==='Метан'?'Количество, м³':'Количество, л'}</span><input name="amount" id="fuelAmount" type="number" step="0.1" required></label><label class="field"><span id="fuelPriceLabel">${s.fuel==='Метан'?'Цена за м³':'Цена за литр'}</span><input name="price" id="fuelFormPrice" type="number" value="${s.fuelPrice}" required></label><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary">Сохранить</button></div></form>`);
    const type=$('#fuelFormType'), amount=$('#fuelAmount'), price=$('#fuelFormPrice');
    const sync=()=>{const methane=type.value==='Метан';$('#fuelAmountLabel').textContent=methane?'Количество, м³':'Количество, л';$('#fuelPriceLabel').textContent=methane?'Цена за м³':'Цена за литр';if(methane&&Number(price.value)===8500)price.value=5200;if(!methane&&Number(price.value)===5200)price.value=8500};type.addEventListener('change',sync);
    $('#fuelForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),fuel=f.get('fuel'),amountValue=Number(f.get('amount')),priceValue=Number(f.get('price'));const r={fuel,amount:amountValue,unit:fuel==='Метан'?'м³':'л',price:priceValue,total:amountValue*priceValue,date:new Date().toISOString()};const a=refuels();a.unshift(r);save('refuels',a);closeModal();render()}
  }
  function openExpense(){showModal(`<h2>Прочий расход</h2><form id="expenseForm"><label class="field">Название<input name="title" placeholder="Мойка, парковка, ремонт…" required></label><label class="field">Сумма<input name="amount" type="number" required></label><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary">Сохранить</button></div></form>`);$('#expenseForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),a=expenses();a.unshift({title:f.get('title'),amount:Number(f.get('amount')),date:new Date().toISOString()});save('expenses',a);closeModal();render()}}

  function renderSettings(){const s=settings();const methane=s.fuel==='Метан';$('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">Персонализация</div><h1>Настройки</h1><p>Расчёт топлива, компенсации и навигации.</p></div></div><div class="card"><h2>Автомобиль</h2><label class="field">Вид топлива<select id="fuelType"><option ${s.fuel==='Бензин'?'selected':''}>Бензин</option><option ${s.fuel==='Пропан'?'selected':''}>Пропан</option><option ${s.fuel==='Метан'?'selected':''}>Метан</option></select></label><label class="field">Расход, ${methane?'м³':'л'} на 100 км<input id="consumption" type="number" step="0.1" value="${s.consumption}"></label><label class="field">Цена топлива, сум/${methane?'м³':'л'}<input id="fuelPrice" type="number" value="${s.fuelPrice}"></label><div class="card-note"><b>Метан — твои текущие данные</b><span>Баллон 100 л · полная заправка примерно 100 000–110 000 сум · пробег 200–250 км.</span></div></div><div class="card"><h2>Навигация</h2><label class="field">Приложение для маршрута<select id="navigation"><option value="yandex" ${s.navigation!=='google'?'selected':''}>Яндекс.Навигатор</option><option value="google" ${s.navigation==='google'?'selected':''}>Google Maps</option></select></label><p class="hint">Выбранное приложение будет открываться после расчёта маршрута.</p></div><div class="card"><h2>Компенсация</h2><label class="field">Сумма за 1 км, сум<input id="rate" type="number" value="${s.rate}"></label><p class="hint">Компенсация считается по расчётному дорожному пробегу выбранных маршрутов.</p></div><div class="card"><h2>Учёт посещения</h2><p class="hint">GPS не используется. После завершения маршрута филиалы отмечаются вручную.</p></div><div class="card"><h2>Резервная копия</h2><p class="hint">Сохраните файл на телефон или в облако. Его можно импортировать обратно.</p><div class="settings-actions"><button class="primary" id="export">⬇ Экспортировать</button><button class="ghost" id="import">⬆ Импортировать</button><button class="danger" id="reset">Сбросить данные</button></div><input id="backupFile" type="file" accept="application/json,.json" style="display:none"></div></section>`;
    $('#fuelType').addEventListener('change',()=>{const fuel=$('#fuelType').value;const methane=fuel==='Метан';save('settings',{...settings(),fuel,consumption:methane?9:Number($('#consumption').value)||7,fuelPrice:methane?5200:Number($('#fuelPrice').value)||8500});render()});
    ['consumption','fuelPrice','rate','navigation'].forEach(id=>$('#'+id).addEventListener('change',()=>{save('settings',{...settings(),consumption:Number($('#consumption').value),fuelPrice:Number($('#fuelPrice').value),rate:Number($('#rate').value),navigation:$('#navigation').value});render()}));
    $('#export').onclick=exportData;$('#import').onclick=()=>$('#backupFile').click();$('#backupFile').onchange=e=>importData(e.target.files?.[0]);$('#reset').onclick=()=>{if(confirm('Удалить все поездки, посещения, заправки и настройки?')){Object.keys(localStorage).filter(k=>k.startsWith('k2-')).forEach(k=>localStorage.removeItem(k));location.reload()}};
  }
  async function exportData(){const data={version:4,app:'Кадастр Маршрут',exportedAt:new Date().toISOString(),settings:settings(),visits:visits(),trips:trips(),refuels:refuels(),expenses:expenses(),activeTrip};const content=JSON.stringify(data,null,2),filename=`kadastr-backup-${new Date().toISOString().slice(0,10)}.json`;try{const plugin=window.Capacitor?.Plugins?.BackupExporter;if(plugin?.exportJson){const r=await plugin.exportJson({filename,content});alert(`Резервная копия сохранена в папку Download${r?.filename?`\n${r.filename}`:''}.`);return}}catch(e){}try{const blob=new Blob([content],{type:'application/json;charset=utf-8'});if(navigator.share){const file=new File([blob],filename,{type:'application/json'});if(navigator.canShare?.({files:[file]})){await navigator.share({title:'Резервная копия Кадастр Маршрут',text:'Резервная копия данных',files:[file]});return}}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);alert('Резервная копия подготовлена. Если файл не скачался, выберите «Поделиться» в системном окне.') }catch(e){alert('Не удалось экспортировать резервную копию. Попробуйте через браузер Chrome или обновите приложение.')}}
  async function importData(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.visits)||!Array.isArray(data.trips)||!data.settings)throw 0;if(!confirm(`Импортировать резервную копию от ${data.exportedAt?dateFmt(data.exportedAt):'неизвестной даты'}? Текущие данные будут заменены.`))return;save('settings',data.settings);save('visits',data.visits);save('trips',data.trips);save('refuels',Array.isArray(data.refuels)?data.refuels:[]);save('expenses',Array.isArray(data.expenses)?data.expenses:[]);save('activeTrip',data.activeTrip||null);activeTrip=data.activeTrip||null;alert('Резервная копия успешно восстановлена.');render()}catch(e){alert('Не удалось импортировать резервную копию. Проверьте JSON-файл.')}}

  function showModal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden');$$('[data-close]').forEach(x=>x.onclick=closeModal)}
  const closeModal=()=>$('#modal').classList.add('hidden');

  $$('.tab').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render()}));$('#quickGps').onclick=()=>{if(activeTrip)finishTrip();else openPlanner()};
  function openGpsInfo(){showModal(`<h2>Учёт пробега</h2><p>GPS-доступ не требуется.</p><p class="hint">После нажатия «Навигация» приложение рассчитывает пробег по дорожному маршруту между выбранными точками и использует его для статистики и компенсации.</p><div class="modal-actions"><button class="primary" data-close>Понятно</button></div>`)}
  render();
})();
