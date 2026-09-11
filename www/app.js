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
  const allBranches=()=>Object.keys(COORDS).map(name=>({name,...COORDS[name] ? {lat:COORDS[name][0],lon:COORDS[name][1]}:{}}));
  const branchByName=name=>{const c=COORDS[name]||[];return {name,lat:c[0],lon:c[1],phone:BRANCH_PHONES[name]||'',staffPhone:STAFF_PHONES[name]||'',...(BRANCH_INFO[name]||{})}};
  const settings=()=>({...load('settings',{rate:1000,fuelPrice:8500,consumption:7,fuel:'Пропан',autoVisit:true,radius:200}),});
  const visits=()=>load('visits',[]);
  const trips=()=>load('trips',[]);
  const refuels=()=>load('refuels',[]);
  const expenses=()=>load('expenses',[]);
  let tab='home';
  let planner={origin:null,points:[],suggestions:[],busy:false,includeHomeReturn:true};
  let watchId=null,lastGps=null,activeTrip=load('activeTrip',null);

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
  function navUrl(points){
    const p=points.filter(Boolean);
    if(p.length<2)return '#';
    const origin=`${p[0].lat},${p[0].lon}`;
    const destination=`${p[p.length-1].lat},${p[p.length-1].lon}`;
    const waypoints=p.length>2?p.slice(1,-1).map(x=>`${x.lat},${x.lon}`).join('|'):'';
    const https=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate${waypoints?`&waypoints=${encodeURIComponent(waypoints)}`:''}`;
    return https;
  }
  async function openGoogleMaps(points){
    const url=navUrl(points);
    if(url==='#')return false;
    try{
      const plugin=window.Capacitor?.Plugins?.MapsLauncher;
      if(plugin?.openRoute){ await plugin.openRoute({url}); return true; }
    }catch(e){}
    try{ window.open(url,'_blank'); return true; }catch{}
    try{ window.location.href=url; return true; }catch{}
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
    const km=ts.reduce((a,t)=>a+Number(t.km||0),0), compensation=km*s.rate, fuelSpent=rs.reduce((a,r)=>a+Number(r.total||0),0), estimated=km/100*s.consumption*s.fuelPrice;
    const net=compensation-fuelSpent;
    $('#screen').innerHTML=`<section class="page home"><div class="hero"><div><div class="eyebrow">Полевой помощник</div><h1>Ваш рабочий маршрут</h1><p>Выбирайте точку, стройте маршрут до 4 филиалов и ведите фактический пробег.</p></div><div class="hero-mark">⌖</div></div>
      <div class="stats"><div><span>Пробег</span><b>${num(km)} км</b><small>по дорожному маршруту</small></div><div><span>Заправки</span><b>${money(fuelSpent)}</b><small>${rs.length} записей</small></div><div><span>Компенсация</span><b>${money(compensation)}</b><small>${s.rate.toLocaleString('ru-RU')} сум/км</small></div><div><span>Чистыми</span><b>${money(net)}</b><small>компенсация − заправки</small></div></div>
      <div class="quick"><div><b>${vs.length}</b><span>посещено</span></div><div><b>${47-vs.length}</b><span>осталось</span></div><div><b>${num(estimated)} л</b><span>расчётное топливо</span></div></div>
      ${activeTrip?activeTripCard():`<button class="start-work" id="startWork">▶ Начать работу</button>`}
      <div class="section-head"><h2>Что дальше</h2></div><div class="tips"><article><b>1</b><span>Выберите дом или филиал как старт.</span></article><article><b>2</b><span>Добавьте до 4 ближайших филиалов.</span></article><article><b>3</b><span>Нажмите «Навигация» — пробег рассчитается по дорожному маршруту.</span></article></div>
      </section>`;
    $('#startWork')?.addEventListener('click',openPlanner);
    $('#finishWork')?.addEventListener('click',finishTrip);

  }
  function activeTripCard(){return `<div class="active-card"><div><div class="eyebrow">Активная поездка</div><h2>${esc(activeTrip.points?.join(' → ')||'Маршрут')}</h2><p>Расчётный дорожный пробег · ${num(activeTrip.km)} км${activeTrip.plannedMin?` · ${activeTrip.plannedMin} мин`:''}</p></div><div class="actions"><button class="danger" id="finishWork">Завершить</button></div></div>`}

  function openPlanner(){
    planner={origin:null,points:[],suggestions:[],busy:false,includeHomeReturn:true};
    showModal(`<h2>Начать работу</h2><p class="muted">С какой точки начинаем маршрут?</p><div class="origin-grid"><button class="origin" data-origin="home"><strong>⌂ Дом</strong><span>Точка старта / возврата</span></button><button class="origin" data-origin="branch"><strong>▦ Филиал</strong><span>Выберите филиал из списка</span></button></div><div id="plannerStep"></div>`);
    $$('.origin').forEach(b=>b.addEventListener('click',()=>chooseOrigin(b.dataset.origin)));
  }
  function chooseOrigin(type){
    if(type==='home'){planner.origin={name:'Дом',...START_POINT};renderPlannerStep();refreshSuggestions();}
    else{
      const opts=allBranches().map(b=>`<option value="${esc(b.name)}">${esc(b.name)} · ${esc(b.region||'')}</option>`).join('');
      $('#plannerStep').innerHTML=`<label class="field">Стартовый филиал<select id="originSelect"><option value="">Выберите...</option>${opts}</select></label>`;
      $('#originSelect').addEventListener('change',e=>{if(e.target.value){planner.origin=branchByName(e.target.value);renderPlannerStep();refreshSuggestions();}});
    }
  }
  function renderPlannerStep(){
    const o=planner.origin;if(!o)return;
    $('#plannerStep').innerHTML=`<div class="origin-picked"><span>Старт</span><b>${esc(o.name)}</b></div><div id="routeSummary" class="route-summary"><span>Подсчитываем...</span></div><div class="field"><label>Возврат домой <input id="returnHome" type="checkbox" ${planner.includeHomeReturn?'checked':''}> <span class="switch-text">добавить Дом в конец маршрута</span></label></div><div class="section-head compact"><h3>Ближайшие филиалы</h3><small>По дороге от выбранной точки</small></div><div id="suggestions" class="suggestions"><div class="loading">Рассчитываем расстояние и время…</div></div><div class="selected-box"><div class="section-head compact"><h3>Маршрут <span>${planner.points.length}/4</span></h3><small>${planner.points.length?'точки выбраны':'можно ограничиться одной'}</small></div><div id="selectedPoints"></div><div class="planner-actions"><button class="primary" id="navigatePlan" ${planner.points.length?'':'disabled'}>🧭 Навигация</button><button class="ghost" id="clearPlan">Сбросить</button></div></div>`;
    $('#returnHome').addEventListener('change',e=>{planner.includeHomeReturn=e.target.checked;updateRouteSummary()});
    $('#navigatePlan').addEventListener('click',startNavigation);
    $('#clearPlan').addEventListener('click',()=>{planner.points=[];renderPlannerStep();refreshSuggestions()});
    updateSelected();updateRouteSummary();
  }
  function updateSelected(){const el=$('#selectedPoints');if(!el)return;el.innerHTML=planner.points.length?planner.points.map((n,i)=>`<div class="selected-row"><span>${i+1}</span><b>${esc(n)}</b><button data-remove="${esc(n)}">×</button></div>`).join(''):'<div class="empty">Пока ни одного филиала. Нажмите «Добавить».</div>';$$('[data-remove]').forEach(b=>b.addEventListener('click',()=>{planner.points=planner.points.filter(x=>x!==b.dataset.remove);updateSelected();updateRouteSummary();refreshSuggestions()}));}
  async function refreshSuggestions(){
    const el=$('#suggestions');if(!el||!planner.origin)return;el.innerHTML='<div class="loading">Рассчитываем реальные дорожные расстояния…</div>';
    const base=lastPoint()||planner.origin;const excluded=new Set([planner.origin.name,...planner.points]);let pool=pendingBranches().filter(b=>!excluded.has(b.name));
    // Straight-line prefilter keeps the OSRM requests practical. Suggestions are calculated from the last selected point.
    pool.sort((a,b)=>hav(base,a)-hav(base,b));pool=pool.slice(0,14);
    const results=[];for(const b of pool){const d=await osrmDistance(base,b);results.push({...b,...d});}
    if(base.name!=='Дом' && !planner.points.includes('Дом')){const d=await osrmDistance(base,START_POINT);results.push({name:'Дом',region:'Точка возврата',...d,isHome:true});}
    results.sort((a,b)=>a.km-b.km);planner.suggestions=results.slice(0,8);
    if(!$('#suggestions'))return;
    $('#suggestions').innerHTML=planner.suggestions.length?planner.suggestions.map((b,i)=>`<article class="suggestion"><div class="rank">${i+1}</div><div class="suggestion-main"><b>${esc(b.name)}</b><span>${b.region?esc(b.region):''}</span><small>🚗 ${b.km.toFixed(1)} км · ⏱ ${Math.round(b.min)} мин${b.road?'':' · ориентир'}</small></div><button class="add" data-add="${esc(b.name)}" ${b.isHome||planner.points.length>=4?'disabled':''}>${b.isHome?'Домой':'Добавить'}</button></article>`).join(''):'<div class="empty">Нет доступных филиалов.</div>';
    $$('[data-add]').forEach(b=>b.addEventListener('click',()=>{if(planner.suggestions.find(x=>x.name===b.dataset.add)?.isHome){planner.includeHomeReturn=true;const rh=$('#returnHome');if(rh)rh.checked=true;updateRouteSummary();return;}if(planner.points.length>=4)return;planner.points.push(b.dataset.add);updateSelected();updateRouteSummary();refreshSuggestions()}));
  }
  async function updateRouteSummary(){const el=$('#routeSummary');if(!el||!planner.origin)return;const pts=routePoints();el.innerHTML='<span>Считаем маршрут…</span>';const d=await osrmRoute(pts);if($('#routeSummary'))$('#routeSummary').innerHTML=`<b>${d.km.toFixed(1)} км</b><span>⏱ ${Math.round(d.min)} мин · ${d.road?'по дорогам':'ориентировочно'}</span>`;}

  async function startNavigation(){
    const pts=routePoints();
    if(planner.points.length===0)return;
    const btn=$('#navigatePlan');
    if(btn){btn.disabled=true;btn.textContent='⏳ Считаем маршрут…';}
    const d=await osrmRoute(pts);
    const trip={id:crypto.randomUUID?.()||String(Date.now()),startedAt:new Date().toISOString(),points:planner.points.slice(),origin:planner.origin.name,includeHomeReturn:planner.includeHomeReturn,km:Number(d.km.toFixed(1)),plannedMin:Math.round(d.min),samples:0,calculation:'Дорожный маршрут'};
    activeTrip=trip;
    save('activeTrip',trip);
    // No GPS is required: the trip mileage is the road distance of the selected route.
    closeModal();
    render();
    const opened=await openGoogleMaps(pts);
    if(!opened)alert('Не удалось открыть Google Maps. Попробуйте ещё раз.');
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
    showModal(`<h2>Завершить поездку</h2><p class="muted">Расчётный пробег маршрута: <b>${num(activeTrip.km)} км</b>. Отметьте филиалы, которые фактически посетили.</p><div class="finish-visits">${names.map(n=>`<label class="check"><input type="checkbox" name="done" value="${esc(n)}" checked> ${esc(n)}</label>`).join('')}</div><div class="modal-actions"><button class="ghost" data-close>Отмена</button><button class="primary" id="finishTripSave">Сохранить поездку</button></div>`);
    $('#finishTripSave').onclick=()=>{
      const selected=[...document.querySelectorAll('input[name="done"]:checked')].map(x=>x.value);
      selected.forEach(n=>saveVisit({branch:n,status:'Посещено',notes:'Посещение по завершённому маршруту',date:new Date().toISOString()}));
      const t={...activeTrip,finishedAt:new Date().toISOString(),date:new Date().toISOString(),visited:selected};
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
    showModal(`<div class="branch-modal-title"><div class="eyebrow">${esc(b.region||'Филиал')}</div><h2>${esc(name)}</h2><div class="coords">📍 ${c.length?c[0].toFixed(6)+', '+c[1].toFixed(6):'—'}</div></div><div class="branch-person"><div class="person-icon">👨‍💼</div><div><b>${esc(b.staff||'Не указан')}</b><span>Бош муҳандис / Ответственный</span><div class="branch-phone">📞 ${esc(b.staffPhone||'—')}</div></div></div><div class="branch-person"><div class="person-icon">💼</div><div><b>${esc(b.head||'Не указан')}</b><span>Филиал бошлиғи / Руководитель</span><div class="branch-phone">📞 ${esc(b.phone||'—')}</div></div></div><div class="detail-extra"><div><span>Адрес</span><b>${esc(b.address||'—')}</b></div><div><span>Email</span><b>${esc(b.email||'—')}</b></div><div><span>Последнее посещение</span><b>${v?dateFmt(v.date):'Не посещён'}</b></div></div><div class="branch-modal-actions"><button class="primary" id="branchNav">🧭 Навигация</button><button class="ghost" id="visitNow">✓ Посетить</button></div><div class="modal-actions"><button class="ghost" data-close>Закрыть</button></div>`);
    $('#branchNav').onclick=()=>{closeModal();singleNav(name)};
    $('#visitNow').onclick=()=>{saveVisit({branch:name,status:'Посещено',notes:'Отмечено вручную',date:new Date().toISOString()});closeModal();render()};
  }
  async function singleNav(name){
    planner={origin:{name:'Дом',...START_POINT},points:[name],suggestions:[],busy:false,includeHomeReturn:true};
    await startNavigation();
  }

  function renderReports(){const vs=visits().sort((a,b)=>new Date(b.date)-new Date(a.date)),ts=trips();const rows=vs.map(v=>`<article class="report-row"><div><b>${esc(v.branch)}</b><span>${esc(v.status)}${v.auto?' · GPS':''}</span><small>${dateFmt(v.date)}</small>${v.notes?`<p>${esc(v.notes)}</p>`:''}</div><button class="ghost small" data-editvisit="${esc(v.id||v.date)}">Изменить</button></article>`).join('');$('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">Журнал работы</div><h1>Отчёты</h1><p>Какие объекты посещены и когда.</p></div><button class="primary small" id="addVisit">+ Посещение</button></div><div class="periods"><button class="period active" data-period="all">Все</button><button class="period" data-period="today">Сегодня</button><button class="period" data-period="week">Неделя</button><button class="period" data-period="month">Месяц</button></div><div id="reportList" class="report-list">${rows||'<div class="empty">Посещений пока нет.</div>'}</div><div class="card"><div class="section-head"><h2>Поездки</h2><span>${ts.length}</span></div>${ts.slice(0,10).map(t=>`<div class="trip-row"><b>${num(t.km)} км</b><span>${esc((t.points||[]).join(' → '))}</span><small>${dateFmt(t.date)}</small></div>`).join('')||'<div class="empty">Поездок пока нет.</div>'}</div></section>`;
    $('#addVisit').onclick=()=>openVisitForm();$$('[data-editvisit]').forEach(b=>b.onclick=()=>openVisitForm(vs.find(v=>(v.id||v.date)===b.dataset.editvisit)));
    $$('.period').forEach(b=>b.onclick=()=>filterReports(b.dataset.period));
  }
  function filterReports(period){const now=new Date();let arr=visits();if(period==='today')arr=arr.filter(v=>new Date(v.date).toDateString()===now.toDateString());if(period==='week'){const d=new Date(now);d.setDate(now.getDate()-6);arr=arr.filter(v=>new Date(v.date)>=d)}if(period==='month')arr=arr.filter(v=>new Date(v.date).getMonth()===now.getMonth()&&new Date(v.date).getFullYear()===now.getFullYear());$('#reportList').innerHTML=arr.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(v=>`<article class="report-row"><div><b>${esc(v.branch)}</b><span>${esc(v.status)}</span><small>${dateFmt(v.date)}</small><p>${esc(v.notes||'')}</p></div></article>`).join('')||'<div class="empty">Нет посещений за выбранный период.</div>';}
  function openVisitForm(existing){const opts=allBranches().map(b=>`<option ${existing?.branch===b.name?'selected':''}>${esc(b.name)}</option>`).join('');showModal(`<h2>${existing?'Изменить':'Новое'} посещение</h2><form id="visitForm"><label class="field">Филиал<select name="branch">${opts}</select></label><label class="field">Статус<select name="status"><option ${existing?.status==='Посещено'?'selected':''}>Посещено</option><option ${existing?.status==='Частично выполнено'?'selected':''}>Частично выполнено</option><option ${existing?.status==='Нужно повторно'?'selected':''}>Нужно повторно</option><option ${existing?.status==='Проблема'?'selected':''}>Проблема</option></select></label><label class="field">Что сделано<textarea name="notes" placeholder="Результат визита">${esc(existing?.notes||'')}</textarea></label><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary">Сохранить</button></div></form>`);$('#visitForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const item={id:existing?.id||crypto.randomUUID?.()||String(Date.now()),branch:f.get('branch'),status:f.get('status'),notes:f.get('notes'),date:existing?.date||new Date().toISOString()};const arr=visits();const i=arr.findIndex(v=>v.id===item.id);if(i>=0)arr[i]=item;else arr.unshift(item);save('visits',arr);closeModal();render()};}
  function saveVisit(v){const arr=visits();arr.unshift({...v,id:v.id||crypto.randomUUID?.()||String(Date.now())});save('visits',arr.slice(0,1000));}

  function renderFinance(){const s=settings(),km=trips().reduce((a,t)=>a+Number(t.km||0),0),comp=km*s.rate,rf=refuels(),fuel=rf.reduce((a,r)=>a+Number(r.total||0),0),exp=expenses(),other=exp.reduce((a,r)=>a+Number(r.amount||0),0);$('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">Доходы и расходы</div><h1>Финансы</h1><p>Заправки и расчёт компенсации по маршрутам.</p></div></div><div class="finance-total"><span>Расчётный результат</span><b>${money(comp-fuel-other)}</b><small>${num(km)} км × ${s.rate.toLocaleString('ru-RU')} − ${money(fuel)} заправки − ${money(other)} прочее</small></div><div class="finance-actions"><button class="primary" id="addFuel">+ Заправка</button><button class="ghost" id="addExpense">+ Расход</button></div><div class="card"><div class="section-head"><h2>Заправки</h2><b>${money(fuel)}</b></div>${rf.slice(0,20).map(r=>`<div class="money-row"><div><b>${esc(r.fuel)}</b><span>${num(r.liters)} л · ${dateFmt(r.date)}</span></div><strong>${money(r.total)}</strong></div>`).join('')||'<div class="empty">Заправок пока нет.</div>'}</div><div class="card"><div class="section-head"><h2>Прочие расходы</h2><b>${money(other)}</b></div>${exp.slice(0,20).map(r=>`<div class="money-row"><div><b>${esc(r.title)}</b><span>${dateFmt(r.date)}</span></div><strong>${money(r.amount)}</strong></div>`).join('')||'<div class="empty">Других расходов нет.</div>'}</div></section>`;$('#addFuel').onclick=openFuel;$('#addExpense').onclick=openExpense;}
  function openFuel(){const s=settings();showModal(`<h2>Заправка</h2><form id="fuelForm"><label class="field">Топливо<select name="fuel"><option>Бензин</option><option ${s.fuel==='Пропан'?'selected':''}>Пропан</option><option ${s.fuel==='Метан'?'selected':''}>Метан</option></select></label><label class="field">Литры<input name="liters" type="number" step="0.1" required></label><label class="field">Цена за литр<input name="price" type="number" value="${s.fuelPrice}" required></label><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary">Сохранить</button></div></form>`);$('#fuelForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),r={fuel:f.get('fuel'),liters:Number(f.get('liters')),price:Number(f.get('price')),total:Number(f.get('liters'))*Number(f.get('price')),date:new Date().toISOString()};const a=refuels();a.unshift(r);save('refuels',a);closeModal();render()}}
  function openExpense(){showModal(`<h2>Прочий расход</h2><form id="expenseForm"><label class="field">Название<input name="title" placeholder="Мойка, парковка, ремонт…" required></label><label class="field">Сумма<input name="amount" type="number" required></label><div class="modal-actions"><button type="button" class="ghost" data-close>Отмена</button><button class="primary">Сохранить</button></div></form>`);$('#expenseForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),a=expenses();a.unshift({title:f.get('title'),amount:Number(f.get('amount')),date:new Date().toISOString()});save('expenses',a);closeModal();render()}}

  function renderSettings(){const s=settings();$('#screen').innerHTML=`<section class="page"><div class="page-title"><div><div class="eyebrow">Персонализация</div><h1>Настройки</h1><p>Здесь меняются расчёты и правила учёта посещений.</p></div></div><div class="card"><h2>Автомобиль</h2><label class="field">Вид топлива<select id="fuelType"><option ${s.fuel==='Бензин'?'selected':''}>Бензин</option><option ${s.fuel==='Пропан'?'selected':''}>Пропан</option><option ${s.fuel==='Метан'?'selected':''}>Метан</option></select></label><label class="field">Расход, л на 100 км<input id="consumption" type="number" step="0.1" value="${s.consumption}"></label><label class="field">Цена топлива, сум/л<input id="fuelPrice" type="number" value="${s.fuelPrice}"></label></div><div class="card"><h2>Компенсация</h2><label class="field">Сумма за 1 км, сум<input id="rate" type="number" value="${s.rate}"></label><p class="hint">Компенсация считается по расчётному дорожному пробегу выбранных маршрутов.</p></div><div class="card"><h2>Учёт посещения</h2><label class="check"><input id="autoVisit" type="checkbox" ${s.autoVisit?'checked':''}> Автоматически отмечать филиал при приближении</label><label class="field">Радиус, метров<input id="radius" type="number" min="50" max="1000" step="50" value="${s.radius}"></label><p class="hint">Можно отключить и отмечать посещения только вручную.</p></div><div class="card"><h2>Данные</h2><div class="settings-actions"><button class="ghost" id="export">Экспортировать резервную копию</button><button class="danger" id="reset">Сбросить данные</button></div></div></section>`;
    ['fuelType','consumption','fuelPrice','rate','autoVisit','radius'].forEach(id=>$('#'+id).addEventListener('change',()=>{const n={fuel:$('#fuelType').value,consumption:Number($('#consumption').value),fuelPrice:Number($('#fuelPrice').value),rate:Number($('#rate').value),autoVisit:$('#autoVisit').checked,radius:Number($('#radius').value)};save('settings',n);render()}));
    $('#export').onclick=exportData;$('#reset').onclick=()=>{if(confirm('Удалить все поездки, посещения, заправки и настройки?')){Object.keys(localStorage).filter(k=>k.startsWith('k2-')).forEach(k=>localStorage.removeItem(k));location.reload()}};
  }
  function exportData(){const data={version:2,exportedAt:new Date().toISOString(),settings:settings(),visits:visits(),trips:trips(),refuels:refuels(),expenses:expenses()};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`kadastr-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function showModal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden');$$('[data-close]').forEach(x=>x.onclick=closeModal)}
  const closeModal=()=>$('#modal').classList.add('hidden');

  $$('.tab').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render()}));$('#quickGps').onclick=()=>{if(activeTrip)finishTrip();else openPlanner()};
  function openGpsInfo(){showModal(`<h2>Учёт пробега</h2><p>GPS-доступ не требуется.</p><p class="hint">После нажатия «Навигация» приложение рассчитывает пробег по дорожному маршруту между выбранными точками и использует его для статистики и компенсации.</p><div class="modal-actions"><button class="primary" data-close>Понятно</button></div>`)}
  render();
})();
